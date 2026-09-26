# PROJECT STATUS — 2026-09-26 V4

## 기준

[STARTIN_SCOPE_V4.txt](docs/STARTIN_SCOPE_V4.txt)가 최상위 범위다.
검증 결과는 이 저장소의 현재 코드 기준이다.
추천검색어의 입력 전용 동작은 유지했으며 해당 작업과 전용 검사를 다시 수행하지 않았다.

## 이번 버전 실제 완료

1. [KEEP/SIMPLIFY/DELETE 분류](docs/SCOPE_REVIEW.md) 후 코드 정리.
2. 서버 페이지네이션, company_id 서버 필터, URL 페이지 복원.
   메인 지역별 5개/전체·기업 10개. 지도는 페이지에 무관한 전체 조건 집계.
3. 기존 compose로 PostgreSQL 실행·FastAPI 연결·실제 API 검증.
4. Alembic 0001 기준 스키마 / 0002 source_key / 0003 PDF 테이블.
   SQLite·PostgreSQL에서 upgrade/downgrade/re-upgrade와 공고 데이터 보존 검증.
5. 작은 JSON import: 정리/검증/중복 처리/행별 실패/결과 요약.
6. 사용자별 MY PDF 업로드·다운로드·교체·삭제. 최대 5MB, DB 바이너리 저장.
7. 자연어 해석 API → 검증된 조건 → 일반 DB 검색. 수동 필터와 AND 적용.
   키 없음/오류/시간초과/거절/잘못된 응답은 키워드 검색으로 대체.
8. README 갱신, 별도 의존성 설치와 빈 DB 초기화 확인.

## 실제 삭제/단순화

- 관리자 공고 POST/PUT/DELETE, require_admin, ADMIN_API_KEY, 전용 테스트/CORS 헤더.
- 프로필 이름 수정 UI/PATCH/스키마/CSS와 전용 테스트, 외부 setUser 노출.
- 로그인 rate limit 및 전용 테스트. 비밀번호 해시·CSRF·Origin·세션 만료 유지.
- 기업 상세의 전체 공고 다운로드·프론트 필터 제거.
- 서버 시작의 자동 create_all 제거. 명시적인 migration 후 실행.

## 최종 실제 검증

- 빌드 성공. SQLite pytest 16 passed, PostgreSQL pytest 16 passed.
- 핵심 E2E 8 passed: 기존 서비스/페이지네이션/PDF/AI mock 및 키 없음 fallback.
- 추천검색어 전용 검사는 이전 통과본 유지, 이번에는 재실행하지 않음.
- 1920/4K 검사 통과. 실제 PostgreSQL에 연결된 개발 화면 캡처도 완료.
  verification/layout-check.json: 가로 넘침/잘림/콘솔 오류 없음, Header 한 줄, 5개 공고.
- 별도 npm ci/build 성공. 별도 Python 패키지 + 빈 DB migration/import/auth/save/search 성공.
- Starlette의 httpx 테스트 클라이언트 deprecation 경고 1개가 있으나 검사는 통과.

## 남은 범위 / 다음 시작 위치

- OPENAI_API_KEY가 설정되지 않아 실제 외부 AI 호출은 미검증.
  백엔드 환경에 키를 설정한 뒤 실제 해석 → DB 결과를 검증한다.
  키를 채팅/소스/VITE 변수에 남기지 않는다. 가짜 성공으로 표시하지 않는다.
- 새 기능을 추가할 필요는 없다. V4 범위 밖 확장 금지.
- 다른 물리 PC에서의 실행은 미검증이며 같은 PC의 별도 의존성 폴더/빈 DB로 절차를 확인했다.

## 실행 상태 / 알려진 제약

- 프론트 http://127.0.0.1:5173, 백엔드 8000 실행. health: database=postgresql, ai_enabled=false.
- Docker project-postgres-1 / 5433 포트. 로컬 비밀번호: .cache/postgres.env (커밋 제외).
- 새 터미널에서는 README의 DATABASE_URL 설정·alembic upgrade head 후 실행한다.
- E2E DB는 .cache/e2e-v4.db. 이전 .cache/e2e.db는 사용하지 않으며 삭제하지 않았다.
- 작은 데이터 규모에 맞춰 서버에서 후보 필터/정렬/페이지 분할. 대형 검색엔진/SQL 최적화는 범위 밖.
- PDF 확장자/MIME/헤더/종료 표시는 검사하지만 내용 분석·OCR·악성코드 검사는 하지 않는다.
- 로컬 전용 Python 실행환경은 저장소에 포함하지 않으며 일반 가상환경 사용을 권장한다.
- 이력서/계정/저장 정보는 SQLite와 PostgreSQL 간 자동 복제되지 않는다.
