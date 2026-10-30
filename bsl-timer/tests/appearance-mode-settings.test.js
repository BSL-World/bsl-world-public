import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPEARANCE_MODE_STORAGE_KEY,
  GLASS_TEXT_TONE_STORAGE_KEY,
  applyGlassTextTone,
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

  assert.deepEqual(settings, { mode: 'dark', glassTextTone: 'light', glassGlowIntensity: 100 });
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

  assert.deepEqual(settings, { mode: 'system', glassTextTone: 'light', glassGlowIntensity: 100 });
  assert.deepEqual(calls, [{
    command: 'save_shared_desktop_settings_section',
    args: {
      section: 'appearance',
      value: { mode: 'system', glassTextTone: 'light', glassGlowIntensity: 100 }
    }
  }]);
});

test('round-trips dark Glass text through shared settings', async () => {
  let stored;
  await saveAppearanceModeSettings({ mode: 'glass', glassTextTone: 'dark', glassGlowIntensity: 100 }, async (_command,args) => { stored = args.value; });
  assert.deepEqual(stored, { mode: 'glass', glassTextTone: 'dark', glassGlowIntensity: 100 });
  const loaded = await loadAppearanceModeSettings(async () => stored);
  assert.deepEqual(loaded, stored);
});

test('Glass text previews and cancellation preserve the material and accent', () => {
  const storage = createStorage();
  const document = { documentElement: { dataset: { appearance: 'glass', theme: 'purple', glow: 'on' } } };
  applyGlassTextTone('dark', { document, storage });
  assert.equal(storage.getItem(GLASS_TEXT_TONE_STORAGE_KEY), 'dark');
  applyGlassTextTone('light', { document, storage });
  assert.equal(storage.getItem(GLASS_TEXT_TONE_STORAGE_KEY), 'light');
  assert.deepEqual(document.documentElement.dataset, {
    appearance: 'glass', theme: 'purple', glow: 'on', glassTextTone: 'light'
  });
});

test('Glass glow defaults preserve the approved level and normalize persisted values', async () => {
  for (const [value, expected] of [[undefined,100], [null,100], ['',100], ['250',250], [-5,0], [999,300], ['bad',100]]) {
    let stored;
    const saved = await saveAppearanceModeSettings({mode:'glass', glassGlowIntensity:value}, async (_command,args) => { stored=args.value; });
    assert.equal(saved.glassGlowIntensity, expected);
    const loaded = await loadAppearanceModeSettings(async () => stored);
    assert.equal(loaded.glassGlowIntensity, expected);
  }
});

test('Glass glow previews and restoration keep palette and on/off independent', async () => {
  const {applyGlassGlowIntensity, GLASS_GLOW_INTENSITY_STORAGE_KEY} = await import('../src/appearance-mode-settings.js');
  const values = new Map();
  const storage = createStorage();
  const document = {documentElement:{dataset:{appearance:'glass',theme:'tan',glow:'off'},style:{setProperty:(key,value)=>values.set(key,value)}}};
  applyGlassGlowIntensity(275,{document,storage});
  assert.equal(values.get('--bsl-glass-glow-strength'),'2.75');
  assert.equal(values.get('--bsl-glass-glow-spread'),'2.75');
  applyGlassGlowIntensity(100,{document,storage});
  assert.equal(storage.getItem(GLASS_GLOW_INTENSITY_STORAGE_KEY),'100');
  assert.equal(values.get('--bsl-glass-glow-strength'),'1');
  assert.deepEqual(document.documentElement.dataset,{appearance:'glass',theme:'tan',glow:'off'});
});