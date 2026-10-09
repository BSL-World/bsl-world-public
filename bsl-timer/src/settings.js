import { invoke } from '@tauri-apps/api/core';
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';

import {
  applyTranslations,
  getLocale,
  getSupportedLocales,
  setLocale,
  t
} from './i18n.js';

import {
  GLOW_STORAGE_KEY,
  THEME_STORAGE_KEY,
  VISUAL_PREVIEW_EVENT,
  applyGlow,
  applyTheme,
  getGlowEnabled,
  getSupportedThemes,
  getTheme,
  setGlowEnabled,
  setTheme
} from './theme.js';

import {
  APPEARANCE_PREVIEW_EVENT,
  APPEARANCE_STORAGE_KEY,
  DEFAULT_DISPLAY_BRIGHTNESS,
  DEFAULT_WINDOW_TRANSPARENCY,
  appearanceEquals,
  getAppearance,
  normalizeAppearance,
  saveAppearance
} from './appearance.js';

import {
  BEHAVIOR_STORAGE_KEY,
  behaviorEquals,
  getBehavior,
  normalizeBehavior,
  saveBehavior
} from './behavior.js';
import { EndSignalService } from './end-signal-service.js';
import {
  AUDIO_FILE_EXTENSIONS,
  getAudioFileName
} from './audio-file.js';
import { SignalPlayer } from './signal.js';
import {
  AUDIO_PREFERENCES_EVENT,
  AUDIO_PREFERENCES_STORAGE_KEY,
  audioPreferencesEqual,
  getAudioPreferences,
  normalizeAudioPreferences,
  saveAudioPreferences
} from './audio-preferences.js';
import {
  DEFAULT_AUDIO_OUTPUT_DEVICE_ID,
  listAudioOutputDevices
} from '@bsl-world/desktop-core/audio';
import {
  DateFormat,
  formatDate,
  formatTime,
  regionalSettingsEqual
} from '@bsl-world/desktop-core/regional';
import {
  EVENT_DETAILS_EVENT,
  MAX_EVENT_DESCRIPTION_LENGTH,
  getEventDisplayName,
  normalizeEventDescription
} from './event-instance.js';
import { SessionStore } from './session-store.js';
import {
  SIGNAL_SETTINGS_EVENT,
  SignalSource,
  createSignalPreviewSettings,
  normalizeSignalSettings,
  signalSettingsEqual
} from './signal-settings.js';
import {
  WARNING_SIGNAL_SETTINGS_EVENT,
  normalizeWarningSignalSettings,
  warningSignalSettingsEqual
} from './warning-signal-settings.js';
import {
  prepareAuxiliaryWindow
} from './window-position.js';
import {
  REGIONAL_SETTINGS_EVENT,
  loadRegionalSettings,
  saveRegionalSettings
} from './regional-settings.js';
import {
  FONT_SIZE_SETTINGS_EVENT,
  FONT_SIZE_STORAGE_KEY,
  FONT_SIZE_OPTIONS,
  applyFontSize,
  fontSizeSettingsEqual,
  getCachedFontSize,
  loadFontSizeSettings,
  saveFontSizeSettings
} from './font-size-settings.js';
import {
  APPEARANCE_MODE_OPTIONS,
  APPEARANCE_MODE_SETTINGS_EVENT,
  APPEARANCE_MODE_STORAGE_KEY,
  appearanceModeSettingsEqual,
  applyAppearanceMode,
  getCachedAppearanceMode,
  loadAppearanceModeSettings,
  saveAppearanceModeSettings,
  watchAppearanceMode
} from './appearance-mode-settings.js';

const settingsWindow = getCurrentWindow();
const SETTINGS_WINDOW_MARGIN = 30;

const languageSelect =
  document.getElementById('language-select');

const timeFormatSelect =
  document.getElementById('time-format-select');

const dateFormatSelect =
  document.getElementById('date-format-select');

const firstDayOfWeekSelect =
  document.getElementById('first-day-of-week-select');

const regionalFormatPreview =
  document.getElementById('regional-format-preview');

const regionalSettingsStatus =
  document.getElementById('regional-settings-status');

const themeSelect =
  document.getElementById('theme-select');

const appearanceModeSelect =
  document.getElementById('appearance-mode-select');

const appearanceModeSettingsStatus =
  document.getElementById('appearance-mode-settings-status');

const fontSizeSelect =
  document.getElementById('font-size-select');

const fontSizeSettingsStatus =
  document.getElementById('font-size-settings-status');

const glowEnabledInput =
  document.getElementById('glow-enabled-input');

const windowTransparencyInput =
  document.getElementById('window-transparency-input');

const windowTransparencyValue =
  document.getElementById('window-transparency-value');

const displayBrightnessInput =
  document.getElementById('display-brightness-input');

const displayBrightnessValue =
  document.getElementById('display-brightness-value');

const windowTransparencyDefaultButton =
  document.getElementById('window-transparency-default-btn');

const displayBrightnessDefaultButton =
  document.getElementById('display-brightness-default-btn');

const confirmCloseActiveInput =
  document.getElementById('confirm-close-active-input');

const pulseTrayOverdueInput =
  document.getElementById('pulse-tray-overdue-input');

const autostartEnabledInput =
  document.getElementById('autostart-enabled-input');

const autostartStatus =
  document.getElementById('autostart-status');

const closeButtonActionSelect =
  document.getElementById('close-button-action-select');

const startupTimerActionSelect =
  document.getElementById('startup-timer-action-select');

const timerNameInput =
  document.getElementById('timer-name-input');

const timerDescriptionInput =
  document.getElementById('timer-description-input');

const signalTimerName =
  document.getElementById('signal-timer-name');

const signalSourceSelect =
  document.getElementById('signal-source-select');

const playEndSignalInput =
  document.getElementById('play-end-signal-input');

const showEndInformerInput =
  document.getElementById('show-end-informer-input');

const windowsSoundControls =
  document.getElementById('windows-sound-controls');

const windowsSoundSelect =
  document.getElementById('windows-sound-select');

