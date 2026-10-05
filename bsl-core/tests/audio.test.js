import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_AUDIO_OUTPUT_DEVICE_ID,
  NativeAudioSignal,
  createNativeAudioRequest,
  isAudioOutputDeviceAvailable,
  listAudioOutputDevices,
  normalizeAudioOutputDeviceId,
  normalizeAudioOutputDevices
} from '../utils/audio.js';

test('normalizes the operating-system default audio output', () => {
  assert.equal(
    normalizeAudioOutputDeviceId('  '),
    DEFAULT_AUDIO_OUTPUT_DEVICE_ID
  );
  assert.equal(
    normalizeAudioOutputDeviceId(' wasapi:speakers '),
    'wasapi:speakers'
  );
});

test('normalizes unique native audio output devices', () => {
  assert.deepEqual(normalizeAudioOutputDevices([
    { id: 'default', label: 'Default' },
    { id: 'wasapi:speakers', label: ' Speakers ' },
    { id: 'wasapi:speakers', label: 'Duplicate' },
    { id: 'wasapi:headset', label: null }
  ]), [
    { id: 'wasapi:speakers', label: 'Speakers' },
    { id: 'wasapi:headset', label: '' }
  ]);
});

test('lists audio outputs through the native desktop bridge', async () => {
  const calls = [];
  const devices = await listAudioOutputDevices(async (command) => {
    calls.push(command);
    return [{ id: 'wasapi:speakers', label: 'Speakers' }];
  });

  assert.deepEqual(calls, ['list_audio_output_devices']);
  assert.deepEqual(devices, [
    { id: 'wasapi:speakers', label: 'Speakers' }
  ]);
});

test('checks a saved device through the native desktop bridge', async () => {
  const calls = [];

  assert.equal(await isAudioOutputDeviceAvailable(
    'wasapi:headset',
    async (command, arguments_) => {
      calls.push({ command, arguments_ });
      return true;
    }
  ), true);
  assert.deepEqual(calls, [{
    command: 'is_audio_output_device_available',
    arguments_: { deviceId: 'wasapi:headset' }
  }]);
});

test('does not invoke native code for the system default', async () => {
  assert.equal(await isAudioOutputDeviceAvailable(
    DEFAULT_AUDIO_OUTPUT_DEVICE_ID,
    () => {
      throw new Error('must not be called');
    }
  ), true);
});

test('builds a native file playback request', () => {
  assert.deepEqual(createNativeAudioRequest({
    playbackId: 12,
    outputDeviceId: ' wasapi:headset ',
    signal: NativeAudioSignal.FILE,
    path: 'D:\\Sounds\\Tea.mp3'
  }), {
    playbackId: '12',
    outputDeviceId: 'wasapi:headset',
    signal: 'file',
    path: 'D:\\Sounds\\Tea.mp3'
  });
});
