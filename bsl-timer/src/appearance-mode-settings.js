import {
  APPEARANCE_MODE_OPTIONS,
  DEFAULT_APPEARANCE_MODE,
  applyAppearanceMode as applyCoreAppearanceMode,
  appearanceModeSettingsEqual,
  normalizeAppearanceMode,
  watchSystemAppearance
} from '@bsl-world/desktop-core/appearance';
import {
  loadSharedSettingsSection,
  saveSharedSettingsSection
} from '@bsl-world/desktop-core/settings';

export const APPEARANCE_MODE_SETTINGS_SECTION = 'appearance';
export const APPEARANCE_MODE_STORAGE_KEY = 'bsl-world.appearance-mode';
export const APPEARANCE_MODE_SETTINGS_EVENT =
  'bsl-world:appearance-mode-settings-changed';

export {
  APPEARANCE_MODE_OPTIONS,
  DEFAULT_APPEARANCE_MODE,
  appearanceModeSettingsEqual,
  normalizeAppearanceMode
};

export function getCachedAppearanceMode(
  storage = globalThis.localStorage ?? null
) {
  return normalizeAppearanceMode(
    storage?.getItem(APPEARANCE_MODE_STORAGE_KEY)
  );
}

export function applyAppearanceMode(
  mode = getCachedAppearanceMode(),
  {
    document = globalThis.document ?? null,
    storage = globalThis.localStorage ?? null,
    matchMedia = globalThis.matchMedia?.bind(globalThis) ?? null
  } = {}
) {
  const result = applyCoreAppearanceMode(mode, {
    document,
    matchMedia
  });

  storage?.setItem(APPEARANCE_MODE_STORAGE_KEY, result.mode);
  return result;
}

export function watchAppearanceMode({
  document = globalThis.document ?? null,
  storage = globalThis.localStorage ?? null,
  matchMedia = globalThis.matchMedia?.bind(globalThis) ?? null
} = {}) {
  return watchSystemAppearance(() => {
    if (getCachedAppearanceMode(storage) === DEFAULT_APPEARANCE_MODE) {
      applyAppearanceMode(DEFAULT_APPEARANCE_MODE, {
        document,
        storage,
        matchMedia
      });
    }
  }, matchMedia);
}

export async function loadAppearanceModeSettings(invoke) {
  const storedSettings = await loadSharedSettingsSection(
    APPEARANCE_MODE_SETTINGS_SECTION,
    invoke
  );
  const settings = {
    mode: normalizeAppearanceMode(storedSettings?.mode)
  };

  applyAppearanceMode(settings.mode);
  return settings;
}

export async function saveAppearanceModeSettings(settings, invoke) {
  const normalizedSettings = {
    mode: normalizeAppearanceMode(settings?.mode)
  };

  await saveSharedSettingsSection(
    APPEARANCE_MODE_SETTINGS_SECTION,
    normalizedSettings,
    invoke
  );
  applyAppearanceMode(normalizedSettings.mode);
  return normalizedSettings;
}
