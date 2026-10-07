export const TimeFormat = Object.freeze({
  SYSTEM: 'system',
  HOUR_24: '24-hour',
  HOUR_12: '12-hour'
});

export const DateFormat = Object.freeze({
  SYSTEM: 'system',
  DAY_MONTH_YEAR_DOTS: 'dd.mm.yyyy',
  DAY_MONTH_YEAR_HYPHENS: 'dd-mm-yyyy',
  DAY_MONTH_SHORT_YEAR_HYPHENS: 'dd-mm-yy',
  YEAR_MONTH_DAY: 'yyyy-mm-dd',
  DAY_TEXT_MONTH_YEAR: 'd-mmm-yyyy',
  TEXT_MONTH_DAY_YEAR: 'mmm-d-yyyy',
  DAY_TEXT_MONTH: 'dd-mmm',
  TEXT_MONTH_DAY: 'mmm-dd'
});

export const FirstDayOfWeek = Object.freeze({
  SYSTEM: 'system',
  MONDAY: 'monday',
  SUNDAY: 'sunday'
});

export const DEFAULT_REGIONAL_SETTINGS = Object.freeze({
  timeFormat: TimeFormat.SYSTEM,
  dateFormat: DateFormat.SYSTEM,
  firstDayOfWeek: FirstDayOfWeek.SYSTEM
});

const TIME_FORMATS = new Set(Object.values(TimeFormat));
const DATE_FORMATS = new Set(Object.values(DateFormat));
const FIRST_DAYS = new Set(Object.values(FirstDayOfWeek));

function normalizeChoice(value, supported, fallback) {
  return supported.has(value) ? value : fallback;
}

export function normalizeRegionalSettings(settings = {}) {
  const source = settings && typeof settings === 'object'
    ? settings
    : {};

  return {
    timeFormat: normalizeChoice(
      source.timeFormat,
      TIME_FORMATS,
      DEFAULT_REGIONAL_SETTINGS.timeFormat
    ),
    dateFormat: normalizeChoice(
      source.dateFormat,
      DATE_FORMATS,
      DEFAULT_REGIONAL_SETTINGS.dateFormat
    ),
    firstDayOfWeek: normalizeChoice(
      source.firstDayOfWeek,
      FIRST_DAYS,
      DEFAULT_REGIONAL_SETTINGS.firstDayOfWeek
    )
  };
}

export function regionalSettingsEqual(first, second) {
  const normalizedFirst = normalizeRegionalSettings(first);
  const normalizedSecond = normalizeRegionalSettings(second);

  return normalizedFirst.timeFormat === normalizedSecond.timeFormat
    && normalizedFirst.dateFormat === normalizedSecond.dateFormat
    && normalizedFirst.firstDayOfWeek
      === normalizedSecond.firstDayOfWeek;
}

function twoDigits(value) {
  return String(value).padStart(2, '0');
}

function textMonth(date, locale) {
  return new Intl.DateTimeFormat(locale, { month: 'short' })
    .format(date)
    .replace(/\.$/, '');
}

export function formatDate(
  value,
  settings = DEFAULT_REGIONAL_SETTINGS,
  { locale, systemLocale } = {}
) {
  const date = value instanceof Date ? value : new Date(value);
  const { dateFormat } = normalizeRegionalSettings(settings);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  if (dateFormat === DateFormat.SYSTEM) {
    return new Intl.DateTimeFormat(systemLocale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(date);
  }

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  switch (dateFormat) {
    case DateFormat.DAY_MONTH_YEAR_DOTS:
      return `${twoDigits(day)}.${twoDigits(month)}.${year}`;
    case DateFormat.DAY_MONTH_YEAR_HYPHENS:
      return `${twoDigits(day)}-${twoDigits(month)}-${year}`;
    case DateFormat.DAY_MONTH_SHORT_YEAR_HYPHENS:
      return `${twoDigits(day)}-${twoDigits(month)}-${twoDigits(year % 100)}`;
    case DateFormat.YEAR_MONTH_DAY:
      return `${year}-${twoDigits(month)}-${twoDigits(day)}`;
    case DateFormat.DAY_TEXT_MONTH_YEAR:
      return `${day} ${textMonth(date, locale)} ${year}`;
    case DateFormat.TEXT_MONTH_DAY_YEAR:
      return `${textMonth(date, locale)} ${day}, ${year}`;
    case DateFormat.DAY_TEXT_MONTH:
      return `${twoDigits(day)} ${textMonth(date, locale)}`;
    case DateFormat.TEXT_MONTH_DAY:
      return `${textMonth(date, locale)}-${twoDigits(day)}`;
    default:
      return '';
  }
}

export function formatTime(
  value,
  settings = DEFAULT_REGIONAL_SETTINGS,
  { locale, systemLocale } = {}
) {
  const date = value instanceof Date ? value : new Date(value);
  const { timeFormat } = normalizeRegionalSettings(settings);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const formatLocale = timeFormat === TimeFormat.SYSTEM
    ? systemLocale
    : locale;
  const options = { hour: '2-digit', minute: '2-digit' };

  if (timeFormat === TimeFormat.HOUR_24) {
    options.hourCycle = 'h23';
  } else if (timeFormat === TimeFormat.HOUR_12) {
    options.hour12 = true;
  }

  return new Intl.DateTimeFormat(formatLocale, options).format(date);
}
