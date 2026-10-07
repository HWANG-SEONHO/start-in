# START IN으로 배우는 React — 2026.10.07

2026.10.08 사용자 확인: **React 아직 시작 전**. 아래는 선행 완료 진도를 가정하지 않는 시작 계획이다.

첫날에는 JavaScript 함수·배열·객체·map을 작은 예제로 확인한다. 이후 하루40~60분, JSX→컴포넌트→props→useState→이벤트·폼 순서로 진행한다. useEffect·API·라우터·인증·모션은 뒤로 둔다. 먼저 예제를 만든 뒤 같은 개념이 쓰인 프로젝트 파일을 읽는다. 한 번에 전체 코드를 외우지 않는다.

| 순서 | 연습 | 프로젝트에서 읽을 곳 | 끝났다는 기준 |
| --- | --- | --- | --- |
| 1 | JSX로 제목과 버튼 만들기, 컴포넌트·props | `src/pages/AuthPage.jsx`의 AuthBenefits | 장점 문구 한 개를 바꾸고 화면에 반영한다 |
| 2 | useState, 클릭, 조건부 표시 | `src/components/FilterPanel.jsx` | 상세 조건 펼치기·접기를 직접 설명한다 |
| 3 | 배열 map, key, 재사용 컴포넌트 | AuthBenefits와 SocialButtons | 배열에 항목을 추가하고 중복 JSX 없이 표시한다 |
| 4 | form, FormData, 입력 검사, busy·error | AuthPage의 submit | 비밀번호 불일치와 서버 오류를 구분한다 |
| 5 | fetch·async/await, API 응답 | `src/services/api.js`와 AccountContext | 로그인 요청→응답→화면 흐름을 말로 설명한다 |
| 6 | Router, Link, URL·검색 조건 | `src/main.jsx`, `src/services/mobileEntry.js` | `/m/main`의 basename과 페이지 경로를 구분한다 |
| 7 | useEffect, 외부 자원 정리 | AuthPage의 ResizeObserver | 관찰 시작·정리가 왜 필요한지 설명한다 |
| 8 | PDF 파일 입력과 요청, 확인창 | `src/components/ResumePanel.jsx` | 선택·업로드·교체·삭제가 각각 언제 실행되는지 찾는다 |
| 9 | CSS grid·media query·viewport | `src/styles/auth.css`, `mobile.css` | 390px과 1920px에서 배치가 달라지는 규칙을 찾는다 |
| 10 | 실제 DB와 프런트 연결 | `backend/app/main.py` | 버튼 하나의 요청을 끝까지 따라가고 작은 기능을 추가한다 |

기능을 고치기 전 현재 동작을 적고, 한 부분만 바꾼 뒤 같은 행동으로 확인한다. Git diff로 바꾼 줄을 읽어보는 것까지 연습에 포함한다. 모션 효과는 이 기본 흐름을 익힌 다음 별도로 읽는다.
