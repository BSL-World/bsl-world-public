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

// Geometry uses the same scale as ordinary text. Large readouts may use the
// gentler display scale, while their containing window follows uiScale.
export const FONT_SIZE_METRICS = Object.freeze({
  small: Object.freeze({ uiScale: 0.9, displayScale: 0.95 }),
  normal: Object.freeze({ uiScale: 1, displayScale: 1 }),
  large: Object.freeze({ uiScale: 1.15, displayScale: 1.075 })
});

export function getFontSizeMetrics(fontSize) {
  return FONT_SIZE_METRICS[normalizeFontSize(fontSize)];
}

export function scaleInterfaceSize(size, fontSize) {
  const { uiScale } = getFontSizeMetrics(fontSize);
  return {
    width: Math.ceil(size.width * uiScale),
    height: Math.ceil(size.height * uiScale)
  };
}
