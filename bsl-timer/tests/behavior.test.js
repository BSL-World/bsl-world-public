import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CloseButtonAction,
  DEFAULT_BEHAVIOR,
  StartupTimerAction,
  getBehavior,
  saveBehavior
} from '../src/behavior.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    }
  };
}

test('uses safe default timer behavior', () => {
  const behavior = getBehavior(createMemoryStorage());

  assert.deepEqual(behavior, DEFAULT_BEHAVIOR);
});

test('saves and restores timer behavior', () => {
  const storage = createMemoryStorage();

  saveBehavior({
    closeButtonAction: CloseButtonAction.EXIT,
    confirmCloseWithActiveTimers: false,
    pulseTrayIconOnOverdue: true,
    startupTimerAction: StartupTimerAction.RESET
  }, storage);

  assert.deepEqual(getBehavior(storage), {
    closeButtonAction: CloseButtonAction.EXIT,
    confirmCloseWithActiveTimers: false,
    pulseTrayIconOnOverdue: true,
    startupTimerAction: StartupTimerAction.RESET
  });
});
