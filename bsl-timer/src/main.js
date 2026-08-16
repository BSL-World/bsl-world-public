import '@fontsource/dseg7-classic/700.css';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

import {
  applyTranslations,
  setLocale,
  t
} from './i18n.js';

import {
  TimerEngine,
  TimerState,
  durationToMilliseconds,
  millisecondsToClock
} from './timer.js';

import { SignalPlayer } from './signal.js';
import { getEdition } from './edition.js';
import {
  applyTheme,
  THEME_STORAGE_KEY
} from './theme.js';

const appWindow = getCurrentWindow();
const signalPlayer = new SignalPlayer();

const timerPanel = document.querySelector('.timer-panel');
const timerStatus = document.getElementById('timer-status');
const timerDisplay = document.getElementById('timer-display');
const validationMessage =
  document.getElementById('validation-message');

const hoursInput = document.getElementById('hours-input');
const minutesInput = document.getElementById('minutes-input');
const secondsInput = document.getElementById('seconds-input');

const startButton = document.getElementById('start-btn');
const pauseButton = document.getElementById('pause-btn');
const stopButton = document.getElementById('stop-btn');
const restartButton = document.getElementById('restart-btn');

const alwaysOnTopButton =
  document.getElementById('always-on-top-btn');

let isAlwaysOnTop = false;

const timer = new TimerEngine({
  onUpdate: renderTimer,
  onExpire: () => {
    void signalPlayer.playDefault();
  }
});

function readDuration() {
  return durationToMilliseconds({
    hours: hoursInput.value,
    minutes: minutesInput.value,
    seconds: secondsInput.value
  });
}

function normalizeDurationInputs(durationMs) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  hoursInput.value = String(hours);
  minutesInput.value = String(minutes);
  secondsInput.value = String(seconds);
}

function updateDurationFromInputs() {
  if (timer.getSnapshot().state !== TimerState.IDLE) {
    return;
  }

  validationMessage.hidden = true;
  timer.setDuration(readDuration());
}

function prepareSignal() {
  void signalPlayer.prepare().catch((error) => {
    console.error('Failed to prepare timer signal:', error);
  });
}

function startTimer() {
  if (timer.getSnapshot().state !== TimerState.IDLE) {
    return;
  }

  const durationMs = readDuration();

  if (durationMs <= 0) {
    validationMessage.hidden = false;
    return;
  }

  validationMessage.hidden = true;
  normalizeDurationInputs(durationMs);
  timer.setDuration(durationMs);

  prepareSignal();
  timer.start();
}

function renderTimer(snapshot) {
  const isOverdue = snapshot.state === TimerState.OVERDUE;
  const isIdle = snapshot.state === TimerState.IDLE;
  const isPaused = snapshot.state === TimerState.PAUSED;

  timerPanel.classList.toggle('is-overdue', isOverdue);
  timerStatus.hidden = !isOverdue;

  timerDisplay.textContent = isOverdue
    ? millisecondsToClock(snapshot.overdueMs)
    : millisecondsToClock(snapshot.remainingMs, true);

  hoursInput.disabled = !isIdle;
  minutesInput.disabled = !isIdle;
  secondsInput.disabled = !isIdle;

  startButton.hidden = !isIdle;
  pauseButton.hidden = isIdle || isOverdue;
  stopButton.hidden = isIdle;
  restartButton.hidden = isIdle;

  pauseButton.textContent = isPaused
    ? t('timer.resume')
    : t('timer.pause');
}

function refreshLocalizedContent() {
  applyTranslations();
  document.title = t('app.title');
  renderTimer(timer.getSnapshot());
}

[
  hoursInput,
  minutesInput,
  secondsInput
].forEach((input) => {
  input.addEventListener('input', updateDurationFromInputs);

  input.addEventListener('change', () => {
    if (timer.getSnapshot().state !== TimerState.IDLE) {
      return;
    }

    const durationMs = readDuration();
    normalizeDurationInputs(durationMs);
    timer.setDuration(durationMs);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      startTimer();
    }
  });
});

startButton.addEventListener('click', startTimer);

pauseButton.addEventListener('click', () => {
  const { state } = timer.getSnapshot();

  if (state === TimerState.RUNNING) {
    timer.pause();
    return;
  }

  if (state === TimerState.PAUSED) {
    timer.resume();
  }
});

stopButton.addEventListener('click', () => {
  signalPlayer.stop();
  timer.reset();
});

restartButton.addEventListener('click', () => {
  signalPlayer.stop();
  timer.reset();

  prepareSignal();
  timer.start();
});

alwaysOnTopButton.addEventListener('click', async () => {
  const nextState = !isAlwaysOnTop;

  try {
    await appWindow.setAlwaysOnTop(nextState);
    isAlwaysOnTop = nextState;

    alwaysOnTopButton.setAttribute(
      'aria-pressed',
      String(isAlwaysOnTop)
    );
  } catch (error) {
    console.error('Failed to change always-on-top state:', error);
  }
});

document
  .getElementById('settings-btn')
  .addEventListener('click', async () => {
    try {
      await invoke('open_settings_window');
    } catch (error) {
      console.error('Failed to open settings window:', error);
    }
  });

document
  .getElementById('minimize-btn')
  .addEventListener('click', async () => {
    await appWindow.minimize();
  });

document
  .getElementById('close-btn')
  .addEventListener('click', async () => {
    timer.destroy();
    signalPlayer.stop();
    await appWindow.close();
  });

window.addEventListener(
  'bsl-timer:locale-changed',
  refreshLocalizedContent
);

window.addEventListener('storage', (event) => {
  if (
    event.key === 'bsl-timer.locale'
    && event.newValue
  ) {
    setLocale(event.newValue);
  }

  if (
    event.key === THEME_STORAGE_KEY
    && event.newValue
  ) {
    applyTheme(event.newValue);
  }
});

document.documentElement.dataset.edition = getEdition();

applyTheme();
refreshLocalizedContent();
timer.setDuration(readDuration());
