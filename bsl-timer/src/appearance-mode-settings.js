import {
  APPEARANCE_MODE_OPTIONS,
  DEFAULT_APPEARANCE_MODE,
  GLASS_TEXT_TONE_OPTIONS,
  applyGlassTextTone as applyCoreGlassTextTone,
  normalizeGlassTextTone,
  normalizeGlassGlowIntensity,
  applyGlassGlowIntensity as applyCoreGlassGlowIntensity,
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
export const GLASS_TEXT_TONE_STORAGE_KEY = 'bsl-world.glass-text-tone';
export const GLASS_GLOW_INTENSITY_STORAGE_KEY = 'bsl-world.glass-glow-intensity';
export const APPEARANCE_MODE_SETTINGS_EVENT =
  'bsl-world:appearance-mode-settings-changed';

export {
  APPEARANCE_MODE_OPTIONS,
  DEFAULT_APPEARANCE_MODE,
  GLASS_TEXT_TONE_OPTIONS,
  appearanceModeSettingsEqual,
  normalizeAppearanceMode
};

export function getCachedGlassGlowIntensity(storage = globalThis.localStorage ?? null) {
  return normalizeGlassGlowIntensity(storage?.getItem(GLASS_GLOW_INTENSITY_STORAGE_KEY));
}

export function applyGlassGlowIntensity(
  value = getCachedGlassGlowIntensity(),
  { document = globalThis.document ?? null, storage = globalThis.localStorage ?? null } = {}
) {
  const intensity = applyCoreGlassGlowIntensity(value, document);
  storage?.setItem(GLASS_GLOW_INTENSITY_STORAGE_KEY, String(intensity));
  return intensity;
}

export function getCachedGlassTextTone(storage = globalThis.localStorage ?? null) {
  return normalizeGlassTextTone(storage?.getItem(GLASS_TEXT_TONE_STORAGE_KEY));
}

export function applyGlassTextTone(
  tone = getCachedGlassTextTone(),
  { document = globalThis.document ?? null, storage = globalThis.localStorage ?? null } = {}
) {
  const normalized = applyCoreGlassTextTone(tone, document);
  storage?.setItem(GLASS_TEXT_TONE_STORAGE_KEY, normalized);
  return normalized;
}

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
  applyCoreGlassTextTone(getCachedGlassTextTone(storage), document);
  applyCoreGlassGlowIntensity(getCachedGlassGlowIntensity(storage), document);
  return result;
}

export function watchAppearanceMode({
  document = globalThis.document ?? null,
  storage = globalThis.localStorage ?? null,
  matchMedia = globalThis.matchMedia?.bind(globalThis) ?? null
} = {}) {
  const onStorage = event => {
    if (event.key === GLASS_GLOW_INTENSITY_STORAGE_KEY) applyCoreGlassGlowIntensity(event.newValue, document);
    if (event.key === GLASS_TEXT_TONE_STORAGE_KEY) {
      applyCoreGlassTextTone(event.newValue, document);
    }
  };
  const window = document?.defaultView;
  window?.addEventListener('storage', onStorage);
  const stopSystemWatch = watchSystemAppearance(() => {
    if (getCachedAppearanceMode(storage) === DEFAULT_APPEARANCE_MODE) {
      applyAppearanceMode(DEFAULT_APPEARANCE_MODE, {
        document,
        storage,
        matchMedia
      });
    }
  }, matchMedia);
  return () => {
    stopSystemWatch();
    window?.removeEventListener('storage', onStorage);
  };
}

export async function loadAppearanceModeSettings(invoke) {
  const storedSettings = await loadSharedSettingsSection(
    APPEARANCE_MODE_SETTINGS_SECTION,
    invoke
  );
  const settings = {
    mode: normalizeAppearanceMode(storedSettings?.mode),
    glassTextTone: normalizeGlassTextTone(storedSettings?.glassTextTone),
    glassGlowIntensity: normalizeGlassGlowIntensity(storedSettings?.glassGlowIntensity)
  };

  applyAppearanceMode(settings.mode);
  applyGlassTextTone(settings.glassTextTone);
  applyGlassGlowIntensity(settings.glassGlowIntensity);
  return settings;
}

export async function saveAppearanceModeSettings(settings, invoke) {
  const normalizedSettings = {
    mode: normalizeAppearanceMode(settings?.mode),
    glassTextTone: normalizeGlassTextTone(settings?.glassTextTone),
    glassGlowIntensity: normalizeGlassGlowIntensity(settings?.glassGlowIntensity)
  };

  await saveSharedSettingsSection(
    APPEARANCE_MODE_SETTINGS_SECTION,
    normalizedSettings,
    invoke
  );
  applyAppearanceMode(normalizedSettings.mode);
  applyGlassTextTone(normalizedSettings.glassTextTone);
  applyGlassGlowIntensity(normalizedSettings.glassGlowIntensity);
  return normalizedSettings;
}
