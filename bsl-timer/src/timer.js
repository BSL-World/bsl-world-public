export const TimerState = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  OVERDUE: 'overdue'
});

export class TimerEngine {
  constructor({
    onUpdate = () => {},
    onExpire = () => {},
    tickRateMs = 200
  } = {}) {
    this.onUpdate = onUpdate;
    this.onExpire = onExpire;
    this.tickRateMs = tickRateMs;

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

    this.durationMs = Math.max(0, Number(durationMs) || 0);
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

    this.endTimestamp = Date.now() + this.remainingMs;
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
      this.endTimestamp - Date.now()
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

    this.endTimestamp = Date.now() + this.remainingMs;
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
      overdueMs: this.overdueMs
    };
  }

  startLoop() {
    this.stopLoop();

    this.intervalId = window.setInterval(
      () => this.tick(),
      this.tickRateMs
    );
  }

  stopLoop() {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  tick() {
    if (
      this.state !== TimerState.RUNNING
      && this.state !== TimerState.OVERDUE
    ) {
      return;
    }

    const differenceMs = this.endTimestamp - Date.now();

    if (differenceMs > 0) {
      this.remainingMs = differenceMs;
      this.overdueMs = 0;
      this.state = TimerState.RUNNING;
    } else {
      this.remainingMs = 0;
      this.overdueMs = Math.abs(differenceMs);
      this.state = TimerState.OVERDUE;

      if (!this.expirationEmitted) {
        this.expirationEmitted = true;
        this.onExpire(this.getSnapshot());
      }
    }

    this.emitUpdate();
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