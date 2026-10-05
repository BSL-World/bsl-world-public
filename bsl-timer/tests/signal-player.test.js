import assert from 'node:assert/strict';
import test from 'node:test';

import { SignalPlayer } from '../src/signal.js';

test('plays a selected custom audio file through the native bridge', async () => {
  const calls = [];
  const player = new SignalPlayer({
    outputDeviceId: 'wasapi:usb-headset',
    invokeFn: async (command, arguments_) => {
      calls.push({ command, arguments_ });
      return {
        effectiveOutputDeviceId: 'wasapi:usb-headset',
        fellBack: false
      };
    }
  });

  assert.equal(await player.play('tea', {
    source: 'custom',
    customSoundPath: 'D:\\Sounds\\Tea.mp3'
  }), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].command, 'play_audio_signal');
  assert.deepEqual(calls[0].arguments_.request, {
    playbackId: 'signal-player-1:1',
    outputDeviceId: 'wasapi:usb-headset',
    signal: 'file',
    path: 'D:\\Sounds\\Tea.mp3'
  });
});

test('checks a selected output device through the native bridge', async () => {
  const calls = [];
  const player = new SignalPlayer({
    invokeFn: async (command, arguments_) => {
      calls.push({ command, arguments_ });
      return true;
    }
  });

  assert.equal(
    await player.setOutputDevice('wasapi:usb-headset'),
    'wasapi:usb-headset'
  );
  assert.deepEqual(calls, [{
    command: 'is_audio_output_device_available',
    arguments_: { deviceId: 'wasapi:usb-headset' }
  }]);
});

test('reports fallback when a selected output is unavailable', async () => {
  const fallbacks = [];
  const player = new SignalPlayer({
    invokeFn: async () => false,
    onOutputDeviceFallback: (deviceId) => fallbacks.push(deviceId)
  });

  assert.equal(
    await player.setOutputDevice('wasapi:missing-device'),
    'default'
  );
  assert.deepEqual(fallbacks, ['wasapi:missing-device']);
});

test('reports native fallback after playback', async () => {
  const fallbacks = [];
  const player = new SignalPlayer({
    outputDeviceId: 'wasapi:disconnected-device',
    invokeFn: async () => ({
      effectiveOutputDeviceId: 'default',
      fellBack: true
    }),
    onOutputDeviceFallback: (deviceId) => fallbacks.push(deviceId)
  });

  assert.equal(await player.playBuiltIn('tea'), true);
  assert.deepEqual(fallbacks, ['wasapi:disconnected-device']);
});

test('falls back to the built-in signal when a file cannot be decoded', async () => {
  const calls = [];
  const errors = [];
  const player = new SignalPlayer({
    invokeFn: async (command, arguments_) => {
      calls.push({ command, arguments_ });

      if (arguments_.request.signal === 'file') {
        throw new Error('decode failed');
      }

      return { effectiveOutputDeviceId: 'default', fellBack: false };
    },
    onFileError: (error, path) => errors.push({ error, path }),
    logger: { error() {} }
  });

  assert.equal(await player.play('tea', {
    source: 'custom',
    customSoundPath: 'D:\\Sounds\\Missing.wav'
  }), true);
  assert.deepEqual(
    calls.map(({ arguments_ }) => arguments_.request.signal),
    ['file', 'builtIn']
  );
  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'D:\\Sounds\\Missing.wav');
});

test('does not fall back after stopped file playback fails', async () => {
  let failPlayback;
  let builtInPlaybackCount = 0;
  let fileErrorCount = 0;
  const player = new SignalPlayer({
    invokeFn: async (command, arguments_) => {
      if (command === 'stop_audio_playback') {
        return;
      }

      if (arguments_.request.signal === 'builtIn') {
        builtInPlaybackCount += 1;
        return { effectiveOutputDeviceId: 'default', fellBack: false };
      }

      return new Promise((resolve, reject) => {
        failPlayback = () => reject(new Error('playback cancelled'));
      });
    },
    onFileError: () => {
      fileErrorCount += 1;
    },
    logger: { error() {} }
  });
  const playback = player.play('tea', {
    source: 'custom',
    customSoundPath: 'D:\\Sounds\\Tea.mp3'
  });

  await Promise.resolve();
  player.stop('tea');
  failPlayback();

  assert.equal(await playback, true);
  assert.equal(builtInPlaybackCount, 0);
  assert.equal(fileErrorCount, 0);
});

test('plays the fixed warning signal through the native bridge', async () => {
  const calls = [];
  const player = new SignalPlayer({
    invokeFn: async (command, arguments_) => {
      calls.push({ command, arguments_ });
      return { effectiveOutputDeviceId: 'default', fellBack: false };
    }
  });

  assert.equal(await player.playWarning('warning:tea:5'), true);
  assert.equal(calls[0].command, 'play_audio_signal');
  assert.equal(calls[0].arguments_.request.signal, 'warning');
});

test('stops native playbacks owned by one signal sequence', async () => {
  const calls = [];
  let finishPlayback;
  const player = new SignalPlayer({
    invokeFn: async (command, arguments_) => {
      calls.push({ command, arguments_ });

      if (command === 'play_audio_signal') {
        return new Promise((resolve) => {
          finishPlayback = () => resolve({
            effectiveOutputDeviceId: 'default',
            fellBack: false
          });
        });
      }
    }
  });

  const playback = player.playBuiltIn('tea');
  await Promise.resolve();
  player.stop('tea');
  await Promise.resolve();
  finishPlayback();
  await playback;

  assert.equal(calls[0].command, 'play_audio_signal');
  assert.deepEqual(calls[1], {
    command: 'stop_audio_playback',
    arguments_: { playbackIds: [calls[0].arguments_.request.playbackId] }
  });
});
