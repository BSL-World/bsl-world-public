import {
  createEventInstance,
  getEventDisplayName
} from './event-instance.js';
import { SessionStore } from './session-store.js';
import { TimerEngine, TimerState } from './timer.js';

export const DEFAULT_TIMER_DURATION_MS = 10 * 60 * 1000;

function cloneRecord(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return JSON.parse(JSON.stringify(value));
}

function isActiveTimerState(state) {
  return state === TimerState.RUNNING
    || state === TimerState.PAUSED
    || state === TimerState.OVERDUE;
}

export class TimerWorkspace {
  constructor({
    sessionStore = new SessionStore(),
    engineFactory = (callbacks) => new TimerEngine(callbacks),
    defaultDurationMs = DEFAULT_TIMER_DURATION_MS,
    onUpdate = () => {},
    onExpire = () => {}
  } = {}) {
    this.sessionStore = sessionStore;
    this.engineFactory = engineFactory;
    this.defaultDurationMs = defaultDurationMs;
    this.onUpdate = onUpdate;
    this.onExpire = onExpire;

    this.events = [];
    this.engines = new Map();
    this.activeEventId = null;
  }

  load({ resetActiveTimers = false } = {}) {
    this.destroy();

    const session = this.sessionStore.load();
    this.events = session.events;
    this.activeEventId = session.activeEventId;

    this.events.forEach((eventInstance) => {
      this.attachEngine(eventInstance, { resetActiveTimers });
    });

    if (resetActiveTimers) {
      this.save();
    }

    return this.getSnapshot();
  }

  attachEngine(eventInstance, { resetActiveTimers = false } = {}) {
    const eventId = eventInstance.id;
    const engine = this.engineFactory({
      onUpdate: (timerSnapshot) => {
        this.onUpdate(eventId, timerSnapshot);
      },
      onExpire: (timerSnapshot) => {
        this.onExpire(eventId, timerSnapshot);
      }
    });

    this.engines.set(eventId, engine);

    if (!engine.restoreState(eventInstance.runtime)) {
      engine.setDuration(this.defaultDurationMs);
    } else if (
      resetActiveTimers
      && isActiveTimerState(engine.getSnapshot().state)
    ) {
      engine.reset();
    }

    return engine;
  }

  getSnapshot() {
    return {
      activeEventId: this.activeEventId,
      events: this.events.map((eventInstance) => ({
        ...eventInstance,
        settings: cloneRecord(eventInstance.settings),
        runtime: this.getEngine(eventInstance.id)?.exportState()
          ?? cloneRecord(eventInstance.runtime)
      }))
    };
  }

  getEvents() {
    return [...this.events];
  }

  getEvent(eventId) {
    return this.events.find(({ id }) => id === eventId) ?? null;
  }

  getActiveEvent() {
    return this.getEvent(this.activeEventId);
  }

  getEngine(eventId) {
    return this.engines.get(eventId) ?? null;
  }

  getActiveEngine() {
    return this.getEngine(this.activeEventId);
  }

  hasActiveTimers() {
    return [...this.engines.values()].some((engine) => (
      isActiveTimerState(engine.getSnapshot().state)
    ));
  }

  hasStoredActiveTimers() {
    return this.sessionStore.load().events.some(
      (eventInstance) => isActiveTimerState(
        eventInstance.runtime?.state
      )
    );
  }

  addEvent({ name = null } = {}) {
    const highestOrdinal = this.events.reduce(
      (highest, eventInstance) => Math.max(
        highest,
        eventInstance.ordinal
      ),
      0
    );
    const activeEvent = this.getActiveEvent();
    const eventInstance = createEventInstance({
      name,
      ordinal: highestOrdinal + 1,
      settings: activeEvent?.settings ?? {}
    });

    this.events.push(eventInstance);
    this.attachEngine(eventInstance);
    this.activeEventId = eventInstance.id;
    this.save();

    return eventInstance;
  }

  removeEvent(eventId) {
    if (this.events.length <= 1) {
      return false;
    }

    const eventIndex = this.events.findIndex(
      ({ id }) => id === eventId
    );

    if (eventIndex < 0) {
      return false;
    }

    this.getEngine(eventId)?.destroy();
    this.engines.delete(eventId);
    this.events.splice(eventIndex, 1);

    if (this.activeEventId === eventId) {
      const nextActiveIndex = Math.min(
        eventIndex,
        this.events.length - 1
      );
      this.activeEventId = this.events[nextActiveIndex].id;
    }

    this.save();
    return true;
  }

  renameEvent(eventId, name) {
    const eventInstance = this.getEvent(eventId);

    if (!eventInstance) {
      return false;
    }

    const normalizedName = typeof name === 'string'
      ? name.trim()
      : '';

    eventInstance.name = normalizedName || null;
    this.save();
    return true;
  }

  setActiveEvent(eventId) {
    if (!this.getEvent(eventId)) {
      return false;
    }

    this.activeEventId = eventId;
    this.save();
    return true;
  }

  getDisplayName(eventId, defaultTypeName = 'Timer') {
    const eventInstance = this.getEvent(eventId);

    return eventInstance
      ? getEventDisplayName(eventInstance, defaultTypeName)
      : '';
  }

  save() {
    const savedSession = this.sessionStore.save(
      this.getSnapshot()
    );

    this.events.forEach((eventInstance) => {
      eventInstance.runtime = this.getEngine(
        eventInstance.id
      )?.exportState() ?? eventInstance.runtime;
    });

    return savedSession;
  }

  destroy() {
    this.engines.forEach((engine) => engine.destroy());
    this.engines.clear();
  }
}
