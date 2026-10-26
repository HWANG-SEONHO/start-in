# 2026-10-26 세 작업 창 변경 통합·커밋·배포

## 사용자 결정
세 창에서 진행한 변경이 모두 끝났으므로 관련 미커밋 변경을 커밋하고 배포한다. `debug.log`는 기존 지시에 따라 제외한다. 새 견본은 사용자 검토 전 상태를 유지한다.

## 반영한 변경
- 세 창 최신 로컬 미리보기 `E:\Claude\webbook\qa-output\luna-fix\build\fullpage-005-new`의 최신 HTML·CTA 모션 코드·장식 연결·36개 프레임을 추적되는 `assets/complete/fullpage/007-pium-tines-garden`에 반영했다. QA 원본 폴더 전체는 배포에 포함하지 않았다.
- 배포 견본의 `<title>`을 자산 메타데이터와 일치시켰다. 실시간 localhost 미리보기에서 새 캡처를 만들어 `review/after.webp`(1920×1080)와 `thumb.webp`(640×400)를 갱신했다. `asset.json`의 `status: review`는 그대로 유지했다.
- Start-in 원격 `main`은 작업 도중 이미 최신 웹북 인증 구현(24시간 세션, 로그인 API, 저장소 기반 콘텐츠 캐시)이 올라와 있었다. rebase에서 중복되는 구버전 로컬 인증 파일은 버리고 원격의 최신 구현을 보존했다. 로컬 자료 문서와 Tines 분석 자료는 추가 반영했다.

## 커밋과 배포
- `HWANG-SEONHO/webbook`: `d4fdb5be9dc2483b69a308de1ebe7ef2b4134688` — `PIUM Tines 견본에 세 작업 창의 최신본 반영`. Render `s-i` (`dep-dbfaq8ijnfac73ej2j40`) `live`.
- `HWANG-SEONHO/start-in`: `5f65f0a8411dc3c892412d508fc09370905c71dd` — `웹북 서버 로그인 보호와 Tines 모션 분석 자료 반영`. Render `start-in-api` (`dep-dbfaq83bc2fs7390q850`) 및 `start-in-web` (`dep-dbfaq83bc2fs7390q8b0`) 모두 `live`.
- 서버 빌드 후 HTTP 확인: `https://s-i.onrender.com/b/`와 `https://start-in-api.onrender.com/b/`는 로그인 화면 200. 비로그인 `/b/book.js`와 `/b/assets/complete/fullpage/007-pium-tines-garden/index.html`는 401. 잘못된 암호 로그인도 401. 실제 비밀번호를 사용한 로그인은 하지 않았다.

## 검증
- `E:\Claude\webbook`: `npm run build` 통과. `npm test`: 32개 중 29 통과, 3 실패. 실패는 로컬에만 남은 빈 `assets/complete/fullpage/006-pium-tines-remake`의 `asset.json` 누락, 로딩 종료 문구/타이밍에 대한 기존 UI 테스트, 지도 화면의 오래된 `approved` 필터 셀렉터 기대값이다. 007 제목 규칙 실패는 수정 후 통과했다.
- `E:\Project`: `npm run build` 통과. 현재 원격 코드 기준 `python -m pytest backend/tests/test_webbook_auth.py -q`: 11 통과(Starlette/httpx 및 pytest cache 경고만 있음).
- 비밀키 패턴 점검에서 staged 파일 이상 없음. `debug.log`는 미커밋 상태로 남겼다.

## 한계와 다음 확인
- 로그인이 필요한 실제 견본 화면을 암호로 열어 브라우저에서 확인하지는 않았다. 비밀번호를 사용하지 않고 로그인 장벽과 직접 파일 요청 차단만 검증했다.
- `fullpage-007`은 새 캡처·코드가 배포됐지만 사용자 시각 검토 전이므로 계속 `review` 상태다.
