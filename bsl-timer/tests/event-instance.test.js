import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EventType,
  createEventInstance,
  getEventDisplayName
} from '../src/event-instance.js';

test('creates a timer event with an automatic display name', () => {
  const eventInstance = createEventInstance({
    id: 'timer-2',
    ordinal: 2
  });

  assert.equal(eventInstance.type, EventType.TIMER);
  assert.equal(eventInstance.name, null);
  assert.equal(getEventDisplayName(eventInstance), 'Timer 2');
  assert.equal(
    getEventDisplayName(eventInstance, 'Timer'),
    'Timer 2'
  );
});

test('preserves a trimmed custom event name', () => {
  const eventInstance = createEventInstance({
    id: 'pasta',
    name: '  Pasta  '
  });

  assert.equal(eventInstance.name, 'Pasta');
  assert.equal(getEventDisplayName(eventInstance), 'Pasta');
});
