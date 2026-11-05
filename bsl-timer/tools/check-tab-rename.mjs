import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
// Run with npm run test:tab-rename on Windows with Microsoft Edge installed.
// Tauri IPC is mocked; this exercises the live DOM and recurring Glass captures.
const output = path.resolve('.task-backups/tab-rename-browser/ui');
fs.mkdirSync(output, { recursive: true });
const profile = path.join(output, `edge-profile-${Date.now()}`);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'
], { windowsHide: true, stdio: 'ignore' });
let connection;
let server;
let nextId = 0;
const waiting = new Map();
async function send(method, params = {}) {
  const id = ++nextId;
  const promise = new Promise((resolve, reject) => waiting.set(id, { resolve, reject }));
  connection.send(JSON.stringify({ id, method, params }));
  return promise;
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
  return result.result.value;
}
async function until(expression) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expression)) return;
    await pause(100);
  }
  throw new Error(`Timeout: ${expression}`);
}
const mock = `(() => {
  const callbacks = new Map(); const listeners = new Map(); let sequence = 0;
  const monitor = { name: 'QA', scaleFactor: 1, position: {x:0,y:0}, size: {width:1920,height:1080}, workArea: {position:{x:0,y:0},size:{width:1920,height:1040}} };
  window.qaErrors = []; window.qaCalls = [];
  addEventListener('error', e => qaErrors.push(e.message));
  addEventListener('unhandledrejection', e => qaErrors.push(String(e.reason?.stack ?? e.reason)));
  window.qaDispatch = (event, payload) => { for (const cb of listeners.get(event) ?? []) cb({event, payload, id:1}); };
  window.__TAURI_EVENT_PLUGIN_INTERNALS__ = { unregisterListener() {} };
  window.__TAURI_INTERNALS__ = {
    metadata: { currentWindow: {label: location.pathname.includes('settings') ? 'settings' : location.pathname.includes('tray-preview') ? 'tray-preview' : 'main'}, currentWebview: {label:'main'} },
    transformCallback(callback) { const id = ++sequence; callbacks.set(id, callback); return id; },
    unregisterCallback(id) { callbacks.delete(id); },
    async invoke(command, args = {}) {
      qaCalls.push({command, args});
      if (command === 'plugin:event|listen') { const list = listeners.get(args.event) ?? []; list.push(callbacks.get(args.handler)); listeners.set(args.event, list); return ++sequence; }
      if (command === 'plugin:event|emit_to' || command === 'plugin:event|emit') return;
      if (command === 'load_shared_desktop_settings_section') return args.section === 'appearance' ? {mode:localStorage.getItem('bsl-world.appearance-mode') ?? 'glass'} : args.section === 'typography' ? {fontSize:localStorage.getItem('bsl-world.font-size') ?? 'normal'} : null;
      if (command === 'save_shared_desktop_settings_section') return args.value;
      if (command === 'list_audio_output_devices' || command === 'list_windows_sounds') return [];
      if (command === 'is_autostart_enabled' || command === 'informer_diagnostics_enabled' || command === 'plugin:window|is_always_on_top') return false;
      if (command === 'plugin:window|is_visible') return true;
      if (command === 'plugin:window|current_monitor' || command === 'plugin:window|primary_monitor') return monitor;
      if (command === 'plugin:window|available_monitors') return [monitor];
      if (command === 'plugin:window|inner_size' || command === 'plugin:window|outer_size') return {width:innerWidth,height:innerHeight};
      if (command === 'plugin:window|outer_position' || command === 'plugin:window|inner_position') return {x:100,y:100};
      if (command === 'plugin:window|scale_factor') return 1;
      if (command === 'plugin:window|set_size') { window.qaSize = args.value; window.qaResize(JSON.stringify(args.value)); const s=args.value.data ?? args.value; for(let i=0;i<100 && (Math.abs(innerWidth-s.width)>1 || Math.abs(innerHeight-s.height)>1);i++) await new Promise(r=>setTimeout(r,10)); return; }
      if (command === 'set_glass_optics') return {session:1,hwnd:1,dpi:1};
      if (command === 'capture_glass_device_ui') return {width:innerWidth,height:innerHeight};
      if (command === 'plugin:updater|check') return null;
      return null;
    }
  };
  localStorage.clear();
  localStorage.setItem('bsl-world.appearance-mode', 'glass');
  localStorage.setItem('bsl-timer.whats-new.dismissed-version', '1.1.8');
})();`;
const results = [];
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); break; } catch {}
    await pause(100);
  }
  if (!port) throw new Error('Edge debugging port unavailable');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  connection = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise(resolve => connection.addEventListener('open', resolve, {once:true}));
  connection.addEventListener('message', event => {
    const data = JSON.parse(event.data);
    if (data.method === 'Runtime.bindingCalled' && data.params.name === 'qaResize') {
      const requested = JSON.parse(data.params.payload);
      const {width, height} = requested.Physical ?? requested.Logical ?? requested.data ?? requested;
      void send('Emulation.setDeviceMetricsOverride', {width,height,deviceScaleFactor:1,mobile:false});
      return;
    }
    if (!data.id) return;
    const handler = waiting.get(data.id); waiting.delete(data.id);
    if (data.error) handler.reject(new Error(JSON.stringify(data.error))); else handler.resolve(data.result);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Runtime.addBinding', {name:'qaResize'});
  await send('Page.addScriptToEvaluateOnNewDocument', { source: mock });



  const { createServer } = await import('vite');
  await send('Emulation.setFocusEmulationEnabled',{enabled:true});
  async function key(key) { await send('Input.dispatchKeyEvent',{type:'keyDown',key});await send('Input.dispatchKeyEvent',{type:'keyUp',key}); }
  async function edit(text = 'Test timer') {
    await evaluate("document.querySelector('.timer-tab-select').dispatchEvent(new MouseEvent('dblclick',{bubbles:true}))");
    await until("document.activeElement.matches('.timer-tab-name-input')");
    await send('Input.insertText',{text});
  }
  for(const edition of ['free','pro']) {
    process.env.VITE_BSL_EDITION=edition;
    server=await createServer({logLevel:'silent',server:{host:'127.0.0.1',port:5174,strictPort:true}});await server.listen();
    for(const locale of ['ru','en']) for(const mode of ['glass','light','dark','system']) {
      await send('Page.navigate',{url:'http://127.0.0.1:5174/'});
      await until("document.querySelector('.timer-tab-select')");
      await evaluate(`(async()=>{(await import('/i18n.js')).setLocale('${locale}');(await import('/appearance-mode-settings.js')).applyAppearanceMode('${mode}');})()`);
      await pause(700);
      // Native window geometry is mocked; give the page enough room independently.
      await send('Emulation.setDeviceMetricsOverride',{width:800,height:650,deviceScaleFactor:1,mobile:false});
      await edit();
      await pause(1200);
      assert.equal(await evaluate("document.activeElement.matches('.timer-tab-name-input')"),true,`${edition}/${locale}/${mode}: idle focus`);
      await key('Enter');await until("!document.querySelector('.timer-tab-name-input')");
      assert.equal(await evaluate("document.querySelector('.timer-tab-label').textContent"),'Test timer');
      await edit('Cancelled name');await key('Escape');await until("!document.querySelector('.timer-tab-name-input')");
      assert.equal(await evaluate("document.querySelector('.timer-tab-label').textContent"),'Test timer');
      await evaluate("document.querySelector('#hours-input').value=0;document.querySelector('#minutes-input').value=0;document.querySelector('#seconds-input').value=2;document.querySelector('#start-btn').click()");
      await edit();
      const before=await evaluate("document.querySelector('#timer-display').textContent");
      await pause(3100);
      assert.equal(await evaluate("document.activeElement.matches('.timer-tab-name-input') && document.activeElement.value==='Test timer'"),true,`${edition}/${locale}/${mode}: running/overdue focus`);
      assert.equal(await evaluate("document.querySelector('.timer-tab').classList.contains('is-overdue')"),true);
      assert.notEqual(await evaluate("document.querySelector('#timer-display').textContent"),before);
      if(mode==='glass') {
        assert.ok(await evaluate("qaCalls.filter(x=>x.command==='capture_glass_device_ui' && x.args.layer===2).length>2"),'multiple real ink passes');
        assert.deepEqual(await evaluate("(()=>{const editor=document.activeElement;editor.setSelectionRange(2,5);document.documentElement.setAttribute('data-device-text-pass','mask');const result={focused:document.activeElement===editor,visibility:getComputedStyle(editor).visibility,opacity:getComputedStyle(editor).opacity,start:editor.selectionStart,end:editor.selectionEnd};document.documentElement.removeAttribute('data-device-text-pass');return result;})()"),{focused:true,visibility:'visible',opacity:'0',start:2,end:5});
        await evaluate("document.documentElement.removeAttribute('data-device-text-pass')");
      }
      const screenshot=await send('Page.captureScreenshot',{format:'png'});
      fs.writeFileSync(path.join(output,`${edition}-${locale}-${mode}.png`),Buffer.from(screenshot.data,'base64'));
      await key('Escape');await until("!document.querySelector('.timer-tab-name-input')");
      await evaluate("document.querySelector('.timer-tab-mute').click()");
      assert.equal(await evaluate("document.querySelector('.timer-tab-mute').getAttribute('aria-pressed')"),'true');
      const phases=new Set();for(let i=0;i<12;i++){phases.add(await evaluate("document.querySelector('.timer-tab').classList.contains('is-overdue-pulse')"));await pause(100);}
      assert.equal(phases.size,2,'overdue lamp keeps blinking');
      await evaluate("document.querySelector('#stop-btn').click()");
      assert.equal(await evaluate("document.querySelector('.timer-tab-mute').hidden"),true);
      if(edition==='pro') {
        await evaluate("document.querySelector('#add-timer-btn').click()");await until("document.activeElement.matches('.timer-tab-name-input')");
        await send('Input.insertText',{text:'Second'});await key('Enter');await until("!document.querySelector('.timer-tab-name-input')");
        await evaluate("document.querySelector('.timer-tab-select').click()");
        assert.equal(await evaluate("document.querySelector('.timer-tab.is-active .timer-tab-label').textContent"),'Test timer');
      }
      const errors=await evaluate('qaErrors');
      assert.ok(errors.every(error=>error.includes('Content does not fit:')),JSON.stringify(errors));
      console.log(`PASS ${edition} ${locale} ${mode}: rename, Enter/Escape, countdown/overdue, Mute, lamps, tab selection`);
    }
    await send('Page.navigate',{url:'about:blank'});await server.close();server=null;
  }
} finally {
  if(connection?.readyState===WebSocket.OPEN){try{await send('Browser.close')}catch{}connection.close()}
  if(server)await server.close();edge.kill();
}
