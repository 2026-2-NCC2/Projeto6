import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // O site público é uma demonstração; o projeto local continua usando a API.
  const githubPages =
    mode === 'pages' ||
    (process.env.GITHUB_ACTIONS === 'true' &&
      process.env.GITHUB_REPOSITORY === 'Tiago-U12/projeto-faculdade');

  return {
    base: githubPages ? '/projeto-faculdade/' : '/',
    define: githubPages
      ? {
          'import.meta.env.VITE_APP_MODE': JSON.stringify('demo'),
          'import.meta.env.VITE_GITHUB_PAGES': JSON.stringify('true'),
        }
      : {},
    plugins: [react()],
    server: {
      proxy: { '/api': 'http://127.0.0.1:3333' },
      // Documentos e arquivos gerados não fazem parte do frontend observado pelo Vite.
      watch: {
        ignored: [
          '**/docs/**',
          '**/tmp/**',
          '**/historico/**',
          '**/logs/**',
          '**/config/**',
          '**/server/**',
          '**/*.zip',
          '**/MANIFESTO.sha256',
        ],
      },
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
  };
});
