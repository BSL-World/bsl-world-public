import { invoke } from '@tauri-apps/api/core';
import { emitTo, listen } from '@tauri-apps/api/event';
import { LogicalSize } from '@tauri-apps/api/dpi';
import {
  currentMonitor,
  getCurrentWindow
} from '@tauri-apps/api/window';
import { confirm } from '@tauri-apps/plugin-dialog';
import {
  FirstDayOfWeek,
  TimeFormat,
  formatDate
} from '@bsl-world/desktop-core/regional';

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
  FONT_SIZE_SETTINGS_EVENT,
  FONT_SIZE_STORAGE_KEY,
  applyFontSize,
  getCachedFontSize,
  loadFontSizeSettings
} from './font-size-settings.js';
import {
  APPEARANCE_MODE_SETTINGS_EVENT,
  APPEARANCE_MODE_STORAGE_KEY,
  applyAppearanceMode,
  loadAppearanceModeSettings,
  watchAppearanceMode
} from './appearance-mode-settings.js';
import {
  REGIONAL_SETTINGS_EVENT,
  loadRegionalSettings
} from './regional-settings.js';
import {
  keepWindowInsideWorkArea,
  prepareAuxiliaryWindow
} from './window-position.js';
import { getDateCountdownDisplayName } from './date-countdown.js';
import { DateCountdownStore } from './date-countdown-store.js';
import {
  DATE_COUNTDOWN_CHANGED_EVENT,
  DATE_COUNTDOWN_EDITOR_LABEL,
  DATE_COUNTDOWN_EDITOR_OPEN_EVENT,
  DATE_COUNTDOWN_EDITOR_REQUEST_KEY,
  dateCountdownEditorValuesEqual,
  getDateCountdownEditorMinimumHeight
} from './date-countdown-editor.js';
import {
  clockDialPosition,
  createCalendarDays,
  minuteDialValues,
  shiftCalendarMonth,
  wrapClockValue
} from './date-time-picker.js';

const appWindow = getCurrentWindow();
const editorPage = document.querySelector('.date-countdown-editor-page');
const form = document.getElementById('date-countdown-form');
const nameInput = document.getElementById('date-countdown-name-input');
const descriptionInput = document.getElementById(
  'date-countdown-description-input'
);
const dateButton = document.getElementById('date-countdown-date-button');
const hourButton = document.getElementById('date-countdown-hour-button');
const minuteButton = document.getElementById('date-countdown-minute-button');
const periodButton = document.getElementById('date-countdown-period-button');
const picker = document.getElementById('date-countdown-picker');
const calendar = document.getElementById('date-countdown-calendar');
const previousMonthButton = document.getElementById(
  'previous-calendar-month-btn'
);
const nextMonthButton = document.getElementById(
  'next-calendar-month-btn'
);
const monthLabel = document.getElementById('calendar-month-label');
const weekdays = document.getElementById('calendar-weekdays');
const calendarDays = document.getElementById('calendar-days');
const timeDial = document.getElementById('date-countdown-time-dial');
const clockFace = document.getElementById('date-countdown-clock-face');
const periodSwitch = document.getElementById(
  'date-countdown-period-switch'
);
const showSecondsInput = document.getElementById(
  'date-countdown-show-seconds-input'
);
const validationMessage = document.getElementById(
  'date-countdown-validation-message'
);
const deleteButton = document.getElementById(
  'delete-date-countdown-btn'
);
const cancelButton = document.getElementById(
  'cancel-date-countdown-btn'
);
const applyButton = document.getElementById(
  'apply-date-countdown-btn'
);

const store = new DateCountdownStore();

let editingCountdownId = null;
let committedEditorValue = null;
let regionalSettings = null;
let pickerMode = 'date';
let selectedDate = null;
let selectedHours = 0;
let selectedMinutes = 0;
let calendarYear = 0;
let calendarMonth = 0;
let isClosing = false;

function getDefaultTarget() {
  const target = new Date(Date.now() + 24 * 60 * 60 * 1000);

  target.setSeconds(0, 0);
  target.setMinutes(Math.ceil(target.getMinutes() / 5) * 5);
  return target.getTime();
}

