// One clock drives both the tab lamps and the short audible pulse.
export function alarmPhase(now, epoch = 0) {
  const elapsed = now - epoch;
  return { beat: epoch + Math.floor(elapsed / 1000) * 1000, lit: ((elapsed % 1000) + 1000) % 1000 < 500 };
}

export class TabAlarm {
  constructor({ play, stop, isSignalPlaying = () => false, onError = console.error }) {
    Object.assign(this, { play, stop, isSignalPlaying, onError });
    this.events = new Map();
    this.lastBeat = null;
    this.playing = false;
    this.lit = false;
  }

  update(id, state) {
    if (state !== 'overdue') {
      this.events.delete(id);
      this.stopIfSilent();
    } else if (!this.events.has(id)) {
      this.events.set(id, false);
    }
  }

  remove(id) {
    this.events.delete(id);
    this.stopIfSilent();
  }

  isMuted(id) { return this.events.get(id) === true; }

  toggleMute(id) {
    if (this.events.has(id)) this.events.set(id, !this.isMuted(id));
    this.stopIfSilent();
  }

  audible() {
    return [...this.events].some(([id, muted]) => !muted && !this.isSignalPlaying(id));
  }

  stopIfSilent() {
    if (!this.audible()) this.stop();
  }

  tick(now, epoch = 0) {
    const { beat, lit } = alarmPhase(now, epoch);
    this.lit = lit;
    if (beat !== this.lastBeat) {
      this.lastBeat = beat;
      // Never queue missed beats or overlap slow native playback requests.
      if (lit && !this.playing && this.audible() && (this.lastSoundAt === undefined || now - this.lastSoundAt >= 500)) {
        this.lastSoundAt = now;
        this.playing = true;
        Promise.resolve().then(() => this.audible() && this.play()).catch(this.onError)
          .finally(() => { this.playing = false; });
      }
    }
    return lit;
  }

  dispose() {
    this.events.clear();
    this.stop();
  }
}
