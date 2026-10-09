import { LogicalSize } from '@tauri-apps/api/dpi';
import {
  currentMonitor,
  getCurrentWindow
} from '@tauri-apps/api/window';

import {
  applyTranslations,
  setLocale,
  t
} from './i18n.js';
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
  WHATS_NEW_VERSION,
  allowWhatsNewAgain,
  dismissWhatsNew,
  shouldShowWhatsNew
} from './whats-new.js';
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
const title = document.getElementById('whats-new-title');
const dontShowAgain = document.getElementById(
  'whats-new-dont-show-again'
);
const closeButton = document.getElementById('whats-new-close-btn');
const page = document.querySelector('.whats-new-page');
const takeFocus = new URLSearchParams(window.location.search)
  .get('takeFocus') !== 'false';
let isClosing = false;

const MIN_WINDOW_HEIGHT = 320;
const MAX_WINDOW_HEIGHT = 720;
const WORK_AREA_MARGIN = 96;
const CONTENT_HEIGHT_ALLOWANCE = 64;

function formatTitle() {
  return t('whatsNew.title').replace(
    '{version}',
    WHATS_NEW_VERSION
  );
}

async function updateInterface() {
  applyTranslations();
  title.textContent = formatTitle();
  await appWindow.setTitle(formatTitle());
}

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
    const currentSize = (await appWindow.innerSize()).toLogical(
      scaleFactor
    );
    const contentHeight = Math.ceil(page.scrollHeight)
      + CONTENT_HEIGHT_ALLOWANCE;
    const workAreaHeight = monitor
      ? monitor.workArea.size.toLogical(monitor.scaleFactor).height
      : MAX_WINDOW_HEIGHT + WORK_AREA_MARGIN;
    const maximumHeight = Math.max(
      MIN_WINDOW_HEIGHT,
      Math.min(MAX_WINDOW_HEIGHT, workAreaHeight - WORK_AREA_MARGIN)
    );
    let targetHeight = Math.max(
      MIN_WINDOW_HEIGHT,
      Math.min(contentHeight, maximumHeight)
    );

    document.body.classList.remove('is-measuring');
    await appWindow.setSize(new LogicalSize(
      currentSize.width,
      targetHeight
    ));

    await new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });

    const remainingOverflow = Math.max(
      0,
      document.body.scrollHeight - window.innerHeight
    );

    if (remainingOverflow > 1 && targetHeight < maximumHeight) {
      targetHeight = Math.min(
        maximumHeight,
        targetHeight + remainingOverflow + CONTENT_HEIGHT_ALLOWANCE
      );
      await appWindow.setSize(new LogicalSize(
        currentSize.width,
        targetHeight
      ));
    }

    await keepWindowInsideWorkArea(appWindow);
  } catch (error) {
    console.error('Failed to fit What’s New to its content:', error);
  } finally {
    document.body.classList.remove('is-measuring');
  }
}

async function closeWindow() {
  if (isClosing) {
    return;
  }

  isClosing = true;

  if (dontShowAgain.checked) {
    dismissWhatsNew(WHATS_NEW_VERSION);
  } else {
    allowWhatsNewAgain(WHATS_NEW_VERSION);
  }

  await appWindow.destroy();
}

applyTheme();
applyGlow();
applyAppearanceMode();
watchAppearanceMode();
applyFontSize();
dontShowAgain.checked = !shouldShowWhatsNew(WHATS_NEW_VERSION);
await updateInterface();
await fitWindowToContent();
await prepareAuxiliaryWindow(appWindow, undefined, { takeFocus });
if (takeFocus) {
  closeButton.focus();
}

closeButton.addEventListener('click', () => {
  void closeWindow();
});

await appWindow.onCloseRequested((event) => {
  event.preventDefault();
  void closeWindow();
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    void closeWindow();
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
    void fitWindowToContent();
  }

  if (event.key === APPEARANCE_MODE_STORAGE_KEY && event.newValue) {
    applyAppearanceMode(event.newValue);
  }

  if (event.key === 'bsl-timer.locale' && event.newValue) {
    setLocale(event.newValue);
    await updateInterface();
    await fitWindowToContent();
  }
});