const signalRepeatCountInput =
  document.getElementById('signal-repeat-count-input');

const customSoundControls =
  document.getElementById('custom-sound-controls');

const chooseCustomSoundButton =
  document.getElementById('choose-custom-sound-btn');

const customSoundFileName =
  document.getElementById('custom-sound-file-name');

const signalSourceStatus =
  document.getElementById('signal-source-status');

const signalRepeatIntervalInput =
  document.getElementById('signal-repeat-interval-input');

const signalPreviewButton =
  document.getElementById('signal-preview-btn');

const allowConcurrentSignalsInput =
  document.getElementById('allow-concurrent-signals-input');

const audioOutputDeviceSelect =
  document.getElementById('audio-output-device-select');

const audioOutputDeviceStatus =
  document.getElementById('audio-output-device-status');

const warningSoundInputs = [
  ...document.querySelectorAll('.warning-sound-input')
];

const warningInformerInputs = [
  ...document.querySelectorAll('.warning-informer-input')
];

const okButton =
  document.getElementById('ok-settings-btn');

const cancelButton =
  document.getElementById('cancel-settings-btn');

const applyButton =
  document.getElementById('apply-settings-btn');

let pendingLocale = getLocale();
let committedRegionalSettings = null;
let pendingRegionalSettings = null;
let regionalSettingsLoaded = false;
let committedTheme = getTheme();
let pendingTheme = committedTheme;
let committedGlowEnabled = getGlowEnabled();
let pendingGlowEnabled = committedGlowEnabled;
let committedAppearanceModeSettings = {
  mode: getCachedAppearanceMode()
};
let pendingAppearanceModeSettings = {
  ...committedAppearanceModeSettings
};
let appearanceModeSettingsLoaded = false;
let committedFontSizeSettings = {
  fontSize: getCachedFontSize()
};
let pendingFontSizeSettings = { ...committedFontSizeSettings };
let fontSizeSettingsLoaded = false;
let committedAppearance = getAppearance();
let pendingAppearance = { ...committedAppearance };
let committedBehavior = getBehavior();
let pendingBehavior = { ...committedBehavior };
const sessionStore = new SessionStore();
const settingsSession = sessionStore.load();
const signalEvent = settingsSession.events.find(
  ({ id }) => id === settingsSession.activeEventId
) ?? settingsSession.events[0];
const signalEventId = signalEvent?.id ?? null;
let committedEventDetails = {
  name: signalEvent?.name ?? '',
  description: signalEvent?.description ?? ''
};
let pendingEventDetails = { ...committedEventDetails };
let committedSignalSettings = normalizeSignalSettings(
  signalEvent?.settings?.endSignal
);
let pendingSignalSettings = { ...committedSignalSettings };
let committedWarningSignalSettings = normalizeWarningSignalSettings(
  signalEvent?.settings?.warningSignals
);
let pendingWarningSignalSettings = {
  ...committedWarningSignalSettings,
  soundThresholdMinutes: [
    ...committedWarningSignalSettings.soundThresholdMinutes
  ],
  informerThresholdMinutes: [
    ...committedWarningSignalSettings.informerThresholdMinutes
  ]
};
let committedAudioPreferences = getAudioPreferences();
let pendingAudioPreferences = { ...committedAudioPreferences };
let audioOutputDevices = [];
let windowsSounds = [];
const signalPreviewId = 'settings-preview';
const signalPreviewPlayer = new SignalPlayer({
  outputDeviceId: pendingAudioPreferences.outputDeviceId,
  onFileError: () => {
    setSignalSourceStatus('settings.signalFileUnavailable');
  },
  onOutputDeviceFallback: () => {
    setAudioOutputStatus('settings.audioOutputFallback');
  }
});
const signalPreviewService = new EndSignalService({
  player: signalPreviewPlayer,
  onComplete: (sequenceId) => {
    if (sequenceId !== signalPreviewId) {
      return;
    }

    signalPreviewButton.dataset.playing = 'false';
    signalPreviewButton.textContent = t('settings.previewSignal');
  }
});
let committedAutostartEnabled = false;
let pendingAutostartEnabled = false;
let autostartStateLoaded = false;
let previewTimeoutId = null;
let isClosing = false;

function populateLanguageSelect() {
  languageSelect.replaceChildren();

  for (const locale of getSupportedLocales()) {
    const option = document.createElement('option');

    option.value = locale.code;
    option.textContent = locale.name;
    option.selected = locale.code === pendingLocale;

    languageSelect.append(option);
  }
}

function setRegionalSettingsStatus(messageKey = null) {
  regionalSettingsStatus.hidden = messageKey === null;
  regionalSettingsStatus.textContent = messageKey ? t(messageKey) : '';
}

function setRegionalControlsDisabled(disabled) {
  timeFormatSelect.disabled = disabled;
  dateFormatSelect.disabled = disabled;
  firstDayOfWeekSelect.disabled = disabled;
}

function updateRegionalPreview() {
  if (!pendingRegionalSettings) {
    regionalFormatPreview.textContent = '—';
    return;
  }

  const now = new Date();
  const options = { locale: pendingLocale };

  regionalFormatPreview.textContent = `${formatDate(
    now,
    pendingRegionalSettings,
    options
  )} · ${formatTime(now, pendingRegionalSettings, options)}`;

  const sampleDate = new Date(2026, 8, 4, 17, 6);
  const dayFirstTextOption = dateFormatSelect.querySelector(
    `[value="${DateFormat.DAY_TEXT_MONTH_YEAR}"]`
  );
  const monthFirstTextOption = dateFormatSelect.querySelector(
    `[value="${DateFormat.TEXT_MONTH_DAY_YEAR}"]`
  );
  const dayTextMonthOption = dateFormatSelect.querySelector(
    `[value="${DateFormat.DAY_TEXT_MONTH}"]`
  );
  const textMonthDayOption = dateFormatSelect.querySelector(
    `[value="${DateFormat.TEXT_MONTH_DAY}"]`
  );

  dayFirstTextOption.textContent = formatDate(sampleDate, {
    ...pendingRegionalSettings,
    dateFormat: DateFormat.DAY_TEXT_MONTH_YEAR
  }, options);
  monthFirstTextOption.textContent = formatDate(sampleDate, {
    ...pendingRegionalSettings,
    dateFormat: DateFormat.TEXT_MONTH_DAY_YEAR
  }, options);
  dayTextMonthOption.textContent = formatDate(sampleDate, {
    ...pendingRegionalSettings,
    dateFormat: DateFormat.DAY_TEXT_MONTH
  }, options);
  textMonthDayOption.textContent = formatDate(sampleDate, {
    ...pendingRegionalSettings,
    dateFormat: DateFormat.TEXT_MONTH_DAY
  }, options);
}

