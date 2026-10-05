const HOME_SEARCH_KEY = 'startin-home-search';

// 홈을 떠나도 같은 탭에서는 마지막 검색조건을 다시 사용할 수 있게 보관한다.
export function rememberHomeSearch(search) {
  try { sessionStorage.setItem(HOME_SEARCH_KEY, search); } catch { /* 저장이 차단돼도 현재 검색은 유지한다. */ }
}

export function homeSearchUrl() {
  try { return `/main${sessionStorage.getItem(HOME_SEARCH_KEY) || ''}`; }
  catch { return '/main'; }
}

// 전체 공고로 이동할 때 검색조건은 이어가고 화면별 페이지 상태는 제외한다.
export function jobsSearchUrl(search) {
  if (search === undefined) {
    try { search = sessionStorage.getItem(HOME_SEARCH_KEY) || ''; }
    catch { search = ''; }
  }
  const params = new URLSearchParams(search);
  const next = new URLSearchParams();
  for (const key of ['filters', 'q', 'sort', 'districts', 'ai']) {
    if (params.has(key)) next.set(key, params.get(key));
  }
  return `/jobs${next.size ? `?${next}` : ''}`;
}
