import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AppearanceMode,
  applyAppearanceMode,
  appearanceModeSettingsEqual,
  normalizeAppearanceMode,
  resolveAppearanceMode,
  watchSystemAppearance
} from '../utils/appearance.js';

test('normalizes and resolves appearance modes', () => {
  assert.equal(normalizeAppearanceMode('light'), AppearanceMode.LIGHT);
  assert.equal(normalizeAppearanceMode('sepia'), AppearanceMode.SYSTEM);
  assert.equal(resolveAppearanceMode('system', false), AppearanceMode.LIGHT);
  assert.equal(resolveAppearanceMode('system', true), AppearanceMode.DARK);
  assert.equal(resolveAppearanceMode('dark', false), AppearanceMode.DARK);
});

test('compares normalized appearance settings', () => {
  assert.equal(appearanceModeSettingsEqual({}, { mode: 'system' }), true);
  assert.equal(
    appearanceModeSettingsEqual({ mode: 'light' }, { mode: 'dark' }),
    false
  );
});

test('applies both preference and resolved appearance', () => {
  const document = { documentElement: { dataset: {} } };
  const result = applyAppearanceMode('system', {
    document,
    matchMedia: () => ({ matches: true })
  });

  assert.deepEqual(result, { mode: 'system', resolvedMode: 'dark' });
  assert.equal(document.documentElement.dataset.appearanceMode, 'system');
  assert.equal(document.documentElement.dataset.appearance, 'dark');
});

test('watches and releases the system appearance query', () => {
  let listener = null;
  let removedListener = null;
  const values = [];
  const stop = watchSystemAppearance((value) => values.push(value), () => ({
    addEventListener(_name, callback) {
      listener = callback;
    },
    removeEventListener(_name, callback) {
      removedListener = callback;
    }
  }));

  listener({ matches: true });
  stop();

  assert.deepEqual(values, [true]);
  assert.equal(removedListener, listener);
});
