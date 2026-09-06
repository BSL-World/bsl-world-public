export const THEME_STORAGE_KEY = 'bsl-timer.theme';
export const GLOW_STORAGE_KEY = 'bsl-timer.glow';
export const VISUAL_PREVIEW_EVENT = 'bsl-timer:visual-preview';

export const DEFAULT_THEME = 'green';
export const DEFAULT_GLOW_ENABLED = true;

const supportedThemes = Object.freeze([
  Object.freeze({
    code: 'green',
    nameKey: 'theme.green'
  }),
  Object.freeze({
    code: 'blue',
    nameKey: 'theme.blue'
  }),
  Object.freeze({
    code: 'purple',
    nameKey: 'theme.purple'
  }),
  Object.freeze({
    code: 'magenta',
    nameKey: 'theme.magenta'
  }),
  Object.freeze({
    code: 'neon-cyan',
    nameKey: 'theme.neonCyan'
  }),
  Object.freeze({
    code: 'tan',
    nameKey: 'theme.tan'
  })
]);

export function normalizeTheme(theme) {
  const isSupported = supportedThemes.some(
    ({ code }) => code === theme
  );

  return isSupported ? theme : DEFAULT_THEME;
}

export function normalizeGlowEnabled(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'false') {
    return false;
  }

  if (value === 'true') {
    return true;
  }

  return DEFAULT_GLOW_ENABLED;
}

export function getSupportedThemes() {
  return supportedThemes;
}

export function getTheme() {
  return normalizeTheme(
    localStorage.getItem(THEME_STORAGE_KEY)
  );
}

export function getGlowEnabled() {
  return normalizeGlowEnabled(
    localStorage.getItem(GLOW_STORAGE_KEY)
  );
}

export function applyTheme(theme = getTheme()) {
  const normalizedTheme = normalizeTheme(theme);
  document.documentElement.dataset.theme = normalizedTheme;
  return normalizedTheme;
}

export function applyGlow(glowEnabled = getGlowEnabled()) {
  const normalizedGlowEnabled = normalizeGlowEnabled(glowEnabled);

  document.documentElement.dataset.glow =
    normalizedGlowEnabled ? 'on' : 'off';

  return normalizedGlowEnabled;
}

export function setTheme(theme) {
  const normalizedTheme = applyTheme(theme);

  localStorage.setItem(
    THEME_STORAGE_KEY,
    normalizedTheme
  );

  window.dispatchEvent(new CustomEvent(
    'bsl-timer:theme-changed',
    {
      detail: {
        theme: normalizedTheme
      }
    }
  ));

  return normalizedTheme;
}

export function setGlowEnabled(glowEnabled) {
  const normalizedGlowEnabled = applyGlow(glowEnabled);

  localStorage.setItem(
    GLOW_STORAGE_KEY,
    String(normalizedGlowEnabled)
  );

  window.dispatchEvent(new CustomEvent(
    'bsl-timer:glow-changed',
    {
      detail: {
        glowEnabled: normalizedGlowEnabled
      }
    }
  ));

  return normalizedGlowEnabled;
}
