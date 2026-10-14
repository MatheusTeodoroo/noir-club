import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:5173', ...devices['Desktop Chrome'], locale: 'pt-BR' },
  webServer: [
    { command: 'npm run dev:relay', port: 8787, reuseExistingServer: true, timeout: 60_000 },
    { command: 'npm run dev -w @mp/web', port: 5173, reuseExistingServer: true, timeout: 60_000 },
  ],
});
