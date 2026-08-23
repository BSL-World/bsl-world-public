import {
  PhysicalPosition,
  availableMonitors
} from '@tauri-apps/api/window';

const DEFAULT_WINDOW_MARGIN = 20;
const WINDOW_POSITION_STORAGE_PREFIX = 'bsl-timer.window-position.';

function getWindowPositionStorageKey(appWindow) {
  return `${WINDOW_POSITION_STORAGE_PREFIX}${appWindow.label}`;
}

function loadWindowPosition(appWindow) {
  try {
    const savedPosition = JSON.parse(
      localStorage.getItem(getWindowPositionStorageKey(appWindow))
    );

    if (
      Number.isFinite(savedPosition?.x)
      && Number.isFinite(savedPosition?.y)
    ) {
      return savedPosition;
    }
  } catch (error) {
    console.error('Failed to load the window position:', error);
  }

  return null;
}

function saveWindowPosition(appWindow, position) {
  try {
    localStorage.setItem(
      getWindowPositionStorageKey(appWindow),
      JSON.stringify({
        x: Math.round(position.x),
        y: Math.round(position.y)
      })
    );
  } catch (error) {
    console.error('Failed to save the window position:', error);
  }
}

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

function distanceToWorkArea(position, workArea) {
  const left = workArea.position.x;
  const top = workArea.position.y;
  const right = left + workArea.size.width;
  const bottom = top + workArea.size.height;
  const nearestX = clamp(position.x, left, right);
  const nearestY = clamp(position.y, top, bottom);
  const distanceX = position.x - nearestX;
  const distanceY = position.y - nearestY;

  return (distanceX ** 2) + (distanceY ** 2);
}

function findNearestMonitor(position, monitors) {
  return monitors.reduce((nearestMonitor, monitor) => {
    if (!nearestMonitor) {
      return monitor;
    }

    const nearestDistance = distanceToWorkArea(
      position,
      nearestMonitor.workArea
    );
    const candidateDistance = distanceToWorkArea(
      position,
      monitor.workArea
    );

    return candidateDistance < nearestDistance
      ? monitor
      : nearestMonitor;
  }, null);
}

export async function keepWindowInsideWorkArea(
  appWindow,
  margin = DEFAULT_WINDOW_MARGIN,
  requestedPosition = null
) {
  const actualPosition = await appWindow.outerPosition();
  const currentPosition = requestedPosition ?? actualPosition;
  const windowSize = await appWindow.outerSize();
  const monitor = findNearestMonitor(
    currentPosition,
    await availableMonitors()
  );

  if (!monitor) {
    return currentPosition;
  }

  const physicalMargin = Math.round(margin * monitor.scaleFactor);
  const workArea = monitor.workArea;
  const minimumX = workArea.position.x + physicalMargin;
  const minimumY = workArea.position.y + physicalMargin;
  const maximumX = Math.max(
    minimumX,
    workArea.position.x
      + workArea.size.width
      - windowSize.width
      - physicalMargin
  );
  const maximumY = Math.max(
    minimumY,
    workArea.position.y
      + workArea.size.height
      - windowSize.height
      - physicalMargin
  );
  const safePosition = new PhysicalPosition(
    clamp(currentPosition.x, minimumX, maximumX),
    clamp(currentPosition.y, minimumY, maximumY)
  );

  if (
    safePosition.x !== actualPosition.x
    || safePosition.y !== actualPosition.y
  ) {
    await appWindow.setPosition(safePosition);
  }

  return safePosition;
}

export async function migrateLegacyWindowPosition(
  appWindow,
  storageKey
) {
  try {
    const savedPosition = JSON.parse(localStorage.getItem(storageKey));

    if (
      Number.isFinite(savedPosition?.x)
      && Number.isFinite(savedPosition?.y)
    ) {
      saveWindowPosition(appWindow, savedPosition);
    }
  } catch (error) {
    console.error('Failed to migrate the saved window position:', error);
  } finally {
    localStorage.removeItem(storageKey);
  }
}

export async function prepareWindowPosition(
  appWindow,
  margin = DEFAULT_WINDOW_MARGIN
) {
  const safePosition = await keepWindowInsideWorkArea(
    appWindow,
    margin,
    loadWindowPosition(appWindow)
  );

  saveWindowPosition(appWindow, safePosition);

  await appWindow.onMoved((event) => {
    saveWindowPosition(appWindow, event.payload);
  });
}

export async function prepareAuxiliaryWindow(
  appWindow,
  margin = DEFAULT_WINDOW_MARGIN
) {
  try {
    await prepareWindowPosition(appWindow, margin);
  } catch (error) {
    console.error('Failed to keep the window inside the work area:', error);
  } finally {
    await appWindow.show();
    await appWindow.setFocus();
  }
}
