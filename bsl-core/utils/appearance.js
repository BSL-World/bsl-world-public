export const AppearanceMode = Object.freeze({
  SYSTEM: 'system',
  LIGHT: 'light',
  DARK: 'dark',
  GLASS: 'glass'
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
  }),
  Object.freeze({
    code: AppearanceMode.GLASS,
    nameKey: 'settings.appearanceModeGlass'
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
    === normalizeAppearanceMode(second?.mode)
    && normalizeGlassTextTone(first?.glassTextTone) === normalizeGlassTextTone(second?.glassTextTone)
    && normalizeGlassGlowIntensity(first?.glassGlowIntensity) === normalizeGlassGlowIntensity(second?.glassGlowIntensity);
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

export const DEFAULT_GLASS_TEXT_TONE = 'light';
export const GLASS_TEXT_TONE_OPTIONS = Object.freeze([
  Object.freeze({ code: 'light', nameKey: 'settings.glassTextLight' }),
  Object.freeze({ code: 'dark', nameKey: 'settings.glassTextDark' })
]);

export function normalizeGlassTextTone(value) {
  return value === 'dark' ? 'dark' : DEFAULT_GLASS_TEXT_TONE;
}

export function applyGlassTextTone(value, document = globalThis.document ?? null) {
  const tone = normalizeGlassTextTone(value);
  if (document?.documentElement) document.documentElement.dataset.glassTextTone = tone;
  return tone;
}

export function normalizeGlassGlowIntensity(value) {
  if (value === null || value === undefined || String(value).trim() === '') return 100;
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(300, Math.round(number))) : 100;
}

export function applyGlassGlowIntensity(value, document = globalThis.document ?? null) {
  const intensity = normalizeGlassGlowIntensity(value);
  document?.documentElement?.style?.setProperty('--bsl-glass-glow-strength', String(intensity / 100));
  document?.documentElement?.style?.setProperty('--bsl-glass-glow-spread', String(1 + Math.max(0, intensity - 100) / 100));
  return intensity;
}
