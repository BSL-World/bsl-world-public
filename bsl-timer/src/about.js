import { invoke } from '@tauri-apps/api/core';
import { emitTo } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { openUrl } from '@tauri-apps/plugin-opener';

import {
  applyTranslations,
  setLocale,
  t
} from './i18n.js';
import { getEdition } from './edition.js';
import {
  GLOW_STORAGE_KEY,
  THEME_STORAGE_KEY,
  applyGlow,
  applyTheme
} from './theme.js';
import { prepareAuxiliaryWindow } from './window-position.js';
import { WHATS_NEW_REQUEST_EVENT } from './whats-new.js';

const appWindow = getCurrentWindow();
const okButton = document.getElementById('about-ok-btn');
const versionElement = document.getElementById('about-version');
const editionElement = document.getElementById('about-edition');
const whatsNewButton = document.getElementById('about-whats-new-btn');
const links = Array.from(
  document.querySelectorAll('.about-link[data-url]')
);

async function closeAboutWindow() {
  await appWindow.destroy();
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

whatsNewButton.addEventListener('click', async () => {
  try {
    await emitTo('main', WHATS_NEW_REQUEST_EVENT);
    await closeAboutWindow();
  } catch (error) {
    console.error('Failed to open What’s New:', error);
  }
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
  if (event.key === THEME_STORAGE_KEY && event.newValue) {
    applyTheme(event.newValue);
  }

  if (event.key === GLOW_STORAGE_KEY && event.newValue) {
    applyGlow(event.newValue);
  }

  if (event.key === 'bsl-timer.locale' && event.newValue) {
    setLocale(event.newValue);
    void appWindow.setTitle(t('about.windowTitle'));
  }
});

applyTheme();
applyGlow();
await prepareAuxiliaryWindow(appWindow);
okButton.focus();