function updateRegionalControls() {
  if (!pendingRegionalSettings) {
    return;
  }

  timeFormatSelect.value = pendingRegionalSettings.timeFormat;
  dateFormatSelect.value = pendingRegionalSettings.dateFormat;
  firstDayOfWeekSelect.value =
    pendingRegionalSettings.firstDayOfWeek;
  updateRegionalPreview();
}

function readRegionalControls() {
  pendingRegionalSettings = {
    timeFormat: timeFormatSelect.value,
    dateFormat: dateFormatSelect.value,
    firstDayOfWeek: firstDayOfWeekSelect.value
  };
  updateRegionalPreview();
  updateApplyButton();
}

async function loadSharedRegionalSettings() {
  setRegionalControlsDisabled(true);
  setRegionalSettingsStatus();

  try {
    committedRegionalSettings = await loadRegionalSettings(invoke);
    pendingRegionalSettings = { ...committedRegionalSettings };
    regionalSettingsLoaded = true;
    setRegionalControlsDisabled(false);
    updateRegionalControls();
  } catch (error) {
    regionalSettingsLoaded = false;
    setRegionalSettingsStatus('settings.regionalSettingsUnavailable');
    console.error('Failed to load shared regional settings:', error);
  }
}

async function applyRegionalSettings() {
  if (
    !regionalSettingsLoaded
    || regionalSettingsEqual(
      pendingRegionalSettings,
      committedRegionalSettings
    )
  ) {
    return true;
  }

  try {
    committedRegionalSettings = await saveRegionalSettings(
      pendingRegionalSettings,
      invoke
    );
    pendingRegionalSettings = { ...committedRegionalSettings };
    setRegionalSettingsStatus();
    await emitTo(
      'main',
      REGIONAL_SETTINGS_EVENT,
      committedRegionalSettings
    );
    return true;
  } catch (error) {
    setRegionalSettingsStatus('settings.regionalSettingsSaveFailed');
    console.error('Failed to save shared regional settings:', error);
    return false;
  }
}

function populateThemeSelect() {
  themeSelect.replaceChildren();

  for (const theme of getSupportedThemes()) {
    const option = document.createElement('option');

    option.value = theme.code;
    option.textContent = t(theme.nameKey);
    option.selected = theme.code === pendingTheme;

    themeSelect.append(option);
  }
}

function setAppearanceModeSettingsStatus(messageKey = null) {
  appearanceModeSettingsStatus.hidden = messageKey === null;
  appearanceModeSettingsStatus.textContent = messageKey
    ? t(messageKey)
    : '';
}

function populateAppearanceModeSelect() {
  appearanceModeSelect.replaceChildren();

  for (const optionDefinition of APPEARANCE_MODE_OPTIONS) {
    const option = document.createElement('option');

    option.value = optionDefinition.code;
    option.textContent = t(optionDefinition.nameKey);
    option.selected = optionDefinition.code
      === pendingAppearanceModeSettings.mode;
    appearanceModeSelect.append(option);
  }
}

async function loadSharedAppearanceModeSettings() {
  appearanceModeSelect.disabled = true;
  setAppearanceModeSettingsStatus();

  try {
    committedAppearanceModeSettings =
      await loadAppearanceModeSettings(invoke);
    pendingAppearanceModeSettings = {
      ...committedAppearanceModeSettings
    };
    appearanceModeSettingsLoaded = true;
    appearanceModeSelect.disabled = false;
    populateAppearanceModeSelect();
  } catch (error) {
    appearanceModeSettingsLoaded = false;
    setAppearanceModeSettingsStatus(
      'settings.appearanceModeUnavailable'
    );
    console.error('Failed to load shared appearance mode:', error);
  }
}

async function applyAppearanceModeSettings() {
  if (
    !appearanceModeSettingsLoaded
    || appearanceModeSettingsEqual(
      pendingAppearanceModeSettings,
      committedAppearanceModeSettings
    )
  ) {
    return true;
  }

  try {
    committedAppearanceModeSettings =
      await saveAppearanceModeSettings(
        pendingAppearanceModeSettings,
        invoke
      );
    pendingAppearanceModeSettings = {
      ...committedAppearanceModeSettings
    };
    setAppearanceModeSettingsStatus();
    await emitTo(
      'main',
      APPEARANCE_MODE_SETTINGS_EVENT,
      committedAppearanceModeSettings
    );
    return true;
  } catch (error) {
    setAppearanceModeSettingsStatus(
      'settings.appearanceModeSaveFailed'
    );
    console.error('Failed to save shared appearance mode:', error);
    return false;
  }
}

function setFontSizeSettingsStatus(messageKey = null) {
  fontSizeSettingsStatus.hidden = messageKey === null;
  fontSizeSettingsStatus.textContent = messageKey ? t(messageKey) : '';
}

function populateFontSizeSelect() {
  fontSizeSelect.replaceChildren();

  for (const optionDefinition of FONT_SIZE_OPTIONS) {
    const option = document.createElement('option');

    option.value = optionDefinition.code;
    option.textContent = t(optionDefinition.nameKey);
    option.selected = optionDefinition.code
      === pendingFontSizeSettings.fontSize;
    fontSizeSelect.append(option);
  }
}

