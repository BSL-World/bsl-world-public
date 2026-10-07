import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CANONICAL_THEMES,
  DEFAULT_GLOW_ENABLED,
  DEFAULT_THEME,
  normalizeGlowEnabled,
  normalizeTheme
} from '../utils/theme.js';

test('exposes stable canonical theme identifiers', () => {
  assert.deepEqual(CANONICAL_THEMES.map(({ code }) => code), [
    'green',
    'blue',
    'purple',
    'magenta',
    'neon-cyan',
    'tan'
  ]);
});

test('normalizes shared theme and glow values', () => {
  assert.equal(normalizeTheme('blue'), 'blue');
  assert.equal(normalizeTheme('unknown'), DEFAULT_THEME);
  assert.equal(normalizeGlowEnabled('false'), false);
  assert.equal(normalizeGlowEnabled(null), DEFAULT_GLOW_ENABLED);
});
