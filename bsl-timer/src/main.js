import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

import {
  applyTranslations,
  setLocale,
  t
} from './i18n.js';

import {
  TimerState,
  durationToMilliseconds,
  millisecondsToClock
} from './timer.js';

import { TimerWorkspace } from './timer-workspace.js';
import { SignalPlayer } from './signal.js';
import {
  canCreateTimer,
  getEdition
} from './edition.js';
import {
  applyTheme,
  THEME_STORAGE_KEY
} from './theme.js';

import {
  APPEARANCE_PREVIEW_EVENT,
  APPEARANCE_STORAGE_KEY,
  applyAppearance,
  getAppearance
} from './appearance.js';

import {
  BEHAVIOR_STORAGE_KEY,
  CloseButtonAction,
  StartupTimerAction,
  getBehavior
} from './behavior.js';
import { prepareWindowPosition } from './window-position.js';

const ALWAYS_ON_TOP_STORAGE_KEY = 'bsl-timer.always-on-top';
const appWindow = getCurrentWindow();
try {
  await prepareWindowPosition(appWindow);
} catch (error) {
  console.error('Failed to keep the main window inside the work area:', error);
}

const signalPlayer = new SignalPlayer();

const timerTabList = document.getElementById('timer-tab-list');
const addTimerButton = document.getElementById('add-timer-btn');
const scrollTabsLeftButton =
  document.getElementById('scroll-tabs-left-btn');
const scrollTabsRightButton =
  document.getElementById('scroll-tabs-right-btn');
const tabNotice = document.getElementById('tab-notice');
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
const timerControls = document.querySelector('.timer-controls');

const confirmationDialogBackdrop =
  document.getElementById('confirmation-dialog-backdrop');
const confirmationDialogTitle =
  document.getElementById('confirmation-dialog-title');
const confirmationDialogMessage =
  document.getElementById('confirmation-dialog-message');
const confirmationDialogXButton =
  document.getElementById('confirmation-dialog-x-btn');
const confirmationSecondaryButton =
  document.getElementById('confirmation-secondary-btn');
const confirmationPrimaryButton =
  document.getElementById('confirmation-primary-btn');

const alwaysOnTopButton =
  document.getElementById('always-on-top-btn');

let isAlwaysOnTop =
  localStorage.getItem(ALWAYS_ON_TOP_STORAGE_KEY) === 'true';
let editingEventId = null;
let noticeTimeoutId = null;
let confirmationResolver = null;
let confirmationConfig = null;
let confirmationPreviousFocus = null;
let isClosingApplication = false;
let trayIconVisualKey = null;
let trayPreviewDataKey = null;

const workspace = new TimerWorkspace({
  onUpdate: (eventId, snapshot) => {
    updateTabState(eventId, snapshot);

    if (eventId === workspace.activeEventId) {
      renderTimer(snapshot);
    }

    void refreshTrayIcon();
    void refreshTrayPreview();
  },
  onExpire: () => {
    workspace.save();
    void signalPlayer.playDefault();
  }
});

try {
  await appWindow.setAlwaysOnTop(isAlwaysOnTop);
  alwaysOnTopButton.setAttribute(
    'aria-pressed',
    String(isAlwaysOnTop)
  );
} catch (error) {
  console.error('Failed to restore always-on-top state:', error);
}

function getActiveTimer() {
  return workspace.getActiveEngine();
}

function parseHexColor(value) {
  const match = /^#([0-9a-f]{6})$/i.exec(value.trim());

  if (!match) {
    return null;
  }

  return [
    Number.parseInt(match[1].slice(0, 2), 16),
    Number.parseInt(match[1].slice(2, 4), 16),
    Number.parseInt(match[1].slice(4, 6), 16)
  ];
}

function hasOverdueTimers() {
  return workspace.getEvents().some((eventInstance) => (
    workspace.getEngine(eventInstance.id)?.getSnapshot().state
      === TimerState.OVERDUE
  ));
}

