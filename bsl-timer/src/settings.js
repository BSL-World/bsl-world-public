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

const settingsWindow = getCurrentWindow();

const languageSelect =
  document.getElementById('language-select');

const themeSelect =
  document.getElementById('theme-select');

const okButton =
  document.getElementById('ok-settings-btn');

const cancelButton =
  document.getElementById('cancel-settings-btn');

const applyButton =
  document.getElementById('apply-settings-btn');

let pendingLocale = getLocale();
let pendingTheme = getTheme();

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

function updateApplyButton() {
  applyButton.disabled =
    pendingLocale === getLocale()
    && pendingTheme === getTheme();
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

async function applyPendingSettings() {
  setLocale(pendingLocale);
  setTheme(pendingTheme);
  populateLanguageSelect();
  populateThemeSelect();
  updateApplyButton();
  await updateInterface();
}

languageSelect.addEventListener('change', () => {
  pendingLocale = languageSelect.value;
  updateApplyButton();
});

themeSelect.addEventListener('change', () => {
  pendingTheme = themeSelect.value;
  updateApplyButton();
});

okButton.addEventListener('click', async () => {
  await applyPendingSettings();
  await settingsWindow.close();
});

cancelButton.addEventListener('click', async () => {
  await settingsWindow.close();
});

applyButton.addEventListener('click', async () => {
  await applyPendingSettings();
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
});

applyTheme();
populateLanguageSelect();
populateThemeSelect();
updateApplyButton();
await updateInterface();
