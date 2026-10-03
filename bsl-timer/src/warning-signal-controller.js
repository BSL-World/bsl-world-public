import { TimerState } from './timer.js';
import {
  getWarningDelivery,
  normalizeWarningSignalSettings
} from './warning-signal-settings.js';

const MINUTE_MS = 60_000;

function getEnabledThresholdsMs(settings) {
  const normalizedSettings = normalizeWarningSignalSettings(settings);

  return [...new Set([
    ...normalizedSettings.soundThresholdMinutes,
    ...normalizedSettings.informerThresholdMinutes
  ])]
    .sort((first, second) => second - first)
    .map((minutes) => minutes * MINUTE_MS);
}

function createInitialRunState(snapshot, enabledThresholdsMs) {
  const firedThresholdsMs = new Set();

  if (snapshot.state !== TimerState.IDLE) {
    enabledThresholdsMs.forEach((thresholdMs) => {
      if (snapshot.remainingMs <= thresholdMs) {
        firedThresholdsMs.add(thresholdMs);
      }
    });
  }

  return {
    state: snapshot.state,
    durationMs: snapshot.durationMs,
    previousRemainingMs: snapshot.remainingMs,
    firedThresholdsMs
  };
}

export class WarningSignalController {
  constructor({ onWarning = () => {} } = {}) {
    this.onWarning = onWarning;
    this.runs = new Map();
  }

  update(eventId, snapshot, settings = {}) {
    const enabledThresholdsMs = getEnabledThresholdsMs(settings);
    let run = this.runs.get(eventId);

    if (!run) {
      run = createInitialRunState(snapshot, enabledThresholdsMs);
      this.runs.set(eventId, run);
      return [];
    }

    if (snapshot.state === TimerState.IDLE) {
      run.state = snapshot.state;
      run.durationMs = snapshot.durationMs;
      run.previousRemainingMs = snapshot.remainingMs;
      run.firedThresholdsMs.clear();
      return [];
    }

    if (
      snapshot.state !== TimerState.RUNNING
      && snapshot.state !== TimerState.PAUSED
    ) {
      enabledThresholdsMs.forEach(
        (thresholdMs) => run.firedThresholdsMs.add(thresholdMs)
      );
      run.state = snapshot.state;
      run.previousRemainingMs = snapshot.remainingMs;
      return [];
    }

    const firedNow = [];
    const startedFromIdle = run.state === TimerState.IDLE;

    enabledThresholdsMs.forEach((thresholdMs) => {
      if (run.firedThresholdsMs.has(thresholdMs)) {
        return;
      }

      if (snapshot.durationMs < thresholdMs) {
        run.firedThresholdsMs.add(thresholdMs);
        return;
      }

      const crossedThreshold = startedFromIdle
        ? run.previousRemainingMs >= thresholdMs
          && snapshot.remainingMs <= thresholdMs
        : run.previousRemainingMs > thresholdMs
          && snapshot.remainingMs <= thresholdMs;

      if (crossedThreshold) {
        run.firedThresholdsMs.add(thresholdMs);
        const thresholdMinutes = thresholdMs / MINUTE_MS;

        firedNow.push(thresholdMinutes);
        this.onWarning(
          eventId,
          thresholdMinutes,
          snapshot,
          getWarningDelivery(settings, thresholdMinutes)
        );
        return;
      }

      if (snapshot.remainingMs < thresholdMs) {
        run.firedThresholdsMs.add(thresholdMs);
      }
    });

    run.state = snapshot.state;
    run.durationMs = snapshot.durationMs;
    run.previousRemainingMs = snapshot.remainingMs;

    return firedNow;
  }

  reset(eventId) {
    this.runs.delete(eventId);
  }

  resetAll() {
    this.runs.clear();
  }
}
