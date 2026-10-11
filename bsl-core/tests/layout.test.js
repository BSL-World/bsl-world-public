import assert from 'node:assert/strict';
import test from 'node:test';
import { cssSizeToPhysical } from '../utils/layout.js';

test('fits CSS content when WebView zoom differs from monitor DPI', () => {
  // 500 CSS pixels need 563 native pixels at 112.5% WebView zoom.
  const size = cssSizeToPhysical({ width: 430, height: 500 }, 1.125);
  assert.deepEqual(size, { width: 484, height: 563 });
  assert.ok(size.height / 1.125 >= 500);
});

test('preserves content at combined monitor DPI and WebView zoom', () => {
  const ratio = 1.5 * 1.25;
  const size = cssSizeToPhysical({ width: 460.4, height: 669.2 }, ratio);
  assert.ok(size.width / ratio >= 460.4);
  assert.ok(size.height / ratio >= 669.2);
});
