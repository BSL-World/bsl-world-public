import assert from 'node:assert/strict';
import test from 'node:test';

import { calculateSafeWindowPosition } from '../utils/window.js';

const monitors = [{
  scaleFactor: 1,
  workArea: {
    position: { x: -1920, y: 0 },
    size: { width: 1920, height: 1040 }
  }
}];

test('preserves valid negative coordinates', () => {
  assert.deepEqual(calculateSafeWindowPosition({
    position: { x: -1600, y: 200 },
    windowSize: { width: 500, height: 400 },
    monitors,
    margin: 20
  }), { x: -1600, y: 200 });
});

test('corrects horizontal and vertical overflow independently', () => {
  assert.deepEqual(calculateSafeWindowPosition({
    position: { x: -2200, y: 200 },
    windowSize: { width: 500, height: 400 },
    monitors,
    margin: 20
  }), { x: -1900, y: 200 });

  assert.deepEqual(calculateSafeWindowPosition({
    position: { x: -1600, y: 900 },
    windowSize: { width: 500, height: 400 },
    monitors,
    margin: 20
  }), { x: -1600, y: 620 });
});
