import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';

import {
  applyTranslations,
  setLocale,
  t
} from './i18n.js';
import { getEdition } from './edition.js';
import { prepareAuxiliaryWindow } from './window-position.js';

const themeStorageKey = 'bsl-timer.theme';

const appWindow = getCurrentWindow();
const okButton = document.getElementById('about-ok-btn');
const versionElement = document.getElementById('about-version');
const editionElement = document.getElementById('about-edition');
const links = Array.from(document.querySelectorAll('.about-link'));

async function closeAboutWindow() {
  await appWindow.close();
}

async function openExternalUrl(url) {
  try {
    await openUrl(url);
  } catch (error) {
    console.error('Failed to open the external URL:', error);
  }
}

applyTranslations();
await appWindow.setTitle(t('about.windowTitle'));

try {
  versionElement.textContent = await invoke('get_app_version');
} catch (error) {
  versionElement.textContent = '—';
  console.error('Failed to read the application version:', error);
}

editionElement.textContent = getEdition() === 'pro' ? 'Pro' : 'Free';

links.forEach((link) => {
  link.addEventListener('click', () => {
    void openExternalUrl(link.dataset.url);
  });
});

okButton.addEventListener('click', () => {
  void closeAboutWindow();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    void closeAboutWindow();
  }
});

window.addEventListener('storage', (event) => {
  if (event.key === themeStorageKey && event.newValue) {
    document.documentElement.dataset.theme = event.newValue;
  }

  if (event.key === 'bsl-timer.locale' && event.newValue) {
    setLocale(event.newValue);
    void appWindow.setTitle(t('about.windowTitle'));
  }
});

await prepareAuxiliaryWindow(appWindow);
okButton.focus();