async function loadSharedFontSizeSettings() {
  fontSizeSelect.disabled = true;
  setFontSizeSettingsStatus();

  try {
    committedFontSizeSettings = await loadFontSizeSettings(invoke);
    pendingFontSizeSettings = { ...committedFontSizeSettings };
    fontSizeSettingsLoaded = true;
    fontSizeSelect.disabled = false;
    populateFontSizeSelect();
  } catch (error) {
    fontSizeSettingsLoaded = false;
    setFontSizeSettingsStatus('settings.fontSizeUnavailable');
    console.error('Failed to load shared font-size settings:', error);
  }
}

async function applyFontSizeSettings() {
  if (
    !fontSizeSettingsLoaded
    || fontSizeSettingsEqual(
      pendingFontSizeSettings,
      committedFontSizeSettings
    )
  ) {
    return true;
  }

  try {
    committedFontSizeSettings = await saveFontSizeSettings(
      pendingFontSizeSettings,
      invoke
    );
    pendingFontSizeSettings = { ...committedFontSizeSettings };
    setFontSizeSettingsStatus();
    await emitTo(
      'main',
      FONT_SIZE_SETTINGS_EVENT,
      committedFontSizeSettings
    );
    return true;
  } catch (error) {
    setFontSizeSettingsStatus('settings.fontSizeSaveFailed');
    console.error('Failed to save shared font-size settings:', error);
    return false;
  }
}

function updateVisualControls() {
  glowEnabledInput.checked = pendingGlowEnabled;
}

function updateAppearanceControls() {
  windowTransparencyInput.value = String(
    pendingAppearance.windowTransparency
  );

  displayBrightnessInput.value = String(
    pendingAppearance.displayBrightness
  );

  windowTransparencyValue.textContent =
    `${pendingAppearance.windowTransparency}%`;

  displayBrightnessValue.textContent =
    `${pendingAppearance.displayBrightness}%`;
}

function updateBehaviorControls() {
  closeButtonActionSelect.value =
    pendingBehavior.closeButtonAction;
  confirmCloseActiveInput.checked =
    pendingBehavior.confirmCloseWithActiveTimers;
  pulseTrayOverdueInput.checked =
    pendingBehavior.pulseTrayIconOnOverdue;
  startupTimerActionSelect.value =
    pendingBehavior.startupTimerAction;
}

function normalizeEventDetails({ name = '', description = '' } = {}) {
  return {
    name: String(name).trim().slice(0, 40),
    description: normalizeEventDescription(description) ?? ''
  };
}

function eventDetailsEqual(first, second) {
  const normalizedFirst = normalizeEventDetails(first);
  const normalizedSecond = normalizeEventDetails(second);

  return normalizedFirst.name === normalizedSecond.name
    && normalizedFirst.description === normalizedSecond.description;
}

function updateEventDetailsControls() {
  timerNameInput.value = pendingEventDetails.name
    || getEventDisplayName(
      { ...signalEvent, name: null },
      t('tabs.defaultName')
    );
  timerDescriptionInput.value = pendingEventDetails.description;
}

function readEventDetailsControls() {
  pendingEventDetails = normalizeEventDetails({
    name: timerNameInput.value,
    description: timerDescriptionInput.value.slice(
      0,
      MAX_EVENT_DESCRIPTION_LENGTH
    )
  });
  signalTimerName.textContent = pendingEventDetails.name
    || getEventDisplayName(
      { ...signalEvent, name: null },
      t('tabs.defaultName')
    );
  updateApplyButton();
}

function setAudioOutputStatus(messageKey = null) {
  audioOutputDeviceStatus.hidden = messageKey === null;
  audioOutputDeviceStatus.textContent = messageKey ? t(messageKey) : '';
}

function getAudioOutputDeviceLabel(device, index) {
  return device.label || t('settings.unnamedAudioOutputDevice')
    .replace('{number}', String(index + 1));
}

function populateAudioOutputDevices() {
  audioOutputDeviceSelect.replaceChildren();

  const defaultOption = document.createElement('option');

  defaultOption.value = DEFAULT_AUDIO_OUTPUT_DEVICE_ID;
  defaultOption.textContent = t('settings.audioOutputSystemDefault');
  audioOutputDeviceSelect.append(defaultOption);

  audioOutputDevices.forEach((device, index) => {
    const option = document.createElement('option');

    option.value = device.id;
    option.textContent = getAudioOutputDeviceLabel(device, index);
    audioOutputDeviceSelect.append(option);
  });

  const selectedDeviceExists =
    pendingAudioPreferences.outputDeviceId
      === DEFAULT_AUDIO_OUTPUT_DEVICE_ID
    || audioOutputDevices.some(
      ({ id }) => id === pendingAudioPreferences.outputDeviceId
    );

  if (!selectedDeviceExists) {
    const unavailableOption = document.createElement('option');

    unavailableOption.value = pendingAudioPreferences.outputDeviceId;
    unavailableOption.textContent = pendingAudioPreferences.outputDeviceLabel
      ? `${pendingAudioPreferences.outputDeviceLabel} — ${t(
          'settings.missingAudioOutputDevice'
        )}`
      : t('settings.missingAudioOutputDevice');
    audioOutputDeviceSelect.append(unavailableOption);
    setAudioOutputStatus('settings.audioOutputFallback');
  }

  audioOutputDeviceSelect.value = pendingAudioPreferences.outputDeviceId;
}

function updateAudioControls() {
  allowConcurrentSignalsInput.checked =
    pendingAudioPreferences.allowConcurrentSignals;
  populateAudioOutputDevices();
}

async function loadAudioOutputDevices() {
  try {
    audioOutputDevices = await listAudioOutputDevices(invoke);
    populateAudioOutputDevices();
  } catch (error) {
    audioOutputDevices = [];
    populateAudioOutputDevices();
    setAudioOutputStatus('settings.audioOutputListUnavailable');
    console.error('Failed to load audio output devices:', error);
  }
}

