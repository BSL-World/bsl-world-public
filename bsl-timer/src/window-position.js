import {
  PhysicalPosition,
  availableMonitors
} from '@tauri-apps/api/window';
import {
  DEFAULT_WINDOW_MARGIN,
  createWindowPositionManager
} from '@bsl-world/desktop-core/window';

const windowPositionManager = createWindowPositionManager({
  storagePrefix: 'bsl-timer.window-position.',
  availableMonitors,
  createPosition: (x, y) => new PhysicalPosition(x, y)
});

export async function keepWindowInsideWorkArea(
  appWindow,
  margin = DEFAULT_WINDOW_MARGIN,
  requestedPosition = null
) {
  return windowPositionManager.keepInsideWorkArea(
    appWindow,
    margin,
    requestedPosition
  );
}

export async function prepareWindowPosition(
  appWindow,
  margin = DEFAULT_WINDOW_MARGIN
) {
  await windowPositionManager.restoreAndTrack(appWindow, margin);
}

export async function prepareAuxiliaryWindow(
  appWindow,
  margin = DEFAULT_WINDOW_MARGIN,
  { takeFocus = true } = {}
) {
  try {
    await windowPositionManager.restoreAndTrack(appWindow, margin);
  } catch (error) {
    console.error('Failed to restore the window position:', error);
  } finally {
    await appWindow.show();
    if (takeFocus) {
      await appWindow.setFocus();
    }
  }
}
