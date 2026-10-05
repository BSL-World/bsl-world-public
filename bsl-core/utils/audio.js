export const DEFAULT_AUDIO_OUTPUT_DEVICE_ID = 'default';

export const NativeAudioSignal = Object.freeze({
  BUILT_IN: 'builtIn',
  WARNING: 'warning',
  FILE: 'file'
});

export function normalizeAudioOutputDeviceId(deviceId) {
  return typeof deviceId === 'string' && deviceId.trim()
    ? deviceId.trim()
    : DEFAULT_AUDIO_OUTPUT_DEVICE_ID;
}

export function normalizeAudioOutputDevices(devices = []) {
  const normalizedDevices = [];
  const knownDeviceIds = new Set();

  for (const device of Array.isArray(devices) ? devices : []) {
    const id = normalizeAudioOutputDeviceId(device?.id);

    if (
      id === DEFAULT_AUDIO_OUTPUT_DEVICE_ID
      || knownDeviceIds.has(id)
    ) {
      continue;
    }

    knownDeviceIds.add(id);
    normalizedDevices.push({
      id,
      label: typeof device?.label === 'string'
        ? device.label.trim()
        : ''
    });
  }

  return normalizedDevices;
}

export async function listAudioOutputDevices(invokeFn) {
  if (typeof invokeFn !== 'function') {
    throw new TypeError('A native command invoker is required');
  }

  return normalizeAudioOutputDevices(
    await invokeFn('list_audio_output_devices')
  );
}

export async function isAudioOutputDeviceAvailable(
  outputDeviceId,
  invokeFn
) {
  const normalizedDeviceId = normalizeAudioOutputDeviceId(outputDeviceId);

  if (normalizedDeviceId === DEFAULT_AUDIO_OUTPUT_DEVICE_ID) {
    return true;
  }

  if (typeof invokeFn !== 'function') {
    throw new TypeError('A native command invoker is required');
  }

  return Boolean(await invokeFn('is_audio_output_device_available', {
    deviceId: normalizedDeviceId
  }));
}

export function createNativeAudioRequest({
  playbackId,
  outputDeviceId,
  signal,
  path = null
}) {
  const normalizedSignal = Object.values(NativeAudioSignal).includes(signal)
    ? signal
    : NativeAudioSignal.BUILT_IN;

  return {
    playbackId: String(playbackId),
    outputDeviceId: normalizeAudioOutputDeviceId(outputDeviceId),
    signal: normalizedSignal,
    path: normalizedSignal === NativeAudioSignal.FILE
      && typeof path === 'string'
      && path.trim()
      ? path
      : null
  };
}
