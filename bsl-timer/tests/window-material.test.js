import assert from 'node:assert/strict';
import test from 'node:test';
import { createWindowMaterialUpdater } from '../src/window-material.js';

test('material switches at unchanged transparency and restores the prior blur', async () => {
  const calls = [];
  const update = createWindowMaterialUpdater(async (...args) => calls.push(args));
  await update('dark', 50);
  await update('dark', 50);
  await update('glass', 50);
  await update('dark', 50);
  assert.deepEqual(calls, [['dark', 50], ['glass', 50], ['dark', 50]]);
});

test('rapid switches finish in selection order even with a slow native call', async () => {
  const calls = [];
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const update = createWindowMaterialUpdater(async (mode, transparency) => {
    if (mode === 'dark') await gate;
    calls.push([mode, transparency]);
  });
  const first = update('dark', 20);
  const second = update('glass', 20);
  const third = update('glass', 90);
  await Promise.resolve();
  assert.deepEqual(calls, []);
  release();
  await Promise.all([first, second, third]);
  assert.deepEqual(calls, [['dark', 20], ['glass', 20], ['glass', 90]]);
});

test('a failed native transition can be retried and does not block later selections', async () => {
  let attempts = 0;
  const update = createWindowMaterialUpdater(async () => {
    if (++attempts === 1) throw new Error('Native failure');
  });
  await assert.rejects(update('glass', 50), /Native failure/);
  await update('glass', 50);
  await update('glass', 50);
  assert.equal(attempts, 2);
  await update('light', 50);
  assert.equal(attempts, 3);
});
