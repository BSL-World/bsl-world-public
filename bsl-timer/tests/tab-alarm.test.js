import test from 'node:test';
import assert from 'node:assert/strict';
import { TabAlarm, alarmPhase } from '../src/tab-alarm.js';
const flush = () => new Promise(resolve => setImmediate(resolve));

test('display-aligned half-second phases and one beep per second; no catch-up bursts', async () => {
  let beeps = 0;
  const alarm = new TabAlarm({ play: () => { beeps++; }, stop() {} });
  alarm.update('background', 'overdue');
  const phases = [];
  for (const now of [0, 499, 500, 999, 1000, 1499, 1500, 1999]) {
    phases.push(alarm.tick(now));
    assert.equal(alarm.lit, phases.at(-1));
    await flush();
  }
  assert.deepEqual(phases, [true, true, false, false, true, true, false, false]);
  assert.equal(beeps, 2);
  alarm.tick(10000);
  await flush();
  assert.equal(beeps, 3);
});

test('mute is per timer and resets after stop/restart; removing last alarm stops sound', async () => {
  let beeps = 0, stops = 0;
  const alarm = new TabAlarm({ play: () => { beeps++; }, stop: () => { stops++; } });
  alarm.update('A', 'running');
  alarm.update('B', 'overdue');
  alarm.toggleMute('B');
  alarm.tick(0);
  await flush();
  assert.equal(beeps, 0);
  alarm.update('A', 'overdue');
  alarm.tick(1000);
  await flush();
  assert.equal(beeps, 1);
  assert.equal(alarm.isMuted('B'), true);
  alarm.remove('A');
  alarm.tick(2000);
  await flush();
  assert.equal(beeps, 1);
  alarm.update('B', 'idle');
  alarm.update('B', 'running');
  alarm.update('B', 'overdue');
  assert.equal(alarm.isMuted('B'), false);
  alarm.tick(3000);
  await flush();
  assert.equal(beeps, 2);
  alarm.dispose();
  assert.ok(stops > 0);
  alarm.tick(4000);
  await flush();
  assert.equal(beeps, 2);
});

test('end sound suppresses beep; slow native playback never accumulates', async () => {
  let sounding = true, beeps = 0, finish;
  const alarm = new TabAlarm({
    play: () => { beeps++; return new Promise(resolve => { finish = resolve; }); },
    stop() {}, isSignalPlaying: () => sounding
  });
  alarm.update('A', 'overdue');
  alarm.tick(0);
  await flush();
  assert.equal(beeps, 0);
  sounding = false;
  alarm.tick(1000);
  await flush();
  alarm.tick(2000);
  await flush();
  assert.equal(beeps, 1);
  finish();
  await flush();
  alarm.tick(3000);
  await flush();
  assert.equal(beeps, 2);
  finish();
});

test('display epoch determines the shared tab and sound phase', () => {
  const epoch = 237;
  assert.equal(alarmPhase(237, epoch).lit, true);
  assert.equal(alarmPhase(736, epoch).lit, true);
  assert.equal(alarmPhase(737, epoch).lit, false);
  assert.equal(alarmPhase(1236, epoch).lit, false);
  assert.equal(alarmPhase(1237, epoch).lit, true);
});
