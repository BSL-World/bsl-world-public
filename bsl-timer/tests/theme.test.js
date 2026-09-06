import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_GLOW_ENABLED,
  DEFAULT_THEME,
  getSupportedThemes,
  normalizeGlowEnabled,
  normalizeTheme
} from '../src/theme.js';

test('exposes the canonical BSL-Timer themes', () => {
  assert.deepEqual(
    getSupportedThemes().map(({ code }) => code),
    [
      'green',
      'blue',
      'purple',
      'magenta',
      'neon-cyan',
      'tan'
    ]
  );
});

test('normalizes unknown themes to Green', () => {
  assert.equal(normalizeTheme('blue'), 'blue');
  assert.equal(normalizeTheme('unknown'), DEFAULT_THEME);
  assert.equal(normalizeTheme(null), DEFAULT_THEME);
});

test('normalizes glow values and preserves the default', () => {
  assert.equal(normalizeGlowEnabled(true), true);
  assert.equal(normalizeGlowEnabled(false), false);
  assert.equal(normalizeGlowEnabled('true'), true);
  assert.equal(normalizeGlowEnabled('false'), false);
  assert.equal(normalizeGlowEnabled(null), DEFAULT_GLOW_ENABLED);
});
