import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadApplicationSettingsSection,
  loadEffectiveSettingsSection,
  loadSharedSettingsSection,
  removeApplicationSettingsSection,
  saveApplicationSettingsSection,
  saveSharedSettingsSection
} from '../utils/settings.js';

test('uses the native bridge for shared settings sections', async () => {
  const calls = [];
  const invoke = async (command, arguments_) => {
    calls.push({ command, arguments_ });
    return arguments_?.value ?? { timeFormat: '24-hour' };
  };

  assert.deepEqual(
    await loadSharedSettingsSection('regional', invoke),
    { timeFormat: '24-hour' }
  );
  assert.deepEqual(
    await saveSharedSettingsSection(
      'regional',
      { dateFormat: 'dd-mm-yyyy' },
      invoke
    ),
    { dateFormat: 'dd-mm-yyyy' }
  );
  assert.deepEqual(calls, [
    {
      command: 'load_shared_desktop_settings_section',
      arguments_: { section: 'regional' }
    },
    {
      command: 'save_shared_desktop_settings_section',
      arguments_: {
        section: 'regional',
        value: { dateFormat: 'dd-mm-yyyy' }
      }
    }
  ]);
});

test('rejects unsafe section names before native invocation', async () => {
  await assert.rejects(
    loadSharedSettingsSection('../timer', () => null),
    /Invalid shared settings section/
  );
});

test('uses independent application setting sections', async () => {
  const calls = [];
  const invoke = async (command, arguments_) => {
    calls.push({ command, arguments_ });
    return command.startsWith('remove_') ? true : arguments_?.value ?? null;
  };

  await loadApplicationSettingsSection('bsl-timer', 'regional', invoke);
  await saveApplicationSettingsSection(
    'bsl-timer',
    'regional',
    { timeFormat: '24-hour' },
    invoke
  );
  assert.equal(
    await removeApplicationSettingsSection(
      'bsl-timer',
      'regional',
      invoke
    ),
    true
  );

  assert.deepEqual(calls, [
    {
      command: 'load_application_desktop_settings_section',
      arguments_: { application: 'bsl-timer', section: 'regional' }
    },
    {
      command: 'save_application_desktop_settings_section',
      arguments_: {
        application: 'bsl-timer',
        section: 'regional',
        value: { timeFormat: '24-hour' }
      }
    },
    {
      command: 'remove_application_desktop_settings_section',
      arguments_: { application: 'bsl-timer', section: 'regional' }
    }
  ]);
});

test('merges application overrides over shared defaults', async () => {
  const invoke = async (command) => command.startsWith('load_shared')
    ? { timeFormat: 'system', dateFormat: 'system' }
    : { timeFormat: '24-hour' };

  assert.deepEqual(
    await loadEffectiveSettingsSection(
      'bsl-timer',
      'regional',
      invoke
    ),
    { timeFormat: '24-hour', dateFormat: 'system' }
  );
});

test('rejects unsafe application names before native invocation', async () => {
  await assert.rejects(
    loadApplicationSettingsSection('../timer', 'regional', () => null),
    /Invalid shared settings application/
  );
});