async function refreshTrayIcon() {
  const style = getComputedStyle(document.documentElement);
  const colorValue = style.getPropertyValue(
    hasOverdueTimers()
      ? '--timer-overdue-color'
      : '--theme-color'
  ).trim();
  const color = parseHexColor(colorValue);
  const overdue = hasOverdueTimers();
  const pulseEnabled = getBehavior().pulseTrayIconOnOverdue;
  const visualKey = `${colorValue}:${overdue}:${pulseEnabled}`;

  if (!color || visualKey === trayIconVisualKey) {
    return;
  }

  trayIconVisualKey = visualKey;

  try {
    await invoke('update_tray_icon', {
      color,
      overdue,
      pulseEnabled
    });
  } catch (error) {
    trayIconVisualKey = null;
    console.error('Failed to update tray icon:', error);
  }
}

function createTrayPreviewData() {
  const activeEvent = workspace.getActiveEvent();
  const activeSnapshot = workspace.getActiveEngine()?.getSnapshot();
  const snapshots = workspace.getEvents().map((eventInstance) => (
    workspace.getEngine(eventInstance.id)?.getSnapshot()
  )).filter(Boolean);
  const activeCount = snapshots.filter(({ state }) => (
    state === TimerState.RUNNING || state === TimerState.PAUSED
  )).length;
  const overdueCount = snapshots.filter(({ state }) => (
    state === TimerState.OVERDUE
  )).length;
  const state = activeSnapshot?.state ?? TimerState.IDLE;
  const otherActiveCount = Math.max(
    0,
    activeCount - (
      state === TimerState.RUNNING || state === TimerState.PAUSED ? 1 : 0
    )
  );
  const otherOverdueCount = Math.max(
    0,
    overdueCount - (state === TimerState.OVERDUE ? 1 : 0)
  );

  return {
    name: activeEvent
      ? workspace.getDisplayName(activeEvent.id, getDefaultTimerName())
      : t('app.title'),
    time: state === TimerState.OVERDUE
      ? millisecondsToClock(activeSnapshot?.overdueMs ?? 0)
      : millisecondsToClock(activeSnapshot?.remainingMs ?? 0, true),
    state,
    otherActiveCount,
    otherOverdueCount
  };
}

async function refreshTrayPreview({ force = false } = {}) {
  const data = createTrayPreviewData();
  const dataKey = JSON.stringify(data);

  if (!force && dataKey === trayPreviewDataKey) {
    return;
  }

  trayPreviewDataKey = dataKey;

  try {
    await emitTo('tray-preview', 'tray-preview-data', data);
  } catch (error) {
    trayPreviewDataKey = null;
    console.error('Failed to update tray preview:', error);
  }
}

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
  const timer = getActiveTimer();

  if (!timer || timer.getSnapshot().state !== TimerState.IDLE) {
    return;
  }

  validationMessage.hidden = true;
  timer.setDuration(readDuration());
  workspace.save();
}

function prepareSignal() {
  void signalPlayer.prepare().catch((error) => {
    console.error('Failed to prepare timer signal:', error);
  });
}

