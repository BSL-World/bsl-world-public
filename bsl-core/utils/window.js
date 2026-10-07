export const DEFAULT_WINDOW_MARGIN = 20;

export function clamp(value, minimum, maximum) {
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

export function findNearestMonitor(position, monitors) {
  return monitors.reduce((nearestMonitor, monitor) => {
    if (!nearestMonitor) {
      return monitor;
    }

    return distanceToWorkArea(position, monitor.workArea)
      < distanceToWorkArea(position, nearestMonitor.workArea)
      ? monitor
      : nearestMonitor;
  }, null);
}

export function calculateSafeWindowPosition({
  position,
  windowSize,
  monitors,
  margin = DEFAULT_WINDOW_MARGIN
}) {
  const monitor = findNearestMonitor(position, monitors);

  if (!monitor) {
    return { x: position.x, y: position.y };
  }

  const physicalMargin = Math.round(margin * monitor.scaleFactor);
  const { workArea } = monitor;
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

  return {
    x: clamp(position.x, minimumX, maximumX),
    y: clamp(position.y, minimumY, maximumY)
  };
}

export function createWindowPositionManager({
  storagePrefix,
  availableMonitors,
  createPosition,
  storage = null,
  logger = globalThis.console
}) {
  const getStorage = () => storage ?? globalThis.localStorage ?? null;
  const getStorageKey = (appWindow) => `${storagePrefix}${appWindow.label}`;

  function loadPosition(appWindow) {
    try {
      const savedPosition = JSON.parse(
        getStorage()?.getItem(getStorageKey(appWindow))
      );

      return Number.isFinite(savedPosition?.x)
        && Number.isFinite(savedPosition?.y)
        ? savedPosition
        : null;
    } catch (error) {
      logger?.error?.('Failed to load the window position:', error);
      return null;
    }
  }

  function savePosition(appWindow, position) {
    try {
      getStorage()?.setItem(
        getStorageKey(appWindow),
        JSON.stringify({
          x: Math.round(position.x),
          y: Math.round(position.y)
        })
      );
    } catch (error) {
      logger?.error?.('Failed to save the window position:', error);
    }
  }

  async function keepInsideWorkArea(
    appWindow,
    margin = DEFAULT_WINDOW_MARGIN,
    requestedPosition = null
  ) {
    const actualPosition = await appWindow.outerPosition();
    const currentPosition = requestedPosition ?? actualPosition;
    const safePosition = calculateSafeWindowPosition({
      position: currentPosition,
      windowSize: await appWindow.outerSize(),
      monitors: await availableMonitors(),
      margin
    });

    if (
      safePosition.x !== actualPosition.x
      || safePosition.y !== actualPosition.y
    ) {
      await appWindow.setPosition(createPosition(
        safePosition.x,
        safePosition.y
      ));
    }

    return safePosition;
  }

  async function restoreAndTrack(
    appWindow,
    margin = DEFAULT_WINDOW_MARGIN
  ) {
    const safePosition = await keepInsideWorkArea(
      appWindow,
      margin,
      loadPosition(appWindow)
    );

    savePosition(appWindow, safePosition);
    await appWindow.onMoved((event) => {
      savePosition(appWindow, event.payload);
    });
    return safePosition;
  }

  return Object.freeze({
    keepInsideWorkArea,
    loadPosition,
    restoreAndTrack,
    savePosition
  });
}
