import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadRegionalSettings,
  saveRegionalSettings
} from '../src/regional-settings.js';

test('loads normalized shared regional settings', async () => {
  const settings = await loadRegionalSettings(async () => ({
    timeFormat: '24-hour',
    dateFormat: 'dd-mm-yyyy',
    firstDayOfWeek: 'monday'
  }));

  assert.deepEqual(settings, {
    timeFormat: '24-hour',
    dateFormat: 'dd-mm-yyyy',
    firstDayOfWeek: 'monday'
  });
});

test('saves only normalized shared regional settings', async () => {
  const calls = [];
  const saved = await saveRegionalSettings({
    timeFormat: 'unsupported',
    dateFormat: 'yyyy-mm-dd',
    firstDayOfWeek: 'sunday',
    productSpecific: true
  }, async (command, arguments_) => {
    calls.push({ command, arguments_ });
  });

  assert.deepEqual(saved, {
    timeFormat: 'system',
    dateFormat: 'yyyy-mm-dd',
    firstDayOfWeek: 'sunday'
  });
  assert.deepEqual(calls[0].arguments_.value, saved);
});
