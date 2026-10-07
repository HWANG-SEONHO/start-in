# 보안·3D 번들 정리 — 2026-10-07

## 변경 범위

- package-lock.json: Vite → PostCSS의 source-map-js만 1.2.1에서 1.2.2로 업데이트.
- vite.config.js: Three.js 기본 엔진·WebGL 렌더러·모델 로더를 역할별 청크로 분리. 기존 React.lazy 로딩은 그대로 유지.
- 로봇 GLB·텍스처·카메라·조명·픽셀 비율·안티앨리어싱·애니메이션·라이선스 표기는 변경하지 않음.
- GitHub push 및 Render 배포는 하지 않음.

## 실제 효과

- 기존 로봇 JavaScript: 635.64KB / gzip 162.45KB.
- 분리 후: 로봇 코드 3.86KB, 모델 로더 45.80KB, 엔진 232.00KB, 렌더러 358.30KB.
- 500KB 초과 파일 경고는 해소. 경고 기준을 높여 숨기지 않음.
- 분리 후 gzip 합계는 약 165.26KB로 소폭 증가. 다운로드 총량을 줄이는 압축 최적화가 아니라 엔진 캐시 재사용과 수정 코드 분리가 목적. 최초 다운로드가 빨라졌다고 주장하지 않음.

## 검증 결과

- npm ci 재설치 성공. npm audit 전체 취약점 0건. npm run build 성공.
- 검증 서버가 esbuild.exe를 사용 중일 때 재설치 EPERM 발생. 검증 서버 종료 후 재설치·재빌드 성공하여 정상 설치 상태로 복구.
- 실제 production preview에서 /main을 바로 열 때 3D 번들·GLB를 다운로드하지 않음 확인.
- /intro에서 분리된 4개 JS와 실제 GLB 로딩 확인. 브라우저 pageerror 없음, 메인 전환 정상.
- 원본 번들과 수정 번들의 4.5초·34.5초 로봇 자세/관절 애니메이션 상태 동일.
- showcase PNG 완전 일치. opening PNG는 완전 일치하지 않으므로 캡처를 직접 열어 확인. 첫 비교에서 RGB 평균 절대 오차는 약 0.074/0.068/0.024(0~255 척도). 이를 픽셀 완전 동일이라고 기록하지 않음.
- 원본 모델 SHA-256 유지: caa5708086f3f1f7349545b5537e4d5b4fa60efa6c98688b456c108aa3a5de39.
- 기존 cover.spec.js는 15초·구버전 선택자 기준이어서 이번 49초 인트로 검증에 그대로 쓰지 않음. 전체 검색/백엔드 회귀 테스트는 이번 범위에서 재실행하지 않음.
- npm의 esbuild install-scripts 검토 안내는 여전히 나올 수 있음. 이는 npm audit 취약점 경고와 다른 항목이며 임의 승인 설정은 추가하지 않음.

## 재검증

1. npm run build
2. npm run preview -- --port 4175 --strictPort
3. 별도 터미널: npm run build -- --config verification/robot-baseline.config.js
4. 별도 터미널: npm run preview -- --outDir .cache/robot-baseline --port 4176 --strictPort
5. node verification/review-robot-bundles.mjs

Windows 파일 잠금을 피하려면 npm ci 이전에 실행 중인 해당 개발/검증 서버를 종료한다. 두 서버 종료 후에도 배포 번들 파일은 dist와 .cache/robot-baseline에 남는다.