function startTimer() {
  const timer = getActiveTimer();

  if (!timer || timer.getSnapshot().state !== TimerState.IDLE) {
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
  workspace.save();
  requestAnimationFrame(focusActiveTimerControl);
}

function toggleTimerPause() {
  const timer = getActiveTimer();

  if (!timer) {
    return;
  }

  const { state } = timer.getSnapshot();

  if (state === TimerState.RUNNING) {
    timer.pause();
    workspace.save();
    requestAnimationFrame(focusActiveTimerControl);
    return;
  }

  if (state === TimerState.PAUSED) {
    timer.resume();
    workspace.save();
    requestAnimationFrame(focusActiveTimerControl);
  }
}

function stopTimer() {
  const timer = getActiveTimer();

  if (!timer || timer.getSnapshot().state === TimerState.IDLE) {
    return;
  }

  signalPlayer.stop();
  timer.reset();
  workspace.save();
  requestAnimationFrame(focusActiveTimerControl);
}

function restartTimer() {
  const timer = getActiveTimer();

  if (!timer || timer.getSnapshot().state === TimerState.IDLE) {
    return;
  }

  signalPlayer.stop();
  timer.reset();
  prepareSignal();
  timer.start();
  workspace.save();
  requestAnimationFrame(focusActiveTimerControl);
}

function updateTimerShortcutHints() {
  startButton.title = `${t('timer.start')} (Alt+S)`;
  pauseButton.title = `${pauseButton.textContent} (Alt+P)`;
  stopButton.title = `${t('timer.stop')} (Alt+S)`;
  restartButton.title = `${t('timer.restart')} (Alt+R)`;
}

function renderTimer(snapshot) {
  const previouslyFocusedElement = document.activeElement;
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
  updateTimerShortcutHints();

  if (
    [startButton, pauseButton, stopButton, restartButton]
      .includes(previouslyFocusedElement)
    && previouslyFocusedElement.hidden
  ) {
    requestAnimationFrame(focusActiveTimerControl);
  }
}

function renderActiveTimer() {
  const timer = getActiveTimer();

  if (!timer) {
    return;
  }

  const snapshot = timer.getSnapshot();
  validationMessage.hidden = true;
  normalizeDurationInputs(snapshot.durationMs);
  renderTimer(snapshot);
}

function focusActiveTimerControl() {
  if (!confirmationDialogBackdrop.hidden || editingEventId) {
    return;
  }

  const timer = getActiveTimer();

  if (!timer) {
    return;
  }

  const { state } = timer.getSnapshot();

  if (
    state === TimerState.IDLE
    && !minutesInput.disabled
  ) {
    minutesInput.focus({ preventScroll: true });
    minutesInput.select();
    return;
  }

  let targetButton = startButton;

  if (state === TimerState.RUNNING || state === TimerState.PAUSED) {
    targetButton = pauseButton;
  } else if (state === TimerState.OVERDUE) {
    targetButton = stopButton;
  }

  if (!targetButton.hidden && !targetButton.disabled) {
    targetButton.focus({ preventScroll: true });
  }
}

function focusInitialTimerControl() {
  requestAnimationFrame(() => {
    requestAnimationFrame(focusActiveTimerControl);
  });
}

function getDefaultTimerName() {
  return t('tabs.defaultName');
}

function updateTabState(eventId, snapshot) {
  const tab = timerTabList.querySelector(
    `[data-event-id="${CSS.escape(eventId)}"]`
  );

  if (!tab) {
    return;
  }

  updateTabStateClasses(tab, snapshot);
}

function updateTabStateClasses(tab, snapshot) {
  tab.classList.toggle(
    'is-running',
    snapshot.state === TimerState.RUNNING
  );
  tab.classList.toggle(
    'is-paused',
    snapshot.state === TimerState.PAUSED
  );
  tab.classList.toggle(
    'is-overdue',
    snapshot.state === TimerState.OVERDUE
  );
}

function createTabEditor(eventInstance) {
  const input = document.createElement('input');
  input.className = 'timer-tab-name-input';
  input.type = 'text';
  input.maxLength = 40;
  input.value = eventInstance.name ?? '';
  input.placeholder = workspace.getDisplayName(
    eventInstance.id,
    getDefaultTimerName()
  );
  input.setAttribute('aria-label', t('tabs.rename'));

  input.addEventListener('click', (event) => {
    event.stopPropagation();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      input.dataset.focusStart = 'true';
      input.blur();
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      input.dataset.cancelled = 'true';
      input.blur();
    }
  });

  input.addEventListener('blur', () => {
    const shouldFocusStart = input.dataset.focusStart === 'true';

    if (input.dataset.cancelled !== 'true') {
      workspace.renameEvent(eventInstance.id, input.value);
    }

    editingEventId = null;
    renderTabs();
    void refreshTrayPreview({ force: true });

    if (shouldFocusStart) {
      requestAnimationFrame(() => {
        startButton.focus();
      });
    }
  });

  return input;
}

