export const WARNING_SIGNAL_SETTINGS_EVENT =
  'bsl-timer:warning-signal-settings-changed';

export const WARNING_THRESHOLD_MINUTES = Object.freeze([15, 10, 5]);

export const DEFAULT_WARNING_SIGNAL_SETTINGS = Object.freeze({
  soundThresholdMinutes: Object.freeze([]),
  informerThresholdMinutes: Object.freeze([])
});

function normalizeThresholds(values) {
  const requestedThresholds = Array.isArray(values) ? values : [];

  return WARNING_THRESHOLD_MINUTES.filter(
    (threshold) => requestedThresholds.some(
      (value) => Number(value) === threshold
    )
  );
}

export function normalizeWarningSignalSettings(settings = {}) {
  const sourceSettings = settings && typeof settings === 'object'
    ? settings
    : {};
  const legacyThresholds = sourceSettings.enabledThresholdMinutes;

  return {
    soundThresholdMinutes: normalizeThresholds(
      sourceSettings.soundThresholdMinutes ?? legacyThresholds
    ),
    informerThresholdMinutes: normalizeThresholds(
      sourceSettings.informerThresholdMinutes
    )
  };
}

export function warningSignalSettingsEqual(first, second) {
  const normalizedFirst = normalizeWarningSignalSettings(first);
  const normalizedSecond = normalizeWarningSignalSettings(second);

  return Object.keys(DEFAULT_WARNING_SIGNAL_SETTINGS).every((key) => (
    normalizedFirst[key].length === normalizedSecond[key].length
    && normalizedFirst[key].every(
      (threshold, index) => threshold === normalizedSecond[key][index]
    )
  ));
}

export function getWarningDelivery(settings, thresholdMinutes) {
  const normalizedSettings = normalizeWarningSignalSettings(settings);

  return {
    sound: normalizedSettings.soundThresholdMinutes
      .includes(thresholdMinutes),
    informer: normalizedSettings.informerThresholdMinutes
      .includes(thresholdMinutes)
  };
}
