import { invoke } from '@tauri-apps/api/core';
import {
  DEFAULT_AUDIO_OUTPUT_DEVICE_ID,
  NativeAudioSignal,
  createNativeAudioRequest,
  isAudioOutputDeviceAvailable,
  normalizeAudioOutputDeviceId
} from '@bsl-world/desktop-core/audio';

import { getSelectedSignalPath } from './signal-settings.js';

let nextSignalPlayerId = 0;

export class SignalPlayer {
  constructor({
    invokeFn = invoke,
    onFileError = () => {},
    onOutputDeviceFallback = () => {},
    outputDeviceId = DEFAULT_AUDIO_OUTPUT_DEVICE_ID,
    logger = console
  } = {}) {
    this.invoke = invokeFn;
    this.onFileError = onFileError;
    this.onOutputDeviceFallback = onOutputDeviceFallback;
    this.outputDeviceId = normalizeAudioOutputDeviceId(outputDeviceId);
    this.logger = logger;
    this.clientId = `signal-player-${++nextSignalPlayerId}`;
    this.nextPlaybackId = 0;
    this.activePlaybackIds = new Map();
    this.stopGeneration = 0;
    this.sequenceStopGenerations = new Map();
  }

  async setOutputDevice(outputDeviceId) {
    this.outputDeviceId = normalizeAudioOutputDeviceId(outputDeviceId);
    const available = await isAudioOutputDeviceAvailable(
      this.outputDeviceId,
      this.invoke
    );

    if (!available) {
      this.onOutputDeviceFallback(this.outputDeviceId);
      return DEFAULT_AUDIO_OUTPUT_DEVICE_ID;
    }

    return this.outputDeviceId;
  }

  async prepare() {
    return true;
  }

  async play(sequenceId = 'default', settings = {}) {
    const soundPath = getSelectedSignalPath(settings);

    if (soundPath) {
      const stopState = this.captureStopState(sequenceId);

      try {
        return await this.playNative(sequenceId, {
          signal: NativeAudioSignal.FILE,
          path: soundPath
        });
      } catch (error) {
        if (this.wasStopped(sequenceId, stopState)) {
          return true;
        }

        this.onFileError(error, soundPath);
        this.logger.error(
          `Failed to play audio file "${soundPath}". Using the built-in signal.`,
          error
        );
      }
    }

    return this.playBuiltIn(sequenceId);
  }

  playBuiltIn(sequenceId = 'default') {
    return this.playNative(sequenceId, {
      signal: NativeAudioSignal.BUILT_IN
    });
  }

  playWarning(sequenceId = 'warning') {
    return this.playNative(sequenceId, {
      signal: NativeAudioSignal.WARNING
    });
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

    const playbackIds = sequenceId === null
      ? [...this.activePlaybackIds.values()].flatMap((ids) => [...ids])
      : [...(this.activePlaybackIds.get(sequenceId) ?? [])];

    if (sequenceId === null) {
      this.activePlaybackIds.clear();
    } else {
      this.activePlaybackIds.delete(sequenceId);
    }

    if (playbackIds.length === 0) {
      return;
    }

    void this.invoke('stop_audio_playback', { playbackIds }).catch((error) => {
      this.logger.error('Failed to stop native audio playback.', error);
    });
  }

  captureStopState(sequenceId) {
    return {
      all: this.stopGeneration,
      sequence: this.sequenceStopGenerations.get(sequenceId) ?? 0
    };
  }

  wasStopped(sequenceId, stopState) {
    return stopState.all !== this.stopGeneration
      || stopState.sequence !== (
        this.sequenceStopGenerations.get(sequenceId) ?? 0
      );
  }

  async playNative(sequenceId, { signal, path = null }) {
    const stopState = this.captureStopState(sequenceId);
    const playbackId = `${this.clientId}:${++this.nextPlaybackId}`;
    const request = createNativeAudioRequest({
      playbackId,
      outputDeviceId: this.outputDeviceId,
      signal,
      path
    });

    if (this.wasStopped(sequenceId, stopState)) {
      return true;
    }

    const playbackIds = this.activePlaybackIds.get(sequenceId) ?? new Set();

    if (!this.activePlaybackIds.has(sequenceId)) {
      this.activePlaybackIds.set(sequenceId, playbackIds);
    }

    playbackIds.add(playbackId);

    let result;

    try {
      result = await this.invoke('play_audio_signal', { request });
    } finally {
      playbackIds.delete(playbackId);

      if (playbackIds.size === 0) {
        this.activePlaybackIds.delete(sequenceId);
      }
    }

    if (
      result?.fellBack
      && this.outputDeviceId !== DEFAULT_AUDIO_OUTPUT_DEVICE_ID
    ) {
      this.onOutputDeviceFallback(this.outputDeviceId);
    }

    return true;
  }
}
