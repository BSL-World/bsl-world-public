import {
  CANONICAL_THEMES,
  DEFAULT_GLOW_ENABLED,
  DEFAULT_THEME,
  createThemeController,
  normalizeGlowEnabled,
  normalizeTheme
} from '@bsl-world/desktop-core/theme';

export const THEME_STORAGE_KEY = 'bsl-timer.theme';
export const GLOW_STORAGE_KEY = 'bsl-timer.glow';
export const VISUAL_PREVIEW_EVENT = 'bsl-timer:visual-preview';

const themeController = createThemeController({
  themeStorageKey: THEME_STORAGE_KEY,
  glowStorageKey: GLOW_STORAGE_KEY,
  themeEventName: 'bsl-timer:theme-changed',
  glowEventName: 'bsl-timer:glow-changed',
  supportedThemes: CANONICAL_THEMES,
  defaultTheme: DEFAULT_THEME,
  defaultGlowEnabled: DEFAULT_GLOW_ENABLED
});

export {
  DEFAULT_GLOW_ENABLED,
  DEFAULT_THEME,
  normalizeGlowEnabled,
  normalizeTheme
};

export const applyGlow = themeController.applyGlow;
export const applyTheme = themeController.applyTheme;
export const getGlowEnabled = themeController.getGlowEnabled;
export const getSupportedThemes = themeController.getSupportedThemes;
export const getTheme = themeController.getTheme;
export const setGlowEnabled = themeController.setGlowEnabled;
export const setTheme = themeController.setTheme;
