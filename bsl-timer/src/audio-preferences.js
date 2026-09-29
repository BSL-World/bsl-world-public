export const AUDIO_PREFERENCES_STORAGE_KEY =
  'bsl-timer.audio-preferences';

export const AUDIO_PREFERENCES_EVENT =
  'bsl-timer:audio-preferences-changed';

export const DEFAULT_AUDIO_PREFERENCES = Object.freeze({
  allowConcurrentSignals: true,
  outputDeviceId: 'default'
});

export function normalizeAudioPreferences(preferences = {}) {
  const sourcePreferences = preferences
    && typeof preferences === 'object'
    ? preferences
    : {};
  const outputDeviceId = typeof sourcePreferences.outputDeviceId === 'string'
    && sourcePreferences.outputDeviceId.trim()
    ? sourcePreferences.outputDeviceId.trim()
    : DEFAULT_AUDIO_PREFERENCES.outputDeviceId;

  return {
    allowConcurrentSignals:
      sourcePreferences.allowConcurrentSignals !== false,
    outputDeviceId
  };
}

export function getAudioPreferences(storage = globalThis.localStorage) {
  const storedPreferences = storage.getItem(
    AUDIO_PREFERENCES_STORAGE_KEY
  );

  if (!storedPreferences) {
    return { ...DEFAULT_AUDIO_PREFERENCES };
  }

  try {
    return normalizeAudioPreferences(JSON.parse(storedPreferences));
  } catch {
    return { ...DEFAULT_AUDIO_PREFERENCES };
  }
}

export function saveAudioPreferences(
  preferences,
  storage = globalThis.localStorage
) {
  const normalizedPreferences = normalizeAudioPreferences(preferences);

  storage.setItem(
    AUDIO_PREFERENCES_STORAGE_KEY,
    JSON.stringify(normalizedPreferences)
  );

  return normalizedPreferences;
}

export function audioPreferencesEqual(first, second) {
  const normalizedFirst = normalizeAudioPreferences(first);
  const normalizedSecond = normalizeAudioPreferences(second);

  return normalizedFirst.allowConcurrentSignals
      === normalizedSecond.allowConcurrentSignals
    && normalizedFirst.outputDeviceId === normalizedSecond.outputDeviceId;
}
