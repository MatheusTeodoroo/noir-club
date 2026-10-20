import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:5174', ...devices['Desktop Chrome'], locale: 'pt-BR' },
  webServer: [
    { command: 'npm run dev:relay', port: 8787, reuseExistingServer: true, timeout: 60_000 },
    // A separate test server that also serves the reference games in examples/ (the e2e plays the
    // Dealer demo); the normal dev server and production never list them.
    {
      command: 'npm run dev -w @mp/web -- --port 5174 --strictPort',
      port: 5174,
      reuseExistingServer: true,
      timeout: 60_000,
      env: { VITE_INCLUDE_EXAMPLES: '1' },
    },
  ],
});
