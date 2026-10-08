import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DATE_COUNTDOWN_STORAGE_KEY,
  DateCountdownStore
} from '../src/date-countdown-store.js';

function createMemoryStorage() {
  const values = new Map();

  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
    removeItem(key) {
      values.delete(key);
    }
  };
}

test('starts empty and persists independent date countdowns', () => {
  const storage = createMemoryStorage();
  const store = new DateCountdownStore({ storage });

  assert.deepEqual(store.load(), []);

  const first = store.add({
    name: 'Conference',
    targetTimestamp: 1_800_000_000_000
  });
  const second = store.add({
    name: 'Holiday',
    targetTimestamp: 1_900_000_000_000
  });

  assert.equal(first.ordinal, 1);
  assert.equal(second.ordinal, 2);

  const restoredStore = new DateCountdownStore({ storage });
  const restored = restoredStore.load();

  assert.equal(restored.length, 2);
  assert.equal(restored[0].name, 'Conference');
  assert.equal(restored[1].name, 'Holiday');
});

test('updates and removes a saved date countdown', () => {
  const storage = createMemoryStorage();
  const store = new DateCountdownStore({ storage });
  const countdown = store.add({
    name: 'Old name',
    targetTimestamp: 1_800_000_000_000
  });

  const updated = store.update(countdown.id, {
    name: 'New name',
    showSeconds: true
  });

  assert.equal(updated.name, 'New name');
  assert.equal(updated.showSeconds, true);
  assert.equal(store.remove(countdown.id), true);
  assert.deepEqual(store.getAll(), []);
  assert.equal(store.remove('missing'), false);

  const persisted = JSON.parse(
    storage.getItem(DATE_COUNTDOWN_STORAGE_KEY)
  );
  assert.deepEqual(persisted.countdowns, []);
});

test('recovers from invalid stored data', () => {
  const storage = createMemoryStorage();
  storage.setItem(DATE_COUNTDOWN_STORAGE_KEY, '{broken');

  const store = new DateCountdownStore({ storage });

  assert.deepEqual(store.load(), []);
});
