import { invoke } from '@tauri-apps/api/core';
import { createWindowMaterialUpdater } from './window-material.js';

export const APPEARANCE_STORAGE_KEY =
  'bsl-timer.appearance';

export const APPEARANCE_PREVIEW_EVENT =
  'bsl-timer:appearance-preview';

export const WINDOW_TRANSPARENCY_MIN = 0;
export const WINDOW_TRANSPARENCY_MAX = 90;
export const DISPLAY_BRIGHTNESS_MIN = 50;
export const DISPLAY_BRIGHTNESS_MAX = 150;
export const DEFAULT_WINDOW_TRANSPARENCY = 50;
export const DEFAULT_DISPLAY_BRIGHTNESS = 100;

const DEFAULT_APPEARANCE = Object.freeze({
  windowTransparency: DEFAULT_WINDOW_TRANSPARENCY,
  displayBrightness: DEFAULT_DISPLAY_BRIGHTNESS
});

let currentAppearance = null;
const updateWindowMaterial = createWindowMaterialUpdater(
  (appearanceMode, transparency) => invoke('set_main_window_transparency', {
    transparency,
    appearanceMode
  })
);

export function watchWindowMaterial() {
  const observer = new MutationObserver(() => {
    void applyAppearance(currentAppearance ?? getAppearance());
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-appearance']
  });
  return () => observer.disconnect();
}

function clampNumber(value, minimum, maximum, fallback) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return Math.min(
    maximum,
    Math.max(minimum, Math.round(number))
  );
}

export function normalizeAppearance(appearance = {}) {
  return {
    windowTransparency: clampNumber(
      appearance.windowTransparency,
      WINDOW_TRANSPARENCY_MIN,
      WINDOW_TRANSPARENCY_MAX,
      DEFAULT_APPEARANCE.windowTransparency
    ),
    displayBrightness: clampNumber(
      appearance.displayBrightness,
      DISPLAY_BRIGHTNESS_MIN,
      DISPLAY_BRIGHTNESS_MAX,
      DEFAULT_APPEARANCE.displayBrightness
    )
  };
}

export function getAppearance() {
  const storedAppearance = localStorage.getItem(
    APPEARANCE_STORAGE_KEY
  );

  if (!storedAppearance) {
    return normalizeAppearance(DEFAULT_APPEARANCE);
  }

  try {
    return normalizeAppearance(JSON.parse(storedAppearance));
  } catch (error) {
    console.error('Failed to read appearance settings:', error);
    return normalizeAppearance(DEFAULT_APPEARANCE);
  }
}

export function saveAppearance(appearance) {
  const normalizedAppearance = normalizeAppearance(appearance);

  localStorage.setItem(
    APPEARANCE_STORAGE_KEY,
    JSON.stringify(normalizedAppearance)
  );

  return normalizedAppearance;
}

export function appearanceEquals(first, second) {
  const normalizedFirst = normalizeAppearance(first);
  const normalizedSecond = normalizeAppearance(second);

  return normalizedFirst.windowTransparency
    === normalizedSecond.windowTransparency
    && normalizedFirst.displayBrightness
    === normalizedSecond.displayBrightness;
}

function applyAppearanceStyles(appearance) {
  document.documentElement.style.setProperty(
    '--bsl-glass-density',
    String((100 - appearance.windowTransparency) / 50)
  );
  const surfaceAlpha = Math.min(
    0.98,
    Math.max(
      0.2,
      1.505 - (appearance.windowTransparency * 0.0145)
    )
  );

  document.documentElement.style.setProperty(
    '--window-surface-alpha',
    surfaceAlpha.toFixed(2)
  );

  document.documentElement.style.setProperty(
    '--display-brightness',
    String(appearance.displayBrightness / 100)
  );
}

export async function applyAppearance(appearance) {
  const normalizedAppearance = normalizeAppearance(appearance);
  currentAppearance = normalizedAppearance;
  applyAppearanceStyles(normalizedAppearance);
  try {
    await updateWindowMaterial(
      document.documentElement.dataset.appearance ?? 'dark',
      normalizedAppearance.windowTransparency
    );
  } catch (error) {
    console.error('Failed to change window transparency:', error);
  }

  return normalizedAppearance;
}
