import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Portas fixas: se a 5173 (ou a 4173 do preview) estiver ocupada, o Vite para com erro em vez de
// abrir em outra porta, que a API recusaria ("Origem não permitida").
export default defineConfig({
  plugins: [react()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
});
