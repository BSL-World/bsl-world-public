import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_SIGNAL_SETTINGS,
  SignalSource,
  createSignalPreviewSettings,
  getSelectedSignalPath,
  normalizeSignalSettings,
  signalSettingsEqual
} from '../src/signal-settings.js';

test('uses safe signal defaults', () => {
  assert.deepEqual(normalizeSignalSettings(), DEFAULT_SIGNAL_SETTINGS);
  assert.equal(DEFAULT_SIGNAL_SETTINGS.repeatIntervalMs, 60_000);
});

test('normalizes repeat and audio source settings', () => {
  assert.deepEqual(normalizeSignalSettings({
    repeatCount: 1_000_000,
    repeatIntervalMs: 125_000,
    source: SignalSource.CUSTOM,
    windowsSoundPath: ' C:\\Windows\\Media\\Alarm01.wav ',
    customSoundPath: ' D:\\Sounds\\Tea.mp3 '
  }), {
    repeatCount: 1_000_000,
    repeatIntervalMs: 125_000,
    source: SignalSource.CUSTOM,
    windowsSoundPath: 'C:\\Windows\\Media\\Alarm01.wav',
    customSoundPath: 'D:\\Sounds\\Tea.mp3'
  });
});

test('replaces invalid signal values with defaults', () => {
  assert.deepEqual(normalizeSignalSettings({
    repeatCount: -4,
    repeatIntervalMs: Number.NaN,
    source: 'remote'
  }), DEFAULT_SIGNAL_SETTINGS);
});

test('migrates duration-based repeats to an equivalent repeat count', () => {
  assert.deepEqual(normalizeSignalSettings({
    repeatMode: 'duration',
    repeatCount: 99,
    repeatDurationMs: 270_000,
    repeatIntervalMs: 120_000,
    source: 'default'
  }), {
    ...DEFAULT_SIGNAL_SETTINGS,
    repeatCount: 2,
    repeatIntervalMs: 120_000
  });
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

test('selects the path for the active signal source', () => {
  const settings = {
    windowsSoundPath: 'C:\\Windows\\Media\\Alarm01.wav',
    customSoundPath: 'D:\\Sounds\\Tea.mp3'
  };

  assert.equal(getSelectedSignalPath({
    ...settings,
    source: SignalSource.WINDOWS
  }), settings.windowsSoundPath);
  assert.equal(getSelectedSignalPath({
    ...settings,
    source: SignalSource.CUSTOM
  }), settings.customSoundPath);
  assert.equal(getSelectedSignalPath(settings), '');
});

test('previews only one playback without changing the selected source', () => {
  assert.deepEqual(createSignalPreviewSettings({
    repeatCount: 4,
    repeatIntervalMs: 60_000,
    source: SignalSource.WINDOWS,
    windowsSoundPath: 'C:\\Windows\\Media\\Alarm01.wav'
  }), {
    ...DEFAULT_SIGNAL_SETTINGS,
    source: SignalSource.WINDOWS,
    windowsSoundPath: 'C:\\Windows\\Media\\Alarm01.wav'
  });
});
