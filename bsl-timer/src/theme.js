export const THEME_STORAGE_KEY = 'bsl-timer.theme';

const DEFAULT_THEME = 'green';

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
    code: 'neon-cyan',
    nameKey: 'theme.neonCyan'
  }),
  Object.freeze({
    code: 'tan',
    nameKey: 'theme.tan'
  }),
  Object.freeze({
    code: 'purple',
    nameKey: 'theme.purple'
  })
]);

function normalizeTheme(theme) {
  const isSupported = supportedThemes.some(
    ({ code }) => code === theme
  );

  return isSupported ? theme : DEFAULT_THEME;
}

export function getSupportedThemes() {
  return supportedThemes;
}

export function getTheme() {
  return normalizeTheme(
    localStorage.getItem(THEME_STORAGE_KEY)
  );
}

export function applyTheme(theme = getTheme()) {
  const normalizedTheme = normalizeTheme(theme);
  document.documentElement.dataset.theme = normalizedTheme;
  return normalizedTheme;
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
