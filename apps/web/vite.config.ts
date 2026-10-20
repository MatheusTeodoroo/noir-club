import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const relay = process.env.RELAY_URL ?? 'http://127.0.0.1:8787';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@games': fileURLToPath(new URL('../../games', import.meta.url)),
      '@examples': fileURLToPath(new URL('../../examples', import.meta.url)),
    },
  },
  worker: { format: 'es' },
  server: {
    port: 5173,
    fs: { allow: ['../..'] },
    proxy: {
      '/api': relay,
      '/ws': { target: relay, ws: true },
    },
  },
  build: { target: 'es2020' },
});
