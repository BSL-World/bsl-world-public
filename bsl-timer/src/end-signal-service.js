import { SignalPlayer } from './signal.js';
import { SignalScheduler } from './signal-scheduler.js';

export class EndSignalService {
  constructor({
    player = new SignalPlayer(),
    scheduler = null,
    allowConcurrentSignals = true,
    onError = (error) => {
      console.error('Failed to play timer signal:', error);
    },
    onComplete = () => {}
  } = {}) {
    this.player = player;
    this.allowConcurrentSignals = allowConcurrentSignals !== false;
    this.onComplete = onComplete;
    this.runningSequenceIds = new Set();
    this.queue = [];
    this.scheduler = scheduler ?? new SignalScheduler({
      play: (sequenceId, settings) => (
        this.player.play(sequenceId, settings)
      ),
      onError,
      onComplete: (sequenceId) => {
        this.handleSequenceComplete(sequenceId);
      }
    });
  }

  prepare() {
    return this.player.prepare();
  }

  start(sequenceId, settings) {
    this.cancel(sequenceId);

    if (
      this.allowConcurrentSignals
      || this.runningSequenceIds.size === 0
    ) {
      this.startNow(sequenceId, settings);
      return;
    }

    this.queue.push({ sequenceId, settings });
  }

  cancel(sequenceId) {
    this.scheduler.cancel(sequenceId);
    this.player.stop(sequenceId);
    this.runningSequenceIds.delete(sequenceId);
    this.queue = this.queue.filter(
      (queuedSignal) => queuedSignal.sequenceId !== sequenceId
    );

    this.startNextQueuedSignal();
  }

  cancelAll() {
    this.scheduler.cancelAll();
    this.player.stop();
    this.runningSequenceIds.clear();
    this.queue = [];
  }

  isActive(sequenceId) {
    return this.runningSequenceIds.has(sequenceId)
      || this.queue.some(
        (queuedSignal) => queuedSignal.sequenceId === sequenceId
      );
  }

  setAllowConcurrentSignals(allowConcurrentSignals) {
    this.allowConcurrentSignals = allowConcurrentSignals !== false;

    if (!this.allowConcurrentSignals) {
      return;
    }

    const queuedSignals = this.queue;
    this.queue = [];

    queuedSignals.forEach(({ sequenceId, settings }) => {
      this.startNow(sequenceId, settings);
    });
  }

  startNow(sequenceId, settings) {
    this.runningSequenceIds.add(sequenceId);
    this.scheduler.start(sequenceId, settings);
  }

  handleSequenceComplete(sequenceId) {
    this.runningSequenceIds.delete(sequenceId);
    this.onComplete(sequenceId);
    this.startNextQueuedSignal();
  }

  startNextQueuedSignal() {
    if (
      this.allowConcurrentSignals
      || this.runningSequenceIds.size > 0
      || this.queue.length === 0
    ) {
      return;
    }

    const nextSignal = this.queue.shift();
    this.startNow(nextSignal.sequenceId, nextSignal.settings);
  }
}
