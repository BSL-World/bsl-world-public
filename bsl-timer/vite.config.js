import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

const mainEntry = fileURLToPath(
  new URL('./src/index.html', import.meta.url)
);

const settingsEntry = fileURLToPath(
  new URL('./src/settings.html', import.meta.url)
);

const aboutEntry = fileURLToPath(
  new URL('./src/about.html', import.meta.url)
);

const trayPreviewEntry = fileURLToPath(
  new URL('./src/tray-preview.html', import.meta.url)
);

const whatsNewEntry = fileURLToPath(
  new URL('./src/whats-new.html', import.meta.url)
);

const dateCountdownEditorEntry = fileURLToPath(
  new URL('./src/date-countdown-editor.html', import.meta.url)
);

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: mainEntry,
        ...(process.env.VITE_BSL_GLASS_OPTICS_STUDY === '1' ? {
          glassOptics: fileURLToPath(new URL('./src/glass-optics.html', import.meta.url)),
          glassDevice: fileURLToPath(new URL('./src/glass-device.html', import.meta.url))
        } : {}),
        settings: settingsEntry,
        about: aboutEntry,
        trayPreview: trayPreviewEntry,
        whatsNew: whatsNewEntry,
        dateCountdownEditor: dateCountdownEditorEntry
      }
    }
  }
});
