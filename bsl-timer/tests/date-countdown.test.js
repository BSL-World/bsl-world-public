import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDateCountdown,
  dateCountdownToLocalInputs,
  formatDateCountdownDuration,
  getDateCountdownParts,
  localInputsToDateCountdownTimestamp
} from '../src/date-countdown.js';

test('normalizes date countdown fields', () => {
  const countdown = createDateCountdown({
    id: ' event-1 ',
    name: '  Important date  ',
    description: ' First line\r\nSecond line ',
    targetTimestamp: 1_800_000_000_000,
    showSeconds: true,
    ordinal: 3
  });

  assert.equal(countdown.id, 'event-1');
  assert.equal(countdown.name, 'Important date');
  assert.equal(countdown.description, 'First line\nSecond line');
  assert.equal(countdown.targetTimestamp, 1_800_000_000_000);
  assert.equal(countdown.showSeconds, true);
  assert.equal(countdown.ordinal, 3);
});

test('splits a future date into days and clock fields', () => {
  const parts = getDateCountdownParts(
    3 * 86_400_000 + 4 * 3_600_000 + 5 * 60_000 + 6_000,
    0
  );

  assert.deepEqual(parts, {
    expired: false,
    differenceMs:
      3 * 86_400_000 + 4 * 3_600_000 + 5 * 60_000 + 6_000,
    days: 3,
    hours: 4,
    minutes: 5,
    seconds: 6
  });
});

test('formats a compact duration with optional seconds', () => {
  const targetTimestamp =
    2 * 86_400_000 + 3 * 3_600_000 + 4 * 60_000 + 5_000;

  assert.equal(
    formatDateCountdownDuration(targetTimestamp, {
      nowTimestamp: 0,
      dayLabel: 'дн'
    }),
    '2 дн · 03:04'
  );
  assert.equal(
    formatDateCountdownDuration(targetTimestamp, {
      nowTimestamp: 0,
      showSeconds: true,
      dayLabel: 'дн'
    }),
    '2 дн · 03:04:05'
  );
  assert.equal(
    formatDateCountdownDuration(1000, { nowTimestamp: 1000 }),
    null
  );
});

test('converts valid local date inputs in both directions', () => {
  const timestamp = localInputsToDateCountdownTimestamp(
    '2027-01-26',
    '18:35'
  );
  const inputs = dateCountdownToLocalInputs(timestamp);

  assert.deepEqual(inputs, {
    date: '2027-01-26',
    time: '18:35'
  });
  assert.equal(
    localInputsToDateCountdownTimestamp('2027-02-30', '18:35'),
    null
  );
});
