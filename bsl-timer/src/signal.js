export class SignalPlayer {
  constructor() {
    this.audioContext = null;
    this.activeOscillators = new Set();
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

  async playDefault() {
    const ready = await this.prepare();

    if (!ready) {
      return false;
    }

    this.stop();

    const startTime = this.audioContext.currentTime;
    const beepOffsets = [0, 0.35, 0.7];

    beepOffsets.forEach((offset) => {
      this.scheduleBeep(startTime + offset);
    });

    return true;
  }

  stop() {
    this.activeOscillators.forEach((oscillator) => {
      try {
        oscillator.stop();
      } catch {
        // The oscillator has already stopped.
      }
    });

    this.activeOscillators.clear();
  }

  scheduleBeep(startTime) {
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

    oscillator.addEventListener('ended', () => {
      this.activeOscillators.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    });

    this.activeOscillators.add(oscillator);
    oscillator.start(startTime);
    oscillator.stop(endTime);
  }
}