import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCalendarDays,
  minuteDialValues,
  shiftCalendarMonth,
  wrapClockValue
} from '../src/date-time-picker.js';

test('builds a Monday-first calendar including adjacent months', () => {
  const days = createCalendarDays(2027, 0, {
    firstDayOfWeek: 1,
    today: new Date(2027, 0, 26)
  });

  assert.equal(days.length, 42);
  assert.deepEqual(days[0], {
    year: 2026,
    month: 11,
    day: 28,
    inCurrentMonth: false,
    isToday: false
  });
  assert.equal(days.find((day) => day.isToday)?.day, 26);
});

test('moves through month and year boundaries horizontally', () => {
  assert.deepEqual(shiftCalendarMonth(2026, 11, 1), {
    year: 2027,
    month: 0
  });
  assert.deepEqual(shiftCalendarMonth(2027, 0, -1), {
    year: 2026,
    month: 11
  });
});

test('wraps exact clock adjustments safely', () => {
  assert.equal(wrapClockValue(24, 24), 0);
  assert.equal(wrapClockValue(-1, 24), 23);
  assert.equal(wrapClockValue(60, 60), 0);
});

test('provides five-minute dial marks', () => {
  assert.deepEqual(
    minuteDialValues(),
    [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
  );
});
