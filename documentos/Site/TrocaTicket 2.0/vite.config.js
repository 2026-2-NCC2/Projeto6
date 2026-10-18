import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://127.0.0.1:3333' },
  },
  preview: {
    proxy: { '/api': 'http://127.0.0.1:3333' },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router'],
          translations: [
            './src/i18n/publicMessages.js',
            './src/i18n/workspaceMessages.js',
            './src/i18n/settingsMessages.js',
          ],
        },
      },
    },
  },
});