async function selectPendingAudioOutputDevice(deviceId, deviceLabel = '') {
  pendingAudioPreferences = normalizeAudioPreferences({
    ...pendingAudioPreferences,
    outputDeviceId: deviceId,
    outputDeviceLabel: deviceId === DEFAULT_AUDIO_OUTPUT_DEVICE_ID
      ? ''
      : deviceLabel
  });

  setAudioOutputStatus();
  const effectiveDeviceId = await signalPreviewPlayer.setOutputDevice(
    pendingAudioPreferences.outputDeviceId
  );

  if (
    effectiveDeviceId === DEFAULT_AUDIO_OUTPUT_DEVICE_ID
    && pendingAudioPreferences.outputDeviceId
      !== DEFAULT_AUDIO_OUTPUT_DEVICE_ID
  ) {
    setAudioOutputStatus('settings.audioOutputFallback');
  }

  updateAudioControls();
  updateApplyButton();
}

function updateSignalControls() {
  playEndSignalInput.checked = pendingSignalSettings.playSound;
  showEndInformerInput.checked = pendingSignalSettings.showInformer;
  signalSourceSelect.value = pendingSignalSettings.source;
  signalRepeatCountInput.value = String(
    pendingSignalSettings.repeatCount
  );
  signalRepeatIntervalInput.value = String(
    pendingSignalSettings.repeatIntervalMs / 60_000
  );
  windowsSoundControls.hidden = pendingSignalSettings.source
    !== SignalSource.WINDOWS;
  customSoundControls.hidden = pendingSignalSettings.source
    !== SignalSource.CUSTOM;
  customSoundFileName.textContent = getAudioFileName(
    pendingSignalSettings.customSoundPath
  ) || t('settings.noAudioFileSelected');
  customSoundFileName.title = pendingSignalSettings.customSoundPath;
  warningSoundInputs.forEach((input) => {
    input.checked = pendingWarningSignalSettings.soundThresholdMinutes
      .includes(Number(input.value));
  });
  warningInformerInputs.forEach((input) => {
    input.checked = pendingWarningSignalSettings.informerThresholdMinutes
      .includes(Number(input.value));
  });
}

function readSignalControls() {
  pendingSignalSettings = normalizeSignalSettings({
    ...pendingSignalSettings,
    playSound: playEndSignalInput.checked,
    showInformer: showEndInformerInput.checked,
    source: signalSourceSelect.value,
    repeatCount: signalRepeatCountInput.value,
    repeatIntervalMs: Number(signalRepeatIntervalInput.value) * 60_000,
    windowsSoundPath: windowsSoundSelect.value
      || pendingSignalSettings.windowsSoundPath
  });

  setSignalSourceStatus();
  updateSignalControls();
  updateApplyButton();
}

function readWarningSignalControls() {
  pendingWarningSignalSettings = normalizeWarningSignalSettings({
    soundThresholdMinutes: warningSoundInputs
      .filter((input) => input.checked)
      .map((input) => Number(input.value)),
    informerThresholdMinutes: warningInformerInputs
      .filter((input) => input.checked)
      .map((input) => Number(input.value))
  });

  updateApplyButton();
}

function setSignalSourceStatus(messageKey = null) {
  signalSourceStatus.hidden = messageKey === null;
  signalSourceStatus.textContent = messageKey ? t(messageKey) : '';
}

function populateWindowsSounds() {
  windowsSoundSelect.replaceChildren();

  if (windowsSounds.length === 0) {
    const option = document.createElement('option');

    option.value = '';
    option.textContent = t('settings.windowsSoundsUnavailable');
    windowsSoundSelect.append(option);
    windowsSoundSelect.disabled = true;
    return;
  }

  windowsSoundSelect.disabled = false;

  windowsSounds.forEach((sound) => {
    const option = document.createElement('option');

    option.value = sound.path;
    option.textContent = sound.name;
    windowsSoundSelect.append(option);
  });

  const selectedSoundExists = windowsSounds.some(
    ({ path }) => path === pendingSignalSettings.windowsSoundPath
  );

  if (
    pendingSignalSettings.windowsSoundPath
    && !selectedSoundExists
  ) {
    const missingOption = document.createElement('option');

    missingOption.value = pendingSignalSettings.windowsSoundPath;
    missingOption.textContent = `${t('settings.missingAudioFile')}: ${getAudioFileName(
      pendingSignalSettings.windowsSoundPath
    )}`;
    windowsSoundSelect.prepend(missingOption);
  }

  windowsSoundSelect.value = pendingSignalSettings.windowsSoundPath
    || windowsSounds[0].path;
}

async function loadWindowsSounds() {
  try {
    windowsSounds = await invoke('list_windows_sounds');
  } catch (error) {
    windowsSounds = [];
    console.error('Failed to load Windows sounds:', error);
  }

  populateWindowsSounds();
}

async function chooseCustomSound() {
  try {
    const selectedPath = await open({
      multiple: false,
      directory: false,
      title: t('settings.chooseAudioFile'),
      filters: [{
        name: t('settings.audioFiles'),
        extensions: [...AUDIO_FILE_EXTENSIONS]
      }]
    });

    if (typeof selectedPath !== 'string') {
      return;
    }

    pendingSignalSettings = normalizeSignalSettings({
      ...pendingSignalSettings,
      source: SignalSource.CUSTOM,
      customSoundPath: selectedPath
    });
    signalSourceSelect.value = SignalSource.CUSTOM;
    setSignalSourceStatus();
    updateSignalControls();
    updateApplyButton();
  } catch (error) {
    setSignalSourceStatus('settings.signalFileSelectionFailed');
    console.error('Failed to select a custom audio file:', error);
  }
}

function adjustSignalNumberInput(input, direction) {
  const step = Number(input.step) || 1;
  const minimum = input.min === ''
    ? Number.NEGATIVE_INFINITY
    : Number(input.min);
  const maximum = input.max === ''
    ? Number.POSITIVE_INFINITY
    : Number(input.max);
  const currentValue = Number(input.value);
  const fallbackValue = Number.isFinite(minimum) ? minimum : 0;
  const nextValue = Math.min(
    maximum,
    Math.max(
      minimum,
      (Number.isFinite(currentValue) ? currentValue : fallbackValue)
        + direction * step
    )
  );
  const decimalPlaces = input.step.includes('.')
    ? input.step.split('.')[1].length
    : 0;

  input.value = decimalPlaces > 0
    ? nextValue.toFixed(decimalPlaces)
    : String(Math.round(nextValue));

  readSignalControls();
}

