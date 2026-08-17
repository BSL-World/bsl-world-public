import assert from 'node:assert/strict';
import test from 'node:test';

import { createEventInstance } from '../src/event-instance.js';
import { SessionStore } from '../src/session-store.js';

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

test('saves and restores event instances', () => {
  const store = new SessionStore({
    storage: createMemoryStorage()
  });
  const firstEvent = createEventInstance({
    id: 'first',
    ordinal: 1
  });
  const secondEvent = createEventInstance({
    id: 'second',
    ordinal: 2,
    name: 'Pasta'
  });

  store.save({
    activeEventId: secondEvent.id,
    events: [firstEvent, secondEvent]
  });

  const restoredSession = store.load();

  assert.equal(restoredSession.events.length, 2);
  assert.equal(restoredSession.activeEventId, 'second');
  assert.equal(restoredSession.events[1].name, 'Pasta');
});

test('recovers from invalid stored data', () => {
  const storage = createMemoryStorage();
  const store = new SessionStore({ storage });

  storage.setItem('bsl-timer.session', '{invalid');

  const restoredSession = store.load();

  assert.equal(restoredSession.events.length, 1);
  assert.equal(
    restoredSession.activeEventId,
    restoredSession.events[0].id
  );
});
