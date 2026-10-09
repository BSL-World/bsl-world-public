import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FONT_SIZE_STORAGE_KEY,
  applyFontSize,
  getCachedFontSize,
  loadFontSizeSettings,
  saveFontSizeSettings
} from '../src/font-size-settings.js';

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

test('uses the normal cached font size by default', () => {
  assert.equal(getCachedFontSize(createStorage()), 'normal');
});

test('applies and caches a supported font size', () => {
  const storage = createStorage();
  const document = { documentElement: { dataset: {} } };

  assert.equal(
    applyFontSize('large', { document, storage }),
    'large'
  );
  assert.equal(document.documentElement.dataset.fontSize, 'large');
  assert.equal(storage.getItem(FONT_SIZE_STORAGE_KEY), 'large');
});

test('loads a normalized font size from shared desktop settings', async () => {
  const calls = [];
  const settings = await loadFontSizeSettings(async (command, args) => {
    calls.push({ command, args });
    return { fontSize: 'large' };
  });

  assert.deepEqual(settings, { fontSize: 'large' });
  assert.deepEqual(calls, [{
    command: 'load_shared_desktop_settings_section',
    args: { section: 'typography' }
  }]);
});

test('saves only a normalized shared font size', async () => {
  const calls = [];
  const settings = await saveFontSizeSettings(
    { fontSize: 'huge', unrelated: true },
    async (command, args) => {
      calls.push({ command, args });
    }
  );

  assert.deepEqual(settings, { fontSize: 'normal' });
  assert.deepEqual(calls, [{
    command: 'save_shared_desktop_settings_section',
    args: {
      section: 'typography',
      value: { fontSize: 'normal' }
    }
  }]);
});
