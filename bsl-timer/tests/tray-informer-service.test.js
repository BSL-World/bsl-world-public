import assert from 'node:assert/strict';
import test from 'node:test';

import { TrayInformerService } from '../src/tray-informer-service.js';

function createClock() {
  let currentTime = 0;
  let nextId = 1;
  const timers = new Map();

  return {
    setTimeout(callback, delay) {
      const id = nextId++;
      timers.set(id, { callback, dueAt: currentTime + delay });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    advance(milliseconds) {
      const target = currentTime + milliseconds;

      while (true) {
        const next = [...timers.entries()]
          .filter(([, timer]) => timer.dueAt <= target)
          .sort(([, first], [, second]) => first.dueAt - second.dueAt)[0];

        if (!next) {
          break;
        }

        const [id, timer] = next;
        timers.delete(id);
        currentTime = timer.dueAt;
        timer.callback();
      }

      currentTime = target;
    }
  };
}

function createService(clock, events) {
  return new TrayInformerService({
    show: (data) => {
      events.push(['show', data]);
      return 7;
    },
    startFade: () => events.push(['fade']),
    hide: (generation) => events.push(['hide', generation]),
    setTimeoutFn: clock.setTimeout,
    clearTimeoutFn: clock.clearTimeout
  });
}

test('keeps an informer for three seconds after playback completes', async () => {
  const clock = createClock();
  const events = [];
  const service = createService(clock, events);

  service.start('warning', { type: 'warning' });
  await Promise.resolve();
  service.complete('warning');
  clock.advance(2_999);
  assert.deepEqual(events, [['show', { type: 'warning' }]]);

  clock.advance(1);
  assert.deepEqual(events.at(-1), ['fade']);
  clock.advance(420);
  assert.deepEqual(events.at(-1), ['hide', 7]);
});

test('waits until every concurrent signal has completed', () => {
  const clock = createClock();
  const events = [];
  const service = createService(clock, events);

  service.start('first', { timer: 'first' });
  service.start('second', { timer: 'second' });
  service.complete('second');
  clock.advance(10_000);
  assert.equal(events.some(([name]) => name === 'fade'), false);

  service.complete('first');
  clock.advance(3_000);
  assert.equal(events.some(([name]) => name === 'fade'), true);
});

test('a new signal cancels pending fade and hide', () => {
  const clock = createClock();
  const events = [];
  const service = createService(clock, events);

  service.showMoment('first', { timer: 'first' });
  clock.advance(2_000);
  service.start('second', { timer: 'second' });
  clock.advance(2_000);

  assert.equal(events.some(([name]) => name === 'fade'), false);
});