function stopSignalPreview() {
  signalPreviewService.cancel(signalPreviewId);
  signalPreviewButton.dataset.playing = 'false';
  signalPreviewButton.textContent = t('settings.previewSignal');
}

function setAutostartStatus(messageKey = null) {
  autostartStatus.hidden = messageKey === null;
  autostartStatus.textContent = messageKey ? t(messageKey) : '';
}

async function loadAutostartState() {
  autostartEnabledInput.disabled = true;
  setAutostartStatus();

  try {
    committedAutostartEnabled = await invoke('is_autostart_enabled');
    pendingAutostartEnabled = committedAutostartEnabled;
    autostartStateLoaded = true;
    autostartEnabledInput.checked = pendingAutostartEnabled;
    autostartEnabledInput.disabled = false;
  } catch (error) {
    autostartStateLoaded = false;
    setAutostartStatus('settings.autostartUnavailable');
    console.error('Failed to read autostart state:', error);
  }

  updateApplyButton();
}

async function applyAutostartSetting() {
  if (
    !autostartStateLoaded
    || pendingAutostartEnabled === committedAutostartEnabled
  ) {
    return true;
  }

  try {
    await invoke('set_autostart_enabled', {
      enabled: pendingAutostartEnabled
    });
    committedAutostartEnabled = pendingAutostartEnabled;
    setAutostartStatus();
    return true;
  } catch (error) {
    setAutostartStatus('settings.autostartUpdateFailed');
    console.error('Failed to update autostart state:', error);
    return false;
  }
}

function updateApplyButton() {
  const autostartUnchanged =
    !autostartStateLoaded
    || pendingAutostartEnabled === committedAutostartEnabled;

  applyButton.disabled =
    pendingLocale === getLocale()
    && (
      !regionalSettingsLoaded
      || regionalSettingsEqual(
        pendingRegionalSettings,
        committedRegionalSettings
      )
    )
    && pendingTheme === getTheme()
    && pendingGlowEnabled === getGlowEnabled()
    && (
      !appearanceModeSettingsLoaded
      || appearanceModeSettingsEqual(
        pendingAppearanceModeSettings,
        committedAppearanceModeSettings
      )
    )
    && (
      !fontSizeSettingsLoaded
      || fontSizeSettingsEqual(
        pendingFontSizeSettings,
        committedFontSizeSettings
      )
    )
    && appearanceEquals(
      pendingAppearance,
      committedAppearance
    )
    && behaviorEquals(pendingBehavior, committedBehavior)
    && eventDetailsEqual(
      pendingEventDetails,
      committedEventDetails
    )
    && signalSettingsEqual(
      pendingSignalSettings,
      committedSignalSettings
    )
    && warningSignalSettingsEqual(
      pendingWarningSignalSettings,
      committedWarningSignalSettings
    )
    && audioPreferencesEqual(
      pendingAudioPreferences,
      committedAudioPreferences
    )
    && autostartUnchanged;
}

async function updateInterface() {
  applyTranslations();
  document.title = t('settings.title');
  updateRegionalControls();
  populateAppearanceModeSelect();
  populateFontSizeSelect();
  populateWindowsSounds();
  populateAudioOutputDevices();
  updateEventDetailsControls();
  updateSignalControls();
  updateAudioControls();
  signalTimerName.textContent = pendingEventDetails.name
    || getEventDisplayName(
      { ...signalEvent, name: null },
      t('tabs.defaultName')
    );

  signalPreviewButton.textContent = signalPreviewService.isActive(
    signalPreviewId
  )
    ? t('settings.stopPreview')
    : t('settings.previewSignal');

  try {
    await settingsWindow.setTitle(t('settings.title'));
  } catch (error) {
    console.error(
      'Failed to update the settings window title:',
      error
    );
  }
}


async function emitVisualPreview() {
  const themeId = applyTheme(pendingTheme);
  const glowEnabled = applyGlow(pendingGlowEnabled);

  try {
    await emitTo(
      'main',
      VISUAL_PREVIEW_EVENT,
      { themeId, glowEnabled }
    );
  } catch (error) {
    console.error('Failed to preview visual settings:', error);
  }
}

async function emitAppearancePreview(appearance) {
  try {
    await emitTo(
      'main',
      APPEARANCE_PREVIEW_EVENT,
      normalizeAppearance(appearance)
    );
  } catch (error) {
    console.error('Failed to preview appearance settings:', error);
  }
}

function scheduleAppearancePreview() {
  if (previewTimeoutId !== null) {
    window.clearTimeout(previewTimeoutId);
  }

  previewTimeoutId = window.setTimeout(() => {
    previewTimeoutId = null;
    void emitAppearancePreview(pendingAppearance);
  }, 30);
}

function readAppearanceControls() {
  pendingAppearance = normalizeAppearance({
    windowTransparency: windowTransparencyInput.value,
    displayBrightness: displayBrightnessInput.value
  });

  updateAppearanceControls();
  updateApplyButton();
  scheduleAppearancePreview();
}

function restoreAppearanceDefault(property, value) {
  pendingAppearance = normalizeAppearance({
    ...pendingAppearance,
    [property]: value
  });

  updateAppearanceControls();
  updateApplyButton();
  scheduleAppearancePreview();
}

