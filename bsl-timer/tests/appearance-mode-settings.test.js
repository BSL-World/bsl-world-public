import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPEARANCE_MODE_STORAGE_KEY,
  applyAppearanceMode,
  getCachedAppearanceMode,
  loadAppearanceModeSettings,
  saveAppearanceModeSettings
} from '../src/appearance-mode-settings.js';

function createStorage(values = {}) {
  const data = new Map(Object.entries(values));

  return {
    getItem(key) {
      return data.get(key) ?? null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    }
  };
}

test('uses the system appearance by default', () => {
  assert.equal(getCachedAppearanceMode(createStorage()), 'system');
});

test('applies and caches the resolved appearance mode', () => {
  const storage = createStorage();
  const document = { documentElement: { dataset: {} } };
  const result = applyAppearanceMode('system', {
    document,
    storage,
    matchMedia: () => ({ matches: false })
  });

  assert.deepEqual(result, { mode: 'system', resolvedMode: 'light' });
  assert.equal(document.documentElement.dataset.appearance, 'light');
  assert.equal(storage.getItem(APPEARANCE_MODE_STORAGE_KEY), 'system');
});

test('loads a normalized mode from shared desktop settings', async () => {
  const calls = [];
  const settings = await loadAppearanceModeSettings(
    async (command, args) => {
      calls.push({ command, args });
      return { mode: 'dark' };
    }
  );

  assert.deepEqual(settings, { mode: 'dark' });
  assert.deepEqual(calls, [{
    command: 'load_shared_desktop_settings_section',
    args: { section: 'appearance' }
  }]);
});

test('saves only a normalized shared appearance mode', async () => {
  const calls = [];
  const settings = await saveAppearanceModeSettings(
    { mode: 'sepia', unrelated: true },
    async (command, args) => calls.push({ command, args })
  );

  assert.deepEqual(settings, { mode: 'system' });
  assert.deepEqual(calls, [{
    command: 'save_shared_desktop_settings_section',
    args: {
      section: 'appearance',
      value: { mode: 'system' }
    }
  }]);
});
