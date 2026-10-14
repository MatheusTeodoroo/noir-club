import { defineConfig } from 'vitest/config';
// @ts-expect-error plain JS helper shared with vite and the bundle build
import { aliases } from './.noir/aliases.mjs';

export default defineConfig({
  resolve: { alias: aliases },
  test: { include: ['test/**/*.test.ts'] },
});
