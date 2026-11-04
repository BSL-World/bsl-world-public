import assert from 'node:assert/strict';
import test from 'node:test';

import {
  APPEARANCE_MODE_STORAGE_KEY,
  AUXILIARY_APPEARANCE_STORAGE_KEY,
  GLASS_TEXT_TONE_STORAGE_KEY,
  applyGlassTextTone,
  applyAppearanceMode,
  applyCachedAppearanceMode,
  getCachedAppearanceMode,
  loadAppearanceModeSettings,
  saveAppearanceModeSettings,
  watchAppearanceMode
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

test('incoming mode notifications apply the current selection without writing it back', () => {
  const values=new Map([[APPEARANCE_MODE_STORAGE_KEY,'glass'],[AUXILIARY_APPEARANCE_STORAGE_KEY,'light']]);
  const writes=[];
  const storage={getItem:key=>values.get(key)??null,setItem:(...args)=>writes.push(args)};
  const document={documentElement:{dataset:{}},body:{matches:()=>true}};
  const result=applyCachedAppearanceMode({document,storage,matchMedia:()=>({matches:true})});
  assert.equal(result.mode,'glass');
  assert.equal(document.documentElement.dataset.appearance,'light');
  assert.deepEqual(writes,[]);
});

test('queued obsolete previews settle in every window without an echo loop', () => {
  for(const count of [2,3]){
    const values=new Map([[APPEARANCE_MODE_STORAGE_KEY,'glass'],[AUXILIARY_APPEARANCE_STORAGE_KEY,'dark']]);
    const windows=[],queue=[];
    for(let i=0;i<count;i++){
      const callbacks=[];
      const window={};
      const storage={getItem:key=>values.get(key)??null,setItem(key,value){
        value=String(value);if(values.get(key)===value)return;values.set(key,value);
        for(const target of windows)if(target!==window)queue.push({target,key,newValue:value});
      }};
      const document={documentElement:{dataset:{}},body:{matches:()=>i!==0},defaultView:{addEventListener:(_name,fn)=>callbacks.push(fn),removeEventListener(){}}};
      const options={storage,document,matchMedia:()=>({matches:true})};
      Object.assign(window,{document,apply:mode=>applyAppearanceMode(mode,options),receive:event=>callbacks.forEach(fn=>fn(event))});
      windows.push(window);watchAppearanceMode(options);
      callbacks.push(event=>{if(event.key===APPEARANCE_MODE_STORAGE_KEY)applyCachedAppearanceMode(options);});
    }
    windows[1].apply('light');windows[1].apply('glass');
    let processed=0;
    while(queue.length&&processed++<100){const event=queue.shift();event.target.receive(event);}
    assert.equal(queue.length,0,'obsolete notifications must not republish themselves');
    assert.equal(values.get(APPEARANCE_MODE_STORAGE_KEY),'glass');
    for(const window of windows)assert.equal(window.document.documentElement.dataset.appearanceMode,'glass');
    assert.equal(windows[0].document.documentElement.dataset.appearance,'glass');
    assert.equal(windows[1].document.documentElement.dataset.appearance,'light');
  }
});

test('Glass retains the preceding ordinary appearance across auxiliary window reopening', () => {
  for (const mode of ['light', 'dark', 'system']) {
    for (const prefersDark of [false, true]) {
      const storage = createStorage();
      const options = { storage, matchMedia: () => ({ matches: prefersDark }) };
      const auxiliary = () => ({ documentElement: { dataset: {} }, body: { matches: () => true } });
      const document = auxiliary();
      applyAppearanceMode(mode, { ...options, document });
      const expected = document.documentElement.dataset.appearance;
      applyAppearanceMode('glass', { ...options, document });
      assert.equal(document.documentElement.dataset.appearance, expected);
      assert.equal(document.documentElement.dataset.appearanceMode, 'glass');
      const reopened = auxiliary();
      applyAppearanceMode('glass', { ...options, document: reopened });
      assert.equal(reopened.documentElement.dataset.appearance, expected);
      const main = { documentElement: { dataset: {} }, body: { matches: () => false } };
      applyAppearanceMode('glass', { ...options, document: main });
      assert.equal(main.documentElement.dataset.appearance, 'glass');
    }
  }
});

test('cancelling an ordinary appearance preview restores the retained Glass appearance', () => {
  const storage = createStorage();
  const document = { documentElement: { dataset: {} }, body: { matches: () => true } };
  const options = { storage, document, matchMedia: () => ({ matches: true }) };
  applyAppearanceMode('light', options);
  applyAppearanceMode('glass', options);
  applyAppearanceMode('dark', options);
  applyAppearanceMode('glass', options);
  assert.equal(document.documentElement.dataset.appearance, 'dark');
  applyAppearanceMode('glass', { ...options, auxiliaryMode: 'light' });
  assert.equal(document.documentElement.dataset.appearance, 'light');
  assert.equal(storage.getItem(AUXILIARY_APPEARANCE_STORAGE_KEY), 'light');
});

test('existing Glass installations without a retained appearance follow Windows', () => {
  for (const prefersDark of [false, true]) {
    const storage = createStorage({ [APPEARANCE_MODE_STORAGE_KEY]: 'glass' });
    const document = { documentElement: { dataset: {} }, body: { matches: () => true } };
    applyAppearanceMode('glass', { document, storage, matchMedia: () => ({ matches: prefersDark }) });
    assert.equal(document.documentElement.dataset.appearance, prefersDark ? 'dark' : 'light');
  }
});

test('Glass auxiliary windows follow retained system changes and other-window previews', () => {
  const storage = createStorage();
  const listeners = new Map();
  let systemChange;
  let dark = false;
  const document = {
    documentElement: { dataset: {} }, body: { matches: () => true },
    defaultView: {
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: name => listeners.delete(name)
    }
  };
  const matchMedia = () => ({
    matches: dark,
    addEventListener: (_name, callback) => { systemChange = callback; },
    removeEventListener: () => { systemChange = null; }
  });
  const options = { document, storage, matchMedia };
  applyAppearanceMode('system', options);
  applyAppearanceMode('glass', options);
  const stop = watchAppearanceMode(options);
  dark = true;
  systemChange({ matches: true });
  assert.equal(document.documentElement.dataset.appearance, 'dark');
  storage.setItem(AUXILIARY_APPEARANCE_STORAGE_KEY, 'light');
  listeners.get('storage')({ key: AUXILIARY_APPEARANCE_STORAGE_KEY });
  assert.equal(document.documentElement.dataset.appearance, 'light');
  systemChange({ matches: true });
  assert.equal(document.documentElement.dataset.appearance, 'light');
  assert.equal(document.documentElement.dataset.appearanceMode, 'glass');
  stop();
  assert.equal(listeners.size, 0);
  assert.equal(systemChange, null);
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
