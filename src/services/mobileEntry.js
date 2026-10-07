// 주소를 정하는 준비 단계입니다. 화면 기능은 PC와 모바일이 함께 사용합니다.
export function prepareMobileEntry() {
  const { pathname, search, hash, hostname } = window.location;
  const mobilePath = pathname === '/m' || pathname.startsWith('/m/');
  const mobileHost = hostname.startsWith('m.');
  const narrowScreen = window.matchMedia('(max-width: 700px)').matches;
  const touchDevice = navigator.maxTouchPoints > 0 || /Mobile|Android|iPhone/i.test(navigator.userAgent);

  // 이미 /m에 있으면 다시 /m을 붙이지 않습니다. 검색조건도 그대로 옮깁니다.
  if (narrowScreen && touchDevice && !mobileHost && !mobilePath) {
    const page = ['/', '/intro'].includes(pathname) ? '/main' : pathname;
    window.history.replaceState(null, '', `/m${page}${search}${hash}`);
  } else if (pathname === '/m' || pathname === '/m/' || (mobileHost && ['/', '/intro'].includes(pathname))) {
    const page = mobileHost ? '/main' : '/m/main';
    window.history.replaceState(null, '', `${page}${search}${hash}`);
  }

  const useMobilePath = window.location.pathname.startsWith('/m/');
  document.documentElement.classList.toggle('mobile-version', useMobilePath || mobileHost);
  return useMobilePath ? '/m' : '/';
}
