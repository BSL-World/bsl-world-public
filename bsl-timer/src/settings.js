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
  applyTheme,
  getSupportedThemes,
  getTheme,
  setTheme,
  THEME_STORAGE_KEY
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

const startupTimerActionSelect =
  document.getElementById('startup-timer-action-select');

const okButton =
  document.getElementById('ok-settings-btn');

const cancelButton =
  document.getElementById('cancel-settings-btn');

const applyButton =
  document.getElementById('apply-settings-btn');

let pendingLocale = getLocale();
let pendingTheme = getTheme();
let committedAppearance = getAppearance();
let pendingAppearance = { ...committedAppearance };
let committedBehavior = getBehavior();
let pendingBehavior = { ...committedBehavior };
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
  confirmCloseActiveInput.checked =
    pendingBehavior.confirmCloseWithActiveTimers;
  startupTimerActionSelect.value =
    pendingBehavior.startupTimerAction;
}

function updateApplyButton() {
  applyButton.disabled =
    pendingLocale === getLocale()
    && pendingTheme === getTheme()
    && appearanceEquals(
      pendingAppearance,
      committedAppearance
    )
    && behaviorEquals(pendingBehavior, committedBehavior);
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
  setLocale(pendingLocale);
  setTheme(pendingTheme);

  committedAppearance = saveAppearance(pendingAppearance);
  pendingAppearance = { ...committedAppearance };
  committedBehavior = saveBehavior(pendingBehavior);
  pendingBehavior = { ...committedBehavior };

  await emitAppearancePreview(committedAppearance);

  populateLanguageSelect();
  populateThemeSelect();
  updateAppearanceControls();
  updateBehaviorControls();
  updateApplyButton();
  await updateInterface();
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

startupTimerActionSelect.addEventListener('change', () => {
  pendingBehavior = normalizeBehavior({
    ...pendingBehavior,
    startupTimerAction: startupTimerActionSelect.value
  });
  updateApplyButton();
});

okButton.addEventListener('click', async () => {
  await applyPendingSettings();
  await closeSettings();
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
    pendingTheme = applyTheme(event.newValue);
    populateThemeSelect();
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
populateLanguageSelect();
populateThemeSelect();
updateAppearanceControls();
updateBehaviorControls();
updateApplyButton();
await updateInterface();
await migrateLegacyWindowPosition(
  settingsWindow,
  LEGACY_SETTINGS_POSITION_STORAGE_KEY
);
await prepareAuxiliaryWindow(
  settingsWindow,
  SETTINGS_WINDOW_MARGIN
);
