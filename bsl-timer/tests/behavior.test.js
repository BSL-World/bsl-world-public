import assert from 'node:assert/strict';
import test from 'node:test';

import {
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
    confirmCloseWithActiveTimers: false,
    startupTimerAction: StartupTimerAction.RESET
  }, storage);

  assert.deepEqual(getBehavior(storage), {
    confirmCloseWithActiveTimers: false,
    startupTimerAction: StartupTimerAction.RESET
  });
});
