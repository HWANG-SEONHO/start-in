# 2026-10-02 최신 ZIP 검증

- `npm run build`: 통과.
- `python -m pytest backend/tests -q`: 19개 통과.
- `npm run test:e2e -- verification/e2e/latest-smoke.spec.js`: 3개 통과. 다중 지역·URL 복원·공고 상세·페이지 이동·기업 목록·가입·MY 세션 확인.
- 기존 E2E 전체: 1개 통과, 11개 실패. 예전 공고 37개/기업 5개 기준, 변경된 링크·입력 이름과 화면 폭·스크롤 기대값이 최신 화면과 불일치한다. 전체 회귀 검증 완료로 간주하지 않는다. 기존 테스트는 후속 정비 대상으로 보존한다.
- Render 시작 명령의 반복 데모 import 제거 후 배포 Live 확인. `/api/health`: `status=ok`, `database=postgresql`, `ai_enabled=false`.

Windows 테스트 실행 시 `PYTHON`을 로컬 가상환경의 Python 경로로 지정하고 `PYTHONUTF8=1`을 설정한다. 로컬 DB·인증 파일·다운로드 ZIP·이전 모션 백업은 Git에 포함하지 않는다.
