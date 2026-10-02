# START IN Mobile

이 브랜치는 START IN 모바일 웹 버전 전용입니다.

- GitHub branch: `mobile`
- Render service: `start-in-mobile`
- Public URL: https://start-in-mobile.onrender.com
- API: https://start-in-api.onrender.com/api
- Desktop production source: `main` branch
- Desktop Render service: `start-in-web`

## 운영 원칙

1. 모바일 UI 수정은 `mobile` 브랜치에서 진행합니다.
2. `main`은 모바일 작업 때문에 직접 수정하지 않습니다.
3. Render의 `start-in-mobile`은 `mobile` 브랜치를 자동 배포합니다.
4. 공통 기능/API 변경이 필요할 때만 별도로 검토한 뒤 `main`과 동기화합니다.
5. 모바일 전용 레이아웃은 `src/styles/mobile.css`에서 관리합니다.

현재 모바일 CSS는 767px 이하에서만 적용되어 PC 레이아웃과 분리됩니다.
