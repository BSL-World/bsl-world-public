export const SIGNAL_SETTINGS_EVENT = 'bsl-timer:signal-settings-changed';

export const SignalRepeatMode = Object.freeze({
  COUNT: 'count',
  DURATION: 'duration'
});

export const SignalSource = Object.freeze({
  DEFAULT: 'default'
});

export const MIN_SIGNAL_REPEAT_INTERVAL_MS = 60_000;

export const DEFAULT_SIGNAL_SETTINGS = Object.freeze({
  repeatMode: SignalRepeatMode.COUNT,
  repeatCount: 0,
  repeatDurationMs: 30_000,
  repeatIntervalMs: MIN_SIGNAL_REPEAT_INTERVAL_MS,
  source: SignalSource.DEFAULT
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

export function normalizeSignalSettings(settings = {}) {
  const sourceSettings = settings && typeof settings === 'object'
    ? settings
    : {};

  return {
    repeatMode: Object.values(SignalRepeatMode).includes(
      sourceSettings.repeatMode
    )
      ? sourceSettings.repeatMode
      : DEFAULT_SIGNAL_SETTINGS.repeatMode,
    repeatCount: normalizeNonNegativeInteger(
      sourceSettings.repeatCount,
      DEFAULT_SIGNAL_SETTINGS.repeatCount
    ),
    repeatDurationMs: normalizePositiveInteger(
      sourceSettings.repeatDurationMs,
      DEFAULT_SIGNAL_SETTINGS.repeatDurationMs
    ),
    repeatIntervalMs: Math.max(
      MIN_SIGNAL_REPEAT_INTERVAL_MS,
      normalizePositiveInteger(
        sourceSettings.repeatIntervalMs,
        DEFAULT_SIGNAL_SETTINGS.repeatIntervalMs
      )
    ),
    source: Object.values(SignalSource).includes(sourceSettings.source)
      ? sourceSettings.source
      : DEFAULT_SIGNAL_SETTINGS.source
  };
}

export function signalSettingsEqual(first, second) {
  const normalizedFirst = normalizeSignalSettings(first);
  const normalizedSecond = normalizeSignalSettings(second);

  return Object.keys(DEFAULT_SIGNAL_SETTINGS).every(
    (key) => normalizedFirst[key] === normalizedSecond[key]
  );
}
