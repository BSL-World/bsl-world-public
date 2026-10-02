import assert from 'node:assert/strict';
import test from 'node:test';

import { SignalScheduler } from '../src/signal-scheduler.js';

function createFakeClock() {
  let currentTime = 0;
  let nextId = 1;
  const timers = new Map();

  return {
    now: () => currentTime,
    setTimeout(callback, delay) {
      const id = nextId;
      nextId += 1;
      timers.set(id, {
        callback,
        dueAt: currentTime + delay
      });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    advance(milliseconds) {
      const targetTime = currentTime + milliseconds;

      while (true) {
        const nextTimer = [...timers.entries()]
          .filter(([, timer]) => timer.dueAt <= targetTime)
          .sort(([, first], [, second]) => first.dueAt - second.dueAt)[0];

        if (!nextTimer) {
          break;
        }

        const [id, timer] = nextTimer;
        timers.delete(id);
        currentTime = timer.dueAt;
        timer.callback();
      }

      currentTime = targetTime;
    }
  };
}

function createScheduler(clock, playbacks, completed = []) {
  return new SignalScheduler({
    play: (sequenceId) => {
      playbacks.push({ sequenceId, startedAt: clock.now() });
    },
    onComplete: (sequenceId) => completed.push(sequenceId),
    now: clock.now,
    setTimeoutFn: clock.setTimeout,
    clearTimeoutFn: clock.clearTimeout
  });
}

test('plays the first signal plus the requested additional repeats', async () => {
  const clock = createFakeClock();
  const playbacks = [];
  const completed = [];
  const scheduler = createScheduler(clock, playbacks, completed);

  scheduler.start('tea', {
    repeatCount: 2,
    repeatIntervalMs: 120_000
  });

  clock.advance(240_000);
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(playbacks, [
    { sequenceId: 'tea', startedAt: 0 },
    { sequenceId: 'tea', startedAt: 120_000 },
    { sequenceId: 'tea', startedAt: 240_000 }
  ]);
  assert.deepEqual(completed, ['tea']);
  assert.equal(scheduler.isActive('tea'), false);
});

test('runs sequences for different timers independently', () => {
  const clock = createFakeClock();
  const playbacks = [];
  const scheduler = createScheduler(clock, playbacks);

  scheduler.start('first', {
    repeatCount: 1,
    repeatIntervalMs: 60_000
  });
  scheduler.start('second', {
    repeatCount: 1,
    repeatIntervalMs: 90_000
  });

  clock.advance(90_000);

  assert.deepEqual(playbacks, [
    { sequenceId: 'first', startedAt: 0 },
    { sequenceId: 'second', startedAt: 0 },
    { sequenceId: 'first', startedAt: 60_000 },
    { sequenceId: 'second', startedAt: 90_000 }
  ]);
});

test('cancels a pending repeat sequence', () => {
  const clock = createFakeClock();
  const playbacks = [];
  const scheduler = createScheduler(clock, playbacks);

  scheduler.start('coffee', {
    repeatCount: 10,
    repeatIntervalMs: 60_000
  });
  scheduler.cancel('coffee');
  clock.advance(600_000);

  assert.equal(playbacks.length, 1);
  assert.equal(scheduler.isActive('coffee'), false);
});
