export const BEHAVIOR_STORAGE_KEY = 'bsl-timer.behavior';

export const StartupTimerAction = Object.freeze({
  ASK: 'ask',
  RESUME: 'resume',
  RESET: 'reset'
});

export const DEFAULT_BEHAVIOR = Object.freeze({
  confirmCloseWithActiveTimers: true,
  startupTimerAction: StartupTimerAction.ASK
});

function isStartupTimerAction(value) {
  return Object.values(StartupTimerAction).includes(value);
}

export function normalizeBehavior(behavior = {}) {
  return {
    confirmCloseWithActiveTimers:
      behavior.confirmCloseWithActiveTimers !== false,
    startupTimerAction: isStartupTimerAction(
      behavior.startupTimerAction
    )
      ? behavior.startupTimerAction
      : DEFAULT_BEHAVIOR.startupTimerAction
  };
}

export function getBehavior(storage = globalThis.localStorage) {
  const storedBehavior = storage.getItem(
    BEHAVIOR_STORAGE_KEY
  );

  if (!storedBehavior) {
    return normalizeBehavior(DEFAULT_BEHAVIOR);
  }

  try {
    return normalizeBehavior(JSON.parse(storedBehavior));
  } catch (error) {
    console.error('Failed to read behavior settings:', error);
    return normalizeBehavior(DEFAULT_BEHAVIOR);
  }
}

export function saveBehavior(
  behavior,
  storage = globalThis.localStorage
) {
  const normalizedBehavior = normalizeBehavior(behavior);

  storage.setItem(
    BEHAVIOR_STORAGE_KEY,
    JSON.stringify(normalizedBehavior)
  );

  return normalizedBehavior;
}

export function behaviorEquals(first, second) {
  const normalizedFirst = normalizeBehavior(first);
  const normalizedSecond = normalizeBehavior(second);

  return normalizedFirst.confirmCloseWithActiveTimers
    === normalizedSecond.confirmCloseWithActiveTimers
    && normalizedFirst.startupTimerAction
    === normalizedSecond.startupTimerAction;
}
