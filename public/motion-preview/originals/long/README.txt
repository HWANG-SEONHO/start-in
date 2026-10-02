START IN — Long Cover Motions / CDN Edition

실행 방법
- ZIP을 풀고 HTML을 더블클릭합니다.
- 별도 npm / React / Vite 실행이 필요 없습니다.
- 인터넷 연결은 필요합니다. GSAP과 Motion을 jsDelivr CDN에서 불러옵니다.

사용 CDN
- GSAP 3.15.0: https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js
- Motion 13.5.0: https://cdn.jsdelivr.net/npm/motion@13.5.0/+esm

구성
01 Kinetic Typography / 15s
02 Editorial + Kinetic / 15s
03 Editorial + Swiss + Minimal + Cinematic / 16s
04 Kinetic + Main Bridge / 17s

구현 원칙
- 메인 시퀀스: GSAP Timeline
- 버튼 hover/press: Motion spring
- CSS는 레이아웃/타이포/색감 담당
- 각 파일은 단일 HTML이며 CSS/JS 코드는 HTML 내부에 포함됩니다.
- 외부 의존성은 CDN 라이브러리뿐입니다.
