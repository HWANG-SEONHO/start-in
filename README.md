# START IN

React + 일반 CSS / FastAPI / SQLAlchemy 기반 채용 탐색 웹 프로젝트입니다.
승인된 1920×1080 메인 구성을 유지하며 4K에서는 콘텐츠 폭을 1920px로 유지합니다.
범위는 [V4](docs/STARTIN_SCOPE_V4.txt), 판단 근거는 [코드 분류](docs/SCOPE_REVIEW.md), 진행 상태는 [CODEX_HANDOFF.md](CODEX_HANDOFF.md)를 참고하세요.

## 현재 기능

- 검색·복수 필터·정렬·지도 선택·URL 복원·공고 상세·최소 기업정보
- 서버 페이지네이션: 메인 지역별 5개, 전체/기업 목록 10개. 지도는 전체 조건의 집계 표시
- 가입/로그인/로그아웃, 쿠키 세션, 사용자별 저장공고와 지원현황 상태·메모·삭제
- MY PDF 한 개 업로드/다운로드/교체/삭제: 5MB, 확장자·MIME·PDF 헤더/종료 표시 검사
- PostgreSQL 실제 연결, Alembic migration, 로컬 JSON 가져오기와 중복/실패 요약
- Hero 자연어 → AI 조건 해석 → 검증 → 일반 DB 검색. 키 없음/실패 시 키워드 검색

추천검색어 클릭은 입력만 변경합니다. AI 검색도 수동 FilterPanel 값을 바꾸지 않고 조건을 함께 적용합니다.
AI가 해석한 조건은 화면과 URL에 남습니다. 상충하는 조건은 결과가 없을 수 있으며 조건 초기화로 해제합니다.
현재 공고 37개와 기업 정보는 데모입니다. 지원현황은 개인 기록이며 실제 기업에 지원서를 보내지 않습니다.
이력서 PDF는 메타데이터와 함께 DB에 저장하므로 별도 파일 서버가 필요 없습니다. PDF 내용 분석은 하지 않습니다.

## 실행

검증 환경: Windows, Node 24.20, Python 3.12.10. 프로젝트 루트에서 실행합니다.
Python 3.12 가상환경을 만들어 실행하는 방식을 권장합니다.

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
```

백엔드 (기본 SQLite):

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m backend.app.import_jobs data/demo-jobs.json
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

별도 터미널에서 프론트:

```powershell
npm install
npm run dev
```

http://127.0.0.1:5173 접속. 프론트 `/api` 요청은 기본적으로 백엔드 8000번 포트로 전달됩니다.
기존 `backend.app.seed`도 남아 있지만 초기 데이터 입력은 검증과 중복 처리가 있는 import 명령을 권장합니다.
DB 구조는 서버 시작 시 자동 변경하지 않으므로 코드 갱신 후 `alembic upgrade head`를 먼저 실행하세요.

## PostgreSQL

Docker Desktop 엔진이 실행되어 있어야 합니다. 현재 프로젝트의 PostgreSQL은 5433번 포트를 사용합니다.
로컬 비밀번호 파일은 `.cache/postgres.env`에 두며 버전 관리에서 제외합니다.
새 환경에서만 다음과 같이 생성합니다. 기존 파일을 덮어쓰지 마세요.

```powershell
New-Item -ItemType Directory -Force .cache | Out-Null
if (-not (Test-Path .cache/postgres.env)) {
  $dbPassword = [Guid]::NewGuid().ToString('N')
  Set-Content .cache/postgres.env "POSTGRES_PASSWORD=$dbPassword" -Encoding ascii
}
docker compose --env-file .cache/postgres.env up -d --wait
$dbPassword = (Get-Content .cache/postgres.env).Split('=', 2)[1]
$env:DATABASE_URL = "postgresql+psycopg://startin:$dbPassword@127.0.0.1:5433/startin"
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m backend.app.import_jobs data/demo-jobs.json
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

DB 데이터는 `.runtime/postgres`에 유지됩니다. SQLite와 PostgreSQL의 계정/저장 정보는 서로 별개입니다.
SQLite로 돌아가려면 새 백엔드 터미널에서 `Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue`를 실행합니다.

## 환경변수와 AI

`.env.example`은 Vite용, `backend/.env.example`은 백엔드 변수 목록입니다.
백엔드 예제 파일은 자동 로드되지 않으므로 서버를 시작하는 터미널에서 환경변수를 설정하세요.

