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

export default defineConfig({
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        main: mainEntry,
        settings: settingsEntry,
        about: aboutEntry
      }
    }
  }
});
