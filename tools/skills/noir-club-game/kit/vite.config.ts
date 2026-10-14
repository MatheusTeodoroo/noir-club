import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
// @ts-expect-error plain JS helper shared with vitest and the bundle build
import { aliases } from './.noir/aliases.mjs';

// `npm run play`: the playground (TV + phones + Dealer driven by the real platform engine).
export default defineConfig({
  root: fileURLToPath(new URL('./.noir/playground', import.meta.url)),
  plugins: [react()],
  resolve: { alias: aliases },
  server: { port: 5180, strictPort: true, fs: { allow: [fileURLToPath(new URL('.', import.meta.url))] } },
});
