import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DateCountdownRibbonState,
  getMainWindowSize
} from '../src/main-window-layout.js';

test('adds vertical room without scaling the compact window width', () => {
  const small = getMainWindowSize('small');
  const normal = getMainWindowSize('normal');
  const large = getMainWindowSize('large');

  assert.equal(small.width, normal.width);
  assert.equal(normal.width, large.width);
  assert.ok(small.height < normal.height);
  assert.ok(normal.height < large.height);
});

test('adds room for collapsed and expanded event ribbons', () => {
  const hidden = getMainWindowSize(
    'normal',
    DateCountdownRibbonState.HIDDEN
  );
  const collapsed = getMainWindowSize(
    'normal',
    DateCountdownRibbonState.COLLAPSED
  );
  const expanded = getMainWindowSize(
    'normal',
    DateCountdownRibbonState.EXPANDED
  );

  assert.equal(hidden.width, collapsed.width);
  assert.equal(collapsed.width, expanded.width);
  assert.ok(hidden.height < collapsed.height);
  assert.ok(collapsed.height < expanded.height);
});

test('uses normal hidden layout for invalid values', () => {
  assert.deepEqual(
    getMainWindowSize('huge', 'floating'),
    getMainWindowSize('normal', DateCountdownRibbonState.HIDDEN)
  );
});
