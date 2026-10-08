import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import {
  LogicalSize,
  getCurrentWindow
} from '@tauri-apps/api/window';
import {
  FirstDayOfWeek,
  TimeFormat,
  formatDate,
  formatTime
} from '@bsl-world/desktop-core/regional';
import {
  checkForUpdates,
  installUpdate
} from './updater.js';
import {
  applyTranslations,
  getLocale,
  setLocale,
  t
} from './i18n.js';

import {
  TimerState,
  durationToMilliseconds,
  millisecondsToClock
} from './timer.js';

import { TimerWorkspace } from './timer-workspace.js';
import { EndSignalService } from './end-signal-service.js';
import { SignalPlayer } from './signal.js';
import { TrayInformerService } from './tray-informer-service.js';
import { EVENT_DETAILS_EVENT } from './event-instance.js';
import {
  SIGNAL_SETTINGS_EVENT,
  normalizeSignalSettings
} from './signal-settings.js';
import {
  WARNING_SIGNAL_SETTINGS_EVENT,
  WARNING_THRESHOLD_MINUTES,
  normalizeWarningSignalSettings
} from './warning-signal-settings.js';
import {
  WarningSignalController
} from './warning-signal-controller.js';
import {
  canCreateDateCountdown,
  canCreateTimer,
  getEdition
} from './edition.js';
import {
  GLOW_STORAGE_KEY,
  THEME_STORAGE_KEY,
  VISUAL_PREVIEW_EVENT,
  applyGlow,
  applyTheme,
  getGlowEnabled,
  getTheme,
  normalizeGlowEnabled,
  normalizeTheme
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
import {
  keepWindowInsideWorkArea,
  prepareWindowPosition
} from './window-position.js';
import {
  formatDateCountdownDuration,
  getDateCountdownDisplayName
} from './date-countdown.js';
import {
  DateCountdownStore
} from './date-countdown-store.js';
import {
  clockDialPosition,
  createCalendarDays,
  minuteDialValues,
  shiftCalendarMonth,
  wrapClockValue
} from './date-time-picker.js';
import {
  REGIONAL_SETTINGS_EVENT,
  loadRegionalSettings
} from './regional-settings.js';
import {
  AUDIO_PREFERENCES_EVENT,
  AUDIO_PREFERENCES_STORAGE_KEY,
  audioPreferencesEqual,
  getAudioPreferences,
  normalizeAudioPreferences
} from './audio-preferences.js';
import {
  WHATS_NEW_VERSION,
  shouldShowWhatsNew
} from './whats-new.js';

const ALWAYS_ON_TOP_STORAGE_KEY = 'bsl-timer.always-on-top';
const DATE_COUNTDOWN_RIBBON_COLLAPSED_STORAGE_KEY =
  'bsl-timer.date-countdown-ribbon-collapsed';
const MAIN_WINDOW_WIDTH = 360;
const MAIN_WINDOW_BASE_HEIGHT = 260;
const MAIN_WINDOW_COLLAPSED_RIBBON_HEIGHT = 286;
const MAIN_WINDOW_RIBBON_HEIGHT = 330;
const MAIN_WINDOW_EDITOR_HEIGHT = 620;
const appWindow = getCurrentWindow();
try {
  await prepareWindowPosition(appWindow);
} catch (error) {
  console.error('Failed to keep the main window inside the work area:', error);
}

const signalInformer = new TrayInformerService({
  show: async (data) => {
    await emitTo('tray-preview', 'tray-preview-data', data);
    return invoke('show_tray_informer');
  },
  startFade: () => {
    void emitTo('tray-preview', 'tray-preview-hide');
  },
  hide: (generation) => {
    if (!Number.isFinite(generation)) {
      return false;
    }

    return invoke('hide_tray_informer', { generation });
  }
});

const initialAudioPreferences = getAudioPreferences();
let appliedAudioPreferences = initialAudioPreferences;
let lastOutputDeviceFallback = null;
const handleOutputDeviceFallback = (deviceId) => {
  if (lastOutputDeviceFallback === deviceId) {
    return;
  }

  lastOutputDeviceFallback = deviceId;
  console.error(`Audio output device "${deviceId}" is unavailable.`);
  showTabNotice(t('timer.audioOutputUnavailable'));
};
const endSignalPlayer = new SignalPlayer({
  outputDeviceId: initialAudioPreferences.outputDeviceId,
  onFileError: () => {
    showTabNotice(t('timer.signalFileUnavailable'));
  },
  onOutputDeviceFallback: handleOutputDeviceFallback
});

const endSignalService = new EndSignalService({
  player: endSignalPlayer,
  allowConcurrentSignals: initialAudioPreferences.allowConcurrentSignals,
  onPlaybackStart: (eventId, playbackNumber, settings) => {
    if (!settings.showInformer) {
      return;
    }

    signalInformer.start(
      `end:${eventId}:${playbackNumber}`,
      createSignalInformerData(eventId, 'completed')
    );
  },
  onPlaybackComplete: (eventId, playbackNumber, settings) => {
    if (settings.showInformer) {
      signalInformer.complete(`end:${eventId}:${playbackNumber}`);
    }
  }
});
const warningSignalPlayer = new SignalPlayer({
  outputDeviceId: initialAudioPreferences.outputDeviceId,
  onOutputDeviceFallback: handleOutputDeviceFallback
});
const warningSignalController = new WarningSignalController({
  onWarning: (eventId, thresholdMinutes, _snapshot, delivery) => {
    const token = `warning:${eventId}:${thresholdMinutes}`;

    if (delivery.informer) {
      signalInformer.start(
        token,
        createSignalInformerData(
          eventId,
          'warning',
          thresholdMinutes
        )
      );
    }

    if (!delivery.sound) {
      signalInformer.complete(token);
      return;
    }

    void warningSignalPlayer.playWarning(token)
      .catch((error) => {
        console.error('Failed to play timer warning signal:', error);
      })
      .finally(() => {
        if (delivery.informer) {
          signalInformer.complete(token);
        }
      });
  }
});

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
const dateCountdownsButton =
  document.getElementById('date-countdowns-btn');
const dateCountdownRibbon =
  document.getElementById('date-countdown-ribbon');
const dateCountdownList =
  document.getElementById('date-countdown-list');
const addDateCountdownButton =
  document.getElementById('add-date-countdown-btn');
const scrollDateCountdownsLeftButton =
  document.getElementById('scroll-date-countdowns-left-btn');
const scrollDateCountdownsRightButton =
  document.getElementById('scroll-date-countdowns-right-btn');
const toggleDateCountdownRibbonButton =
  document.getElementById('toggle-date-countdown-ribbon-btn');
const dateCountdownDialogBackdrop =
  document.getElementById('date-countdown-dialog-backdrop');
const dateCountdownForm =
  document.getElementById('date-countdown-form');
const dateCountdownDialogTitle =
  document.getElementById('date-countdown-dialog-title');
const dateCountdownDialogXButton =
  document.getElementById('date-countdown-dialog-x-btn');
const dateCountdownNameInput =
  document.getElementById('date-countdown-name-input');
const dateCountdownDescriptionInput =
  document.getElementById('date-countdown-description-input');
const dateCountdownDateButton =
  document.getElementById('date-countdown-date-button');
const dateCountdownHourButton =
  document.getElementById('date-countdown-hour-button');
const dateCountdownMinuteButton =
  document.getElementById('date-countdown-minute-button');
const dateCountdownPeriodButton =
  document.getElementById('date-countdown-period-button');
const dateCountdownPicker =
  document.getElementById('date-countdown-picker');
const dateCountdownCalendar =
  document.getElementById('date-countdown-calendar');
const previousCalendarMonthButton =
  document.getElementById('previous-calendar-month-btn');
const nextCalendarMonthButton =
  document.getElementById('next-calendar-month-btn');
const calendarMonthLabel =
  document.getElementById('calendar-month-label');
const calendarWeekdays =
  document.getElementById('calendar-weekdays');
const calendarDays = document.getElementById('calendar-days');
const dateCountdownTimeDial =
  document.getElementById('date-countdown-time-dial');
const dateCountdownClockFace =
  document.getElementById('date-countdown-clock-face');
const dateCountdownPeriodSwitch =
  document.getElementById('date-countdown-period-switch');
const dateCountdownShowSecondsInput =
  document.getElementById('date-countdown-show-seconds-input');
const dateCountdownValidationMessage =
  document.getElementById('date-countdown-validation-message');
const deleteDateCountdownButton =
  document.getElementById('delete-date-countdown-btn');
const cancelDateCountdownButton =
  document.getElementById('cancel-date-countdown-btn');

let isAlwaysOnTop =
  localStorage.getItem(ALWAYS_ON_TOP_STORAGE_KEY) === 'true';
let editingEventId = null;
let noticeTimeoutId = null;
let confirmationResolver = null;
let confirmationConfig = null;
let confirmationPreviousFocus = null;
let updaterDialogMode = null;
let isClosingApplication = false;
let trayIconVisualKey = null;
let taskbarIconVisualKey = null;
let trayPreviewDataKey = null;
let editingDateCountdownId = null;
let dateCountdownRefreshId = null;
let mainWindowHeight = null;
let regionalSettings = null;
let isDateCountdownRibbonCollapsed =
  localStorage.getItem(
    DATE_COUNTDOWN_RIBBON_COLLAPSED_STORAGE_KEY
  ) === 'true';
let dateCountdownPickerMode = 'date';
let selectedDateCountdownDate = null;
let selectedDateCountdownHours = 0;
let selectedDateCountdownMinutes = 0;
let calendarDisplayYear = 0;
let calendarDisplayMonth = 0;

const dateCountdownStore = new DateCountdownStore();

const workspace = new TimerWorkspace({
  onUpdate: (eventId, snapshot) => {
    const eventInstance = workspace.getEvent(eventId);

    warningSignalController.update(
      eventId,
      snapshot,
      eventInstance?.settings?.warningSignals
    );
    updateTabState(eventId, snapshot);

    if (eventId === workspace.activeEventId) {
      renderTimer(snapshot);
    }

    refreshStatusIcons();
    void refreshTrayPreview();
  },
  onExpire: (eventId) => {
    workspace.save();
    const eventInstance = workspace.getEvent(eventId);
    const signalSettings = normalizeSignalSettings(
      eventInstance?.settings?.endSignal
    );

    if (signalSettings.playSound) {
      endSignalService.start(eventId, signalSettings);
      return;
    }

    if (signalSettings.showInformer) {
      signalInformer.showMoment(
        `end:${eventId}:informer-only`,
        createSignalInformerData(eventId, 'completed')
      );
    }
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

function getEventVisualSettings(eventInstance, {
  fallbackTheme = getTheme(),
  fallbackGlowEnabled = getGlowEnabled()
} = {}) {
  const settings = eventInstance?.settings ?? {};

  return {
    themeId: normalizeTheme(
      settings.themeId ?? settings.theme ?? fallbackTheme
    ),
    glowEnabled: normalizeGlowEnabled(
      settings.glowEnabled ?? fallbackGlowEnabled
    )
  };
}

function migrateTimerVisualSettings() {
  const fallbackTheme = getTheme();
  const fallbackGlowEnabled = getGlowEnabled();

  for (const eventInstance of workspace.getEvents()) {
    const visualSettings = getEventVisualSettings(eventInstance, {
      fallbackTheme,
      fallbackGlowEnabled
    });
    const currentSettings = eventInstance.settings ?? {};

    if (
      currentSettings.themeId === visualSettings.themeId
      && currentSettings.glowEnabled === visualSettings.glowEnabled
    ) {
      continue;
    }

    workspace.updateEventSettings(
      eventInstance.id,
      visualSettings
    );
  }
}

function syncVisualSettingsStorage({
  themeId,
  glowEnabled
}) {
  if (localStorage.getItem(THEME_STORAGE_KEY) !== themeId) {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  }

  const glowValue = String(glowEnabled);

  if (localStorage.getItem(GLOW_STORAGE_KEY) !== glowValue) {
    localStorage.setItem(GLOW_STORAGE_KEY, glowValue);
  }
}

function applyActiveVisualSettings() {
  const visualSettings = getEventVisualSettings(
    workspace.getActiveEvent()
  );

  applyTheme(visualSettings.themeId);
  applyGlow(visualSettings.glowEnabled);
  syncVisualSettingsStorage(visualSettings);

  return visualSettings;
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
  const overdue = hasOverdueTimers();
  const colorValue = style.getPropertyValue(
    overdue
      ? '--timer-overdue-color'
      : '--theme-color'
  ).trim();
  const color = parseHexColor(colorValue);
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

async function refreshTaskbarIcon() {
  const style = getComputedStyle(document.documentElement);
  const activeSnapshot = workspace.getActiveEngine()?.getSnapshot();
  const overdue = activeSnapshot?.state === TimerState.OVERDUE;
  const colorValue = style.getPropertyValue(
    overdue
      ? '--timer-overdue-color'
      : '--theme-color'
  ).trim();
  const color = parseHexColor(colorValue);
  const visualKey = `${colorValue}:${overdue}`;

  if (!color || visualKey === taskbarIconVisualKey) {
    return;
  }

  taskbarIconVisualKey = visualKey;

  try {
    await invoke('update_taskbar_icon', { color });
  } catch (error) {
    taskbarIconVisualKey = null;
    console.error('Failed to update taskbar icon:', error);
  }
}

function refreshStatusIcons() {
  void refreshTrayIcon();
  void refreshTaskbarIcon();
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
    mode: 'timer',
    name: activeEvent
      ? workspace.getDisplayName(activeEvent.id, getDefaultTimerName())
      : t('app.title'),
    description: activeEvent?.description ?? '',
    time: state === TimerState.OVERDUE
      ? millisecondsToClock(activeSnapshot?.overdueMs ?? 0)
      : millisecondsToClock(activeSnapshot?.remainingMs ?? 0, true),
    state,
    ...getEventVisualSettings(activeEvent),
    otherActiveCount,
    otherOverdueCount
  };
}

function createSignalInformerData(
  eventId,
  mode,
  thresholdMinutes = null
) {
  const eventInstance = workspace.getEvent(eventId);
  const snapshot = workspace.getEngine(eventId)?.getSnapshot();
  const visualSettings = getEventVisualSettings(eventInstance);

  return {
    mode,
    name: workspace.getDisplayName(eventId, getDefaultTimerName()),
    description: eventInstance?.description ?? '',
    time: mode === 'warning'
      ? millisecondsToClock(thresholdMinutes * 60_000)
      : millisecondsToClock(snapshot?.remainingMs ?? 0),
    state: mode === 'completed' ? TimerState.OVERDUE : TimerState.RUNNING,
    thresholdMinutes,
    ...visualSettings,
    otherActiveCount: 0,
    otherOverdueCount: 0
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

function cycleDurationInput(input, delta) {
  const currentValue = Number.parseInt(input.value, 10);
  const normalizedValue = Number.isFinite(currentValue)
    ? currentValue
    : 0;

  input.value = String((normalizedValue + delta + 60) % 60);
  updateDurationFromInputs();
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
  void endSignalService.prepare().catch((error) => {
    console.error('Failed to prepare timer signal:', error);
  });
  void warningSignalPlayer.prepare().catch((error) => {
    console.error('Failed to prepare timer warning signal:', error);
  });
}

function applyAudioPreferences(preferences, { force = false } = {}) {
  const normalizedPreferences = normalizeAudioPreferences(preferences);

  if (
    !force
    && audioPreferencesEqual(
      normalizedPreferences,
      appliedAudioPreferences
    )
  ) {
    return;
  }

  appliedAudioPreferences = normalizedPreferences;
  lastOutputDeviceFallback = null;

  endSignalService.setAllowConcurrentSignals(
    normalizedPreferences.allowConcurrentSignals
  );

  void Promise.all([
    endSignalPlayer.setOutputDevice(
      normalizedPreferences.outputDeviceId
    ),
    warningSignalPlayer.setOutputDevice(
      normalizedPreferences.outputDeviceId
    )
  ]).catch((error) => {
    console.error('Failed to update the audio output device:', error);
  });
}

function stopWarningSignals(eventId) {
  WARNING_THRESHOLD_MINUTES.forEach((thresholdMinutes) => {
    warningSignalPlayer.stop(
      `warning:${eventId}:${thresholdMinutes}`
    );
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

  endSignalService.cancel(workspace.activeEventId);
  stopWarningSignals(workspace.activeEventId);
  timer.reset();
  workspace.save();
  requestAnimationFrame(focusActiveTimerControl);
}

function restartTimer() {
  const timer = getActiveTimer();

  if (!timer || timer.getSnapshot().state === TimerState.IDLE) {
    return;
  }

  endSignalService.cancel(workspace.activeEventId);
  stopWarningSignals(workspace.activeEventId);
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
  if (
    !confirmationDialogBackdrop.hidden
    || !dateCountdownDialogBackdrop.hidden
    || editingEventId
  ) {
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
    selectButton.title = eventInstance.description
      ? `${label.textContent}\n${eventInstance.description}`
      : label.textContent;
    selectButton.append(label);

    selectButton.addEventListener('click', () => {
      if (eventInstance.id === workspace.activeEventId) {
        return;
      }

      workspace.setActiveEvent(eventInstance.id);
      applyActiveVisualSettings();
      updateActiveTabSelection();
      renderActiveTimer();
      refreshStatusIcons();
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

  updaterDialogMode = null;
  confirmationConfig = config;
  confirmationPreviousFocus = document.activeElement;
  confirmationDialogXButton.hidden = false;
  confirmationSecondaryButton.hidden = false;
  confirmationPrimaryButton.hidden = false;
  updateConfirmationDialog();
  confirmationDialogBackdrop.hidden = false;

  requestAnimationFrame(() => {
    confirmationPrimaryButton.focus();
  });

  return new Promise((resolve) => {
    confirmationResolver = resolve;
  });
}

function showUpdaterProgress(messageKey, values = {}) {
  updaterDialogMode = 'progress';
  confirmationConfig = null;
  confirmationDialogTitle.textContent = t('updater.progressTitle');
  confirmationDialogMessage.textContent = formatTranslation(
    messageKey,
    values
  );
  confirmationDialogXButton.hidden = true;
  confirmationSecondaryButton.hidden = true;
  confirmationPrimaryButton.hidden = true;
  confirmationDialogBackdrop.hidden = false;
}

function showUpdaterError() {
  updaterDialogMode = 'error';
  confirmationConfig = null;
  confirmationDialogTitle.textContent = t('updater.errorTitle');
  confirmationDialogMessage.textContent = t('updater.errorMessage');
  confirmationDialogXButton.hidden = true;
  confirmationSecondaryButton.hidden = true;
  confirmationPrimaryButton.hidden = false;
  confirmationPrimaryButton.classList.remove('danger-button');
  confirmationPrimaryButton.textContent = t('window.ok');
  confirmationDialogBackdrop.hidden = false;

  requestAnimationFrame(() => {
    confirmationPrimaryButton.focus();
  });
}

function hideUpdaterDialog() {
  updaterDialogMode = null;
  confirmationDialogBackdrop.hidden = true;
  requestAnimationFrame(focusActiveTimerControl);
}

async function openWhatsNewWindow() {
  try {
    await invoke('open_whats_new_window');
  } catch (error) {
    console.error('Failed to open What’s New:', error);
  }
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

  endSignalService.cancel(eventId);
  stopWarningSignals(eventId);
  warningSignalController.reset(eventId);
  workspace.removeEvent(eventId);
  applyActiveVisualSettings();
  renderTabs();
  renderActiveTimer();
  refreshStatusIcons();
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

async function setMainWindowHeight(height) {
  if (mainWindowHeight === height) {
    return;
  }

  mainWindowHeight = height;

  try {
    await appWindow.setSize(new LogicalSize(
      MAIN_WINDOW_WIDTH,
      height
    ));
    await keepWindowInsideWorkArea(appWindow);
  } catch (error) {
    mainWindowHeight = null;
    console.error('Failed to resize the main window:', error);
  }
}

function getDefaultDateCountdownTarget() {
  const target = new Date(Date.now() + 24 * 60 * 60 * 1000);

  target.setSeconds(0, 0);
  target.setMinutes(Math.ceil(target.getMinutes() / 5) * 5);
  return target.getTime();
}

function getCalendarFirstDayOfWeek() {
  const configuredFirstDay = regionalSettings?.firstDayOfWeek;

  if (configuredFirstDay === FirstDayOfWeek.MONDAY) {
    return 1;
  }

  if (configuredFirstDay === FirstDayOfWeek.SUNDAY) {
    return 0;
  }

  try {
    const systemLocale = new Intl.Locale(
      Intl.DateTimeFormat().resolvedOptions().locale
    );
    const firstDay = systemLocale.weekInfo?.firstDay
      ?? systemLocale.getWeekInfo?.().firstDay;

    return firstDay === 7 ? 0 : 1;
  } catch {
    return getLocale().toLowerCase().startsWith('en') ? 0 : 1;
  }
}

function usesTwelveHourClock() {
  const configuredFormat = regionalSettings?.timeFormat;

  if (configuredFormat === TimeFormat.HOUR_12) {
    return true;
  }

  if (configuredFormat === TimeFormat.HOUR_24) {
    return false;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric'
  }).resolvedOptions().hour12 === true;
}

function selectedDateCountdownTarget() {
  if (!selectedDateCountdownDate) {
    return null;
  }

  const target = new Date(
    selectedDateCountdownDate.year,
    selectedDateCountdownDate.month,
    selectedDateCountdownDate.day,
    selectedDateCountdownHours,
    selectedDateCountdownMinutes,
    0,
    0
  );

  return Number.isNaN(target.getTime()) ? null : target.getTime();
}

function renderDateCountdownTargetControls() {
  if (!selectedDateCountdownDate) {
    return;
  }

  const targetTimestamp = selectedDateCountdownTarget();
  const target = new Date(targetTimestamp);
  const twelveHourClock = usesTwelveHourClock();
  const displayHours = twelveHourClock
    ? selectedDateCountdownHours % 12 || 12
    : selectedDateCountdownHours;

  dateCountdownDateButton.textContent = regionalSettings
    ? formatDate(target, regionalSettings, { locale: getLocale() })
    : target.toLocaleDateString(getLocale());
  dateCountdownHourButton.textContent = String(displayHours)
    .padStart(2, '0');
  dateCountdownMinuteButton.textContent = String(
    selectedDateCountdownMinutes
  ).padStart(2, '0');
  dateCountdownPeriodButton.hidden = !twelveHourClock;
  dateCountdownPeriodButton.textContent =
    selectedDateCountdownHours < 12 ? 'AM' : 'PM';

  dateCountdownDateButton.classList.toggle(
    'is-active',
    dateCountdownPickerMode === 'date'
  );
  dateCountdownHourButton.classList.toggle(
    'is-active',
    dateCountdownPickerMode === 'hours'
  );
  dateCountdownMinuteButton.classList.toggle(
    'is-active',
    dateCountdownPickerMode === 'minutes'
  );
}

function renderDateCountdownCalendar() {
  const firstDayOfWeek = getCalendarFirstDayOfWeek();
  const monthDate = new Date(
    calendarDisplayYear,
    calendarDisplayMonth,
    1
  );
  const weekdayFormatter = new Intl.DateTimeFormat(getLocale(), {
    weekday: 'short'
  });

  calendarMonthLabel.textContent = new Intl.DateTimeFormat(
    getLocale(),
    { month: 'long', year: 'numeric' }
  ).format(monthDate);

  calendarWeekdays.replaceChildren(
    ...Array.from({ length: 7 }, (_, index) => {
      const label = document.createElement('span');
      const weekday = new Date(2024, 0, 7 + firstDayOfWeek + index);

      label.textContent = weekdayFormatter.format(weekday)
        .replace(/\.$/, '');
      return label;
    })
  );

  calendarDays.replaceChildren(
    ...createCalendarDays(
      calendarDisplayYear,
      calendarDisplayMonth,
      { firstDayOfWeek }
    ).map((day) => {
      const button = document.createElement('button');
      const isSelected =
        day.year === selectedDateCountdownDate?.year
        && day.month === selectedDateCountdownDate?.month
        && day.day === selectedDateCountdownDate?.day;

      button.type = 'button';
      button.textContent = String(day.day);
      button.className = 'calendar-day';
      button.classList.toggle('is-adjacent', !day.inCurrentMonth);
      button.classList.toggle('is-today', day.isToday);
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
      button.addEventListener('click', () => {
        selectedDateCountdownDate = {
          year: day.year,
          month: day.month,
          day: day.day
        };
        calendarDisplayYear = day.year;
        calendarDisplayMonth = day.month;
        setDateCountdownPickerMode('hours');
        dateCountdownHourButton.focus();
      });
      return button;
    })
  );
}

function createClockDialButton({
  label,
  value,
  index,
  count = 12,
  radius = 82,
  inner = false,
  selected = false,
  onSelect
}) {
  const button = document.createElement('button');
  const position = clockDialPosition(index, count, radius);

  button.type = 'button';
  button.className = 'clock-dial-value';
  button.classList.toggle('is-inner', inner);
  button.classList.toggle('is-selected', selected);
  button.style.setProperty('--dial-x', `${position.x}px`);
  button.style.setProperty('--dial-y', `${position.y}px`);
  button.textContent = String(label).padStart(2, '0');
  button.dataset.value = String(value);
  button.addEventListener('click', onSelect);
  return button;
}

function renderDateCountdownTimeDial() {
  const twelveHourClock = usesTwelveHourClock();
  const isHourMode = dateCountdownPickerMode === 'hours';
  const values = [];

  if (isHourMode && twelveHourClock) {
    for (let displayHour = 1; displayHour <= 12; displayHour += 1) {
      const hour = displayHour % 12
        + (selectedDateCountdownHours >= 12 ? 12 : 0);

      values.push(createClockDialButton({
        label: displayHour,
        value: hour,
        index: displayHour % 12,
        selected: hour === selectedDateCountdownHours,
        onSelect: () => {
          selectedDateCountdownHours = hour;
          setDateCountdownPickerMode('minutes');
          dateCountdownMinuteButton.focus();
        }
      }));
    }
  } else if (isHourMode) {
    for (let hour = 0; hour < 24; hour += 1) {
      const inner = hour >= 12;

      values.push(createClockDialButton({
        label: hour,
        value: hour,
        index: hour % 12,
        radius: inner ? 51 : 84,
        inner,
        selected: hour === selectedDateCountdownHours,
        onSelect: () => {
          selectedDateCountdownHours = hour;
          setDateCountdownPickerMode('minutes');
          dateCountdownMinuteButton.focus();
        }
      }));
    }
  } else {
    const minutes = minuteDialValues();

    values.push(...minutes.map((minute, index) =>
      createClockDialButton({
        label: minute,
        value: minute,
        index,
        selected: minute === selectedDateCountdownMinutes,
        onSelect: () => {
          selectedDateCountdownMinutes = minute;
          renderDateCountdownPicker();
        }
      })
    ));
  }

  dateCountdownClockFace.replaceChildren(...values);
  dateCountdownPeriodSwitch.hidden = !twelveHourClock || !isHourMode;

  for (const button of dateCountdownPeriodSwitch.querySelectorAll('button')) {
    const selectedPeriod = selectedDateCountdownHours < 12 ? 'am' : 'pm';

    button.classList.toggle(
      'is-selected',
      button.dataset.period === selectedPeriod
    );
  }
}

function renderDateCountdownPicker() {
  const isDateMode = dateCountdownPickerMode === 'date';

  dateCountdownPicker.dataset.mode = dateCountdownPickerMode;
  dateCountdownCalendar.hidden = !isDateMode;
  dateCountdownTimeDial.hidden = isDateMode;
  renderDateCountdownTargetControls();

  if (isDateMode) {
    renderDateCountdownCalendar();
  } else {
    renderDateCountdownTimeDial();
  }
}

function setDateCountdownPickerMode(mode) {
  dateCountdownPickerMode = mode;
  renderDateCountdownPicker();
}

function moveCalendarMonth(offset) {
  const shifted = shiftCalendarMonth(
    calendarDisplayYear,
    calendarDisplayMonth,
    offset
  );

  calendarDisplayYear = shifted.year;
  calendarDisplayMonth = shifted.month;
  renderDateCountdownCalendar();
}

function adjustDateCountdownTime(part, amount) {
  if (part === 'hours') {
    selectedDateCountdownHours = wrapClockValue(
      selectedDateCountdownHours + amount,
      24
    );
  } else {
    selectedDateCountdownMinutes = wrapClockValue(
      selectedDateCountdownMinutes + amount,
      60
    );
  }

  renderDateCountdownPicker();
}

function getDateCountdownName(countdown) {
  return getDateCountdownDisplayName(
    countdown,
    t('dateCountdowns.defaultName')
  );
}

function formatDateCountdownTarget(countdown) {
  const target = new Date(countdown.targetTimestamp);

  if (!regionalSettings) {
    return target.toLocaleString(getLocale());
  }

  const options = { locale: getLocale() };

  return `${formatDate(target, regionalSettings, options)} · ${formatTime(
    target,
    regionalSettings,
    options
  )}`;
}

function updateDateCountdownCard(card, countdown, nowTimestamp) {
  const duration = formatDateCountdownDuration(
    countdown.targetTimestamp,
    {
      nowTimestamp,
      showSeconds: countdown.showSeconds,
      dayLabel: t('dateCountdowns.dayShort')
    }
  );
  const name = getDateCountdownName(countdown);
  const target = formatDateCountdownTarget(countdown);
  const time = card.querySelector('.date-countdown-time');

  card.classList.toggle('is-expired', duration === null);
  card.querySelector('.date-countdown-name').textContent = name;
  time.textContent = duration ?? t('dateCountdowns.occurred');
  card.title = [
    name,
    countdown.description,
    target
  ].filter(Boolean).join('\n');
}

function refreshDateCountdownValues() {
  const nowTimestamp = Date.now();

  for (const countdown of dateCountdownStore.getAll()) {
    const card = dateCountdownList.querySelector(
      `[data-countdown-id="${CSS.escape(countdown.id)}"]`
    );

    if (card) {
      updateDateCountdownCard(card, countdown, nowTimestamp);
    }
  }
}

function updateDateCountdownScrollButtons() {
  const hasOverflow = dateCountdownList.scrollWidth
    > dateCountdownList.clientWidth + 1;

  scrollDateCountdownsLeftButton.hidden = !hasOverflow;
  scrollDateCountdownsRightButton.hidden = !hasOverflow;

  if (!hasOverflow) {
    return;
  }

  scrollDateCountdownsLeftButton.disabled =
    dateCountdownList.scrollLeft <= 1;
  scrollDateCountdownsRightButton.disabled =
    dateCountdownList.scrollLeft + dateCountdownList.clientWidth
    >= dateCountdownList.scrollWidth - 1;
}

function createDateCountdownCard(countdown) {
  const card = document.createElement('button');
  const name = document.createElement('span');
  const time = document.createElement('strong');

  card.className = 'date-countdown-card';
  card.type = 'button';
  card.dataset.countdownId = countdown.id;
  card.setAttribute('aria-label', t('dateCountdowns.edit'));

  name.className = 'date-countdown-name';
  time.className = 'date-countdown-time';
  card.append(name, time);
  updateDateCountdownCard(card, countdown, Date.now());

  card.addEventListener('click', () => {
    openDateCountdownEditor(countdown.id);
  });

  return card;
}

function renderDateCountdowns() {
  const countdowns = dateCountdownStore.getAll();
  const hasCountdowns = countdowns.length > 0;

  dateCountdownRibbon.hidden = !hasCountdowns;
  dateCountdownRibbon.classList.toggle(
    'is-collapsed',
    isDateCountdownRibbonCollapsed
  );
  dateCountdownList.replaceChildren(
    ...countdowns.map(createDateCountdownCard)
  );

  const ribbonToggleKey = isDateCountdownRibbonCollapsed
    ? 'dateCountdowns.expand'
    : 'dateCountdowns.collapse';
  const ribbonToggleIcon = toggleDateCountdownRibbonButton
    .querySelector('span');

  toggleDateCountdownRibbonButton.title = t(ribbonToggleKey);
  toggleDateCountdownRibbonButton.setAttribute(
    'aria-label',
    t(ribbonToggleKey)
  );
  toggleDateCountdownRibbonButton.setAttribute(
    'aria-expanded',
    String(!isDateCountdownRibbonCollapsed)
  );
  ribbonToggleIcon.textContent = isDateCountdownRibbonCollapsed
    ? '⌄'
    : '⌃';

  const creationAllowed = canCreateDateCountdown(countdowns.length);

  addDateCountdownButton.classList.toggle(
    'is-locked',
    !creationAllowed
  );
  addDateCountdownButton.setAttribute(
    'aria-disabled',
    String(!creationAllowed)
  );
  addDateCountdownButton.title = creationAllowed
    ? t('dateCountdowns.add')
    : t('dateCountdowns.proLimit');

  requestAnimationFrame(updateDateCountdownScrollButtons);

  if (!dateCountdownDialogBackdrop.hidden) {
    void setMainWindowHeight(MAIN_WINDOW_EDITOR_HEIGHT);
  } else {
    void setMainWindowHeight(
      hasCountdowns
        ? isDateCountdownRibbonCollapsed
          ? MAIN_WINDOW_COLLAPSED_RIBBON_HEIGHT
          : MAIN_WINDOW_RIBBON_HEIGHT
        : MAIN_WINDOW_BASE_HEIGHT
    );
  }
}

function setDateCountdownValidation(messageKey = null) {
  dateCountdownValidationMessage.hidden = messageKey === null;
  dateCountdownValidationMessage.textContent = messageKey
    ? t(messageKey)
    : '';
}

function openDateCountdownEditor(countdownId = null) {
  const countdowns = dateCountdownStore.getAll();
  const countdown = countdownId
    ? dateCountdownStore.get(countdownId)
    : null;

  if (!countdown && !canCreateDateCountdown(countdowns.length)) {
    showTabNotice(t('dateCountdowns.proLimit'));
    return;
  }

  editingDateCountdownId = countdown?.id ?? null;
  const targetTimestamp = countdown?.targetTimestamp
    ?? getDefaultDateCountdownTarget();
  const target = new Date(targetTimestamp);

  dateCountdownDialogTitle.textContent = t(
    countdown
      ? 'dateCountdowns.editTitle'
      : 'dateCountdowns.createTitle'
  );
  dateCountdownNameInput.value = countdown?.name ?? '';
  dateCountdownDescriptionInput.value =
    countdown?.description ?? '';
  selectedDateCountdownDate = {
    year: target.getFullYear(),
    month: target.getMonth(),
    day: target.getDate()
  };
  selectedDateCountdownHours = target.getHours();
  selectedDateCountdownMinutes = target.getMinutes();
  calendarDisplayYear = target.getFullYear();
  calendarDisplayMonth = target.getMonth();
  dateCountdownPickerMode = 'date';
  dateCountdownShowSecondsInput.checked =
    countdown?.showSeconds === true;
  deleteDateCountdownButton.hidden = !countdown;
  setDateCountdownValidation();
  dateCountdownDialogBackdrop.hidden = false;
  renderDateCountdownPicker();
  void setMainWindowHeight(MAIN_WINDOW_EDITOR_HEIGHT);

  requestAnimationFrame(() => {
    dateCountdownNameInput.focus();
    dateCountdownNameInput.select();
  });
}

function closeDateCountdownEditor() {
  editingDateCountdownId = null;
  dateCountdownDialogBackdrop.hidden = true;
  setDateCountdownValidation();
  renderDateCountdowns();
}

function saveDateCountdownFromEditor() {
  const targetTimestamp = selectedDateCountdownTarget();

  if (targetTimestamp === null) {
    setDateCountdownValidation('dateCountdowns.invalidTarget');
    return false;
  }

  if (targetTimestamp <= Date.now()) {
    setDateCountdownValidation('dateCountdowns.pastTarget');
    return false;
  }

  const value = {
    name: dateCountdownNameInput.value,
    description: dateCountdownDescriptionInput.value,
    targetTimestamp,
    showSeconds: dateCountdownShowSecondsInput.checked
  };

  if (editingDateCountdownId) {
    dateCountdownStore.update(editingDateCountdownId, value);
  } else {
    dateCountdownStore.add(value);
  }

  closeDateCountdownEditor();
  return true;
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
  endSignalService.cancelAll();

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
  renderDateCountdowns();

  if (!dateCountdownDialogBackdrop.hidden) {
    dateCountdownDialogTitle.textContent = t(
      editingDateCountdownId
        ? 'dateCountdowns.editTitle'
        : 'dateCountdowns.createTitle'
    );
    renderDateCountdownPicker();
  }

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

[
  minutesInput,
  secondsInput
].forEach((input) => {
  input.addEventListener('wheel', (event) => {
    if (document.activeElement !== input || input.disabled) {
      return;
    }

    event.preventDefault();
    cycleDurationInput(input, event.deltaY < 0 ? -1 : 1);
  }, { passive: false });
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
  if (updaterDialogMode) {
    return;
  }

  settleConfirmation(false);
});

confirmationSecondaryButton.addEventListener('click', () => {
  if (updaterDialogMode) {
    return;
  }

  settleConfirmation(false);
});

confirmationPrimaryButton.addEventListener('click', () => {
  if (updaterDialogMode === 'error') {
    hideUpdaterDialog();
    return;
  }

  if (updaterDialogMode) {
    return;
  }

  settleConfirmation(true);
});

confirmationDialogBackdrop.addEventListener('click', (event) => {
  if (
    !updaterDialogMode
    && event.target === confirmationDialogBackdrop
  ) {
    settleConfirmation(false);
  }
});

confirmationDialogBackdrop.addEventListener('keydown', (event) => {
  if (updaterDialogMode === 'progress') {
    event.preventDefault();
    return;
  }

  if (updaterDialogMode === 'error') {
    if (event.key === 'Enter' || event.key === 'Escape') {
      event.preventDefault();
      hideUpdaterDialog();
    }
    return;
  }

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

dateCountdownList.addEventListener(
  'scroll',
  updateDateCountdownScrollButtons
);

dateCountdownList.addEventListener('wheel', (event) => {
  if (dateCountdownList.scrollWidth <= dateCountdownList.clientWidth) {
    return;
  }

  event.preventDefault();
  dateCountdownList.scrollBy({
    left: event.deltaY || event.deltaX,
    behavior: 'auto'
  });
}, { passive: false });

scrollDateCountdownsLeftButton.addEventListener('click', () => {
  dateCountdownList.scrollBy({
    left: -Math.max(100, dateCountdownList.clientWidth * 0.75),
    behavior: 'smooth'
  });
});

scrollDateCountdownsRightButton.addEventListener('click', () => {
  dateCountdownList.scrollBy({
    left: Math.max(100, dateCountdownList.clientWidth * 0.75),
    behavior: 'smooth'
  });
});

toggleDateCountdownRibbonButton.addEventListener('click', () => {
  isDateCountdownRibbonCollapsed = !isDateCountdownRibbonCollapsed;
  localStorage.setItem(
    DATE_COUNTDOWN_RIBBON_COLLAPSED_STORAGE_KEY,
    String(isDateCountdownRibbonCollapsed)
  );
  renderDateCountdowns();
});

dateCountdownDateButton.addEventListener('click', () => {
  setDateCountdownPickerMode('date');
});

dateCountdownHourButton.addEventListener('click', () => {
  setDateCountdownPickerMode('hours');
});

dateCountdownMinuteButton.addEventListener('click', () => {
  setDateCountdownPickerMode('minutes');
});

for (const [button, part] of [
  [dateCountdownHourButton, 'hours'],
  [dateCountdownMinuteButton, 'minutes']
]) {
  button.addEventListener('focus', () => {
    setDateCountdownPickerMode(part);
  });

  button.addEventListener('keydown', (event) => {
    const direction = ['ArrowUp', 'ArrowRight'].includes(event.key)
      ? 1
      : ['ArrowDown', 'ArrowLeft'].includes(event.key)
        ? -1
        : 0;

    if (direction === 0) {
      return;
    }

    event.preventDefault();
    adjustDateCountdownTime(part, direction);
  });

  button.addEventListener('wheel', (event) => {
    event.preventDefault();
    adjustDateCountdownTime(part, event.deltaY > 0 ? 1 : -1);
  }, { passive: false });
}

dateCountdownPeriodButton.addEventListener('click', () => {
  selectedDateCountdownHours = selectedDateCountdownHours < 12
    ? selectedDateCountdownHours + 12
    : selectedDateCountdownHours - 12;
  renderDateCountdownPicker();
});

dateCountdownPeriodSwitch.addEventListener('click', (event) => {
  const period = event.target.closest('button')?.dataset.period;

  if (!period) {
    return;
  }

  const baseHour = selectedDateCountdownHours % 12;

  selectedDateCountdownHours = baseHour + (period === 'pm' ? 12 : 0);
  renderDateCountdownPicker();
});

previousCalendarMonthButton.addEventListener('click', () => {
  moveCalendarMonth(-1);
});

nextCalendarMonthButton.addEventListener('click', () => {
  moveCalendarMonth(1);
});

dateCountdownCalendar.addEventListener('wheel', (event) => {
  const movement = event.deltaX || event.deltaY;

  if (movement === 0) {
    return;
  }

  event.preventDefault();
  moveCalendarMonth(movement > 0 ? 1 : -1);
}, { passive: false });

addTimerButton.addEventListener('click', () => {
  if (!canCreateTimer(workspace.getEvents().length)) {
    showTabNotice(t('tabs.proLimit'));
    return;
  }

  const eventInstance = workspace.addEvent();
  editingEventId = eventInstance.id;
  applyActiveVisualSettings();
  renderTabs({ focusEditor: true });
  renderActiveTimer();
  refreshStatusIcons();
  void refreshTrayPreview({ force: true });
});

dateCountdownsButton.addEventListener('click', () => {
  const countdowns = dateCountdownStore.getAll();

  if (
    countdowns.length === 1
    && !canCreateDateCountdown(countdowns.length)
  ) {
    openDateCountdownEditor(countdowns[0].id);
    return;
  }

  openDateCountdownEditor();
});

addDateCountdownButton.addEventListener('click', () => {
  openDateCountdownEditor();
});

dateCountdownForm.addEventListener('submit', (event) => {
  event.preventDefault();
  saveDateCountdownFromEditor();
});

dateCountdownDialogXButton.addEventListener(
  'click',
  closeDateCountdownEditor
);

cancelDateCountdownButton.addEventListener(
  'click',
  closeDateCountdownEditor
);

deleteDateCountdownButton.addEventListener('click', async () => {
  if (!editingDateCountdownId) {
    return;
  }

  const countdown = dateCountdownStore.get(editingDateCountdownId);
  const confirmed = await requestConfirmation({
    titleKey: 'dateCountdowns.confirmDeleteTitle',
    messageKey: 'dateCountdowns.confirmDelete',
    primaryKey: 'dateCountdowns.delete',
    secondaryKey: 'window.cancel',
    values: {
      name: countdown
        ? getDateCountdownName(countdown)
        : t('dateCountdowns.defaultName')
    },
    destructive: true
  });

  if (!confirmed) {
    return;
  }

  dateCountdownStore.remove(editingDateCountdownId);
  closeDateCountdownEditor();
});

dateCountdownDialogBackdrop.addEventListener('click', (event) => {
  if (event.target === dateCountdownDialogBackdrop) {
    closeDateCountdownEditor();
  }
});

dateCountdownDialogBackdrop.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeDateCountdownEditor();
  }
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
    const themeId = applyTheme(event.newValue);

    workspace.updateEventSettings(
      workspace.activeEventId,
      { themeId }
    );
    refreshStatusIcons();
    void refreshTrayPreview({ force: true });
  }

  if (
    event.key === GLOW_STORAGE_KEY
    && event.newValue
  ) {
    const glowEnabled = applyGlow(event.newValue);

    workspace.updateEventSettings(
      workspace.activeEventId,
      { glowEnabled }
    );
    void refreshTrayPreview({ force: true });
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
    refreshStatusIcons();
  }

  if (
    event.key === AUDIO_PREFERENCES_STORAGE_KEY
    && event.newValue
  ) {
    applyAudioPreferences(getAudioPreferences());
  }
});

window.addEventListener('beforeunload', () => {
  window.clearInterval(dateCountdownRefreshId);
  workspace.save();
  workspace.destroy();
  endSignalService.cancelAll();
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

await listen(VISUAL_PREVIEW_EVENT, (event) => {
  const { themeId, glowEnabled } = event.payload ?? {};

  applyTheme(themeId);
  applyGlow(glowEnabled);
  refreshStatusIcons();
  void refreshTrayPreview({ force: true });
});

await listen(SIGNAL_SETTINGS_EVENT, (event) => {
  const { eventId, settings } = event.payload ?? {};

  if (!workspace.getEvent(eventId)) {
    return;
  }

  workspace.updateEventSettings(eventId, {
    endSignal: normalizeSignalSettings(settings)
  });
});

await listen(EVENT_DETAILS_EVENT, (event) => {
  const { eventId, name, description } = event.payload ?? {};

  if (!workspace.updateEventDetails(eventId, { name, description })) {
    return;
  }

  renderTabs();
  void refreshTrayPreview({ force: true });
});

await listen(WARNING_SIGNAL_SETTINGS_EVENT, (event) => {
  const { eventId, settings } = event.payload ?? {};

  if (!workspace.getEvent(eventId)) {
    return;
  }

  workspace.updateEventSettings(eventId, {
    warningSignals: normalizeWarningSignalSettings(settings)
  });
});

await listen(REGIONAL_SETTINGS_EVENT, (event) => {
  regionalSettings = event.payload;
  renderDateCountdowns();

  if (!dateCountdownDialogBackdrop.hidden) {
    renderDateCountdownPicker();
  }
});

await listen(AUDIO_PREFERENCES_EVENT, (event) => {
  applyAudioPreferences(event.payload);
});

navigator.mediaDevices?.addEventListener?.('devicechange', () => {
  applyAudioPreferences(appliedAudioPreferences, { force: true });
});

document.documentElement.dataset.edition = getEdition();

applyTheme();
applyGlow();
await applyAppearance(getAppearance());
applyTranslations();
document.title = t('app.title');

const resetActiveTimers = await shouldResetStoredActiveTimers();

workspace.load({ resetActiveTimers });
dateCountdownStore.load();

try {
  regionalSettings = await loadRegionalSettings(invoke);
} catch (error) {
  console.error('Failed to load shared regional settings:', error);
}

migrateTimerVisualSettings();
applyActiveVisualSettings();
refreshLocalizedContent();
dateCountdownRefreshId = window.setInterval(
  refreshDateCountdownValues,
  1000
);
refreshStatusIcons();
void refreshTrayPreview({ force: true });
focusInitialTimerControl();
const availableUpdate = await checkForUpdates();
let updateFlowStarted = false;

if (availableUpdate) {
  const shouldUpdate = await requestConfirmation({
    titleKey: 'updater.title',
    messageKey: 'updater.message',
    primaryKey: 'updater.update',
    secondaryKey: 'updater.later',
    values: { version: availableUpdate.version }
  });

  if (shouldUpdate) {
    updateFlowStarted = true;
    showUpdaterProgress('updater.downloading');

    try {
      await installUpdate(availableUpdate, ({
        phase,
        downloaded,
        total
      }) => {
        if (phase === 'installing') {
          showUpdaterProgress('updater.installing');
          return;
        }

        if (total && total > 0) {
          const percent = Math.min(
            100,
            Math.floor((downloaded / total) * 100)
          );

          showUpdaterProgress(
            'updater.downloadingProgress',
            { percent }
          );
          return;
        }

        showUpdaterProgress('updater.downloading');
      });
    } catch (error) {
      console.error('Failed to install BSL-Timer update:', error);
      showUpdaterError();
    }
  }
}

if (!updateFlowStarted && shouldShowWhatsNew(WHATS_NEW_VERSION)) {
  await openWhatsNewWindow();
}
