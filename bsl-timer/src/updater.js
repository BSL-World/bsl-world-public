import { check } from '@tauri-apps/plugin-updater';

import { getEdition } from './edition.js';
import { getUpdaterTarget } from './updater-target.js';

export async function checkForUpdates() {
  try {
    return await check({
      target: getUpdaterTarget(getEdition())
    });
  } catch (error) {
    console.error('Failed to check for BSL-Timer updates:', error);
    return null;
  }
}

export async function installUpdate(update, onProgress = () => {}) {
  let downloaded = 0;
  let contentLength = null;

  await update.downloadAndInstall((event) => {
    if (event.event === 'Started') {
      contentLength = Number.isFinite(event.data.contentLength)
        ? event.data.contentLength
        : null;

      onProgress({
        phase: 'downloading',
        downloaded,
        total: contentLength
      });
      return;
    }

    if (event.event === 'Progress') {
      downloaded += event.data.chunkLength;

      onProgress({
        phase: 'downloading',
        downloaded,
        total: contentLength
      });
      return;
    }

    if (event.event === 'Finished') {
      onProgress({
        phase: 'installing',
        downloaded,
        total: contentLength
      });
    }
  });
}