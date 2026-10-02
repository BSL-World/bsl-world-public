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
import { getEventDisplayName } from './event-instance.js';
import { SessionStore } from './session-store.js';
import {
  SIGNAL_SETTINGS_EVENT,
  SignalSource,
  createSignalPreviewSettings,
  normalizeSignalSettings,
  signalSettingsEqual
} from './signal-settings.js';
import {
  prepareAuxiliaryWindow
} from './window-position.js';

const settingsWindow = getCurrentWindow();
const SETTINGS_WINDOW_MARGIN = 30;

const languageSelect =
  document.getElementById('language-select');

const themeSelect =
  document.getElementById('theme-select');

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

const signalTimerName =
  document.getElementById('signal-timer-name');

const signalSourceSelect =
  document.getElementById('signal-source-select');

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

const okButton =
  document.getElementById('ok-settings-btn');

const cancelButton =
  document.getElementById('cancel-settings-btn');

const applyButton =
  document.getElementById('apply-settings-btn');

let pendingLocale = getLocale();
let committedTheme = getTheme();
let pendingTheme = committedTheme;
let committedGlowEnabled = getGlowEnabled();
let pendingGlowEnabled = committedGlowEnabled;
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
let committedSignalSettings = normalizeSignalSettings(
  signalEvent?.settings?.endSignal
);
let pendingSignalSettings = { ...committedSignalSettings };
let committedAudioPreferences = getAudioPreferences();
let pendingAudioPreferences = { ...committedAudioPreferences };
let windowsSounds = [];
const signalPreviewId = 'settings-preview';
const signalPreviewService = new EndSignalService({
  player: new SignalPlayer({
    onFileError: () => {
      setSignalSourceStatus('settings.signalFileUnavailable');
    }
  }),
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

function updateSignalControls() {
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
  allowConcurrentSignalsInput.checked =
    pendingAudioPreferences.allowConcurrentSignals;
}

function readSignalControls() {
  pendingSignalSettings = normalizeSignalSettings({
    ...pendingSignalSettings,
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
    && pendingTheme === getTheme()
    && pendingGlowEnabled === getGlowEnabled()
    && appearanceEquals(
      pendingAppearance,
      committedAppearance
    )
    && behaviorEquals(pendingBehavior, committedBehavior)
    && signalSettingsEqual(
      pendingSignalSettings,
      committedSignalSettings
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
  populateWindowsSounds();
  updateSignalControls();
  signalTimerName.textContent = getEventDisplayName(
    signalEvent,
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
  if (!await applyAutostartSetting()) {
    updateApplyButton();
    return false;
  }

  setLocale(pendingLocale);
  committedTheme = setTheme(pendingTheme);
  pendingTheme = committedTheme;
  committedGlowEnabled = setGlowEnabled(pendingGlowEnabled);
  pendingGlowEnabled = committedGlowEnabled;

  committedAppearance = saveAppearance(pendingAppearance);
  pendingAppearance = { ...committedAppearance };
  committedBehavior = saveBehavior(pendingBehavior);
  pendingBehavior = { ...committedBehavior };

  if (signalEventId) {
    committedSignalSettings = normalizeSignalSettings(
      pendingSignalSettings
    );
    pendingSignalSettings = { ...committedSignalSettings };

    await emitTo('main', SIGNAL_SETTINGS_EVENT, {
      eventId: signalEventId,
      settings: committedSignalSettings
    });
  }

  committedAudioPreferences = saveAudioPreferences(
    pendingAudioPreferences
  );
  pendingAudioPreferences = { ...committedAudioPreferences };

  await emitTo(
    'main',
    AUDIO_PREFERENCES_EVENT,
    committedAudioPreferences
  );

  await emitAppearancePreview(committedAppearance);

  populateLanguageSelect();
  populateThemeSelect();
  updateVisualControls();
  updateAppearanceControls();
  updateBehaviorControls();
  updateSignalControls();
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
  applyTheme(committedTheme);
  applyGlow(committedGlowEnabled);
  await emitVisualPreview();
  await emitAppearancePreview(committedAppearance);
  await closeSettings();
}

languageSelect.addEventListener('change', () => {
  pendingLocale = languageSelect.value;
  updateApplyButton();
});

themeSelect.addEventListener('change', () => {
  pendingTheme = themeSelect.value;
  updateApplyButton();
  void emitVisualPreview();
});

glowEnabledInput.addEventListener('change', () => {
  pendingGlowEnabled = glowEnabledInput.checked;
  updateApplyButton();
  void emitVisualPreview();
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

    updateSignalControls();
    updateApplyButton();
  }
});

applyTheme();
applyGlow();
populateLanguageSelect();
populateThemeSelect();
await loadWindowsSounds();
updateVisualControls();
updateAppearanceControls();
updateBehaviorControls();
updateSignalControls();
updateApplyButton();
await updateInterface();
await loadAutostartState();
await prepareAuxiliaryWindow(
  settingsWindow,
  SETTINGS_WINDOW_MARGIN
);