function getFirstDayOfWeek() {
  if (regionalSettings?.firstDayOfWeek === FirstDayOfWeek.MONDAY) {
    return 1;
  }

  if (regionalSettings?.firstDayOfWeek === FirstDayOfWeek.SUNDAY) {
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
  if (regionalSettings?.timeFormat === TimeFormat.HOUR_12) {
    return true;
  }

  if (regionalSettings?.timeFormat === TimeFormat.HOUR_24) {
    return false;
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric'
  }).resolvedOptions().hour12 === true;
}

function selectedTarget() {
  if (!selectedDate) {
    return null;
  }

  const target = new Date(
    selectedDate.year,
    selectedDate.month,
    selectedDate.day,
    selectedHours,
    selectedMinutes,
    0,
    0
  );

  return Number.isNaN(target.getTime()) ? null : target.getTime();
}

function readEditorValue() {
  return {
    name: nameInput.value,
    description: descriptionInput.value,
    targetTimestamp: selectedTarget(),
    showSeconds: showSecondsInput.checked
  };
}

function hasUnsavedChanges() {
  return !dateCountdownEditorValuesEqual(
    readEditorValue(),
    committedEditorValue
  );
}

function updateActions() {
  applyButton.disabled = !hasUnsavedChanges();
}

function setValidation(messageKey = null) {
  validationMessage.hidden = messageKey === null;
  validationMessage.textContent = messageKey ? t(messageKey) : '';
}

function renderTargetControls() {
  if (!selectedDate) {
    return;
  }

  const target = new Date(selectedTarget());
  const twelveHourClock = usesTwelveHourClock();
  const displayHours = twelveHourClock
    ? selectedHours % 12 || 12
    : selectedHours;

  dateButton.textContent = regionalSettings
    ? formatDate(target, regionalSettings, { locale: getLocale() })
    : target.toLocaleDateString(getLocale());
  hourButton.textContent = String(displayHours).padStart(2, '0');
  minuteButton.textContent = String(selectedMinutes).padStart(2, '0');
  periodButton.hidden = !twelveHourClock;
  periodButton.textContent = selectedHours < 12 ? 'AM' : 'PM';

  dateButton.classList.toggle('is-active', pickerMode === 'date');
  hourButton.classList.toggle('is-active', pickerMode === 'hours');
  minuteButton.classList.toggle('is-active', pickerMode === 'minutes');
}

function renderCalendar() {
  const firstDayOfWeek = getFirstDayOfWeek();
  const monthDate = new Date(calendarYear, calendarMonth, 1);
  const weekdayFormatter = new Intl.DateTimeFormat(getLocale(), {
    weekday: 'short'
  });

  monthLabel.textContent = new Intl.DateTimeFormat(getLocale(), {
    month: 'long',
    year: 'numeric'
  }).format(monthDate);

  weekdays.replaceChildren(
    ...Array.from({ length: 7 }, (_, index) => {
      const label = document.createElement('span');
      const weekday = new Date(2024, 0, 7 + firstDayOfWeek + index);

      label.textContent = weekdayFormatter.format(weekday)
        .replace(/\.$/, '');
      return label;
    })
  );

  calendarDays.replaceChildren(
    ...createCalendarDays(calendarYear, calendarMonth, {
      firstDayOfWeek
    }).map((day) => {
      const button = document.createElement('button');
      const isSelected = day.year === selectedDate?.year
        && day.month === selectedDate?.month
        && day.day === selectedDate?.day;

      button.type = 'button';
      button.textContent = String(day.day);
      button.className = 'calendar-day';
      button.classList.toggle('is-adjacent', !day.inCurrentMonth);
      button.classList.toggle('is-today', day.isToday);
      button.classList.toggle('is-selected', isSelected);
      button.setAttribute('aria-pressed', String(isSelected));
      button.addEventListener('click', () => {
        selectedDate = {
          year: day.year,
          month: day.month,
          day: day.day
        };
        calendarYear = day.year;
        calendarMonth = day.month;
        setPickerMode('hours');
        hourButton.focus();
      });
      return button;
    })
  );
}

