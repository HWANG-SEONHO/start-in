// 학습용 설명: Vite 개발서버와 /api 프록시 주소를 정하는 설정 파일입니다.
// 아래 코드는 기능을 바꾸지 않으면서, 처음 읽는 사람도 흐름을 따라갈 수 있게 주석을 붙였습니다.

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return { plugins: [react()], server: { proxy: { '/api': { target: env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true } } } };
});
