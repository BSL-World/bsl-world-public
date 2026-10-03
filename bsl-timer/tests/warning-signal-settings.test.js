import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFAULT_WARNING_SIGNAL_SETTINGS,
  getWarningDelivery,
  normalizeWarningSignalSettings,
  warningSignalSettingsEqual
} from '../src/warning-signal-settings.js';

test('disables all warning signals by default', () => {
  assert.deepEqual(
    normalizeWarningSignalSettings(),
    DEFAULT_WARNING_SIGNAL_SETTINGS
  );
});

test('keeps only supported warning thresholds in display order', () => {
  assert.deepEqual(normalizeWarningSignalSettings({
    soundThresholdMinutes: ['5', 15, 7, 10, 5],
    informerThresholdMinutes: [10, 7]
  }), {
    soundThresholdMinutes: [15, 10, 5],
    informerThresholdMinutes: [10]
  });
});

test('migrates existing warning switches to sound delivery', () => {
  assert.deepEqual(normalizeWarningSignalSettings({
    enabledThresholdMinutes: [15, 5]
  }), {
    soundThresholdMinutes: [15, 5],
    informerThresholdMinutes: []
  });
});

test('compares normalized warning settings', () => {
  assert.equal(warningSignalSettingsEqual({}, {
    soundThresholdMinutes: [],
    informerThresholdMinutes: []
  }), true);
  assert.equal(warningSignalSettingsEqual({
    soundThresholdMinutes: [5, 15]
  }, {
    soundThresholdMinutes: [15, 5]
  }), true);
  assert.equal(warningSignalSettingsEqual({}, {
    informerThresholdMinutes: [5]
  }), false);
});

test('returns independent sound and informer delivery channels', () => {
  assert.deepEqual(getWarningDelivery({
    soundThresholdMinutes: [15, 5],
    informerThresholdMinutes: [10, 5]
  }, 5), {
    sound: true,
    informer: true
  });
  assert.deepEqual(getWarningDelivery({
    soundThresholdMinutes: [15],
    informerThresholdMinutes: [10]
  }, 10), {
    sound: false,
    informer: true
  });
});