function createDialButton({
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

function renderTimeDial() {
  const twelveHourClock = usesTwelveHourClock();
  const isHourMode = pickerMode === 'hours';
  const values = [];

  if (isHourMode && twelveHourClock) {
    for (let displayHour = 1; displayHour <= 12; displayHour += 1) {
      const hour = displayHour % 12
        + (selectedHours >= 12 ? 12 : 0);

      values.push(createDialButton({
        label: displayHour,
        value: hour,
        index: displayHour % 12,
        selected: hour === selectedHours,
        onSelect: () => {
          selectedHours = hour;
          setPickerMode('minutes');
          minuteButton.focus();
        }
      }));
    }
  } else if (isHourMode) {
    for (let hour = 0; hour < 24; hour += 1) {
      const inner = hour >= 12;

      values.push(createDialButton({
        label: hour,
        value: hour,
        index: hour % 12,
        radius: inner ? 51 : 84,
        inner,
        selected: hour === selectedHours,
        onSelect: () => {
          selectedHours = hour;
          setPickerMode('minutes');
          minuteButton.focus();
        }
      }));
    }
  } else {
    values.push(...minuteDialValues().map((minute, index) =>
      createDialButton({
        label: minute,
        value: minute,
        index,
        selected: minute === selectedMinutes,
        onSelect: () => {
          selectedMinutes = minute;
          renderPicker();
        }
      })
    ));
  }

  clockFace.replaceChildren(...values);
  periodSwitch.hidden = !twelveHourClock || !isHourMode;

  for (const button of periodSwitch.querySelectorAll('button')) {
    const selectedPeriod = selectedHours < 12 ? 'am' : 'pm';

    button.classList.toggle(
      'is-selected',
      button.dataset.period === selectedPeriod
    );
  }
}

function renderPicker() {
  const isDateMode = pickerMode === 'date';

  picker.dataset.mode = pickerMode;
  calendar.hidden = !isDateMode;
  timeDial.hidden = isDateMode;
  renderTargetControls();

  if (isDateMode) {
    renderCalendar();
  } else {
    renderTimeDial();
  }

  if (committedEditorValue !== null) {
    updateActions();
  }
}

function setPickerMode(mode) {
  pickerMode = mode;
  renderPicker();
}

function moveMonth(offset) {
  const shifted = shiftCalendarMonth(
    calendarYear,
    calendarMonth,
    offset
  );

  calendarYear = shifted.year;
  calendarMonth = shifted.month;
  renderCalendar();
}

function adjustTime(part, amount) {
  if (part === 'hours') {
    selectedHours = wrapClockValue(selectedHours + amount, 24);
  } else {
    selectedMinutes = wrapClockValue(selectedMinutes + amount, 60);
  }

  renderPicker();
}

function readRequestedCountdownId() {
  const storedRequest = localStorage.getItem(
    DATE_COUNTDOWN_EDITOR_REQUEST_KEY
  );

  localStorage.removeItem(DATE_COUNTDOWN_EDITOR_REQUEST_KEY);

  if (!storedRequest) {
    return null;
  }

  try {
    const countdownId = JSON.parse(storedRequest)?.countdownId;
    return typeof countdownId === 'string' ? countdownId : null;
  } catch {
    return null;
  }
}

async function updateWindowTitle() {
  const title = t(
    editingCountdownId
      ? 'dateCountdowns.editTitle'
      : 'dateCountdowns.createTitle'
  );

  document.title = title;
  await appWindow.setTitle(title);
}

async function fitWindowToContent() {
  try {
    const widthByFontSize = {
      small: 440,
      normal: 460,
      large: 520
    };
    const targetWidth = widthByFontSize[getCachedFontSize()] ?? 460;
    const initialScaleFactor = window.devicePixelRatio ?? 1;
    const initialSize = (await appWindow.innerSize()).toLogical(
      initialScaleFactor
    );

    if (Math.abs(initialSize.width - targetWidth) > 1) {
      await appWindow.setSize(new LogicalSize(
        targetWidth,
        initialSize.height
      ));
    }

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
    const workAreaHeight = monitor
      ? monitor.workArea.size.toLogical(monitor.scaleFactor).height
      : 760;
    const maximumHeight = Math.max(480, workAreaHeight - 80);
    const contentHeight = Math.ceil(editorPage.scrollHeight) + 24;
    const minimumHeight = getDateCountdownEditorMinimumHeight(
      getCachedFontSize()
    );
    const targetHeight = Math.min(
      maximumHeight,
      Math.max(minimumHeight, contentHeight)
    );

    if (
      Math.abs(currentSize.width - targetWidth) > 1
      || Math.abs(currentSize.height - targetHeight) > 1
    ) {
      await appWindow.setSize(new LogicalSize(
        targetWidth,
        targetHeight
      ));
    }

    await keepWindowInsideWorkArea(appWindow);
  } catch (error) {
    console.error('Failed to fit the event editor:', error);
  }
}

async function loadCountdown(countdownId = null) {
  store.load();
  const countdown = countdownId ? store.get(countdownId) : null;
  const target = new Date(
    countdown?.targetTimestamp ?? getDefaultTarget()
  );

  editingCountdownId = countdown?.id ?? null;
  nameInput.value = countdown?.name ?? '';
  descriptionInput.value = countdown?.description ?? '';
  selectedDate = {
    year: target.getFullYear(),
    month: target.getMonth(),
    day: target.getDate()
  };
  selectedHours = target.getHours();
  selectedMinutes = target.getMinutes();
  calendarYear = target.getFullYear();
  calendarMonth = target.getMonth();
  pickerMode = 'date';
  showSecondsInput.checked = countdown?.showSeconds === true;
  deleteButton.hidden = !countdown;
  setValidation();
  renderPicker();
  committedEditorValue = readEditorValue();
  updateActions();
  await updateWindowTitle();
  await fitWindowToContent();

  requestAnimationFrame(() => {
    nameInput.focus();
    nameInput.select();
  });
}

async function showConfirmation(message, options) {
  try {
    return await confirm(message, options);
  } catch (error) {
    console.error('Failed to show native confirmation dialog:', error);
    return window.confirm(
      [options?.title, message].filter(Boolean).join('\n\n')
    );
  }
}

async function confirmDiscardChanges() {
  if (!hasUnsavedChanges()) {
    return true;
  }

  return showConfirmation(t('dateCountdowns.discardChanges'), {
    title: t('dateCountdowns.discardChangesTitle'),
    kind: 'warning',
    okLabel: t('dateCountdowns.discardChangesAction'),
    cancelLabel: t('window.cancel')
  });
}

async function requestClose() {
  if (isClosing || !await confirmDiscardChanges()) {
    return false;
  }

  isClosing = true;
  await appWindow.destroy();
  return true;
}

async function requestLoadCountdown(countdownId) {
  if (
    countdownId === editingCountdownId
    || !await confirmDiscardChanges()
  ) {
    return;
  }

  await loadCountdown(countdownId);
}

async function notifyMainWindow() {
  await emitTo('main', DATE_COUNTDOWN_CHANGED_EVENT, {
    countdownId: editingCountdownId
  });
}

async function saveCountdown({ close = true } = {}) {
  const targetTimestamp = selectedTarget();

  if (targetTimestamp === null) {
    setValidation('dateCountdowns.invalidTarget');
    return false;
  }

  if (targetTimestamp <= Date.now()) {
    setValidation('dateCountdowns.pastTarget');
    return false;
  }

  const value = {
    name: nameInput.value,
    description: descriptionInput.value,
    targetTimestamp,
    showSeconds: showSecondsInput.checked
  };

  store.load();
  const savedCountdown = editingCountdownId
    ? store.update(editingCountdownId, value)
    : store.add(value);

  if (!savedCountdown) {
    return false;
  }

  editingCountdownId = savedCountdown.id;
  nameInput.value = savedCountdown.name ?? '';
  descriptionInput.value = savedCountdown.description ?? '';
  deleteButton.hidden = false;
  committedEditorValue = readEditorValue();
  setValidation();
  updateActions();
  await updateWindowTitle();
  await notifyMainWindow();

  if (close) {
    isClosing = true;
    await appWindow.destroy();
  }

  return true;
}

async function deleteCountdown() {
  if (!editingCountdownId) {
    return;
  }

  store.load();
  const countdown = store.get(editingCountdownId);
  const name = countdown
    ? getDateCountdownDisplayName(
      countdown,
      t('dateCountdowns.defaultName')
    )
    : t('dateCountdowns.defaultName');
  const confirmed = await showConfirmation(
    t('dateCountdowns.confirmDelete', { name }),
    {
      title: t('dateCountdowns.confirmDeleteTitle'),
      kind: 'warning',
      okLabel: t('dateCountdowns.delete'),
      cancelLabel: t('window.cancel')
    }
  );

  if (!confirmed || !store.remove(editingCountdownId)) {
    return;
  }

  await notifyMainWindow();
  isClosing = true;
  await appWindow.destroy();
}

function updateInterface() {
  applyTranslations();
  void updateWindowTitle();
  renderPicker();
  void fitWindowToContent();
}

dateButton.addEventListener('click', () => setPickerMode('date'));
hourButton.addEventListener('click', () => setPickerMode('hours'));
minuteButton.addEventListener('click', () => setPickerMode('minutes'));

for (const [button, part] of [
  [hourButton, 'hours'],
  [minuteButton, 'minutes']
]) {
  button.addEventListener('focus', () => setPickerMode(part));
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
    adjustTime(part, direction);
  });
  button.addEventListener('wheel', (event) => {
    event.preventDefault();
    adjustTime(part, event.deltaY > 0 ? 1 : -1);
  }, { passive: false });
}

