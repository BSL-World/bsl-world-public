import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TimerEngine,
  TimerState
} from '../src/timer.js';

function createClock(initialTime = 0) {
  let currentTime = initialTime;
  let scheduledCallback = null;

  return {
    now: () => currentTime,
    scheduleInterval(callback) {
      scheduledCallback = callback;
      return 1;
    },
    cancelInterval() {
      scheduledCallback = null;
    },
    advance(milliseconds) {
      currentTime += milliseconds;
      scheduledCallback?.();
    }
  };
}

function createTimer(clock, options = {}) {
  return new TimerEngine({
    now: clock.now,
    scheduleInterval: clock.scheduleInterval,
    cancelInterval: clock.cancelInterval,
    ...options
  });
}

test('exports and restores a running timer', () => {
  const firstClock = createClock(1000);
  const firstTimer = createTimer(firstClock);

  firstTimer.setDuration(10000);
  firstTimer.start();
  firstClock.advance(3000);

  const persistedState = firstTimer.exportState();
  const secondClock = createClock(5000);
  const secondTimer = createTimer(secondClock);

  assert.equal(secondTimer.restoreState(persistedState), true);
  assert.equal(secondTimer.getSnapshot().state, TimerState.RUNNING);
  assert.equal(secondTimer.getSnapshot().remainingMs, 6000);
});

test('restores a paused timer without advancing it', () => {
  const firstClock = createClock(0);
  const firstTimer = createTimer(firstClock);

  firstTimer.setDuration(10000);
  firstTimer.start();
  firstClock.advance(2500);
  firstTimer.pause();

  const persistedState = firstTimer.exportState();
  const secondClock = createClock(50000);
  const secondTimer = createTimer(secondClock);

  secondTimer.restoreState(persistedState);

  assert.equal(secondTimer.getSnapshot().state, TimerState.PAUSED);
  assert.equal(secondTimer.getSnapshot().remainingMs, 7500);
});

test('does not treat a missing end timestamp as the Unix epoch', () => {
  const clock = createClock(50000);
  const timer = createTimer(clock);

  timer.restoreState({
    state: TimerState.RUNNING,
    durationMs: 10000,
    remainingMs: 4000,
    overdueMs: 0,
    endTimestamp: null
  });

  assert.equal(timer.getSnapshot().state, TimerState.PAUSED);
  assert.equal(timer.getSnapshot().remainingMs, 4000);
  assert.equal(timer.getSnapshot().endTimestamp, null);
});

test('restores an expired timer without notifying by default', () => {
  const clock = createClock(12000);
  let expirationCount = 0;
  const timer = createTimer(clock, {
    onExpire: () => {
      expirationCount += 1;
    }
  });

  timer.restoreState({
    state: TimerState.RUNNING,
    durationMs: 10000,
    remainingMs: 10000,
    overdueMs: 0,
    endTimestamp: 10000
  });

  assert.equal(timer.getSnapshot().state, TimerState.OVERDUE);
  assert.equal(timer.getSnapshot().overdueMs, 2000);
  assert.equal(expirationCount, 0);
});

test('can notify when a restored timer expired while inactive', () => {
  const clock = createClock(12000);
  let expirationCount = 0;
  const timer = createTimer(clock, {
    onExpire: () => {
      expirationCount += 1;
    }
  });

  timer.restoreState(
    {
      state: TimerState.RUNNING,
      durationMs: 10000,
      remainingMs: 10000,
      overdueMs: 0,
      endTimestamp: 10000
    },
    { notifyIfExpired: true }
  );

  assert.equal(expirationCount, 1);
});
