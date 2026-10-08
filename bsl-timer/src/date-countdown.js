export const DATE_COUNTDOWN_VERSION = 1;
export const MAX_DATE_COUNTDOWN_NAME_LENGTH = 40;
export const MAX_DATE_COUNTDOWN_DESCRIPTION_LENGTH = 300;

function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2)
  ].join('-');
}

function normalizeText(value, maximumLength) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value
    .replaceAll('\r\n', '\n')
    .replaceAll('\r', '\n')
    .trim()
    .slice(0, maximumLength);

  return normalizedValue || null;
}

function normalizeTimestamp(value, fallback) {
  const timestamp = Number(value);

  return Number.isFinite(timestamp) && timestamp > 0
    ? Math.trunc(timestamp)
    : fallback;
}

function normalizeOrdinal(value) {
  const ordinal = Number(value);

  return Number.isInteger(ordinal) && ordinal > 0
    ? ordinal
    : 1;
}

export function createDateCountdown({
  id = createId(),
  name = null,
  description = null,
  targetTimestamp = Date.now() + 24 * 60 * 60 * 1000,
  showSeconds = false,
  ordinal = 1
} = {}) {
  return {
    version: DATE_COUNTDOWN_VERSION,
    id: normalizeText(id, 120) ?? createId(),
    name: normalizeText(name, MAX_DATE_COUNTDOWN_NAME_LENGTH),
    description: normalizeText(
      description,
      MAX_DATE_COUNTDOWN_DESCRIPTION_LENGTH
    ),
    targetTimestamp: normalizeTimestamp(
      targetTimestamp,
      Date.now() + 24 * 60 * 60 * 1000
    ),
    showSeconds: showSeconds === true,
    ordinal: normalizeOrdinal(ordinal)
  };
}

export function normalizeDateCountdown(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return createDateCountdown(value);
}

export function getDateCountdownDisplayName(
  countdown,
  defaultTypeName = 'Event'
) {
  return countdown.name
    ?? `${defaultTypeName} ${countdown.ordinal}`;
}

export function getDateCountdownParts(
  targetTimestamp,
  nowTimestamp = Date.now()
) {
  const differenceMs = Math.max(
    0,
    Number(targetTimestamp) - Number(nowTimestamp)
  );
  const totalSeconds = Math.floor(differenceMs / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    expired: Number(targetTimestamp) <= Number(nowTimestamp),
    differenceMs,
    days,
    hours,
    minutes,
    seconds
  };
}

export function formatDateCountdownDuration(
  targetTimestamp,
  {
    nowTimestamp = Date.now(),
    showSeconds = false,
    dayLabel = 'd'
  } = {}
) {
  const parts = getDateCountdownParts(targetTimestamp, nowTimestamp);

  if (parts.expired) {
    return null;
  }

  const clock = [
    parts.hours,
    parts.minutes,
    ...(showSeconds ? [parts.seconds] : [])
  ].map((value) => String(value).padStart(2, '0')).join(':');

  return parts.days > 0
    ? `${parts.days} ${dayLabel} · ${clock}`
    : clock;
}

export function dateCountdownToLocalInputs(timestamp) {
  const date = new Date(timestamp);
  const pad = (value) => String(value).padStart(2, '0');

  return {
    date: [
      date.getFullYear(),
      pad(date.getMonth() + 1),
      pad(date.getDate())
    ].join('-'),
    time: [
      pad(date.getHours()),
      pad(date.getMinutes())
    ].join(':')
  };
}

export function localInputsToDateCountdownTimestamp(
  dateValue,
  timeValue
) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(
    String(dateValue)
  );
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(
    String(timeValue)
  );

  if (!dateMatch || !timeMatch) {
    return null;
  }

  const [, year, month, day] = dateMatch.map(Number);
  const [, hours, minutes] = timeMatch.map(Number);
  const date = new Date(year, month - 1, day, hours, minutes, 0, 0);

  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
    || date.getHours() !== hours
    || date.getMinutes() !== minutes
  ) {
    return null;
  }

  return date.getTime();
}
