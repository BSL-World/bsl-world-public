import { listen } from '@tauri-apps/api/event';

import {
  applyTranslations,
  setLocale,
  t
} from './i18n.js';
import {
  applyTheme,
  THEME_STORAGE_KEY
} from './theme.js';

const card = document.getElementById('tray-preview-card');
const name = document.getElementById('tray-preview-name');
const status = document.getElementById('tray-preview-status');
const time = document.getElementById('tray-preview-time');
const summary = document.getElementById('tray-preview-summary');

let currentData = {
  name: 'BSL-Timer',
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
    otherActiveCount,
    otherOverdueCount,
    state
  } = currentData;
  const details = [];

  card.dataset.state = state;
  name.textContent = currentData.name;
  status.textContent = t(`trayPreview.${state}`);
  time.textContent = currentData.time;

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
});

applyTheme();
applyTranslations();
render();
