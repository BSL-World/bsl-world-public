import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { TimerEngine, TimerState, millisecondsToClock } from '../src/timer.js';

const preview = readFileSync(new URL('../src/tray-preview.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('repeated end informers show elapsed overdue time of the source timer', () => {
  let now = 0;
  const engine = new TimerEngine({ now: () => now, scheduleInterval: () => 1, cancelInterval() {} });
  engine.setDuration(1000);
  engine.start();
  const context = vm.createContext({
    workspace: {
      getEvent: id => ({ id, description: 'Background timer' }),
      getEngine: id => id === 'B' ? engine : null,
      getDisplayName: id => `Timer ${id}`
    },
    getEventVisualSettings: () => ({}), getDefaultTimerName: () => 'Timer',
    TimerState, millisecondsToClock
  });
  const start = main.indexOf('function createSignalInformerData(');
  const end = main.indexOf('async function refreshTrayPreview', start);
  vm.runInContext(main.slice(start, end), context);
  const data = (mode = 'completed', threshold = null) =>
    context.createSignalInformerData('B', mode, threshold);
  for (const [elapsed, expected] of [[0, '00:00:00'], [300000, '00:05:00'], [600000, '00:10:00']]) {
    now = 1000 + elapsed;
    engine.tick();
    assert.equal(data().time, expected);
    assert.equal(data().eventId, 'B');
    assert.equal(data().state, TimerState.OVERDUE);
  }
});

test('visible informers keep ticking for warnings, completion and repeated reminders without changing layout or click target', async () => {
  const handlers = new Map();
  const emitted = [];
  let click;
  let fits = 0;
  const element = () => ({ textContent: '', hidden: false, dataset: {} });
  const card = { ...element(), addEventListener: (_, fn) => { click = fn; } };
  const time = element();
  const context = vm.createContext({
    card, time, name: element(), status: element(), description: element(), summary: element(),
    currentData: {}, lastLayoutKey: null, informerFit: Promise.resolve(true),
    getLocale: () => 'ru', t: key => key,
    applyTheme() {}, applyGlow() {}, informerDiagnostic() {}, diagnosticSnapshot: () => ({}),
    fitInformer: async () => { fits++; return true; },
    listen: async (name, fn) => handlers.set(name, fn),
    emitTo: async (...args) => { emitted.push(args); }
  });
  vm.runInContext(preview.slice(preview.indexOf("card.addEventListener('click'"), preview.indexOf('let lastLayoutKey')), context);
  vm.runInContext(preview.slice(preview.indexOf('function format('), preview.indexOf("await listen('tray-preview-data'")), context);
  await vm.runInContext('(async () => {' + preview.slice(preview.indexOf("await listen('tray-preview-data'"), preview.indexOf("await listen('tray-preview-show'")) + '})()', context);
  let now = 0;
  const updateStart = main.indexOf('  onUpdate: (eventId, snapshot) => {', main.indexOf('const workspace ='));
  const updateEnd = main.indexOf('  onExpire:', updateStart);
  Object.assign(context, {
    TimerState, millisecondsToClock,
    workspace: { activeEventId: 'A', getEvent: () => ({ settings: {} }) },
    warningSignalController: { update() {} }, updateTabState() {}, renderTimer() {},
    refreshStatusIcons() {}, refreshTrayPreview: async () => {},
    emitTo: async (window, event, payload) => {
      if (handlers.has(event)) await handlers.get(event)({ payload });
      else emitted.push([window, event, payload]);
    }
  });
  const onUpdate = vm.runInContext('({' + main.slice(updateStart, updateEnd) + '}).onUpdate', context);
  const engine = new TimerEngine({ now: () => now, scheduleInterval: () => 1, cancelInterval() {},
    onUpdate: snapshot => { onUpdate('B', snapshot); } });
  Object.assign(context.workspace, { getEngine: () => engine, getDisplayName: () => 'Timer B' });
  Object.assign(context, { getEventVisualSettings: () => ({}), getDefaultTimerName: () => 'Timer' });
  vm.runInContext(main.slice(main.indexOf('function createSignalInformerData('), main.indexOf('async function refreshTrayPreview')), context);
  for (const minutes of [15, 10, 5]) {
    engine.setDuration(minutes * 60000 + 1000);
    engine.start();
    now += 1500;
    engine.tick();
    const data = context.createSignalInformerData('B', 'warning', minutes);
    await handlers.get('tray-preview-data')({ payload: { ...data, layoutRequestId: minutes } });
    assert.equal(time.textContent, millisecondsToClock(minutes * 60000 - 500, true));
    const previousFits = fits;
    for (let second = 1; second <= 3; second++) {
      now += 1000;
      engine.tick();
      assert.equal(time.textContent, millisecondsToClock(minutes * 60000 - 500 - second * 1000, true));
    }
    assert.equal(fits, previousFits, 'second ticks must not resize the informer');
    engine.reset();
  }
  engine.setDuration(1000);
  engine.start();
  now += 1000;
  engine.tick();
  for (const overdue of [0, 60000, 120000]) {
    const end = engine.endTimestamp;
    now = end + overdue;
    engine.tick();
    await handlers.get('tray-preview-data')({ payload: {
      ...context.createSignalInformerData('B', 'completed'), layoutRequestId: 99 + overdue
    } });
    const previousFits = fits;
    for (let second = 1; second <= 3; second++) {
      now += 1000;
      engine.tick();
      assert.equal(time.textContent, millisecondsToClock(overdue + second * 1000));
      onUpdate('A', { state: TimerState.RUNNING, remainingMs: 999000 });
      await handlers.get('tray-preview-data')({ payload: { eventId: 'A', time: '00:16:39' } });
      assert.equal(time.textContent, millisecondsToClock(overdue + second * 1000));
    }
    assert.equal(fits, previousFits);
    click();
    assert.equal(emitted.at(-1)[2].eventId, 'B');
  }
});

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
  const end = preview.indexOf("await listen('tray-preview-time'", start);
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
