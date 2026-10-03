const HOME_SEARCH_KEY = 'startin-home-search';

// 홈을 떠나도 같은 탭에서는 마지막 검색조건을 다시 사용할 수 있게 보관한다.
export function rememberHomeSearch(search) {
  try { sessionStorage.setItem(HOME_SEARCH_KEY, search); } catch { /* 저장이 차단돼도 현재 검색은 유지한다. */ }
}

export function homeSearchUrl() {
  try { return `/main${sessionStorage.getItem(HOME_SEARCH_KEY) || ''}`; }
  catch { return '/main'; }
}
