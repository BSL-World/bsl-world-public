export const AppearanceMode = Object.freeze({
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark'
});

export const DEFAULT_APPEARANCE_MODE = AppearanceMode.SYSTEM;

export const APPEARANCE_MODE_OPTIONS = Object.freeze([
  Object.freeze({
    code: AppearanceMode.SYSTEM,
    nameKey: 'settings.appearanceModeSystem'
  }),
  Object.freeze({
    code: AppearanceMode.LIGHT,
    nameKey: 'settings.appearanceModeLight'
  }),
  Object.freeze({
    code: AppearanceMode.DARK,
    nameKey: 'settings.appearanceModeDark'
  })
]);

export function normalizeAppearanceMode(
  value,
  defaultValue = DEFAULT_APPEARANCE_MODE
) {
  return Object.values(AppearanceMode).includes(value)
    ? value
    : defaultValue;
}

export function resolveAppearanceMode(
  mode,
  prefersDark = false
) {
  const normalizedMode = normalizeAppearanceMode(mode);

  if (normalizedMode === AppearanceMode.SYSTEM) {
    return prefersDark ? AppearanceMode.DARK : AppearanceMode.LIGHT;
  }

  return normalizedMode;
}

export function appearanceModeSettingsEqual(first, second) {
  return normalizeAppearanceMode(first?.mode)
    === normalizeAppearanceMode(second?.mode);
}

export function applyAppearanceMode(
  mode,
  {
    document = globalThis.document ?? null,
    matchMedia = globalThis.matchMedia?.bind(globalThis) ?? null
  } = {}
) {
  const normalizedMode = normalizeAppearanceMode(mode);
  const prefersDark = Boolean(
    matchMedia?.('(prefers-color-scheme: dark)')?.matches
  );
  const resolvedMode = resolveAppearanceMode(
    normalizedMode,
    prefersDark
  );

  if (document?.documentElement) {
    document.documentElement.dataset.appearanceMode = normalizedMode;
    document.documentElement.dataset.appearance = resolvedMode;
  }

  return Object.freeze({
    mode: normalizedMode,
    resolvedMode
  });
}

export function watchSystemAppearance(
  onChange,
  matchMedia = globalThis.matchMedia?.bind(globalThis) ?? null
) {
  const mediaQuery = matchMedia?.('(prefers-color-scheme: dark)');

  if (!mediaQuery?.addEventListener) {
    return () => {};
  }

  const handleChange = (event) => {
    onChange(Boolean(event.matches));
  };

  mediaQuery.addEventListener('change', handleChange);
  return () => mediaQuery.removeEventListener('change', handleChange);
}
