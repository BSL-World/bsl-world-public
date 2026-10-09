import {
  DEFAULT_FONT_SIZE,
  FONT_SIZE_OPTIONS,
  applyFontSize as applyCoreFontSize,
  fontSizeSettingsEqual,
  normalizeFontSize
} from '@bsl-world/desktop-core/typography';
import {
  loadSharedSettingsSection,
  saveSharedSettingsSection
} from '@bsl-world/desktop-core/settings';

export const FONT_SIZE_SETTINGS_SECTION = 'typography';
export const FONT_SIZE_STORAGE_KEY = 'bsl-world.font-size';
export const FONT_SIZE_SETTINGS_EVENT =
  'bsl-world:font-size-settings-changed';

export {
  DEFAULT_FONT_SIZE,
  FONT_SIZE_OPTIONS,
  fontSizeSettingsEqual,
  normalizeFontSize
};

export function getCachedFontSize(
  storage = globalThis.localStorage ?? null
) {
  return normalizeFontSize(
    storage?.getItem(FONT_SIZE_STORAGE_KEY)
  );
}

export function applyFontSize(
  fontSize = getCachedFontSize(),
  {
    document = globalThis.document ?? null,
    storage = globalThis.localStorage ?? null
  } = {}
) {
  const normalizedFontSize = applyCoreFontSize(fontSize, document);

  storage?.setItem(FONT_SIZE_STORAGE_KEY, normalizedFontSize);
  return normalizedFontSize;
}

export async function loadFontSizeSettings(invoke) {
  const storedSettings = await loadSharedSettingsSection(
    FONT_SIZE_SETTINGS_SECTION,
    invoke
  );
  const settings = {
    fontSize: normalizeFontSize(storedSettings?.fontSize)
  };

  applyFontSize(settings.fontSize);
  return settings;
}

export async function saveFontSizeSettings(settings, invoke) {
  const normalizedSettings = {
    fontSize: normalizeFontSize(settings?.fontSize)
  };

  await saveSharedSettingsSection(
    FONT_SIZE_SETTINGS_SECTION,
    normalizedSettings,
    invoke
  );
  applyFontSize(normalizedSettings.fontSize);
  return normalizedSettings;
}