function createTimerTab(eventInstance, canClose) {
  const snapshot = workspace
    .getEngine(eventInstance.id)
    .getSnapshot();
  const tab = document.createElement('div');

  tab.className = 'timer-tab';
  tab.dataset.eventId = eventInstance.id;
  tab.classList.toggle(
    'is-active',
    eventInstance.id === workspace.activeEventId
  );

  if (editingEventId === eventInstance.id) {
    tab.append(createTabEditor(eventInstance));
  } else {
    const selectButton = document.createElement('button');
    const label = document.createElement('span');

    selectButton.className = 'timer-tab-select';
    selectButton.type = 'button';
    selectButton.setAttribute('role', 'tab');
    selectButton.setAttribute(
      'aria-selected',
      String(eventInstance.id === workspace.activeEventId)
    );

    label.className = 'timer-tab-label';
    label.textContent = workspace.getDisplayName(
      eventInstance.id,
      getDefaultTimerName()
    );
    selectButton.append(label);

    selectButton.addEventListener('click', () => {
      if (eventInstance.id === workspace.activeEventId) {
        return;
      }

      workspace.setActiveEvent(eventInstance.id);
      updateActiveTabSelection();
      renderActiveTimer();
      void refreshTrayPreview({ force: true });
    });

    selectButton.addEventListener('dblclick', () => {
      startRenamingTab(eventInstance.id);
    });

    tab.append(selectButton);
  }

  if (canClose) {
    const closeButton = document.createElement('button');
    closeButton.className = 'timer-tab-close';
    closeButton.type = 'button';
    closeButton.textContent = '×';
    closeButton.title = t('tabs.close');
    closeButton.setAttribute('aria-label', t('tabs.close'));
    closeButton.addEventListener('click', (event) => {
      event.stopPropagation();
      void closeTimerTab(eventInstance.id);
    });
    tab.append(closeButton);
  }

  updateTabStateClasses(tab, snapshot);
  return tab;
}

function updateActiveTabSelection() {
  timerTabList.querySelectorAll('.timer-tab').forEach((tab) => {
    const isActive = tab.dataset.eventId === workspace.activeEventId;
    tab.classList.toggle('is-active', isActive);
    tab.querySelector('[role="tab"]')?.setAttribute(
      'aria-selected',
      String(isActive)
    );
  });

  ensureActiveTabVisible();
}

function updateTabScrollButtons() {
  const hasOverflow = timerTabList.scrollWidth
    > timerTabList.clientWidth + 1;

  document.querySelector('.timer-tabs-bar')?.classList.toggle(
    'has-overflow',
    hasOverflow
  );
  scrollTabsLeftButton.hidden = !hasOverflow;
  scrollTabsRightButton.hidden = !hasOverflow;

  if (!hasOverflow) {
    return;
  }

  scrollTabsLeftButton.disabled = timerTabList.scrollLeft <= 1;
  scrollTabsRightButton.disabled =
    timerTabList.scrollLeft + timerTabList.clientWidth
    >= timerTabList.scrollWidth - 1;
}

function ensureActiveTabVisible() {
  const activeTab = timerTabList.querySelector('.timer-tab.is-active');

  activeTab?.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'nearest'
  });

  window.setTimeout(updateTabScrollButtons, 180);
}

function refreshTabOverflow() {
  const tabsBar = document.querySelector('.timer-tabs-bar');

  tabsBar?.classList.remove('has-overflow');
  scrollTabsLeftButton.hidden = true;
  scrollTabsRightButton.hidden = true;

  requestAnimationFrame(() => {
    updateTabScrollButtons();
    ensureActiveTabVisible();
  });
}

function renderTabs({ focusEditor = false } = {}) {
  const events = workspace.getEvents();
  const canClose = events.length > 1;

  timerTabList.replaceChildren(
    ...events.map((eventInstance) => (
      createTimerTab(eventInstance, canClose)
    ))
  );

  const creationAllowed = canCreateTimer(events.length);
  addTimerButton.classList.toggle('is-locked', !creationAllowed);
  addTimerButton.setAttribute(
    'aria-disabled',
    String(!creationAllowed)
  );
  addTimerButton.title = creationAllowed
    ? t('tabs.add')
    : t('tabs.proLimit');
  addTimerButton.setAttribute(
    'aria-label',
    addTimerButton.title
  );

  refreshTabOverflow();

  if (focusEditor) {
    requestAnimationFrame(() => {
      const editor = timerTabList.querySelector(
        '.timer-tab-name-input'
      );
      editor?.focus();
      editor?.select();
    });
  }
}

function startRenamingTab(eventId) {
  editingEventId = eventId;
  renderTabs({ focusEditor: true });
}

function formatTranslation(key, values) {
  return Object.entries(values).reduce(
    (text, [name, value]) => (
      text.replaceAll(`{${name}}`, value)
    ),
    t(key)
  );
}

