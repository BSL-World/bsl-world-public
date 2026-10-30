import assert from 'node:assert/strict';
import test from 'node:test';

import {
  AppearanceMode,
  applyGlassTextTone,
  normalizeGlassTextTone,
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

test('Glass stays explicit across system appearance changes', () => {
  for (const matches of [false, true, false]) {
    const document = { documentElement: { dataset: {} } };
    const result = applyAppearanceMode('glass', {
      document, matchMedia: () => ({ matches })
    });
    assert.deepEqual(result, { mode: 'glass', resolvedMode: 'glass' });
    assert.equal(document.documentElement.dataset.appearance, 'glass');
  }
  assert.equal(appearanceModeSettingsEqual({ mode: 'glass' }, { mode: 'dark' }), false);
});

test('Glass text contrast is independent of material and accent color', () => {
  const document = { documentElement: { dataset: { appearance: 'glass', theme: 'purple', glow: 'on' } } };
  assert.equal(normalizeGlassTextTone('unknown'), 'light');
  assert.equal(applyGlassTextTone('dark', document), 'dark');
  assert.deepEqual(document.documentElement.dataset, {
    appearance: 'glass', theme: 'purple', glow: 'on', glassTextTone: 'dark'
  });
  assert.equal(appearanceModeSettingsEqual({ mode: 'glass' }, { mode: 'glass', glassTextTone: 'light' }), true);
  assert.equal(appearanceModeSettingsEqual({ mode: 'glass' }, { mode: 'glass', glassTextTone: 'dark' }), false);
});
