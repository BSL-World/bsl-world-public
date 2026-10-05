import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_AUDIO_PREFERENCES,
  audioPreferencesEqual,
  getAudioPreferences,
  saveAudioPreferences
} from '../src/audio-preferences.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

test('allows concurrent timer signals by default', () => {
  assert.deepEqual(
    getAudioPreferences(createMemoryStorage()),
    DEFAULT_AUDIO_PREFERENCES
  );
});

test('saves global audio preferences', () => {
  const storage = createMemoryStorage();

  saveAudioPreferences({
    allowConcurrentSignals: false,
    outputDeviceId: 'speakers',
    outputDeviceLabel: 'Desktop speakers'
  }, storage);

  assert.deepEqual(getAudioPreferences(storage), {
    allowConcurrentSignals: false,
    outputDeviceId: 'speakers',
    outputDeviceLabel: 'Desktop speakers'
  });
});

test('compares normalized global audio preferences', () => {
  assert.equal(
    audioPreferencesEqual({}, DEFAULT_AUDIO_PREFERENCES),
    true
  );
  assert.equal(
    audioPreferencesEqual({}, { allowConcurrentSignals: false }),
    false
  );
  assert.equal(
    audioPreferencesEqual(
      { outputDeviceId: 'speakers', outputDeviceLabel: 'Speakers' },
      { outputDeviceId: 'speakers', outputDeviceLabel: 'Headset' }
    ),
    false
  );
});
