import assert from 'node:assert/strict';
import test from 'node:test';

import { TimerState } from '../src/timer.js';
import {
  WarningSignalController
} from '../src/warning-signal-controller.js';

function snapshot(state, remainingMinutes, durationMinutes = 20) {
  return {
    state,
    durationMs: durationMinutes * 60_000,
    remainingMs: remainingMinutes * 60_000,
    overdueMs: 0,
    endTimestamp: null
  };
}

const allWarnings = {
  soundThresholdMinutes: [15, 5],
  informerThresholdMinutes: [10, 5]
};

test('fires each enabled threshold once while time decreases', () => {
  const warnings = [];
  const controller = new WarningSignalController({
    onWarning: (eventId, minutes) => warnings.push({ eventId, minutes })
  });

  controller.update('tea', snapshot(TimerState.IDLE, 20), allWarnings);
  controller.update('tea', snapshot(TimerState.RUNNING, 16), allWarnings);
  controller.update('tea', snapshot(TimerState.RUNNING, 14.9), allWarnings);
  controller.update('tea', snapshot(TimerState.RUNNING, 12), allWarnings);
  controller.update('tea', snapshot(TimerState.RUNNING, 9.9), allWarnings);
  controller.update('tea', snapshot(TimerState.RUNNING, 4.9), allWarnings);
  controller.update('tea', snapshot(TimerState.OVERDUE, 0), allWarnings);

  assert.deepEqual(warnings, [
    { eventId: 'tea', minutes: 15 },
    { eventId: 'tea', minutes: 10 },
    { eventId: 'tea', minutes: 5 }
  ]);
});

test('does not retroactively fire thresholds below the timer duration', () => {
  const warnings = [];
  const controller = new WarningSignalController({
    onWarning: (_eventId, minutes) => warnings.push(minutes)
  });

  controller.update(
    'short',
    snapshot(TimerState.IDLE, 8, 8),
    allWarnings
  );
  controller.update(
    'short',
    snapshot(TimerState.RUNNING, 7.9, 8),
    allWarnings
  );
  controller.update(
    'short',
    snapshot(TimerState.RUNNING, 4.9, 8),
    allWarnings
  );

  assert.deepEqual(warnings, [5]);
});

test('resets fired thresholds for a restarted countdown', () => {
  const warnings = [];
  const controller = new WarningSignalController({
    onWarning: (_eventId, minutes) => warnings.push(minutes)
  });

  controller.update('work', snapshot(TimerState.IDLE, 20), allWarnings);
  controller.update('work', snapshot(TimerState.RUNNING, 14), allWarnings);
  controller.update('work', snapshot(TimerState.IDLE, 20), allWarnings);
  controller.update('work', snapshot(TimerState.RUNNING, 14), allWarnings);

  assert.deepEqual(warnings, [15, 15]);
});

test('does not replay missed warnings when restoring a running timer', () => {
  const warnings = [];
  const controller = new WarningSignalController({
    onWarning: (_eventId, minutes) => warnings.push(minutes)
  });

  controller.update('restored', snapshot(TimerState.RUNNING, 7), allWarnings);
  controller.update('restored', snapshot(TimerState.RUNNING, 4.9), allWarnings);

  assert.deepEqual(warnings, [5]);
});

test('keeps threshold state while paused and resumed', () => {
  const warnings = [];
  const controller = new WarningSignalController({
    onWarning: (_eventId, minutes) => warnings.push(minutes)
  });

  controller.update('focus', snapshot(TimerState.IDLE, 20), allWarnings);
  controller.update('focus', snapshot(TimerState.RUNNING, 14), allWarnings);
  controller.update('focus', snapshot(TimerState.PAUSED, 14), allWarnings);
  controller.update('focus', snapshot(TimerState.RUNNING, 14), allWarnings);
  controller.update('focus', snapshot(TimerState.RUNNING, 9), allWarnings);

  assert.deepEqual(warnings, [15, 10]);
});

test('reports the selected delivery channels for a threshold', () => {
  const warnings = [];
  const controller = new WarningSignalController({
    onWarning: (_eventId, minutes, _snapshot, delivery) => {
      warnings.push({ minutes, delivery });
    }
  });

  controller.update('work', snapshot(TimerState.IDLE, 20), allWarnings);
  controller.update('work', snapshot(TimerState.RUNNING, 9), allWarnings);

  assert.deepEqual(warnings, [
    { minutes: 15, delivery: { sound: true, informer: false } },
    { minutes: 10, delivery: { sound: false, informer: true } }
  ]);
});
