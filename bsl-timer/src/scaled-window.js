import { PhysicalSize } from '@tauri-apps/api/dpi';
import { currentMonitor } from '@tauri-apps/api/window';
import { scaleInterfaceSize } from '@bsl-world/desktop-core/typography';
import { measureNaturalSize, cssSizeToPhysical } from '@bsl-world/desktop-core/layout';
import { getCachedFontSize } from './font-size-settings.js';
import { fitActionButtons } from './action-button-layout.js';
import { keepWindowInsideWorkArea } from './window-position.js';

const pendingFits = new WeakMap();
const pixelRatios = new WeakMap();
const pause = () => new Promise(resolve => setTimeout(resolve, 25));

async function waitForClientResize(appWindow, pixelsPerCssPixel) {
  // Hidden WebView2 windows may suspend requestAnimationFrame. Timer-based
  // polling accounts for a CSS/native pixel ratio different from monitor DPI.
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await pause();
    const native = await appWindow.innerSize();
    if (Math.abs(window.innerWidth - native.width / pixelsPerCssPixel) <= 0.75
      && Math.abs(window.innerHeight - native.height / pixelsPerCssPixel) <= 0.75) return;
  }
  throw new Error('The WebView viewport did not settle after resizing');
}

function measurePage(page, viewportWidth = window.innerWidth) {
  const body = getComputedStyle(document.body);
  const size = measureNaturalSize(page, { width: viewportWidth
    - parseFloat(body.paddingLeft) - parseFloat(body.paddingRight) });
  return {
    width: size.width + parseFloat(body.paddingLeft) + parseFloat(body.paddingRight),
    height: size.height + parseFloat(body.paddingTop) + parseFloat(body.paddingBottom)
  };
}

export function fitScaledWindow(appWindow, {
  width, height = 0, page = null, requireAllContent = false
}) {
  const previous = pendingFits.get(appWindow) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    await document.fonts.ready;
    fitActionButtons();
    const preferred = scaleInterfaceSize({ width, height }, getCachedFontSize());
    const monitor = await currentMonitor();
    const dpi = monitor?.scaleFactor ?? window.devicePixelRatio ?? 1;
    const visible = await appWindow.isVisible();
    let inner = await appWindow.innerSize();
    const observedRatio = inner.width / Math.max(1, window.innerWidth);
    const previousRatio = pixelRatios.get(appWindow);
    // Native and DOM sizes round to whole pixels. Do not reinterpret that
    // rounding as a new zoom on every fit, feeding it into the next resize.
    const roundingTolerance = 2 * observedRatio / Math.max(1, window.innerWidth);
    const pixelsPerCssPixel = previousRatio?.dpi === dpi
      && (!visible || Math.abs(previousRatio.value - observedRatio) <= roundingTolerance)
      ? previousRatio.value : observedRatio;
    pixelRatios.set(appWindow, { dpi, value: pixelsPerCssPixel });
    let targetWidth = Math.ceil(preferred.width * dpi);

    // Work out both axes on copies first. Never resize to a temporary narrow
    // window just to measure it; repeated fit requests must not bounce it.
    let required = { width: 0, height: 0 };
    if (page) {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        required = measurePage(page, targetWidth / pixelsPerCssPixel);
        const neededWidth = cssSizeToPhysical(required, pixelsPerCssPixel).width;
        if (neededWidth <= targetWidth + 1) break;
        targetWidth = neededWidth;
      }
    }
    if (requireAllContent) await appWindow.setMinSize(null);
    const targetHeight = Math.max(Math.ceil(preferred.height * dpi),
      page ? cssSizeToPhysical(required, pixelsPerCssPixel).height : 1);
    inner = await appWindow.innerSize();
    if (Math.abs(inner.width - targetWidth) > 1 || Math.abs(inner.height - targetHeight) > 1) {
      await appWindow.setSize(new PhysicalSize(targetWidth, targetHeight));
      if (visible) await waitForClientResize(appWindow, pixelsPerCssPixel);
    }
    if (requireAllContent) {
      if (visible) {
        const actual = measurePage(page);
        if (actual.height > window.innerHeight + 1 || actual.width > window.innerWidth + 1) {
          throw new Error(`Content does not fit: ${actual.width}x${actual.height}, viewport ${window.innerWidth}x${window.innerHeight}`);
        }
      }
      // Manual resizing cannot cut off the measured contents either.
      await appWindow.setMinSize(new PhysicalSize(targetWidth, targetHeight));
    }
    await keepWindowInsideWorkArea(appWindow);
  });
  pendingFits.set(appWindow, next);
  return next;
}
