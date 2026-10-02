export const AUDIO_FILE_EXTENSIONS = Object.freeze([
  'wav',
  'mp3',
  'm4a',
  'aac',
  'ogg',
  'oga',
  'opus',
  'flac',
  'webm',
  'wma'
]);

const AUDIO_MIME_TYPES = Object.freeze({
  wav: 'audio/wav',
  mp3: 'audio/mpeg',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  opus: 'audio/ogg; codecs=opus',
  flac: 'audio/flac',
  webm: 'audio/webm',
  wma: 'audio/x-ms-wma'
});

export function getAudioFileExtension(path = '') {
  const match = String(path).match(/\.([^.\\/]+)$/);

  return match?.[1]?.toLowerCase() ?? '';
}

export function getAudioMimeType(path = '') {
  return AUDIO_MIME_TYPES[getAudioFileExtension(path)]
    ?? 'application/octet-stream';
}

export function getAudioFileName(path = '') {
  return String(path).split(/[\\/]/).pop() ?? '';
}

export function isSupportedAudioFile(path = '') {
  return AUDIO_FILE_EXTENSIONS.includes(getAudioFileExtension(path));
}
