import { getCurrentWindow } from '@tauri-apps/api/window';
import { fitScaledWindow } from './scaled-window.js';
import { emitTo, listen } from '@tauri-apps/api/event';
import { informerDiagnostic, installInformerErrorDiagnostics } from './informer-diagnostics.js';

import {
  applyTranslations,
  getLocale,
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

installInformerErrorDiagnostics();
informerDiagnostic('preview-loaded');

const informerWindow = getCurrentWindow();
const card = document.getElementById('tray-preview-card');
const name = document.getElementById('tray-preview-name');
const status = document.getElementById('tray-preview-status');
const description = document.getElementById('tray-preview-description');
const time = document.getElementById('tray-preview-time');
const summary = document.getElementById('tray-preview-summary');

card.addEventListener('click', () => {
  if (currentData.eventId) {
    void emitTo('main', 'tray-informer-activate', { eventId: currentData.eventId });
  }
});

let lastLayoutKey = null;
let informerFit = Promise.resolve();
let fitSequence = 0;
let pendingFitCount = 0;

function diagnosticSnapshot() {
  const style = getComputedStyle(card);
  const bounds = card.getBoundingClientRect();
  return {
    classes: card.className, opacity: style.opacity, visibility: style.visibility,
    display: style.display, documentVisibility: document.visibilityState,
    viewport: [window.innerWidth, window.innerHeight],
    cardSize: [bounds.width, bounds.height], pendingFitCount,
    mode: currentData.mode, state: currentData.state
  };
}

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
  // Seconds are text updates, never a reason to alter the card or window.
  time.textContent = currentData.time;
  const { time: ignoredTime, themeId, glowEnabled, layoutRequestId, ...layoutData } = currentData;
  const layoutKey = JSON.stringify([getLocale(), layoutData]);
  if (layoutKey === lastLayoutKey) return;
  lastLayoutKey = layoutKey;
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
  informerFit = fitInformer();
}

await listen('tray-preview-data', async (event) => {
  if (currentData.layoutRequestId && !event.payload.layoutRequestId && !event.payload.hoverPreview) return;
  currentData = event.payload;
  applyTheme(currentData.themeId);
  applyGlow(currentData.glowEnabled);
  render();
  if (Number.isFinite(event.payload.layoutRequestId)) {
    informerDiagnostic('preview-data-request', { requestId: event.payload.layoutRequestId, ...diagnosticSnapshot() });
    if (await informerFit === false) return;
    informerDiagnostic('preview-ready-sending', { requestId: event.payload.layoutRequestId, ...diagnosticSnapshot() });
    await emitTo('main', 'tray-preview-ready', event.payload.layoutRequestId);
  }
});

await listen('tray-preview-show', async () => {
  informerDiagnostic('preview-show-received', diagnosticSnapshot());
  await informerFit;
  informerDiagnostic('preview-show-fit-resolved', diagnosticSnapshot());
  card.classList.remove('is-hiding');
  informerDiagnostic('preview-show-class-removed', diagnosticSnapshot());
});

await listen('tray-preview-hide', () => {
  informerDiagnostic('preview-hide-received', diagnosticSnapshot());
  card.classList.add('is-hiding');
  informerDiagnostic('preview-hide-class-added', diagnosticSnapshot());
});

document.addEventListener('visibilitychange', () => {
  informerDiagnostic('preview-document-visibility', diagnosticSnapshot());
});
card.addEventListener('transitionend', event => {
  if (event.target === card && event.propertyName === 'opacity') {
    informerDiagnostic('preview-opacity-transition-end', diagnosticSnapshot());
  }
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

async function fitInformer() {
  const fitId = ++fitSequence;
  pendingFitCount += 1;
  informerDiagnostic('preview-fit-start', { fitId, ...diagnosticSnapshot() });
  try {
    await fitScaledWindow(informerWindow, { width: 340, page: card, requireAllContent: true,
      onDiagnostic: (stage, details) => informerDiagnostic('preview-fit-stage', { fitId, stage, ...details }) });
    informerDiagnostic('preview-fit-success', { fitId, ...diagnosticSnapshot() });
    return true;
  } catch (error) {
    informerDiagnostic('preview-fit-failed', { fitId, error: String(error?.message ?? error), ...diagnosticSnapshot() });
    console.error('Failed to resize the informer:', error);
    return false;
  } finally {
    pendingFitCount -= 1;
  }
}
window.addEventListener('bsl-world:font-size-applied', () => { informerFit = fitInformer(); });
await informerFit;
