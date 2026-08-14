import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  input: {
    main: 'index.html',
    settings: 'settings.html'
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true
  }
});