function updateConfirmationDialog() {
  if (!confirmationConfig) {
    return;
  }

  const values = confirmationConfig.values ?? {};

  confirmationDialogTitle.textContent = formatTranslation(
    confirmationConfig.titleKey,
    values
  );
  confirmationDialogMessage.textContent = formatTranslation(
    confirmationConfig.messageKey,
    values
  );
  confirmationPrimaryButton.textContent = t(
    confirmationConfig.primaryKey
  );
  confirmationSecondaryButton.textContent = t(
    confirmationConfig.secondaryKey
  );
  confirmationPrimaryButton.classList.toggle(
    'danger-button',
    confirmationConfig.destructive === true
  );
}

function settleConfirmation(confirmed) {
  if (!confirmationResolver) {
    return;
  }

  const resolve = confirmationResolver;
  const previousFocus = confirmationPreviousFocus;

  confirmationResolver = null;
  confirmationConfig = null;
  confirmationPreviousFocus = null;
  confirmationDialogBackdrop.hidden = true;

  previousFocus?.focus();
  resolve(confirmed);
}

function requestConfirmation(config) {
  if (confirmationResolver) {
    return Promise.resolve(false);
  }

  confirmationConfig = config;
  confirmationPreviousFocus = document.activeElement;
  updateConfirmationDialog();
  confirmationDialogBackdrop.hidden = false;

  requestAnimationFrame(() => {
    confirmationPrimaryButton.focus();
  });

  return new Promise((resolve) => {
    confirmationResolver = resolve;
  });
}

async function closeTimerTab(eventId) {
  const timer = workspace.getEngine(eventId);
  const eventName = workspace.getDisplayName(
    eventId,
    getDefaultTimerName()
  );
  const timerState = timer?.getSnapshot().state;
  const needsConfirmation = timerState !== TimerState.IDLE;

  if (
    needsConfirmation
    && !await requestConfirmation({
      titleKey: 'tabs.confirmCloseTitle',
      messageKey: 'tabs.confirmClose',
      primaryKey: 'tabs.confirmCloseAction',
      secondaryKey: 'window.cancel',
      values: { name: eventName },
      destructive: true
    })
  ) {
    return;
  }

  workspace.removeEvent(eventId);
  renderTabs();
  renderActiveTimer();
  void refreshTrayIcon();
  void refreshTrayPreview({ force: true });
}

function showTabNotice(message) {
  window.clearTimeout(noticeTimeoutId);
  tabNotice.textContent = message;
  tabNotice.hidden = false;

  noticeTimeoutId = window.setTimeout(() => {
    tabNotice.hidden = true;
  }, 2800);
}

async function requestApplicationClose({
  showForConfirmation = false
} = {}) {
  if (isClosingApplication) {
    return;
  }

  const behavior = getBehavior();
  const needsConfirmation =
    behavior.confirmCloseWithActiveTimers
    && workspace.hasActiveTimers();

  if (needsConfirmation && showForConfirmation) {
    void appWindow.show()
      .then(() => appWindow.setFocus())
      .catch((error) => {
        console.error(
          'Failed to show the exit confirmation window:',
          error
        );
      });
  }

  if (needsConfirmation) {
    const confirmationPromise = requestConfirmation({
      titleKey: 'behavior.closeTitle',
      messageKey: 'behavior.closeMessage',
      primaryKey: 'behavior.closeAction',
      secondaryKey: 'window.cancel',
      destructive: true
    });

    if (!await confirmationPromise) {
      return;
    }
  }

  isClosingApplication = true;

  try {
    await invoke('close_settings_window');
  } catch (error) {
    console.error('Failed to close the settings window:', error);
  }

  try {
    await invoke('close_about_window');
  } catch (error) {
    console.error('Failed to close the About window:', error);
  }

  workspace.save();
  workspace.destroy();
  signalPlayer.stop();

  try {
    await invoke('exit_application');
  } catch (error) {
    isClosingApplication = false;
    console.error('Failed to exit the application:', error);
  }
}

async function requestMainWindowClose() {
  if (
    getBehavior().closeButtonAction
    === CloseButtonAction.MINIMIZE_TO_TRAY
  ) {
    workspace.save();
    await appWindow.hide();
    return;
  }

  await requestApplicationClose();
}

