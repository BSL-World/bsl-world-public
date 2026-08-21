export const TimerState = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  OVERDUE: 'overdue'
});

export const TIMER_STATE_VERSION = 1;

function normalizeMilliseconds(value, fallback = 0) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.max(0, number);
}

function isTimerState(value) {
  return Object.values(TimerState).includes(value);
}

export class TimerEngine {
  constructor({
    onUpdate = () => {},
    onExpire = () => {},
    tickRateMs = 200,
    now = () => Date.now(),
    scheduleInterval = (callback, delay) => (
      globalThis.setInterval(callback, delay)
    ),
    cancelInterval = (intervalId) => (
      globalThis.clearInterval(intervalId)
    )
  } = {}) {
    this.onUpdate = onUpdate;
    this.onExpire = onExpire;
    this.tickRateMs = tickRateMs;
    this.now = now;
    this.scheduleInterval = scheduleInterval;
    this.cancelInterval = cancelInterval;

    this.durationMs = 0;
    this.remainingMs = 0;
    this.overdueMs = 0;
    this.endTimestamp = null;
    this.intervalId = null;
    this.state = TimerState.IDLE;
    this.expirationEmitted = false;
  }

  setDuration(durationMs) {
    this.stopLoop();

    this.durationMs = normalizeMilliseconds(durationMs);
    this.remainingMs = this.durationMs;
    this.overdueMs = 0;
    this.endTimestamp = null;
    this.state = TimerState.IDLE;
    this.expirationEmitted = false;

    this.emitUpdate();
  }

  start() {
    if (this.state === TimerState.PAUSED) {
      return this.resume();
    }

    if (
      this.state === TimerState.RUNNING
      || this.state === TimerState.OVERDUE
      || this.remainingMs <= 0
    ) {
      return false;
    }

    this.endTimestamp = this.now() + this.remainingMs;
    this.state = TimerState.RUNNING;
    this.startLoop();
    this.tick();

    return true;
  }

  pause() {
    if (this.state !== TimerState.RUNNING) {
      return false;
    }

    this.remainingMs = Math.max(
      0,
      this.endTimestamp - this.now()
    );

    if (this.remainingMs <= 0) {
      this.tick();
      return false;
    }

    this.stopLoop();
    this.endTimestamp = null;
    this.state = TimerState.PAUSED;
    this.emitUpdate();

    return true;
  }

  resume() {
    if (
      this.state !== TimerState.PAUSED
      || this.remainingMs <= 0
    ) {
      return false;
    }

    this.endTimestamp = this.now() + this.remainingMs;
    this.state = TimerState.RUNNING;
    this.startLoop();
    this.tick();

    return true;
  }

  reset() {
    this.stopLoop();

    this.remainingMs = this.durationMs;
    this.overdueMs = 0;
    this.endTimestamp = null;
    this.state = TimerState.IDLE;
    this.expirationEmitted = false;

    this.emitUpdate();
  }

  destroy() {
    this.stopLoop();
  }

  getSnapshot() {
    return {
      state: this.state,
      durationMs: this.durationMs,
      remainingMs: this.remainingMs,
      overdueMs: this.overdueMs,
      endTimestamp: this.endTimestamp
    };
  }

  exportState() {
    this.syncWithClock({
      emitExpiration: false,
      emitUpdate: false
    });

    return {
      version: TIMER_STATE_VERSION,
      state: this.state,
      durationMs: this.durationMs,
      remainingMs: this.remainingMs,
      overdueMs: this.overdueMs,
      endTimestamp: this.endTimestamp
    };
  }

  restoreState(persistedState, {
    notifyIfExpired = false
  } = {}) {
    if (
      !persistedState
      || typeof persistedState !== 'object'
      || !isTimerState(persistedState.state)
    ) {
      return false;
    }

    this.stopLoop();

    this.durationMs = normalizeMilliseconds(
      persistedState.durationMs
    );
    this.remainingMs = normalizeMilliseconds(
      persistedState.remainingMs,
      this.durationMs
    );
    this.overdueMs = normalizeMilliseconds(
      persistedState.overdueMs
    );
    this.endTimestamp = persistedState.endTimestamp !== null
      && persistedState.endTimestamp !== undefined
      && Number.isFinite(Number(persistedState.endTimestamp))
      ? Number(persistedState.endTimestamp)
      : null;
    this.state = persistedState.state;
    this.expirationEmitted = false;

    if (
      this.state === TimerState.RUNNING
      || this.state === TimerState.OVERDUE
    ) {
      if (this.endTimestamp === null) {
        this.state = TimerState.PAUSED;
        this.overdueMs = 0;
        this.emitUpdate();
        return true;
      }

      const isExpired = this.endTimestamp <= this.now();
      this.expirationEmitted = isExpired && !notifyIfExpired;
      this.startLoop();
      this.tick();
      return true;
    }

    this.endTimestamp = null;
    this.overdueMs = 0;

    if (this.state === TimerState.IDLE) {
      this.remainingMs = this.durationMs;
    }

    this.emitUpdate();
    return true;
  }

  startLoop() {
    this.stopLoop();

    this.intervalId = this.scheduleInterval(
      () => this.tick(),
      this.tickRateMs
    );
  }

  stopLoop() {
    if (this.intervalId !== null) {
      this.cancelInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick() {
    this.syncWithClock();
  }

  syncWithClock({
    emitExpiration = true,
    emitUpdate = true
  } = {}) {
    if (
      this.state !== TimerState.RUNNING
      && this.state !== TimerState.OVERDUE
    ) {
      return;
    }

    const differenceMs = this.endTimestamp - this.now();

    if (differenceMs > 0) {
      this.remainingMs = differenceMs;
      this.overdueMs = 0;
      this.state = TimerState.RUNNING;
    } else {
      this.remainingMs = 0;
      this.overdueMs = Math.abs(differenceMs);
      this.state = TimerState.OVERDUE;

      if (!this.expirationEmitted && emitExpiration) {
        this.expirationEmitted = true;
        this.onExpire(this.getSnapshot());
      }
    }

    if (emitUpdate) {
      this.emitUpdate();
    }
  }

  emitUpdate() {
    this.onUpdate(this.getSnapshot());
  }
}

export function durationToMilliseconds({
  hours = 0,
  minutes = 0,
  seconds = 0
}) {
  const totalSeconds =
    Math.max(0, Number(hours) || 0) * 3600
    + Math.max(0, Number(minutes) || 0) * 60
    + Math.max(0, Number(seconds) || 0);

  return totalSeconds * 1000;
}

export function millisecondsToClock(milliseconds, roundUp = false) {
  const safeMilliseconds = Math.max(
    0,
    Number(milliseconds) || 0
  );

  const totalSeconds = roundUp
    ? Math.ceil(safeMilliseconds / 1000)
    : Math.floor(safeMilliseconds / 1000);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
}