async function applyPendingSettings() {
  if (!await applyRegionalSettings()) {
    updateApplyButton();
    return false;
  }

  if (!await applyFontSizeSettings()) {
    updateApplyButton();
    return false;
  }

  if (!await applyAppearanceModeSettings()) {
    updateApplyButton();
    return false;
  }

  if (!await applyAutostartSetting()) {
    updateApplyButton();
    return false;
  }

  setLocale(pendingLocale);
  committedTheme = setTheme(pendingTheme);
  pendingTheme = committedTheme;
  committedGlowEnabled = setGlowEnabled(pendingGlowEnabled);
  pendingGlowEnabled = committedGlowEnabled;
  pendingAppearanceModeSettings = {
    ...committedAppearanceModeSettings
  };

  committedAppearance = saveAppearance(pendingAppearance);
  pendingAppearance = { ...committedAppearance };
  committedBehavior = saveBehavior(pendingBehavior);
  pendingBehavior = { ...committedBehavior };

  if (signalEventId) {
    committedEventDetails = normalizeEventDetails(pendingEventDetails);
    pendingEventDetails = { ...committedEventDetails };

    await emitTo('main', EVENT_DETAILS_EVENT, {
      eventId: signalEventId,
      ...committedEventDetails
    });

    committedSignalSettings = normalizeSignalSettings(
      pendingSignalSettings
    );
    pendingSignalSettings = { ...committedSignalSettings };

    await emitTo('main', SIGNAL_SETTINGS_EVENT, {
      eventId: signalEventId,
      settings: committedSignalSettings
    });

    committedWarningSignalSettings = normalizeWarningSignalSettings(
      pendingWarningSignalSettings
    );
    pendingWarningSignalSettings = {
      ...committedWarningSignalSettings,
      soundThresholdMinutes: [
        ...committedWarningSignalSettings.soundThresholdMinutes
      ],
      informerThresholdMinutes: [
        ...committedWarningSignalSettings.informerThresholdMinutes
      ]
    };

    await emitTo('main', WARNING_SIGNAL_SETTINGS_EVENT, {
      eventId: signalEventId,
      settings: committedWarningSignalSettings
    });
  }

  committedAudioPreferences = saveAudioPreferences(
    pendingAudioPreferences
  );
  pendingAudioPreferences = { ...committedAudioPreferences };
  await signalPreviewPlayer.setOutputDevice(
    committedAudioPreferences.outputDeviceId
  );

  await emitTo(
    'main',
    AUDIO_PREFERENCES_EVENT,
    committedAudioPreferences
  );

  await emitAppearancePreview(committedAppearance);

  populateLanguageSelect();
  populateThemeSelect();
  populateFontSizeSelect();
  updateVisualControls();
  updateAppearanceControls();
  updateBehaviorControls();
  updateEventDetailsControls();
  updateSignalControls();
  updateAudioControls();
  updateApplyButton();
  await updateInterface();
  return true;
}

async function closeSettings() {
  if (isClosing) {
    return;
  }

  isClosing = true;
  signalPreviewService.cancelAll();
  await settingsWindow.destroy();
}

async function cancelPendingSettings() {
  if (previewTimeoutId !== null) {
    window.clearTimeout(previewTimeoutId);
    previewTimeoutId = null;
  }

  pendingTheme = committedTheme;
  pendingGlowEnabled = committedGlowEnabled;
  pendingFontSizeSettings = { ...committedFontSizeSettings };
  applyTheme(committedTheme);
  applyGlow(committedGlowEnabled);
  applyAppearanceMode(committedAppearanceModeSettings.mode);
  applyFontSize(committedFontSizeSettings.fontSize);
  await emitVisualPreview();
  await emitAppearancePreview(committedAppearance);
  await closeSettings();
}

languageSelect.addEventListener('change', () => {
  pendingLocale = languageSelect.value;
  updateRegionalPreview();
  updateApplyButton();
});

timeFormatSelect.addEventListener('change', readRegionalControls);
dateFormatSelect.addEventListener('change', readRegionalControls);
firstDayOfWeekSelect.addEventListener('change', readRegionalControls);

themeSelect.addEventListener('change', () => {
  pendingTheme = themeSelect.value;
  updateApplyButton();
  void emitVisualPreview();
});

appearanceModeSelect.addEventListener('change', () => {
  pendingAppearanceModeSettings = {
    mode: appearanceModeSelect.value
  };
  applyAppearanceMode(pendingAppearanceModeSettings.mode);
  updateApplyButton();
});

glowEnabledInput.addEventListener('change', () => {
  pendingGlowEnabled = glowEnabledInput.checked;
  updateApplyButton();
  void emitVisualPreview();
});

fontSizeSelect.addEventListener('change', () => {
  pendingFontSizeSettings = {
    fontSize: applyFontSize(fontSizeSelect.value)
  };
  updateApplyButton();
});

windowTransparencyInput.addEventListener(
  'input',
  readAppearanceControls
);

displayBrightnessInput.addEventListener(
  'input',
  readAppearanceControls
);

windowTransparencyDefaultButton.addEventListener('click', () => {
  restoreAppearanceDefault(
    'windowTransparency',
    DEFAULT_WINDOW_TRANSPARENCY
  );
});

displayBrightnessDefaultButton.addEventListener('click', () => {
  restoreAppearanceDefault(
    'displayBrightness',
    DEFAULT_DISPLAY_BRIGHTNESS
  );
});

confirmCloseActiveInput.addEventListener('change', () => {
  pendingBehavior = normalizeBehavior({
    ...pendingBehavior,
    confirmCloseWithActiveTimers: confirmCloseActiveInput.checked
  });
  updateApplyButton();
});

pulseTrayOverdueInput.addEventListener('change', () => {
  pendingBehavior = normalizeBehavior({
    ...pendingBehavior,
    pulseTrayIconOnOverdue: pulseTrayOverdueInput.checked
  });
  updateApplyButton();
});

autostartEnabledInput.addEventListener('change', () => {
  pendingAutostartEnabled = autostartEnabledInput.checked;
  setAutostartStatus();
  updateApplyButton();
});

closeButtonActionSelect.addEventListener('change', () => {
  pendingBehavior = normalizeBehavior({
    ...pendingBehavior,
    closeButtonAction: closeButtonActionSelect.value
  });
  updateApplyButton();
});