async function shouldResetStoredActiveTimers() {
  if (!workspace.hasStoredActiveTimers()) {
    return false;
  }

  const startupTimerAction = getBehavior().startupTimerAction;

  if (startupTimerAction === StartupTimerAction.RESET) {
    return true;
  }

  if (startupTimerAction === StartupTimerAction.RESUME) {
    return false;
  }

  const shouldRestore = await requestConfirmation({
    titleKey: 'behavior.restoreTitle',
    messageKey: 'behavior.restoreMessage',
    primaryKey: 'behavior.restoreAction',
    secondaryKey: 'behavior.resetAction'
  });

  return !shouldRestore;
}

function refreshLocalizedContent() {
  applyTranslations();
  document.title = t('app.title');
  updateConfirmationDialog();
  renderTabs();
  renderActiveTimer();
  void refreshTrayPreview({ force: true });
}

[
  hoursInput,
  minutesInput,
  secondsInput
].forEach((input) => {
  input.addEventListener('input', updateDurationFromInputs);

  input.addEventListener('change', () => {
    const timer = getActiveTimer();

    if (!timer || timer.getSnapshot().state !== TimerState.IDLE) {
      return;
    }

    const durationMs = readDuration();
    normalizeDurationInputs(durationMs);
    timer.setDuration(durationMs);
    workspace.save();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      startTimer();
    }
  });
});

startButton.addEventListener('click', startTimer);
pauseButton.addEventListener('click', toggleTimerPause);
stopButton.addEventListener('click', stopTimer);
restartButton.addEventListener('click', restartTimer);

startButton.setAttribute('aria-keyshortcuts', 'Alt+S');
pauseButton.setAttribute('aria-keyshortcuts', 'Alt+P');
stopButton.setAttribute('aria-keyshortcuts', 'Alt+S');
restartButton.setAttribute('aria-keyshortcuts', 'Alt+R');

document.addEventListener('keydown', (event) => {
  if (
    !event.altKey
    || event.ctrlKey
    || event.metaKey
    || event.shiftKey
    || event.repeat
    || !confirmationDialogBackdrop.hidden
  ) {
    return;
  }

  const timer = getActiveTimer();

  if (!timer) {
    return;
  }

  const { state } = timer.getSnapshot();

  if (event.code === 'KeyS') {
    event.preventDefault();

    if (state === TimerState.IDLE) {
      startTimer();
    } else {
      stopTimer();
    }

    return;
  }

  if (
    event.code === 'KeyP'
    && (state === TimerState.RUNNING || state === TimerState.PAUSED)
  ) {
    event.preventDefault();
    toggleTimerPause();
    return;
  }

  if (event.code === 'KeyR' && state !== TimerState.IDLE) {
    event.preventDefault();
    restartTimer();
  }
});

timerControls.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return;
  }

  const visibleButtons = [
    startButton,
    pauseButton,
    stopButton,
    restartButton
  ].filter((button) => !button.hidden && !button.disabled);
  const currentIndex = visibleButtons.indexOf(document.activeElement);

  if (currentIndex === -1 || visibleButtons.length < 2) {
    return;
  }

  const direction = event.key === 'ArrowLeft' ? -1 : 1;
  const nextIndex = (
    currentIndex + direction + visibleButtons.length
  ) % visibleButtons.length;

  event.preventDefault();
  visibleButtons[nextIndex].focus({ preventScroll: true });
});

confirmationDialogXButton.addEventListener('click', () => {
  settleConfirmation(false);
});

confirmationSecondaryButton.addEventListener('click', () => {
  settleConfirmation(false);
});

confirmationPrimaryButton.addEventListener('click', () => {
  settleConfirmation(true);
});

confirmationDialogBackdrop.addEventListener('click', (event) => {
  if (event.target === confirmationDialogBackdrop) {
    settleConfirmation(false);
  }
});

