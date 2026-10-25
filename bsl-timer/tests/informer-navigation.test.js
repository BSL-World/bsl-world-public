import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const preview = readFileSync(new URL('../src/tray-preview.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('background ticks preserve the visible overdue reminder and click targets its timer', async () => {
  const emitted = [];
  let click;
  let receive;
  const context = vm.createContext({
    card: { addEventListener: (_, handler) => { click = handler; } },
    listen: async (_, handler) => { receive = handler; },
    emitTo: async (...args) => { emitted.push(args); },
    applyTheme() {}, applyGlow() {}, render() {}, informerDiagnostic() {},
    diagnosticSnapshot() { return {}; }, informerFit: Promise.resolve(true),
    currentData: { eventId: 'overdue-B', mode: 'completed', layoutRequestId: 9 }
  });
  vm.runInContext(preview.slice(preview.indexOf("card.addEventListener('click'"), preview.indexOf('let lastLayoutKey')), context);
  const start = preview.indexOf("await listen('tray-preview-data'");
  const end = preview.indexOf("await listen('tray-preview-show'", start);
  await vm.runInContext('(async () => {' + preview.slice(start, end) + '})()', context);
  await receive({ payload: { eventId: 'active-A', mode: 'timer' } });
  click();
  assert.equal(emitted[0][2].eventId, 'overdue-B');
  await receive({ payload: { eventId: 'overdue-C', mode: 'completed', layoutRequestId: 10 } });
  click();
  assert.equal(emitted.at(-1)[2].eventId, 'overdue-C');
  await receive({ payload: { eventId: 'active-A', hoverPreview: true } });
  click();
  assert.equal(emitted.at(-1)[2].eventId, 'active-A');
});

test('informer activation selects and renders the source tab before showing the main window', async () => {
  let activate;
  const steps = [];
  const context = vm.createContext({
    listen: async (_, handler) => { activate = handler; },
    workspace: { getEvent: id => id === 'B', setActiveEvent: id => steps.push(id) },
    applyActiveVisualSettings: () => steps.push('theme'),
    updateActiveTabSelection: () => steps.push('tab'),
    renderActiveTimer: () => steps.push('render'),
    refreshStatusIcons: () => steps.push('icons'),
    invoke: async name => steps.push(name)
  });
  const start = main.indexOf("await listen('tray-informer-activate'");
  const end = main.indexOf("await listen('tray-preview-requested'", start);
  await vm.runInContext('(async () => {' + main.slice(start, end) + '})()', context);
  await activate({ payload: { eventId: 'deleted' } });
  assert.deepEqual(steps, []);
  await activate({ payload: { eventId: 'B' } });
  assert.deepEqual(steps, ['B', 'theme', 'tab', 'render', 'icons', 'activate_main_window']);
});