startupTimerActionSelect.addEventListener('change', () => {
  pendingBehavior = normalizeBehavior({
    ...pendingBehavior,
    startupTimerAction: startupTimerActionSelect.value
  });
  updateApplyButton();
});

signalSourceSelect.addEventListener('change', readSignalControls);
playEndSignalInput.addEventListener('change', readSignalControls);
showEndInformerInput.addEventListener('change', readSignalControls);
windowsSoundSelect.addEventListener('change', readSignalControls);
chooseCustomSoundButton.addEventListener('click', () => {
  void chooseCustomSound();
});
signalRepeatCountInput.addEventListener('change', readSignalControls);
signalRepeatIntervalInput.addEventListener('change', readSignalControls);

[
  signalRepeatCountInput,
  signalRepeatIntervalInput
].forEach((input) => {
  input.addEventListener('wheel', (event) => {
    if (document.activeElement !== input || event.deltaY === 0) {
      return;
    }

    event.preventDefault();
    adjustSignalNumberInput(input, event.deltaY > 0 ? 1 : -1);
  }, { passive: false });
});

allowConcurrentSignalsInput.addEventListener('change', () => {
  pendingAudioPreferences = normalizeAudioPreferences({
    ...pendingAudioPreferences,
    allowConcurrentSignals: allowConcurrentSignalsInput.checked
  });
  updateApplyButton();
});

audioOutputDeviceSelect.addEventListener('change', () => {
  const selectedDeviceId = audioOutputDeviceSelect.value;
  const selectedDevice = audioOutputDevices.find(
    ({ id }) => id === selectedDeviceId
  );

  void selectPendingAudioOutputDevice(
    selectedDeviceId,
    selectedDevice?.label
      ?? pendingAudioPreferences.outputDeviceLabel
  );
});

[
  ...warningSoundInputs,
  ...warningInformerInputs
].forEach((input) => {
  input.addEventListener('change', readWarningSignalControls);
});

timerNameInput.addEventListener('input', readEventDetailsControls);
timerDescriptionInput.addEventListener('input', readEventDetailsControls);

signalPreviewButton.addEventListener('click', () => {
  if (signalPreviewService.isActive(signalPreviewId)) {
    stopSignalPreview();
    return;
  }

  readSignalControls();
  signalPreviewService.start(
    signalPreviewId,
    createSignalPreviewSettings(pendingSignalSettings)
  );
  const previewIsActive = signalPreviewService.isActive(signalPreviewId);

  signalPreviewButton.dataset.playing = String(previewIsActive);
  signalPreviewButton.textContent = previewIsActive
    ? t('settings.stopPreview')
    : t('settings.previewSignal');
});

okButton.addEventListener('click', async () => {
  if (await applyPendingSettings()) {
    await closeSettings();
  }
});

cancelButton.addEventListener('click', async () => {
  await cancelPendingSettings();
});

applyButton.addEventListener('click', async () => {
  await applyPendingSettings();
});

await settingsWindow.onCloseRequested((event) => {
  event.preventDefault();
  void cancelPendingSettings();
});

window.addEventListener('storage', async (event) => {
  if (!event.newValue) {
    return;
  }

  if (event.key === 'bsl-timer.locale') {
    setLocale(event.newValue);
    pendingLocale = event.newValue;

    populateLanguageSelect();
    populateThemeSelect();
    updateApplyButton();
    await updateInterface();
  }

  if (event.key === THEME_STORAGE_KEY) {
    committedTheme = applyTheme(event.newValue);
    pendingTheme = committedTheme;
    populateThemeSelect();
    updateApplyButton();
  }

  if (event.key === GLOW_STORAGE_KEY) {
    committedGlowEnabled = applyGlow(event.newValue);
    pendingGlowEnabled = committedGlowEnabled;
    updateVisualControls();
    updateApplyButton();
  }

  if (event.key === APPEARANCE_MODE_STORAGE_KEY) {
    committedAppearanceModeSettings = {
      mode: applyAppearanceMode(event.newValue).mode
    };
    pendingAppearanceModeSettings = {
      ...committedAppearanceModeSettings
    };
    populateAppearanceModeSelect();
    updateApplyButton();
  }

  if (event.key === FONT_SIZE_STORAGE_KEY) {
    committedFontSizeSettings = {
      fontSize: applyFontSize(event.newValue)
    };
    pendingFontSizeSettings = { ...committedFontSizeSettings };
    populateFontSizeSelect();
    updateApplyButton();
  }

  if (event.key === APPEARANCE_STORAGE_KEY) {
    committedAppearance = getAppearance();
    pendingAppearance = { ...committedAppearance };

    updateAppearanceControls();
    updateApplyButton();
  }

  if (event.key === BEHAVIOR_STORAGE_KEY) {
    committedBehavior = getBehavior();
    pendingBehavior = { ...committedBehavior };

    updateBehaviorControls();
    updateApplyButton();
  }

  if (event.key === AUDIO_PREFERENCES_STORAGE_KEY) {
    committedAudioPreferences = getAudioPreferences();
    pendingAudioPreferences = { ...committedAudioPreferences };

    await signalPreviewPlayer.setOutputDevice(
      committedAudioPreferences.outputDeviceId
    );
    updateSignalControls();
    updateAudioControls();
    updateApplyButton();
  }
});

navigator.mediaDevices?.addEventListener?.('devicechange', () => {
  void loadAudioOutputDevices();
});

applyTheme();
applyGlow();
applyAppearanceMode();
watchAppearanceMode();
applyFontSize();
populateLanguageSelect();
populateThemeSelect();
await loadSharedRegionalSettings();
await loadSharedAppearanceModeSettings();
await loadSharedFontSizeSettings();
await loadWindowsSounds();
await loadAudioOutputDevices();
updateVisualControls();
updateAppearanceControls();
updateBehaviorControls();
updateSignalControls();
updateAudioControls();
updateApplyButton();
await updateInterface();
await loadAutostartState();
await prepareAuxiliaryWindow(
  settingsWindow,
  SETTINGS_WINDOW_MARGIN
);