- `DATABASE_URL`: 미설정 시 `backend/startin.db`
- `CORS_ORIGINS`: 프론트 주소 목록. HTTPS 배포 시 `COOKIE_SECURE=true`
- `BACKEND_URL`: Vite 프록시 대상. 기본 `http://127.0.0.1:8000`
- `VITE_API_BASE_URL`: 브라우저 API 주소. 기본 `/api`
- `OPENAI_API_KEY`: 백엔드 환경에만 설정. 프론트/VITE 변수나 저장소에 넣지 않음
- `OPENAI_MODEL`: 기본 `gpt-4o-mini`, Structured Outputs 지원 모델 사용

AI 요청은 [OpenAI 공식 Structured Outputs 문서](https://developers.openai.com/api/docs/guides/structured-outputs)의 Responses API 형식에 맞춥니다.
외부로 보내는 사용자 데이터는 검색 문구뿐이며 공고 전체/계정/이력서는 보내지 않습니다.
`OPENAI_API_KEY`를 설정하고 백엔드를 재시작하면 실제 호출 경로가 활성화됩니다.
현재 키가 없어 외부 유료 API 호출은 미검증입니다. 모의 정상 응답과 오류/시간초과/잘못된 응답/키 없음 대체 동작은 검증했습니다.

## Migration / import

```powershell
.\.runtime\python\python.exe -m alembic current
.\.venv\Scripts\python.exe -m alembic upgrade head
.\.venv\Scripts\python.exe -m backend.app.import_jobs data/demo-jobs.json
```

이력: `0001` 기존 6개 테이블 → `0002` 공고 중복 판별 키 → `0003` 사용자 PDF.
이전 create_all DB는 기준 테이블의 컬럼 이름이 일치할 때만 0001 이력에 편입합니다.
되돌리기는 테스트용 DB에서만 수행하세요. `0003`을 되돌리면 이력서가 삭제됩니다.
import JSON은 `companies`/`jobs` 배열이며 샘플은 `data/demo-jobs.json`입니다.
입력 ID는 연결에만 사용하고 실제 DB ID는 자동 생성합니다. 기존 데이터는 덮어쓰지 않습니다.
공고 중복 기준은 기업/제목/지역/구군/작성일이며 성공·건너뜀·실패를 출력합니다. 실패 행이 있으면 종료 코드 1입니다.

## 검증

```powershell
npm run build
.\.venv\Scripts\python.exe -m pytest backend/tests -q -p no:cacheprovider --basetemp=.cache/pytest-check
.\.venv\Scripts\python.exe verification/check_postgres.py
.\.venv\Scripts\python.exe verification/check_migrations.py
.\.venv\Scripts\python.exe verification/check_migrations.py --postgres
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.cache\ms-playwright"
npx playwright install chromium
npm run test:e2e
```

E2E 실행 전 `$env:PYTHON = "$PWD\.venv\Scripts\python.exe"`를 설정합니다.
E2E는 별도 SQLite DB와 8001/5174 포트를 사용하며 외부 AI 키를 비활성화합니다.
PostgreSQL API 검사는 생성한 임시 스키마만 정리하며 프로젝트 데이터를 지우지 않습니다.
최신 결과: SQLite 16개, PostgreSQL 16개, 핵심 브라우저 8개 통과. 추천검색어 전용 검사는 이전 통과본을 유지하고 이번에는 재실행하지 않았습니다.
1920/4K 레이아웃, 별도 npm 의존성 설치·빌드, 별도 Python 패키지와 빈 DB 초기화도 확인했습니다. 다른 물리 PC에서 직접 검증한 것은 아닙니다.

## 주요 파일

- `src/hooks/useJobSearch.js`: URL·필터·페이지·자연어 검색 요청
- `src/components/`: 승인 시안과 역할별 UI, `ResumePanel`/`Pagination`
- `src/pages/`: 검색·상세·기업·인증·MY
- `backend/app/main.py`: API와 사용자별 데이터 접근
- `backend/app/ai_search.py`: AI 조건 스키마·검증·fallback
- `backend/app/import_jobs.py`: 로컬 데이터 가져오기
- `backend/migrations/`: 고정된 DB 변경 이력
- `verification/`: API/브라우저/초기화 검증과 캡처

원본 히어로/지도만 이미지로 사용하며 시안 전체 이미지나 외부 프로젝트 소스는 사용하지 않았습니다.
