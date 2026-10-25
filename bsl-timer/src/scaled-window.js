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
  width, height = 0, page = null, requireAllContent = false, onDiagnostic = null
}) {
  const report = (stage, details = {}) => onDiagnostic?.(stage, details);
  report('queued');
  const previous = pendingFits.get(appWindow) ?? Promise.resolve();
  const next = previous.catch(() => {}).then(async () => {
    report('fonts-wait');
    await document.fonts.ready;
    report('fonts-ready');
    fitActionButtons();
    const preferred = scaleInterfaceSize({ width, height }, getCachedFontSize());
    report('monitor-wait');
    const monitor = await currentMonitor();
    const dpi = monitor?.scaleFactor ?? window.devicePixelRatio ?? 1;
    report('visibility-wait');
    const visible = await appWindow.isVisible();
    report('inner-size-wait', { visible });
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
    report('measurement-complete', { visible, targetWidth, pixelsPerCssPixel, required });
    if (requireAllContent) {
      report('clear-min-size-wait');
      await appWindow.setMinSize(null);
    }
    const targetHeight = Math.max(Math.ceil(preferred.height * dpi),
      page ? cssSizeToPhysical(required, pixelsPerCssPixel).height : 1);
    report('inner-size-before-resize');
    inner = await appWindow.innerSize();
    if (Math.abs(inner.width - targetWidth) > 1 || Math.abs(inner.height - targetHeight) > 1) {
      report('set-size-wait', { targetWidth, targetHeight });
      await appWindow.setSize(new PhysicalSize(targetWidth, targetHeight));
      report('set-size-returned');
      if (visible) report('client-resize-wait');
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
      report('set-min-size-wait');
      await appWindow.setMinSize(new PhysicalSize(targetWidth, targetHeight));
    }
    report('work-area-wait');
    await keepWindowInsideWorkArea(appWindow);
    report('complete');
  });
  pendingFits.set(appWindow, next);
  return next;
}
