import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DateFormat,
  FirstDayOfWeek,
  TimeFormat,
  formatDate,
  formatTime,
  normalizeRegionalSettings,
  regionalSettingsEqual
} from '../utils/regional.js';

const sample = new Date(2026, 8, 4, 17, 6, 0);

test('normalizes independent regional preferences', () => {
  assert.deepEqual(normalizeRegionalSettings({
    timeFormat: TimeFormat.HOUR_24,
    dateFormat: DateFormat.DAY_MONTH_YEAR_HYPHENS,
    firstDayOfWeek: FirstDayOfWeek.MONDAY
  }), {
    timeFormat: '24-hour',
    dateFormat: 'dd-mm-yyyy',
    firstDayOfWeek: 'monday'
  });

  assert.equal(regionalSettingsEqual(null, {}), true);
});

test('formats dates without coupling the pattern to interface language', () => {
  const settings = {
    dateFormat: DateFormat.DAY_MONTH_YEAR_HYPHENS
  };

  assert.equal(formatDate(sample, settings, { locale: 'en' }), '04-09-2026');
  assert.equal(formatDate(sample, settings, { locale: 'ru' }), '04-09-2026');
});

test('supports textual month orders and 12 or 24 hour time', () => {
  assert.equal(formatDate(sample, {
    dateFormat: DateFormat.TEXT_MONTH_DAY_YEAR
  }, { locale: 'en-US' }), 'Sep 4, 2026');
  assert.match(formatTime(sample, {
    timeFormat: TimeFormat.HOUR_24
  }, { locale: 'en-US' }), /^17:06$/);
  assert.match(formatTime(sample, {
    timeFormat: TimeFormat.HOUR_12
  }, { locale: 'en-US' }), /^05:06\sPM$/);
  assert.equal(formatDate(sample, {
    dateFormat: DateFormat.DAY_MONTH_SHORT_YEAR_HYPHENS
  }), '04-09-26');
  assert.equal(formatDate(sample, {
    dateFormat: DateFormat.TEXT_MONTH_DAY
  }, { locale: 'en-US' }), 'Sep-04');
});
