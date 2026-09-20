import { check } from '@tauri-apps/plugin-updater';

export async function checkForUpdates() {
  try {
    return await check();
  } catch (error) {
    console.error('Failed to check for BSL-Timer updates:', error);
    return null;
  }
}

export async function installUpdate(update) {
  await update.downloadAndInstall();
}