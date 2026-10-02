import { invoke } from '@tauri-apps/api/core';

import { getAudioMimeType } from './audio-file.js';
import { getSelectedSignalPath } from './signal-settings.js';

export class SignalPlayer {
  constructor({
    invokeFn = invoke,
    audioFactory = (url) => new Audio(url),
    createObjectUrl = (blob) => URL.createObjectURL(blob),
    onFileError = () => {},
    logger = console
  } = {}) {
    this.invoke = invokeFn;
    this.audioFactory = audioFactory;
    this.createObjectUrl = createObjectUrl;
    this.onFileError = onFileError;
    this.logger = logger;
    this.audioContext = null;
    this.activeOscillators = new Map();
    this.activeAudioElements = new Map();
    this.audioStopCallbacks = new WeakMap();
    this.audioUrlCache = new Map();
    this.stopGeneration = 0;
    this.sequenceStopGenerations = new Map();
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

  async play(sequenceId = 'default', settings = {}) {
    const soundPath = getSelectedSignalPath(settings);

    if (soundPath) {
      try {
        await this.playAudioFile(sequenceId, soundPath);
        return true;
      } catch (error) {
        this.onFileError(error, soundPath);
        this.logger.error(
          `Failed to play audio file "${soundPath}". Using the built-in signal.`,
          error
        );
      }
    }

    return this.playBuiltIn(sequenceId);
  }

  async playBuiltIn(sequenceId = 'default') {
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
    if (sequenceId === null) {
      this.stopGeneration += 1;
    } else {
      this.sequenceStopGenerations.set(
        sequenceId,
        (this.sequenceStopGenerations.get(sequenceId) ?? 0) + 1
      );
    }

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

    const audioEntries = sequenceId === null
      ? [...this.activeAudioElements.entries()]
      : [[
          sequenceId,
          this.activeAudioElements.get(sequenceId) ?? new Set()
        ]];

    audioEntries.forEach(([ownerId, audioElements]) => {
      audioElements.forEach((audio) => {
        audio.pause();
        audio.currentTime = 0;
        this.audioStopCallbacks.get(audio)?.();
      });

      this.activeAudioElements.delete(ownerId);
    });
  }

  async getAudioUrl(path) {
    if (!await this.invoke('audio_file_exists', { path })) {
      throw new Error(`The selected audio file does not exist: ${path}`);
    }

    if (this.audioUrlCache.has(path)) {
      return this.audioUrlCache.get(path);
    }

    const audioBuffer = await this.invoke('read_audio_file', { path });
    const audioUrl = this.createObjectUrl(new Blob(
      [audioBuffer],
      { type: getAudioMimeType(path) }
    ));

    this.audioUrlCache.set(path, audioUrl);
    return audioUrl;
  }

  async playAudioFile(sequenceId, path) {
    const stopGeneration = this.stopGeneration;
    const sequenceStopGeneration = this.sequenceStopGenerations.get(
      sequenceId
    ) ?? 0;
    const wasStopped = () => (
      stopGeneration !== this.stopGeneration
      || sequenceStopGeneration !== (
        this.sequenceStopGenerations.get(sequenceId) ?? 0
      )
    );
    let audioUrl;

    try {
      audioUrl = await this.getAudioUrl(path);
    } catch (error) {
      if (wasStopped()) {
        return;
      }

      throw error;
    }

    if (wasStopped()) {
      return;
    }

    const audio = this.audioFactory(audioUrl);
    const audioElements = this.activeAudioElements.get(sequenceId)
      ?? new Set();

    if (!this.activeAudioElements.has(sequenceId)) {
      this.activeAudioElements.set(sequenceId, audioElements);
    }

    audio.preload = 'auto';

    return new Promise((resolve, reject) => {
      let settled = false;

      const settle = (error = null) => {
        if (settled) {
          return;
        }

        settled = true;
        audioElements.delete(audio);

        if (audioElements.size === 0) {
          this.activeAudioElements.delete(sequenceId);
        }

        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        this.audioStopCallbacks.delete(audio);

        if (error) {
          reject(error);
        } else {
          resolve();
        }
      };
      const handleEnded = () => settle();
      const handleError = () => settle(
        new Error(`The audio file could not be decoded: ${path}`)
      );

      audio.addEventListener('ended', handleEnded, { once: true });
      audio.addEventListener('error', handleError, { once: true });
      this.audioStopCallbacks.set(audio, () => settle());
      audioElements.add(audio);

      Promise.resolve(audio.play()).catch(settle);
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
