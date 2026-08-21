import assert from 'node:assert/strict';
import test from 'node:test';

import { SessionStore } from '../src/session-store.js';
import {
  DEFAULT_TIMER_DURATION_MS,
  TimerWorkspace
} from '../src/timer-workspace.js';

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

test('loads a default timer workspace', () => {
  const workspace = new TimerWorkspace({
    sessionStore: new SessionStore({
      storage: createMemoryStorage()
    })
  });

  workspace.load();

  assert.equal(workspace.getEvents().length, 1);
  assert.equal(
    workspace.getActiveEngine().getSnapshot().durationMs,
    DEFAULT_TIMER_DURATION_MS
  );

  workspace.destroy();
});

test('creates independent timer instances', () => {
  const workspace = new TimerWorkspace({
    sessionStore: new SessionStore({
      storage: createMemoryStorage()
    })
  });

  workspace.load();
  const firstEvent = workspace.getActiveEvent();
  firstEvent.settings = {
    theme: 'purple',
    displayBrightness: 120
  };
  const secondEvent = workspace.addEvent({ name: 'Pasta' });

  workspace.getEngine(firstEvent.id).setDuration(3000);
  workspace.getEngine(secondEvent.id).setDuration(9000);

  assert.equal(workspace.getEvents().length, 2);
  assert.equal(workspace.getActiveEvent().id, secondEvent.id);
  assert.equal(
    workspace.getEngine(firstEvent.id).getSnapshot().durationMs,
    3000
  );
  assert.equal(
    workspace.getEngine(secondEvent.id).getSnapshot().durationMs,
    9000
  );
  assert.deepEqual(secondEvent.settings, firstEvent.settings);

  workspace.destroy();
});

test('restores tabs, names, and the active event', () => {
  const storage = createMemoryStorage();
  const firstWorkspace = new TimerWorkspace({
    sessionStore: new SessionStore({ storage })
  });

  firstWorkspace.load();
  const firstEvent = firstWorkspace.getActiveEvent();
  const secondEvent = firstWorkspace.addEvent();
  firstWorkspace.renameEvent(secondEvent.id, 'Tea');
  firstWorkspace.setActiveEvent(firstEvent.id);
  firstWorkspace.save();
  firstWorkspace.destroy();

  const secondWorkspace = new TimerWorkspace({
    sessionStore: new SessionStore({ storage })
  });

  secondWorkspace.load();

  assert.equal(secondWorkspace.getEvents().length, 2);
  assert.equal(secondWorkspace.getActiveEvent().id, firstEvent.id);
  assert.equal(secondWorkspace.getEvent(secondEvent.id).name, 'Tea');

  secondWorkspace.destroy();
});

test('removes a tab and activates its nearest neighbor', () => {
  const workspace = new TimerWorkspace({
    sessionStore: new SessionStore({
      storage: createMemoryStorage()
    })
  });

  workspace.load();
  const firstEvent = workspace.getActiveEvent();
  const secondEvent = workspace.addEvent();

  assert.equal(workspace.removeEvent(secondEvent.id), true);
  assert.equal(workspace.getActiveEvent().id, firstEvent.id);
  assert.equal(workspace.removeEvent(firstEvent.id), false);

  workspace.destroy();
});

test('detects and resets stored active timers', () => {
  const storage = createMemoryStorage();
  const firstWorkspace = new TimerWorkspace({
    sessionStore: new SessionStore({ storage })
  });

  firstWorkspace.load();
  firstWorkspace.getActiveEngine().setDuration(60_000);
  firstWorkspace.getActiveEngine().start();
  firstWorkspace.save();

  assert.equal(firstWorkspace.hasActiveTimers(), true);
  firstWorkspace.destroy();

  const secondWorkspace = new TimerWorkspace({
    sessionStore: new SessionStore({ storage })
  });

  assert.equal(secondWorkspace.hasStoredActiveTimers(), true);
  secondWorkspace.load({ resetActiveTimers: true });

  const restoredTimer = secondWorkspace
    .getActiveEngine()
    .getSnapshot();

  assert.equal(restoredTimer.state, 'idle');
  assert.equal(restoredTimer.durationMs, 60_000);
  assert.equal(restoredTimer.remainingMs, 60_000);
  assert.equal(secondWorkspace.hasActiveTimers(), false);

  secondWorkspace.destroy();
});