confirmationDialogBackdrop.addEventListener('keydown', (event) => {
  if (
    event.key === 'ArrowLeft' ||
    event.key === 'ArrowUp' ||
    event.key === 'ArrowRight' ||
    event.key === 'ArrowDown'
  ) {
    const actionButtons = [
      confirmationSecondaryButton,
      confirmationPrimaryButton
    ].sort((leftButton, rightButton) => (
      leftButton.getBoundingClientRect().left -
      rightButton.getBoundingClientRect().left
    ));
    const selectLeftButton =
      event.key === 'ArrowLeft' || event.key === 'ArrowUp';

    event.preventDefault();
    actionButtons[selectLeftButton ? 0 : actionButtons.length - 1].focus();
    return;
  }

  if (event.key === 'Tab') {
    const focusableElements = [
      confirmationDialogXButton,
      confirmationSecondaryButton,
      confirmationPrimaryButton
    ];
    const currentIndex = focusableElements.indexOf(
      document.activeElement
    );
    const direction = event.shiftKey ? -1 : 1;
    const nextIndex = (
      currentIndex + direction + focusableElements.length
    ) % focusableElements.length;

    event.preventDefault();
    focusableElements[nextIndex].focus();
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    settleConfirmation(false);
    return;
  }

  if (event.key === 'Enter') {
    const activeElement = document.activeElement;

    if (
      activeElement === confirmationDialogXButton ||
      activeElement === confirmationSecondaryButton ||
      activeElement === confirmationPrimaryButton
    ) {
      event.preventDefault();
      activeElement.click();
    }
  }
});

scrollTabsLeftButton.addEventListener('click', () => {
  timerTabList.scrollBy({
    left: -Math.max(80, timerTabList.clientWidth * 0.7),
    behavior: 'smooth'
  });
});

scrollTabsRightButton.addEventListener('click', () => {
  timerTabList.scrollBy({
    left: Math.max(80, timerTabList.clientWidth * 0.7),
    behavior: 'smooth'
  });
});

timerTabList.addEventListener('scroll', updateTabScrollButtons);

timerTabList.addEventListener('wheel', (event) => {
  if (timerTabList.scrollWidth <= timerTabList.clientWidth) {
    return;
  }

  event.preventDefault();
  timerTabList.scrollBy({
    left: event.deltaY || event.deltaX,
    behavior: 'auto'
  });
}, { passive: false });

window.addEventListener('resize', refreshTabOverflow);

addTimerButton.addEventListener('click', () => {
  if (!canCreateTimer(workspace.getEvents().length)) {
    showTabNotice(t('tabs.proLimit'));
    return;
  }

  const eventInstance = workspace.addEvent();
  editingEventId = eventInstance.id;
  renderTabs({ focusEditor: true });
  renderActiveTimer();
  void refreshTrayPreview({ force: true });
});

alwaysOnTopButton.addEventListener('click', async () => {
  const nextState = !isAlwaysOnTop;

  try {
    await appWindow.setAlwaysOnTop(nextState);
    isAlwaysOnTop = nextState;
    localStorage.setItem(
      ALWAYS_ON_TOP_STORAGE_KEY,
      String(isAlwaysOnTop)
    );

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
  .getElementById('about-btn')
  .addEventListener('click', async () => {
    try {
      await invoke('open_about_window');
    } catch (error) {
      console.error('Failed to open the About window:', error);
    }
  });

document
  .getElementById('minimize-btn')
  .addEventListener('click', async () => {
    await appWindow.hide();
  });

document
  .getElementById('close-btn')
  .addEventListener('click', () => {
    void requestMainWindowClose();
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
    void refreshTrayIcon();
  }

  if (
    event.key === APPEARANCE_STORAGE_KEY
    && event.newValue
  ) {
    void applyAppearance(getAppearance());
  }

  if (
    event.key === BEHAVIOR_STORAGE_KEY
    && event.newValue
  ) {
    void refreshTrayIcon();
  }
});

window.addEventListener('beforeunload', () => {
  workspace.save();
  workspace.destroy();
  signalPlayer.stop();
});

await appWindow.onCloseRequested((event) => {
  if (isClosingApplication) {
    return;
  }

  event.preventDefault();
  void requestMainWindowClose();
});

await listen('tray-exit-requested', () => {
  void requestApplicationClose({
    showForConfirmation: true
  });
});

await listen('tray-preview-requested', () => {
  void refreshTrayPreview({ force: true });
});

await listen(APPEARANCE_PREVIEW_EVENT, (event) => {
  void applyAppearance(event.payload);
});

document.documentElement.dataset.edition = getEdition();

applyTheme();
await applyAppearance(getAppearance());
applyTranslations();
document.title = t('app.title');

const resetActiveTimers = await shouldResetStoredActiveTimers();

workspace.load({ resetActiveTimers });
refreshLocalizedContent();
void refreshTrayIcon();
void refreshTrayPreview({ force: true });
focusInitialTimerControl();
