import { invoke } from '@tauri-apps/api/core';
import { LogicalSize } from '@tauri-apps/api/dpi';
import {
  currentMonitor,
  getCurrentWindow
} from '@tauri-apps/api/window';
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
import {
  keepWindowInsideWorkArea,
  prepareAuxiliaryWindow
} from './window-position.js';
import {
  FONT_SIZE_STORAGE_KEY,
  applyFontSize
} from './font-size-settings.js';
import {
  APPEARANCE_MODE_STORAGE_KEY,
  applyAppearanceMode,
  watchAppearanceMode
} from './appearance-mode-settings.js';

const appWindow = getCurrentWindow();
const okButton = document.getElementById('about-ok-btn');
const versionElement = document.getElementById('about-version');
const editionElement = document.getElementById('about-edition');
const whatsNewButton = document.getElementById('about-whats-new-btn');
const page = document.querySelector('.about-page');
const links = Array.from(
  document.querySelectorAll('.about-link[data-url]')
);

const MIN_WINDOW_HEIGHT = 335;
const MAX_WINDOW_HEIGHT = 640;
const WORK_AREA_MARGIN = 80;
const CONTENT_HEIGHT_ALLOWANCE = 8;

async function fitWindowToContent() {
  try {
    document.body.classList.add('is-measuring');

    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const monitor = await currentMonitor();
    const scaleFactor = monitor?.scaleFactor
      ?? window.devicePixelRatio
      ?? 1;
    const [innerPhysicalSize, outerPhysicalSize] = await Promise.all([
      appWindow.innerSize(),
      appWindow.outerSize()
    ]);
    const currentInnerSize = innerPhysicalSize.toLogical(scaleFactor);
    const currentOuterSize = outerPhysicalSize.toLogical(scaleFactor);
    const windowFrameHeight = Math.max(
      0,
      currentOuterSize.height - currentInnerSize.height
    );
    const fontSizeScale = Number.parseFloat(
      getComputedStyle(document.documentElement)
        .getPropertyValue('--font-size-scale')
    ) || 1;
    const preferredMinimumHeight = Math.ceil(
      MIN_WINDOW_HEIGHT * Math.max(1, fontSizeScale)
    );
    const contentHeight = Math.ceil(page.scrollHeight)
      + windowFrameHeight
      + CONTENT_HEIGHT_ALLOWANCE;
    const workAreaHeight = monitor
      ? monitor.workArea.size.toLogical(monitor.scaleFactor).height
      : MAX_WINDOW_HEIGHT + WORK_AREA_MARGIN;
    const availableHeight = Math.max(
      MIN_WINDOW_HEIGHT,
      workAreaHeight - WORK_AREA_MARGIN
    );
    const minimumHeight = Math.min(
      preferredMinimumHeight,
      availableHeight
    );
    const maximumHeight = Math.max(
      minimumHeight,
      Math.min(MAX_WINDOW_HEIGHT, availableHeight)
    );
    const targetHeight = Math.max(
      minimumHeight,
      Math.min(contentHeight, maximumHeight)
    );

    document.body.classList.remove('is-measuring');
    await appWindow.setSize(new LogicalSize(
      currentOuterSize.width,
      targetHeight
    ));
    await keepWindowInsideWorkArea(appWindow);
  } catch (error) {
    console.error('Failed to fit About to its content:', error);
  } finally {
    document.body.classList.remove('is-measuring');
  }
}

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
    await invoke('open_whats_new_window', { takeFocus: true });
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

window.addEventListener('storage', async (event) => {
  if (event.key === THEME_STORAGE_KEY && event.newValue) {
    applyTheme(event.newValue);
  }

  if (event.key === GLOW_STORAGE_KEY && event.newValue) {
    applyGlow(event.newValue);
  }

  if (event.key === FONT_SIZE_STORAGE_KEY && event.newValue) {
    applyFontSize(event.newValue);
    await fitWindowToContent();
  }

  if (event.key === APPEARANCE_MODE_STORAGE_KEY && event.newValue) {
    applyAppearanceMode(event.newValue);
  }

  if (event.key === 'bsl-timer.locale' && event.newValue) {
    setLocale(event.newValue);
    await appWindow.setTitle(t('about.windowTitle'));
    await fitWindowToContent();
  }
});

applyTheme();
applyGlow();
applyAppearanceMode();
watchAppearanceMode();
applyFontSize();
await fitWindowToContent();
await prepareAuxiliaryWindow(appWindow);
okButton.focus();
