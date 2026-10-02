export const SIGNAL_SETTINGS_EVENT = 'bsl-timer:signal-settings-changed';

export const SignalSource = Object.freeze({
  DEFAULT: 'default',
  WINDOWS: 'windows',
  CUSTOM: 'custom'
});

export const MIN_SIGNAL_REPEAT_INTERVAL_MS = 60_000;

export const DEFAULT_SIGNAL_SETTINGS = Object.freeze({
  repeatCount: 0,
  repeatIntervalMs: MIN_SIGNAL_REPEAT_INTERVAL_MS,
  source: SignalSource.DEFAULT,
  windowsSoundPath: '',
  customSoundPath: ''
});

function normalizeNonNegativeInteger(value, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number) || number < 0) {
    return fallback;
  }

  return Math.min(Math.floor(number), Number.MAX_SAFE_INTEGER);
}

function normalizePositiveInteger(value, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return fallback;
  }

  return Math.min(Math.round(number), Number.MAX_SAFE_INTEGER);
}

function normalizePath(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function migrateRepeatCount(sourceSettings, repeatIntervalMs) {
  if (sourceSettings.repeatMode !== 'duration') {
    return normalizeNonNegativeInteger(
      sourceSettings.repeatCount,
      DEFAULT_SIGNAL_SETTINGS.repeatCount
    );
  }

  const repeatDurationMs = normalizePositiveInteger(
    sourceSettings.repeatDurationMs,
    0
  );

  return Math.floor(repeatDurationMs / repeatIntervalMs);
}

export function normalizeSignalSettings(settings = {}) {
  const sourceSettings = settings && typeof settings === 'object'
    ? settings
    : {};
  const repeatIntervalMs = Math.max(
    MIN_SIGNAL_REPEAT_INTERVAL_MS,
    normalizePositiveInteger(
      sourceSettings.repeatIntervalMs,
      DEFAULT_SIGNAL_SETTINGS.repeatIntervalMs
    )
  );

  return {
    repeatCount: migrateRepeatCount(
      sourceSettings,
      repeatIntervalMs
    ),
    repeatIntervalMs,
    source: Object.values(SignalSource).includes(sourceSettings.source)
      ? sourceSettings.source
      : DEFAULT_SIGNAL_SETTINGS.source,
    windowsSoundPath: normalizePath(sourceSettings.windowsSoundPath),
    customSoundPath: normalizePath(sourceSettings.customSoundPath)
  };
}

export function signalSettingsEqual(first, second) {
  const normalizedFirst = normalizeSignalSettings(first);
  const normalizedSecond = normalizeSignalSettings(second);

  return Object.keys(DEFAULT_SIGNAL_SETTINGS).every(
    (key) => normalizedFirst[key] === normalizedSecond[key]
  );
}

export function getSelectedSignalPath(settings = {}) {
  const normalizedSettings = normalizeSignalSettings(settings);

  if (normalizedSettings.source === SignalSource.WINDOWS) {
    return normalizedSettings.windowsSoundPath;
  }

  if (normalizedSettings.source === SignalSource.CUSTOM) {
    return normalizedSettings.customSoundPath;
  }

  return '';
}

export function createSignalPreviewSettings(settings = {}) {
  return {
    ...normalizeSignalSettings(settings),
    repeatCount: 0
  };
}
