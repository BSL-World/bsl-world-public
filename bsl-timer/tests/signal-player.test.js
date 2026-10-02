import assert from 'node:assert/strict';
import test from 'node:test';

import { SignalPlayer } from '../src/signal.js';

class FakeAudio {
  constructor(url) {
    this.url = url;
    this.listeners = new Map();
    this.currentTime = 0;
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }

  removeEventListener(name) {
    this.listeners.delete(name);
  }

  play() {
    queueMicrotask(() => this.listeners.get('ended')?.());
    return Promise.resolve();
  }

  pause() {}
}

test('plays a selected custom audio file', async () => {
  const commands = [];
  const player = new SignalPlayer({
    invokeFn: async (command, arguments_) => {
      commands.push({ command, arguments_ });

      if (command === 'audio_file_exists') {
        return true;
      }

      return new Uint8Array([1, 2, 3]).buffer;
    },
    audioFactory: (url) => new FakeAudio(url),
    createObjectUrl: () => 'blob:signal-test'
  });

  assert.equal(await player.play('tea', {
    source: 'custom',
    customSoundPath: 'D:\\Sounds\\Tea.mp3'
  }), true);
  assert.deepEqual(commands.map(({ command }) => command), [
    'audio_file_exists',
    'read_audio_file'
  ]);
});

test('falls back to the built-in signal when a file disappears', async () => {
  const errors = [];
  const player = new SignalPlayer({
    invokeFn: async () => false,
    onFileError: (error, path) => errors.push({ error, path }),
    logger: { error() {} }
  });
  let builtInPlaybackCount = 0;

  player.playBuiltIn = async () => {
    builtInPlaybackCount += 1;
    return true;
  };

  assert.equal(await player.play('tea', {
    source: 'custom',
    customSoundPath: 'D:\\Sounds\\Missing.wav'
  }), true);
  assert.equal(builtInPlaybackCount, 1);
  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'D:\\Sounds\\Missing.wav');
});

test('does not start a file after its sequence is stopped while loading', async () => {
  let finishReading;
  let playbackCount = 0;
  const player = new SignalPlayer({
    invokeFn: async (command) => {
      if (command === 'audio_file_exists') {
        return true;
      }

      return new Promise((resolve) => {
        finishReading = () => resolve(new Uint8Array([1, 2, 3]).buffer);
      });
    },
    audioFactory: () => {
      playbackCount += 1;
      return new FakeAudio('blob:signal-test');
    },
    createObjectUrl: () => 'blob:signal-test'
  });
  const playback = player.play('tea', {
    source: 'custom',
    customSoundPath: 'D:\\Sounds\\Tea.mp3'
  });

  await Promise.resolve();
  player.stop('tea');
  finishReading();

  assert.equal(await playback, true);
  assert.equal(playbackCount, 0);
});

test('does not fall back after a stopped file load fails', async () => {
  let failReading;
  let builtInPlaybackCount = 0;
  let fileErrorCount = 0;
  const player = new SignalPlayer({
    invokeFn: async (command) => {
      if (command === 'audio_file_exists') {
        return true;
      }

      return new Promise((resolve, reject) => {
        failReading = () => reject(new Error('read cancelled'));
      });
    },
    onFileError: () => {
      fileErrorCount += 1;
    },
    logger: { error() {} }
  });

  player.playBuiltIn = async () => {
    builtInPlaybackCount += 1;
    return true;
  };

  const playback = player.play('tea', {
    source: 'custom',
    customSoundPath: 'D:\\Sounds\\Tea.mp3'
  });

  await Promise.resolve();
  player.stop('tea');
  failReading();

  assert.equal(await playback, true);
  assert.equal(builtInPlaybackCount, 0);
  assert.equal(fileErrorCount, 0);
});
