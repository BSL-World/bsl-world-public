export const FontSize = Object.freeze({
  SMALL: 'small',
  NORMAL: 'normal',
  LARGE: 'large'
});

export const DEFAULT_FONT_SIZE = FontSize.NORMAL;

export const FONT_SIZE_OPTIONS = Object.freeze([
  Object.freeze({ code: FontSize.SMALL, nameKey: 'settings.fontSizeSmall' }),
  Object.freeze({ code: FontSize.NORMAL, nameKey: 'settings.fontSizeNormal' }),
  Object.freeze({ code: FontSize.LARGE, nameKey: 'settings.fontSizeLarge' })
]);

export function normalizeFontSize(
  value,
  defaultValue = DEFAULT_FONT_SIZE
) {
  return Object.values(FontSize).includes(value)
    ? value
    : defaultValue;
}

export function fontSizeSettingsEqual(first, second) {
  return normalizeFontSize(first?.fontSize)
    === normalizeFontSize(second?.fontSize);
}

export function applyFontSize(
  fontSize,
  document_ = globalThis.document ?? null
) {
  const normalizedFontSize = normalizeFontSize(fontSize);

  if (document_?.documentElement) {
    document_.documentElement.dataset.fontSize = normalizedFontSize;
  }

  return normalizedFontSize;
}
