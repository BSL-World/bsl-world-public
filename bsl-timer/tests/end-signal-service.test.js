import assert from 'node:assert/strict';
import test from 'node:test';

import { EndSignalService } from '../src/end-signal-service.js';

function createHarness({ allowConcurrentSignals }) {
  const started = [];
  const cancelled = [];
  const scheduler = {
    start(sequenceId, settings) {
      started.push({ sequenceId, settings });
    },
    cancel(sequenceId) {
      cancelled.push(sequenceId);
    },
    cancelAll() {},
    isActive() {
      return false;
    }
  };
  const player = {
    prepare: async () => true,
    stop() {}
  };
  const service = new EndSignalService({
    player,
    scheduler,
    allowConcurrentSignals
  });

  return { service, started, cancelled };
}

test('starts signals from different timers concurrently by default', () => {
  const { service, started } = createHarness({
    allowConcurrentSignals: true
  });

  service.start('first', { repeatCount: 1 });
  service.start('second', { repeatCount: 2 });

  assert.deepEqual(started.map(({ sequenceId }) => sequenceId), [
    'first',
    'second'
  ]);
});

test('queues signals when concurrent playback is disabled', () => {
  const { service, started } = createHarness({
    allowConcurrentSignals: false
  });

  service.start('first', { repeatCount: 1 });
  service.start('second', { repeatCount: 2 });

  assert.deepEqual(started.map(({ sequenceId }) => sequenceId), [
    'first'
  ]);
  assert.equal(service.isActive('second'), true);

  service.handleSequenceComplete('first');

  assert.deepEqual(started.map(({ sequenceId }) => sequenceId), [
    'first',
    'second'
  ]);
});

test('releases queued signals when concurrent playback is enabled', () => {
  const { service, started } = createHarness({
    allowConcurrentSignals: false
  });

  service.start('first', {});
  service.start('second', {});
  service.start('third', {});
  service.setAllowConcurrentSignals(true);

  assert.deepEqual(started.map(({ sequenceId }) => sequenceId), [
    'first',
    'second',
    'third'
  ]);
});
