import './action-button-layout.js';
import { fitScaledWindow } from './scaled-window.js';
import {
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
    await fitScaledWindow(appWindow, { width: 430, height: 0, page: page, requireAllContent: true });
  } catch (error) {
    console.error('Failed to fit the window:', error);
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

window.addEventListener('bsl-world:font-size-applied', () => { void fitWindowToContent(); });

// Refit when localization, validation or picker contents change height.
new MutationObserver(() => { void fitWindowToContent(); }).observe(
  page, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] }
);
