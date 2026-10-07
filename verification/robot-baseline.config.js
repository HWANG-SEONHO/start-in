import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 번들 분리 전과 같은 조건의 비교용 빌드입니다. 운영 설정은 바꾸지 않습니다.
export default defineConfig({
  plugins: [react()],
  build: { outDir: '.cache/robot-baseline' },
});