periodButton.addEventListener('click', () => {
  selectedHours = selectedHours < 12
    ? selectedHours + 12
    : selectedHours - 12;
  renderPicker();
});

periodSwitch.addEventListener('click', (event) => {
  const period = event.target.closest('button')?.dataset.period;

  if (!period) {
    return;
  }

  selectedHours = selectedHours % 12 + (period === 'pm' ? 12 : 0);
  renderPicker();
});

previousMonthButton.addEventListener('click', () => moveMonth(-1));
nextMonthButton.addEventListener('click', () => moveMonth(1));
calendar.addEventListener('wheel', (event) => {
  const movement = event.deltaX || event.deltaY;

  if (movement === 0) {
    return;
  }

  event.preventDefault();
  moveMonth(movement > 0 ? 1 : -1);
}, { passive: false });

form.addEventListener('submit', (event) => {
  event.preventDefault();
  void saveCountdown();
});
form.addEventListener('input', updateActions);
cancelButton.addEventListener('click', () => void requestClose());
applyButton.addEventListener('click', () => {
  void saveCountdown({ close: false });
});
deleteButton.addEventListener('click', () => void deleteCountdown());

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    void requestClose();
  }
});

window.addEventListener('bsl-timer:locale-changed', updateInterface);
window.addEventListener('storage', (event) => {
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
  }
});

