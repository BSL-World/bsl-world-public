import { emitTo } from '@tauri-apps/api/event';
import {
  availableMonitors,
  getCurrentWindow,
  PhysicalPosition
} from '@tauri-apps/api/window';

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
  appearanceEquals,
  getAppearance,
  normalizeAppearance,
  saveAppearance
} from './appearance.js';

const settingsWindow = getCurrentWindow();
const SETTINGS_POSITION_STORAGE_KEY =
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
let previewTimeoutId = null;
let isClosing = false;

function loadSettingsWindowPosition() {
  try {
    const savedPosition = JSON.parse(
      localStorage.getItem(SETTINGS_POSITION_STORAGE_KEY)
    );

    if (
      Number.isFinite(savedPosition?.x)
      && Number.isFinite(savedPosition?.y)
    ) {
      return savedPosition;
    }
  } catch (error) {
    console.error(
      'Failed to load the settings window position:',
      error
    );
  }

  return null;
}

function savePosition(position) {
  localStorage.setItem(
    SETTINGS_POSITION_STORAGE_KEY,
    JSON.stringify({
      x: Math.round(position.x),
      y: Math.round(position.y)
    })
  );
}

async function saveSettingsWindowPosition() {
  try {
    savePosition(await settingsWindow.outerPosition());
  } catch (error) {
    console.error(
      'Failed to save the settings window position:',
      error
    );
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function distanceToWorkArea(position, workArea) {
  const left = workArea.position.x;
  const top = workArea.position.y;
  const right = left + workArea.size.width;
  const bottom = top + workArea.size.height;
  const nearestX = clamp(position.x, left, right);
  const nearestY = clamp(position.y, top, bottom);
  const distanceX = position.x - nearestX;
  const distanceY = position.y - nearestY;

  return (distanceX ** 2) + (distanceY ** 2);
}

function findNearestMonitor(position, monitors) {
  return monitors.reduce((nearestMonitor, monitor) => {
    if (!nearestMonitor) {
      return monitor;
    }

    const nearestDistance = distanceToWorkArea(
      position,
      nearestMonitor.workArea
    );
    const candidateDistance = distanceToWorkArea(
      position,
      monitor.workArea
    );

    return candidateDistance < nearestDistance
      ? monitor
      : nearestMonitor;
  }, null);
}

async function prepareSettingsWindow() {
  try {
    const fallbackPosition = await settingsWindow.outerPosition();
    const windowSize = await settingsWindow.outerSize();
    const savedPosition = loadSettingsWindowPosition();
    const requestedPosition = savedPosition ?? fallbackPosition;
    const monitor = findNearestMonitor(
      requestedPosition,
      await availableMonitors()
    );

    if (monitor) {
      const margin = Math.round(
        SETTINGS_WINDOW_MARGIN * monitor.scaleFactor
      );
      const workArea = monitor.workArea;
      const minimumX = workArea.position.x + margin;
      const minimumY = workArea.position.y + margin;
      const maximumX = Math.max(
        minimumX,
        workArea.position.x
          + workArea.size.width
          - windowSize.width
          - margin
      );
      const maximumY = Math.max(
        minimumY,
        workArea.position.y
          + workArea.size.height
          - windowSize.height
          - margin
      );
      const safePosition = new PhysicalPosition(
        clamp(requestedPosition.x, minimumX, maximumX),
        clamp(requestedPosition.y, minimumY, maximumY)
      );

      await settingsWindow.setPosition(safePosition);
      savePosition(safePosition);
    }
  } catch (error) {
    console.error(
      'Failed to restore the settings window position:',
      error
    );
  } finally {
    await settingsWindow.show();
    await settingsWindow.setFocus();
  }
}

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

function updateApplyButton() {
  applyButton.disabled =
    pendingLocale === getLocale()
    && pendingTheme === getTheme()
    && appearanceEquals(
      pendingAppearance,
      committedAppearance
    );
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

async function applyPendingSettings() {
  setLocale(pendingLocale);
  setTheme(pendingTheme);

  committedAppearance = saveAppearance(pendingAppearance);
  pendingAppearance = { ...committedAppearance };

  await emitAppearancePreview(committedAppearance);

  populateLanguageSelect();
  populateThemeSelect();
  updateAppearanceControls();
  updateApplyButton();
  await updateInterface();
}

async function closeSettings() {
  if (isClosing) {
    return;
  }

  isClosing = true;
  await saveSettingsWindowPosition();
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
});

applyTheme();
populateLanguageSelect();
populateThemeSelect();
updateAppearanceControls();
updateApplyButton();
await updateInterface();
await prepareSettingsWindow();
