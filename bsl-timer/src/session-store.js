import {
  createEventInstance,
  normalizeEventInstance
} from './event-instance.js';

export const SESSION_STORAGE_KEY = 'bsl-timer.session';
export const SESSION_VERSION = 1;

export function createEmptySession() {
  const firstEvent = createEventInstance({ ordinal: 1 });

  return {
    version: SESSION_VERSION,
    activeEventId: firstEvent.id,
    events: [firstEvent]
  };
}

export function normalizeSession(session) {
  if (!session || typeof session !== 'object') {
    return createEmptySession();
  }

  const events = Array.isArray(session.events)
    ? session.events
      .map(normalizeEventInstance)
      .filter(Boolean)
    : [];

  if (events.length === 0) {
    return createEmptySession();
  }

  const requestedActiveEventId = session.activeEventId;
  const activeEventId = events.some(
    ({ id }) => id === requestedActiveEventId
  )
    ? requestedActiveEventId
    : events[0].id;

  return {
    version: SESSION_VERSION,
    activeEventId,
    events
  };
}

export class SessionStore {
  constructor({
    storage = globalThis.localStorage,
    storageKey = SESSION_STORAGE_KEY
  } = {}) {
    if (!storage) {
      throw new Error('Session storage is not available');
    }

    this.storage = storage;
    this.storageKey = storageKey;
  }

  load() {
    const storedSession = this.storage.getItem(this.storageKey);

    if (!storedSession) {
      return createEmptySession();
    }

    try {
      return normalizeSession(JSON.parse(storedSession));
    } catch {
      return createEmptySession();
    }
  }

  save(session) {
    const normalizedSession = normalizeSession(session);

    this.storage.setItem(
      this.storageKey,
      JSON.stringify(normalizedSession)
    );

    return normalizedSession;
  }

  clear() {
    this.storage.removeItem(this.storageKey);
  }
}
