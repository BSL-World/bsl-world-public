import {
  DEFAULT_REGIONAL_SETTINGS,
  normalizeRegionalSettings
} from '@bsl-world/desktop-core/regional';
import {
  loadSharedSettingsSection,
  saveSharedSettingsSection
} from '@bsl-world/desktop-core/settings';

export const REGIONAL_SETTINGS_SECTION = 'regional';
export const REGIONAL_SETTINGS_EVENT =
  'bsl-world:regional-settings-changed';

export async function loadRegionalSettings(invoke) {
  const storedSettings = await loadSharedSettingsSection(
    REGIONAL_SETTINGS_SECTION,
    invoke
  );

  return storedSettings === null
    ? { ...DEFAULT_REGIONAL_SETTINGS }
    : normalizeRegionalSettings(storedSettings);
}

export async function saveRegionalSettings(settings, invoke) {
  const normalizedSettings = normalizeRegionalSettings(settings);

  await saveSharedSettingsSection(
    REGIONAL_SETTINGS_SECTION,
    normalizedSettings,
    invoke
  );
  return normalizedSettings;
}
