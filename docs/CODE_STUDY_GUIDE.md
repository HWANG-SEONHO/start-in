# START IN 코드 읽기 지도

이 프로젝트의 코드는 **기능을 만드는 것**과 **사용자가 코드를 이해하는 것**을 같이 목표로 합니다. 주석은 어려운 말을 늘리는 대신 `왜 필요한가 → 무엇을 받는가 → 무엇을 하는가 → 무엇을 돌려주는가` 순서로 적었습니다.

## 1. 처음 읽을 React 흐름

`index.html → src/main.jsx → src/App.jsx → src/pages/SearchPage.jsx → src/hooks/useJobSearch.js → src/services/api.js`

브라우저 화면에서 검색 조건을 누르면 `useJobSearch.js`가 상태와 URL을 정리하고, `api.js`가 FastAPI에 요청을 보냅니다.

## 2. 처음 읽을 FastAPI 흐름

`backend/app/main.py → backend/app/schemas.py → backend/app/models.py → backend/app/database.py`

`main.py`가 요청을 받고, `schemas.py`가 값의 모양을 검사하고, `models.py`가 DB 표를 설명하고, `database.py`가 실제 DB 세션을 빌려줍니다.

## 3. DB를 이해하는 가장 짧은 연결

`User`는 회원, `Company`는 기업, `Job`은 공고입니다. `SavedJob`은 사용자와 공고를 연결하고, `Application`은 그 공고에 대한 지원 상태를 저장합니다. `ForeignKey`는 "이 줄이 다른 표의 어느 줄을 가리키는가"를 나타내는 연결선입니다.

## 4. 먼저 보면 좋은 작은 기능

저장 기능은 `SaveButton.jsx → api.js → main.py의 saved job API → SavedJob model` 순서로 따라가면 프론트엔드 → API → DB 전체 연결을 비교적 짧게 볼 수 있습니다.

## 5. JSON 파일에 주석이 없는 이유

`package.json`, `package-lock.json`, `data/demo-jobs.json`은 **JSON 문법 자체가 주석을 허용하지 않습니다.** 억지로 `// 주석`을 넣으면 프로그램이 파일을 읽지 못합니다. 그래서 JSON은 원본 문법을 유지하고 이 문서와 주변 JavaScript/Python 코드에서 역할을 설명합니다.

- `package.json`: 실행 명령과 npm 라이브러리 목록
- `package-lock.json`: 설치되는 라이브러리 버전을 고정하는 자동 생성 파일
- `data/demo-jobs.json`: 학습용 데모 기업/공고 데이터

## 6. 공부할 때의 규칙

코드를 외우지 말고 **사용자 행동 → React → API → FastAPI → DB → 응답 → 화면** 한 줄을 따라갑니다. 처음 보는 문법이 나오면 그 문법만 작은 예제로 확인한 뒤 다시 START IN 코드로 돌아옵니다.


## Windows에서 alembic.ini 주석이 영어인 이유

Windows의 어떤 Python 환경은 `.ini` 파일을 UTF-8이 아니라 `cp949`로 읽습니다.
그래서 설정 파일 안에 한글 주석이 있으면 서버 시작 전에 `UnicodeDecodeError`가 날 수 있습니다.
이 파일은 **설정 파일의 문법을 깨뜨리지 않는 것**이 더 중요해서 ASCII(영문)만 사용합니다.
대신 실제 학습 설명은 이 문서와 Python 코드의 한글 주석에 남깁니다.

서버가 DB를 준비할 때는 `backend/app/main.py`의 `alembic_config()`가
Alembic 설정을 Python 코드로 직접 만들어 사용하므로 Windows의 기본 인코딩에 의존하지 않습니다.

## 2026.10.07 — 인증과 모바일 코드를 읽는 순서

`src/services/mobileEntry.js`는 앱을 그리기 전에 주소를 준비합니다. 휴대폰이면 `/m`을 한 번 붙이고 검색조건을 그대로 둡니다. `src/main.jsx`가 반환된 경로를 Router의 basename으로 전달하면, 각 페이지는 모바일 전용 주소를 따로 복사할 필요가 없습니다.

`AuthPage.jsx`의 `authBenefits`는 내용 배열이고 `AuthBenefits`는 그 내용을 그리는 컴포넌트입니다. 로그인과 가입이 같은 내용을 재사용하되 위치는 CSS로 바꿉니다. 사진에는 글자를 넣지 않으므로 문구를 바꾸려고 이미지를 잘라낼 필요가 없습니다.

`FilterPanel.jsx`의 `expanded`는 펼쳤는지만 기억합니다. 선택한 검색조건은 기존 검색 상태에 남아 있으므로 상세 조건을 접어도 체크가 지워지지 않습니다. `mobile.css`는 모바일 배치만 담당하고 실제 검색·계정·PDF 기능은 PC 코드와 같습니다.

기존 인증·DB 기능은 유지하고 새 모바일 준비 함수를 분리했습니다. 가독성을 위해 컴포넌트 재사용과 흐름 주석을 추가했으며 전체 백엔드를 새로 쓰지는 않았습니다. [구체적인 연습 순서](STUDY_PLAN_20261007.md)
