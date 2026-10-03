import { normalizeSignalSettings } from './signal-settings.js';

export class SignalScheduler {
  constructor({
    play,
    onError = () => {},
    onPlaybackStart = () => {},
    onPlaybackComplete = () => {},
    onComplete = () => {},
    setTimeoutFn = globalThis.setTimeout.bind(globalThis),
    clearTimeoutFn = globalThis.clearTimeout.bind(globalThis),
    now = () => Date.now()
  }) {
    if (typeof play !== 'function') {
      throw new TypeError('SignalScheduler requires a play function');
    }

    this.play = play;
    this.onError = onError;
    this.onPlaybackStart = onPlaybackStart;
    this.onPlaybackComplete = onPlaybackComplete;
    this.onComplete = onComplete;
    this.setTimeoutFn = setTimeoutFn;
    this.clearTimeoutFn = clearTimeoutFn;
    this.now = now;
    this.sequences = new Map();
  }

  start(sequenceId, settings = {}) {
    this.cancel(sequenceId);

    const normalizedSettings = normalizeSignalSettings(settings);
    const sequence = {
      id: sequenceId,
      settings: normalizedSettings,
      startedAt: this.now(),
      playbackCount: 0,
      timeoutId: null
    };

    this.sequences.set(sequenceId, sequence);
    this.run(sequence);
  }

  cancel(sequenceId) {
    const sequence = this.sequences.get(sequenceId);

    if (!sequence) {
      return false;
    }

    if (sequence.timeoutId !== null) {
      this.clearTimeoutFn(sequence.timeoutId);
    }

    this.sequences.delete(sequenceId);
    return true;
  }

  cancelAll() {
    [...this.sequences.keys()].forEach((sequenceId) => {
      this.cancel(sequenceId);
    });
  }

  isActive(sequenceId) {
    return this.sequences.has(sequenceId);
  }

  shouldScheduleNext(sequence) {
    const { settings, playbackCount } = sequence;

    return playbackCount <= settings.repeatCount;
  }

  run(sequence) {
    if (this.sequences.get(sequence.id) !== sequence) {
      return;
    }

    sequence.playbackCount += 1;
    const playbackNumber = sequence.playbackCount;

    this.onPlaybackStart(
      sequence.id,
      playbackNumber,
      sequence.settings
    );

    let playbackPromise;

    try {
      playbackPromise = Promise.resolve(
        this.play(sequence.id, sequence.settings)
      ).catch((error) => {
        this.onError(error, sequence.id);
      });
    } catch (error) {
      this.onError(error, sequence.id);
      playbackPromise = Promise.resolve();
    }

    const reportPlaybackComplete = () => {
      this.onPlaybackComplete(
        sequence.id,
        playbackNumber,
        sequence.settings
      );
    };

    if (!this.shouldScheduleNext(sequence)) {
      void playbackPromise.finally(() => {
        reportPlaybackComplete();

        if (this.sequences.get(sequence.id) !== sequence) {
          return;
        }

        this.sequences.delete(sequence.id);
        this.onComplete(sequence.id);
      });
      return;
    }

    void playbackPromise.finally(reportPlaybackComplete);

    const nextStartAt = sequence.startedAt
      + sequence.playbackCount * sequence.settings.repeatIntervalMs;
    const delay = Math.max(0, nextStartAt - this.now());

    sequence.timeoutId = this.setTimeoutFn(() => {
      sequence.timeoutId = null;
      this.run(sequence);
    }, delay);
  }
}
