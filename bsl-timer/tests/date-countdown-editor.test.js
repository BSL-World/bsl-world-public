import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dateCountdownEditorValuesEqual,
  getDateCountdownEditorMinimumHeight
} from '../src/date-countdown-editor.js';

const baseline = Object.freeze({
  name: 'Holiday',
  description: 'Pack the suitcase',
  targetTimestamp: 1_800_000_000_000,
  showSeconds: false
});

test('recognizes an unchanged date countdown editor value', () => {
  assert.equal(
    dateCountdownEditorValuesEqual(baseline, { ...baseline }),
    true
  );
});

test('detects every persisted date countdown editor change', () => {
  for (const changed of [
    { name: 'Flight' },
    { description: 'Check in online' },
    { targetTimestamp: baseline.targetTimestamp + 60_000 },
    { showSeconds: true }
  ]) {
    assert.equal(
      dateCountdownEditorValuesEqual(
        baseline,
        { ...baseline, ...changed }
      ),
      false
    );
  }
});

test('adds enough vertical room for Large editor controls', () => {
  const normalHeight = getDateCountdownEditorMinimumHeight('normal');
  const largeHeight = getDateCountdownEditorMinimumHeight('large');

  assert.equal(getDateCountdownEditorMinimumHeight('small'), normalHeight);
  assert.ok(largeHeight >= normalHeight + 120);
  assert.equal(
    getDateCountdownEditorMinimumHeight('unknown'),
    normalHeight
  );
});
