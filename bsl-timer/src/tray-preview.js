import { listen } from '@tauri-apps/api/event';

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
  FONT_SIZE_STORAGE_KEY,
  applyFontSize
} from './font-size-settings.js';
import {
  APPEARANCE_MODE_STORAGE_KEY,
  applyAppearanceMode,
  watchAppearanceMode
} from './appearance-mode-settings.js';

const card = document.getElementById('tray-preview-card');
const name = document.getElementById('tray-preview-name');
const status = document.getElementById('tray-preview-status');
const description = document.getElementById('tray-preview-description');
const time = document.getElementById('tray-preview-time');
const summary = document.getElementById('tray-preview-summary');

let currentData = {
  name: 'BSL-Timer',
  description: '',
  mode: 'timer',
  time: '00:00:00',
  state: 'idle',
  otherActiveCount: 0,
  otherOverdueCount: 0
};

function format(key, values = {}) {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, value),
    t(key)
  );
}

function render() {
  const {
    mode,
    otherActiveCount,
    otherOverdueCount,
    state
  } = currentData;
  const details = [];

  card.dataset.state = state;
  name.textContent = currentData.name;
  status.textContent = t(`trayPreview.${
    mode === 'timer' ? state : mode
  }`);
  description.textContent = currentData.description ?? '';
  description.hidden = !description.textContent;
  time.textContent = currentData.time;

  if (mode === 'warning') {
    details.push(format('trayPreview.warningRemaining', {
      count: currentData.thresholdMinutes
    }));
  }

  if (mode === 'completed') {
    details.push(t('trayPreview.countdownCompleted'));
  }

  if (otherActiveCount > 0) {
    details.push(format('trayPreview.otherActive', {
      count: otherActiveCount
    }));
  }

  if (otherOverdueCount > 0) {
    details.push(format('trayPreview.otherOverdue', {
      count: otherOverdueCount
    }));
  }

  summary.textContent = details.join(' · ');
  summary.hidden = details.length === 0;
}

await listen('tray-preview-data', (event) => {
  currentData = event.payload;
  applyTheme(currentData.themeId);
  applyGlow(currentData.glowEnabled);
  render();
});

await listen('tray-preview-show', () => {
  card.classList.remove('is-hiding');
});

await listen('tray-preview-hide', () => {
  card.classList.add('is-hiding');
});

window.addEventListener('bsl-timer:locale-changed', render);

window.addEventListener('storage', (event) => {
  if (event.key === 'bsl-timer.locale' && event.newValue) {
    setLocale(event.newValue);
  }

  if (event.key === THEME_STORAGE_KEY && event.newValue) {
    applyTheme(event.newValue);
  }

  if (event.key === GLOW_STORAGE_KEY && event.newValue) {
    applyGlow(event.newValue);
  }

  if (event.key === FONT_SIZE_STORAGE_KEY && event.newValue) {
    applyFontSize(event.newValue);
  }

  if (event.key === APPEARANCE_MODE_STORAGE_KEY && event.newValue) {
    applyAppearanceMode(event.newValue);
  }
});

applyTheme();
applyGlow();
applyAppearanceMode();
watchAppearanceMode();
applyFontSize();
applyTranslations();
render();
