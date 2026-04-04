import { defineConfig } from '@playwright/test';

const PORT = process.env.PORT || 3000;

export default defineConfig({
  testDir: 'test/e2e',
  webServer: {
    command: `PORT=${PORT} node server.js`,
    port: Number(PORT),
    reuseExistingServer: !process.env.CI,
  },
  retries: 1,
  use: {
    baseURL: `http://localhost:${PORT}`,
    headless: true,
  },
});
