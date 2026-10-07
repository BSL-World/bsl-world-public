export const DEFAULT_THEME = 'green';
export const DEFAULT_GLOW_ENABLED = true;

export const CANONICAL_THEMES = Object.freeze([
  Object.freeze({ code: 'green', nameKey: 'theme.green' }),
  Object.freeze({ code: 'blue', nameKey: 'theme.blue' }),
  Object.freeze({ code: 'purple', nameKey: 'theme.purple' }),
  Object.freeze({ code: 'magenta', nameKey: 'theme.magenta' }),
  Object.freeze({ code: 'neon-cyan', nameKey: 'theme.neonCyan' }),
  Object.freeze({ code: 'tan', nameKey: 'theme.tan' })
]);

export function normalizeTheme(
  theme,
  supportedThemes = CANONICAL_THEMES,
  defaultTheme = DEFAULT_THEME
) {
  return supportedThemes.some(({ code }) => code === theme)
    ? theme
    : defaultTheme;
}

export function normalizeGlowEnabled(
  value,
  defaultValue = DEFAULT_GLOW_ENABLED
) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === 'false') {
    return false;
  }

  if (value === 'true') {
    return true;
  }

  return defaultValue;
}

export function createThemeController({
  themeStorageKey,
  glowStorageKey,
  themeEventName,
  glowEventName,
  supportedThemes = CANONICAL_THEMES,
  defaultTheme = DEFAULT_THEME,
  defaultGlowEnabled = DEFAULT_GLOW_ENABLED,
  storage = null,
  document: document_ = null,
  eventTarget = null
}) {
  const getStorage = () => storage ?? globalThis.localStorage ?? null;
  const getRoot = () => (
    document_ ?? globalThis.document ?? null
  )?.documentElement ?? null;
  const getTarget = () => eventTarget ?? globalThis.window ?? null;

  function getSupportedThemes() {
    return supportedThemes;
  }

  function getTheme() {
    return normalizeTheme(
      getStorage()?.getItem(themeStorageKey),
      supportedThemes,
      defaultTheme
    );
  }

  function getGlowEnabled() {
    return normalizeGlowEnabled(
      getStorage()?.getItem(glowStorageKey),
      defaultGlowEnabled
    );
  }

  function applyTheme(theme = getTheme()) {
    const normalizedTheme = normalizeTheme(
      theme,
      supportedThemes,
      defaultTheme
    );
    const root = getRoot();

    if (root) {
      root.dataset.theme = normalizedTheme;
    }

    return normalizedTheme;
  }

  function applyGlow(glowEnabled = getGlowEnabled()) {
    const normalizedGlowEnabled = normalizeGlowEnabled(
      glowEnabled,
      defaultGlowEnabled
    );
    const root = getRoot();

    if (root) {
      root.dataset.glow = normalizedGlowEnabled ? 'on' : 'off';
    }

    return normalizedGlowEnabled;
  }

  function dispatch(name, detail) {
    const target = getTarget();

    if (target && name) {
      target.dispatchEvent(new CustomEvent(name, { detail }));
    }
  }

  function setTheme(theme) {
    const normalizedTheme = applyTheme(theme);

    getStorage()?.setItem(themeStorageKey, normalizedTheme);
    dispatch(themeEventName, { theme: normalizedTheme });
    return normalizedTheme;
  }

  function setGlowEnabled(glowEnabled) {
    const normalizedGlowEnabled = applyGlow(glowEnabled);

    getStorage()?.setItem(
      glowStorageKey,
      String(normalizedGlowEnabled)
    );
    dispatch(glowEventName, { glowEnabled: normalizedGlowEnabled });
    return normalizedGlowEnabled;
  }

  return Object.freeze({
    applyGlow,
    applyTheme,
    getGlowEnabled,
    getSupportedThemes,
    getTheme,
    setGlowEnabled,
    setTheme
  });
}
