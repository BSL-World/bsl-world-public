import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_SIGNAL_SETTINGS,
  SignalRepeatMode,
  normalizeSignalSettings,
  signalSettingsEqual
} from '../src/signal-settings.js';

test('uses safe signal defaults', () => {
  assert.deepEqual(normalizeSignalSettings(), DEFAULT_SIGNAL_SETTINGS);
  assert.equal(DEFAULT_SIGNAL_SETTINGS.repeatIntervalMs, 60_000);
});

test('normalizes repeat settings without an artificial count limit', () => {
  assert.deepEqual(normalizeSignalSettings({
    repeatMode: SignalRepeatMode.DURATION,
    repeatCount: 1_000_000,
    repeatDurationMs: 45_500,
    repeatIntervalMs: 125_000,
    source: 'default'
  }), {
    repeatMode: SignalRepeatMode.DURATION,
    repeatCount: 1_000_000,
    repeatDurationMs: 45_500,
    repeatIntervalMs: 125_000,
    source: 'default'
  });
});

test('replaces invalid signal values with defaults', () => {
  assert.deepEqual(normalizeSignalSettings({
    repeatMode: 'forever',
    repeatCount: -4,
    repeatDurationMs: 0,
    repeatIntervalMs: Number.NaN,
    source: 'remote'
  }), DEFAULT_SIGNAL_SETTINGS);
});

test('migrates sub-minute repeat intervals to one minute', () => {
  assert.equal(
    normalizeSignalSettings({ repeatIntervalMs: 2_000 })
      .repeatIntervalMs,
    60_000
  );
});

test('compares normalized signal settings', () => {
  assert.equal(signalSettingsEqual({}, DEFAULT_SIGNAL_SETTINGS), true);
  assert.equal(signalSettingsEqual({}, { repeatCount: 1 }), false);
});
