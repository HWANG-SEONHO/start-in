# START IN

> **빠르게 찾고, 가볍게 보고, 바로 나갈 수 있는 구직 탐색 프로젝트.**

`START IN`은 구직사이트에 들어갔을 때 쏟아지는 정보부터 보는 대신, **내 조건에 맞는 채용시장이 지금 어떤지 빠르게 확인하는 경험**에서 시작한 프로젝트입니다.

지역과 조건을 고르고, 지도를 보고, 공고를 확인하고, 필요하면 AI 검색을 이용합니다. 볼 것을 봤으면 오래 붙잡아두지 않는 화면을 지향합니다.

🌐 **[배포 버전 바로가기](https://start-in-web.onrender.com/)**  
💻 **[GitHub Repository](https://github.com/HWANG-SEONHO/start-in)**

---

## HOME · 1차 디자인

![START IN HOME 1차 디자인](assets/images/home-draft-20260919.png)

처음으로 START IN의 방향이 잡힌 HOME 초안입니다.

이 시점에는 **조건 선택 → 지역별 채용 밀도 → 공고 확인**이라는 큰 흐름을 먼저 정했습니다. 아직 세부 기능보다 사이트가 어떤 경험을 줘야 하는지 찾는 단계였습니다.

---

## HOME · 2차 디자인

![START IN HOME 2차 디자인](assets/images/home-current-20260925.png)

1차 디자인 이후 헤더, 히어로, AI 검색, 상세 필터, 부산 지도, 채용공고 영역을 실제 브라우저에서 반복해서 조정했습니다.

1920×1080 화면을 기준으로 여백, 버튼, 지도 크기, 타이포그래피, 이미지 배치 등을 다듬으면서 **한 장짜리 시안이 아니라 실제로 사용할 수 있는 페이지**로 발전시킨 단계입니다.

---

## 2차 디자인 이후 · 기능이 붙기 시작했다

2차 디자인을 기준으로 React 전환을 시작했고, 이후 프로젝트의 중심이 단순한 화면 구현에서 **실제 서비스 구조를 연결하는 작업**으로 넓어졌습니다.

React 화면 뒤에 FastAPI와 DB가 연결되고, 로그인한 사용자마다 다른 데이터가 생기면서 START IN은 프론트 화면만 보는 프로젝트가 아니라 **화면 → API → DB → 다시 화면으로 돌아오는 전체 흐름**을 확인할 수 있는 프로젝트가 됐습니다.

이 과정에서 초기 디자인판과 기능 개발판을 따로 관리하던 시기도 있었지만, 현재는 그 구분을 끝내고 **최신 통합본을 `main` 기준**으로 사용합니다.

현재 저장소의 기업·채용공고 데이터는 기능 검증을 위한 **가상 데모 데이터**이며 실제 기업이나 실제 채용공고가 아닙니다.

---

## 현재 주요 기능

- React 기반 화면과 Router
- 지역 · 직무 · 학력 · 경력 · 고용형태 · 급여 · 근무조건 · 기업형태 · 복리후생 복수 필터
- 지역별 채용 분포 지도와 구·군 다중 선택
- 검색 · 정렬 · 페이지네이션 · URL 상태 복원
- 공고 상세와 기업별 공고
- 회원가입 · 로그인 · 로그아웃 · 쿠키 세션
- 사용자별 즐겨찾기
- 지원현황 상태 · 메모 · 취소
- PDF 이력서 업로드 · 다운로드 · 교체 · 삭제
- 자연어 조건 검색 + 일반 DB 검색 fallback
- PostgreSQL + SQLAlchemy + Alembic
- Render 배포
- 기능 검증용 데모 기업 **150개** · 채용공고 **1,000개**
- 17개 시·도 데이터와 지역별 지도 자산

---

## 프로젝트가 발전한 순서

`아이디어 → HOME 1차 디자인 → HOME 2차 디자인 → HTML/CSS/JS 구현 → 브라우저 미세조정 → React 전환 → FastAPI/API 연결 → DB → 인증/사용자 기능 → 데모 데이터 확장 → 배포 → 실제 실행 오류 수정 → UX 개선 → 코드 가독성/주석 정리 → 최신 통합본 main`

처음에는 화면을 만드는 일이 중심이었지만, 기능이 붙은 뒤부터는 **동작 여부뿐 아니라 실제 사용감과 실행 안정성**까지 함께 보게 됐습니다.

---

## UX에서 계속 확인하는 것

기능이 동작하는 것만으로 끝내지 않고, 실제 사용하면서 거슬리는 부분을 계속 수정합니다.

- 페이지 전환·정렬·필터 변경 후 불필요한 스크롤 상단 이동 방지
- scrollbar 변화 때문에 화면이 좌우로 미세하게 움직이는 현상 방지
- 여러 지역과 구·군을 선택해도 화면 위치와 선택 상태 유지
- 신규 지원기록과 기존 기록을 바로 구별할 수 있게 표시
- 저장 · 취소 · 업로드 · 즐겨찾기 결과를 토스트 알림으로 안내
- 확인이 필요한 작업에는 팝업 사용
- 로고 · 파비콘 · 버튼 · 타이포그래피의 브랜드 일관성 유지

이런 작은 문제들은 처음에는 사소해 보였지만, 반복해서 수정할수록 프로젝트의 완성도를 크게 좌우한다는 것을 확인했습니다.

---

## 기술 스택

### Frontend

- React 19
- React Router
- Vite
- CSS
- Playwright E2E

### Backend

- FastAPI
- SQLAlchemy
- Alembic
- SQLite / PostgreSQL
- Pytest

### Deployment / Workflow

- Render
- GitHub
- Google Drive — 대형 원본 보관
- Notion — 판단·변경 이유·프로젝트 맥락 기록

---

## AI DEVLOG

결과만 남기지 않고, **무슨 생각으로 시작했고 무엇을 잘못 만들었으며 사용자와 ChatGPT가 어떻게 부딪히고 방향을 바꿨는지**도 함께 기록합니다.

ChatGPT가 1인칭 화자로 쓰되, 사용자의 생각이나 감정을 임의로 만들어내지 않고 실제 프로젝트에서 확인된 사건을 중심으로 기록합니다.

- [POST 01 · 추석 연휴에 일이 커졌다](docs/AI_DEVLOG.md)
- [POST 02 · 홈 화면을 만들었는데 자꾸 다른 사이트가 됐다](docs/AI_DEVLOG_02.md)
- [POST 03 · 조금만 다듬자고 했는데 만드는 기준부터 생겼다](docs/AI_DEVLOG_03.md)
- [POST 04 · 히어로 이미지 하나에 AI들이 다 달라붙었다](docs/AI_DEVLOG_04.md)
- [POST 05 · 나는 React 복습인 줄 알았다](docs/AI_DEVLOG_05.md)
- [POST 06 · 채용공고를 구하러 갔다가 내가 천 개를 만들었다](docs/AI_DEVLOG_06.md)
- [POST 07 · 테스트는 통과했는데 서버는 두 번 죽었다](docs/AI_DEVLOG_07.md)
- [POST 08 · 고칠수록 체크리스트가 길어졌다](docs/AI_DEVLOG_08.md)

---

## 로컬 실행

프로젝트 루트에서 실행합니다.

### 1. Python 가상환경과 Backend 패키지

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.lock.txt
```

### 2. Backend

```powershell
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000
```

로컬 SQLite는 서버 시작 시 필요한 테이블을 준비합니다. DB가 비어 있으면 데모 데이터도 자동으로 입력합니다.

`backend/startin.db`는 개인 실행 데이터이므로 배포/인계 ZIP에 포함하지 않습니다.

### 3. Frontend

CMD:

```bash
npm install
npm run dev
```

PowerShell에서 실행 정책 때문에 `npm.ps1`이 막히는 경우:

```powershell
npm.cmd install
npm.cmd run dev
```

브라우저에서 `http://127.0.0.1:5173`으로 접속합니다.

---

## 코드 읽기

START IN은 기능 구현뿐 아니라 **나중에 다시 읽고 수정할 수 있는 코드**를 목표로 합니다.

- 역할이 드러나는 함수·변수 이름 사용
- 긴 처리 흐름은 가능한 작은 의미 단위로 분리
- 주석은 단순 번역보다 `왜 필요한가 → 무엇을 하는가 → 결과가 무엇인가`를 설명
- JSON/INI처럼 주석이나 인코딩에 민감한 파일은 형식 안정성을 우선하고 설명은 별도 문서에 작성

처음부터 전체 코드를 읽기보다 `docs/CODE_STUDY_GUIDE.md`의 흐름을 따라가는 것을 권장합니다.

---

## 주요 파일

- `src/hooks/useJobSearch.js` — URL · 필터 · 페이지 · 자연어 검색 요청
- `src/components/` — 공통 UI와 이력서/페이지네이션 등 역할별 컴포넌트
- `src/pages/` — 검색 · 상세 · 기업 · 인증 · MY 화면
- `backend/app/main.py` — API와 사용자별 데이터 접근
- `backend/app/ai_search.py` — 자연어 조건 해석 · 검증 · fallback
- `backend/app/import_jobs.py` — 데모 데이터 가져오기
- `backend/migrations/` — DB 변경 이력
- `data/demo-jobs.json` — 기능 검증용 데모 데이터
- `public/` — 로고 · 지도 · 히어로 등 실제 서비스 정적 자산

> `public`은 프로젝트 화면에 필요한 실제 정적 자산이 들어 있으므로 용량이 크더라도 배포·인계 소스에서 임의로 제외하지 않습니다.

---

## 데이터와 개인정보

- 저장소의 기업·공고 데이터는 데모입니다.
- 실제 사용자 비밀번호는 평문으로 저장하지 않습니다.
- API key와 비밀정보는 GitHub에 올리지 않습니다.
- 이력서와 계정정보를 외부 AI 검색 요청에 전달하지 않습니다.

---

### START IN / START 人

어디에서 시작할 것인가.  
시작하는 사람.
