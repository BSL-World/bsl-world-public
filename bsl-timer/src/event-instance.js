export const EVENT_INSTANCE_VERSION = 1;

export const EventType = Object.freeze({
  TIMER: 'timer'
});

function createId() {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2)
  ].join('-');
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalizedValue = value.trim();
  return normalizedValue || null;
}

function normalizeOrdinal(value) {
  const number = Number(value);

  if (!Number.isInteger(number) || number < 1) {
    return 1;
  }

  return number;
}

function cloneRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return {};
  }
}

export function createEventInstance({
  id = createId(),
  type = EventType.TIMER,
  name = null,
  ordinal = 1,
  settings = {},
  runtime = {}
} = {}) {
  return {
    version: EVENT_INSTANCE_VERSION,
    id: normalizeText(id) ?? createId(),
    type: normalizeText(type) ?? EventType.TIMER,
    name: normalizeText(name),
    ordinal: normalizeOrdinal(ordinal),
    settings: cloneRecord(settings),
    runtime: cloneRecord(runtime)
  };
}

export function normalizeEventInstance(eventInstance) {
  if (!eventInstance || typeof eventInstance !== 'object') {
    return null;
  }

  return createEventInstance(eventInstance);
}

export function getEventDisplayName(
  eventInstance,
  defaultTypeName = 'Timer'
) {
  return eventInstance.name
    ?? `${defaultTypeName} ${eventInstance.ordinal}`;
}
