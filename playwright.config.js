// 학습용 설명: 브라우저 자동테스트의 화면크기, 서버, 실행순서를 정하는 설정 파일입니다.
// 아래 코드는 기능을 바꾸지 않으면서, 처음 읽는 사람도 흐름을 따라갈 수 있게 주석을 붙였습니다.

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
