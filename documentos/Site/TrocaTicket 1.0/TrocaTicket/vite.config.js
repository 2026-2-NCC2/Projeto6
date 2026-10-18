import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
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
