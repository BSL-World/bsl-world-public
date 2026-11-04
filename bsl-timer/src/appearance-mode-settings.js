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
export const AUXILIARY_APPEARANCE_STORAGE_KEY = 'bsl-timer.auxiliary-appearance-mode';
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

export function getCachedAuxiliaryAppearanceMode(storage = globalThis.localStorage ?? null) {
  const mode = normalizeAppearanceMode(storage?.getItem(AUXILIARY_APPEARANCE_STORAGE_KEY));
  return mode === 'glass' ? DEFAULT_APPEARANCE_MODE : mode;
}

function isAuxiliaryDocument(document) {
  return Boolean(document?.body?.matches(
    '.settings-body, .about-window-body, .whats-new-window-body, .date-countdown-editor-body'
  ));
}

export function applyAppearanceMode(
  mode = getCachedAppearanceMode(),
  {
    document = globalThis.document ?? null,
    storage = globalThis.localStorage ?? null,
    matchMedia = globalThis.matchMedia?.bind(globalThis) ?? null,
    auxiliaryMode,
    persist = true
  } = {}
) {
  // Keep the ordinary appearance independently of the main window's Glass material.
  const ordinaryMode = normalizeAppearanceMode(auxiliaryMode ?? (
    normalizeAppearanceMode(mode) === 'glass'
      ? getCachedAuxiliaryAppearanceMode(storage)
      : mode
  ));
  const retainedMode = ordinaryMode === 'glass' ? DEFAULT_APPEARANCE_MODE : ordinaryMode;
  if (persist && storage?.getItem(AUXILIARY_APPEARANCE_STORAGE_KEY) !== retainedMode) {
    storage?.setItem(AUXILIARY_APPEARANCE_STORAGE_KEY, retainedMode);
  }
  const result = applyCoreAppearanceMode(mode, {
    document,
    matchMedia
  });

  if (result.mode === 'glass' && isAuxiliaryDocument(document)) {
    applyCoreAppearanceMode(retainedMode, { document, matchMedia });
    document.documentElement.dataset.appearanceMode = result.mode;
  }

  if (persist) storage?.setItem(APPEARANCE_MODE_STORAGE_KEY, result.mode);
  applyCoreGlassTextTone(getCachedGlassTextTone(storage), document);
  applyCoreGlassGlowIntensity(getCachedGlassGlowIntensity(storage), document);
  return result;
}

// A storage notification is already committed. Read the latest selection and
// apply it without publishing an older event value back to the other windows.
export function applyCachedAppearanceMode(options = {}) {
  const { storage = globalThis.localStorage ?? null } = options;
  return applyAppearanceMode(getCachedAppearanceMode(storage), {
    ...options, storage, persist: false
  });
}

export function watchAppearanceMode({
  document = globalThis.document ?? null,
  storage = globalThis.localStorage ?? null,
  matchMedia = globalThis.matchMedia?.bind(globalThis) ?? null
} = {}) {
  const onStorage = event => {
    if (event.key === AUXILIARY_APPEARANCE_STORAGE_KEY) {
      applyCachedAppearanceMode({ document, storage, matchMedia });
    }
    if (event.key === GLASS_GLOW_INTENSITY_STORAGE_KEY) applyCoreGlassGlowIntensity(getCachedGlassGlowIntensity(storage), document);
    if (event.key === GLASS_TEXT_TONE_STORAGE_KEY) {
      applyCoreGlassTextTone(getCachedGlassTextTone(storage), document);
    }
  };
  const window = document?.defaultView;
  window?.addEventListener('storage', onStorage);
  const stopSystemWatch = watchSystemAppearance(() => {
    const mode = getCachedAppearanceMode(storage);
    if (mode === DEFAULT_APPEARANCE_MODE || (
      mode === 'glass' && isAuxiliaryDocument(document)
      && getCachedAuxiliaryAppearanceMode(storage) === DEFAULT_APPEARANCE_MODE
    )) {
      applyCachedAppearanceMode({
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
