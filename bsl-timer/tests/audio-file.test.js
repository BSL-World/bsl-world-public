import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getAudioFileExtension,
  getAudioFileName,
  getAudioMimeType,
  isSupportedAudioFile
} from '../src/audio-file.js';

test('recognizes supported audio files case-insensitively', () => {
  assert.equal(isSupportedAudioFile('D:\\Sounds\\Alarm.MP3'), true);
  assert.equal(isSupportedAudioFile('D:\\Sounds\\notes.txt'), false);
  assert.equal(getAudioFileExtension('D:\\Sounds\\Alarm.MP3'), 'mp3');
});

test('provides a playback MIME type and display file name', () => {
  assert.equal(getAudioMimeType('C:\\Windows\\Media\\Alarm01.wav'), 'audio/wav');
  assert.equal(getAudioFileName('D:\\Sounds\\Tea timer.opus'), 'Tea timer.opus');
});
