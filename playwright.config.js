import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve('.cache/ms-playwright');

export default defineConfig({
  testDir: './verification/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:5174', viewport: { width: 1920, height: 1080 }, trace: 'retain-on-failure' },
  webServer: [
    { command: 'node verification/start-test-api.mjs', url: 'http://127.0.0.1:8001/api/health', reuseExistingServer: false, timeout: 30000 },
    { command: 'npm run dev -- --port 5174 --strictPort', url: 'http://127.0.0.1:5174', env: { BACKEND_URL: 'http://127.0.0.1:8001' }, reuseExistingServer: false, timeout: 30000 },
  ],
});
