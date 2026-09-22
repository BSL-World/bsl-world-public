import test from 'node:test';
import assert from 'node:assert/strict';

import { getUpdaterTarget } from '../src/updater-target.js';

test('uses the Free updater target by default', () => {
  assert.equal(getUpdaterTarget('free'), 'windows-x86_64-free');
});

test('uses the Pro updater target for Pro builds', () => {
  assert.equal(getUpdaterTarget('pro'), 'windows-x86_64-pro');
});

test('falls back to the Free updater target for unknown editions', () => {
  assert.equal(getUpdaterTarget('unknown'), 'windows-x86_64-free');
});