await appWindow.onCloseRequested((event) => {
  if (isClosing) {
    return;
  }

  event.preventDefault();
  void requestClose();
});

await listen(DATE_COUNTDOWN_EDITOR_OPEN_EVENT, (event) => {
  const countdownId = typeof event.payload?.countdownId === 'string'
    ? event.payload.countdownId
    : null;

  void requestLoadCountdown(countdownId);
});

await listen(REGIONAL_SETTINGS_EVENT, (event) => {
  regionalSettings = event.payload;
  renderPicker();
});

await listen(FONT_SIZE_SETTINGS_EVENT, (event) => {
  applyFontSize(event.payload?.fontSize);
  void fitWindowToContent();
});

await listen(APPEARANCE_MODE_SETTINGS_EVENT, (event) => {
  applyAppearanceMode(event.payload?.mode);
});

applyTheme();
applyGlow();
applyAppearanceMode();
watchAppearanceMode();
applyFontSize();
applyTranslations();

try {
  regionalSettings = await loadRegionalSettings(invoke);
} catch (error) {
  console.error('Failed to load shared regional settings:', error);
}

try {
  await loadFontSizeSettings(invoke);
} catch (error) {
  console.error('Failed to load shared font-size settings:', error);
}

try {
  await loadAppearanceModeSettings(invoke);
} catch (error) {
  console.error('Failed to load shared appearance mode:', error);
}

await loadCountdown(readRequestedCountdownId());
await prepareAuxiliaryWindow(appWindow);

if (appWindow.label !== DATE_COUNTDOWN_EDITOR_LABEL) {
  console.warn('Unexpected event editor window label:', appWindow.label);
}
