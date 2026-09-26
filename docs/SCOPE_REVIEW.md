# V4 코드 분류

2026-09-26 현재 작업 폴더의 실제 코드 기준. 첨부 문서에 언급된 ZIP은 별도로 읽지 않았다.

| 분류 | 대상 | 판단 |
| --- | --- | --- |
| KEEP | App/Router, Header/Hero/Filter/Map/JobList/JobCard, CSS, 제공 이미지 | 승인 시안과 검색 흐름 |
| KEEP | 검색 URL 상태, API 로딩/오류/재시도, 상세·기업 최소 화면 | React → URL → API 학습 |
| KEEP | 인증 화면·AccountContext·세션·비밀번호 해시·CSRF/Origin | 사용자별 저장·지원 기능에 필요 |
| KEEP | Company/Job/User/Session/SavedJob/Application, API·스키마·DB 제약 | 핵심 데이터 관계와 사용자 분리 |
| KEEP | 저장공고·지원현황 상태/메모/삭제 | 서로 다른 관계 데이터와 수정 흐름. 기존 7개 상태는 데이터 호환성을 위해 유지 |
| KEEP | 준비중/404 화면 | Header 시안 보존과 이동 오류 안내 |
| KEEP | 현재 npm/Python 의존성, DB compose, seed, 핵심 테스트 | 모두 현재 실행·검증 또는 지정된 PostgreSQL 단계에 사용 |
| SIMPLIFY | MY와 AccountContext | 이름 수정 탭과 외부 setUser 노출 제거 |
| SIMPLIFY | 공고 조회·기업 상세 | 전체 목록 전송 대신 서버 페이지 응답, company_id 서버 조건 |
| SIMPLIFY | 지도 집계 | 페이지 공고와 분리된 전체 조건 기준 지역 집계 유지 |
| DELETE | 관리자 공고 POST/PUT/DELETE, require_admin, ADMIN_API_KEY, CORS 관리자 헤더 | 사용자 UI에 소비처 없음. 공고 입력은 이후 import 단계 담당 |
| DELETE | ProfileUpdate/PATCH /me, 프로필 CSS·전용 테스트 | 지원현황 수정과 학습 중복 |
| DELETE | 로그인 rate limit와 전용 테스트 | V4 완료 범위 제외. 세션 만료 검사는 유지 |

JobWrite는 관리자 삭제 후 응답 스키마의 공통 필드로만 쓰이므로 JobFields로 이름을 바꾼다.
추천검색어 구현은 변경하지 않는다. 페이지 응답 계약이 바뀌어도 기존 동작은 유지한다.
