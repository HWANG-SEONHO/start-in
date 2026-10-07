// 학습용 설명: Vite 개발서버와 /api 프록시 주소를 정하는 설정 파일입니다.
// 아래 코드는 기능을 바꾸지 않으면서, 처음 읽는 사람도 흐름을 따라갈 수 있게 주석을 붙였습니다.

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    server: { proxy: { '/api': { target: env.BACKEND_URL || 'http://127.0.0.1:8000', changeOrigin: true } } },
    build: {
      rollupOptions: {
        output: {
          // 로봇 연출 수정 때 3D 엔진까지 다시 받지 않도록 역할별로 분리합니다.
          onlyExplicitManualChunks: true,
          manualChunks(id) {
            const path = id.replaceAll('\\', '/');
            if (path.includes('/node_modules/three/build/three.core.js')) return 'three-core';
            if (path.includes('/node_modules/three/build/three.module.js')) return 'three-renderer';
            if (path.includes('/node_modules/three/examples/jsm/')) return 'three-loaders';
          },
        },
      },
    },
  };
});
