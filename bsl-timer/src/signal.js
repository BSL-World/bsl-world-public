export class SignalPlayer {
  constructor() {
    this.audioContext = null;
    this.activeOscillators = new Map();
  }

  async prepare() {
    if (!this.audioContext) {
      const AudioContextClass =
        window.AudioContext ?? window.webkitAudioContext;

      if (!AudioContextClass) {
        return false;
      }

      this.audioContext = new AudioContextClass();
    }

    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    return this.audioContext.state === 'running';
  }

  async play(sequenceId = 'default') {
    const ready = await this.prepare();

    if (!ready) {
      return false;
    }

    const startTime = this.audioContext.currentTime;
    const beepOffsets = [0, 0.35, 0.7];

    await Promise.all(beepOffsets.map((offset) => (
      this.scheduleBeep(sequenceId, startTime + offset)
    )));

    return true;
  }

  stop(sequenceId = null) {
    const oscillatorEntries = sequenceId === null
      ? [...this.activeOscillators.entries()]
      : [[
          sequenceId,
          this.activeOscillators.get(sequenceId) ?? new Set()
        ]];

    oscillatorEntries.forEach(([ownerId, oscillators]) => {
      oscillators.forEach((oscillator) => {
        try {
          oscillator.stop();
        } catch {
          // The oscillator has already stopped.
        }
      });

      this.activeOscillators.delete(ownerId);
    });
  }

  scheduleBeep(sequenceId, startTime) {
    const oscillators = this.activeOscillators.get(sequenceId)
      ?? new Set();

    if (!this.activeOscillators.has(sequenceId)) {
      this.activeOscillators.set(sequenceId, oscillators);
    }

    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const endTime = startTime + 0.2;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, startTime);

    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(
      0.25,
      startTime + 0.01
    );
    gain.gain.setValueAtTime(0.25, endTime - 0.03);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      endTime
    );

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);

    return new Promise((resolve) => {
      oscillator.addEventListener('ended', () => {
        oscillators.delete(oscillator);

        if (oscillators.size === 0) {
          this.activeOscillators.delete(sequenceId);
        }

        oscillator.disconnect();
        gain.disconnect();
        resolve();
      }, { once: true });

      oscillators.add(oscillator);
      oscillator.start(startTime);
      oscillator.stop(endTime);
    });
  }
}
