import { invoke } from '@tauri-apps/api/core';
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

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
import {
  migrateLegacyWindowPosition,
  prepareAuxiliaryWindow
} from './window-position.js';

const settingsWindow = getCurrentWindow();
const LEGACY_SETTINGS_POSITION_STORAGE_KEY =
  'bsl-timer.settings-window-position';
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
    && autostartUnchanged;
}

async function updateInterface() {
  applyTranslations();
  document.title = t('settings.title');

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

  await emitAppearancePreview(committedAppearance);

  populateLanguageSelect();
  populateThemeSelect();
  updateVisualControls();
  updateAppearanceControls();
  updateBehaviorControls();
  updateApplyButton();
  await updateInterface();
  return true;
}

async function closeSettings() {
  if (isClosing) {
    return;
  }

  isClosing = true;
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
});

applyTheme();
applyGlow();
populateLanguageSelect();
populateThemeSelect();
updateVisualControls();
updateAppearanceControls();
updateBehaviorControls();
updateApplyButton();
await updateInterface();
await loadAutostartState();
await migrateLegacyWindowPosition(
  settingsWindow,
  LEGACY_SETTINGS_POSITION_STORAGE_KEY
);
await prepareAuxiliaryWindow(
  settingsWindow,
  SETTINGS_WINDOW_MARGIN
);
