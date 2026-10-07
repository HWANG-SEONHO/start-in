import RequestError from '../components/RequestError';
// 학습용 설명: 검색조건, 지도, 공고목록을 한 화면에 연결하는 검색 페이지입니다.
// 큰 흐름: useJobSearch에서 상태/함수 받기 → Filter/Map/JobList에 나눠 전달 → 사용자 클릭이 다시 hook으로 돌아감.

import { Link, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Hero from '../components/Hero';
import FilterPanel from '../components/FilterPanel';
import MapSection from '../components/MapSection';
import { lazy, Suspense } from 'react';
const NationalMap = lazy(() => import('../components/NationalMap'));
import JobList from '../components/JobList';
import FloatingRobot from '../components/FloatingRobot';
import { useJobSearch } from '../hooks/useJobSearch';
import { filterGroups } from '../data/filters';
export default function SearchPage({
  home = false
}) {
  // 검색에 필요한 대부분의 상태와 동작은 useJobSearch 한 곳에 모아 두었습니다.
  const location = useLocation();
  const legacy = new URLSearchParams(location.search).get('map') === 'legacy';
  const regionalMode = home && legacy;
  const search = useJobSearch({ home, unified: home && !legacy });

  // 지도에서 선택한 구·군을 "부산 해운대구" 같은 표시용 글자로 바꿉니다.
  const selectedDistrictLabels = filterGroups.region.options.flatMap(region => (search.districts[region] || []).map(name => `${region} ${name}`));

  // 지역 필터를 제외하고 사용자가 고른 세부조건 개수를 셉니다.
  const selectedFilterCount = Object.entries(search.filters).filter(([key]) => key !== 'region').reduce((count, [, values]) => count + values.length, 0);

  // FilterPanel 제목 아래에 보여줄 현재 검색상태 한 줄입니다.
  const filterSummary = [search.filters.region?.length ? search.filters.region.join('·') : '전국', search.loading ? '검색 중…' : search.error ? '조회 실패' : `${search.total}건`, `조건 ${selectedFilterCount}개`, selectedDistrictLabels.length ? `지도 선택: ${selectedDistrictLabels.join('·')}` : '', search.query ? `검색어: ${search.query}` : ''].filter(Boolean).join(' · ');

  // 메인의 "부산 공고 목록 보기" 같은 링크에 현재 검색조건을 그대로 담습니다.
  function listLink(region) {
    const params = new URLSearchParams(location.search);
    params.set('filters', JSON.stringify({
      ...search.filters,
      ...(region ? {
        region: [region]
      } : {})
    }));
    params.set('sort', region ? search.regionSorts[region] || search.sort : search.sort);
    params.set('districts', JSON.stringify(region ? {
      [region]: search.districts[region] || []
    } : search.districts));

    // 메인 전용 지역별 페이지/정렬값은 일반 /jobs 화면으로 가져가지 않습니다.
    params.delete('pages');
    params.delete('page');
    params.delete('regionSorts');
    return `/jobs?${params}`;
  }

  // API 결과 한 덩어리를 JobList가 이해하는 props로 바꿉니다.
  function jobList(result, region = '전체') {
    const selectedDistricts = search.districts[region] || [];
    const regionLabel = selectedDistricts.length === 1 ? `${region} ${selectedDistricts[0]}` : selectedDistricts.length > 1 ? `${region} ${selectedDistricts.length}개 구` : region;
    return <JobList moreLink={home ? listLink(regionalMode ? region : undefined) : undefined} region={regionLabel} jobs={result.items} total={result.total} page={result.page} totalPages={result.total_pages} onPage={nextPage => search.setPage(nextPage, regionalMode ? region : undefined)} sort={regionalMode ? search.regionSorts[region] || search.sort : search.sort} onSort={value => search.setSort(value, regionalMode ? region : undefined)} />;
  }

  // /jobs 화면 위의 작은 일반 검색창 제출 함수입니다.
  function submitKeywordSearch(event) {
    event.preventDefault();
    const text = new FormData(event.currentTarget).get('q').trim();
    search.search(text);
  }
  return <>
      {/* 메인 화면에만 큰 Hero 영역을 보여줍니다. */}
      {home && <div className="hero-background">
          <Header />
          <Hero key={search.query} query={search.query} onSearch={search.searchWithAI} searching={search.interpreting} guidance={search.aiDescription ? `AI 해석: ${search.aiDescription} · 선택한 필터와 함께 적용` : search.aiMessage} count={search.loading && !search.refreshingSort ? '—' : search.total} companyCount={search.loading && !search.refreshingSort ? '—' : search.companyCount} />
        </div>}

      <main className={home ? "search-page-main search-page-main-home" : "search-page-main"}>
        {/* 일반 /jobs 화면에서는 AI가 해석한 조건을 따로 알려줍니다. */}
        {!home && search.aiDescription && <p className="demo-notice">
            AI 해석: {search.aiDescription} · 직접 선택한 필터와 함께 적용됩니다.
          </p>}

        {!home && <div className="page-search-heading">
            <h1>채용공고</h1>
            <form onSubmit={submitKeywordSearch}>
              <input key={search.query} name="q" aria-label="공고 검색어" defaultValue={search.query} maxLength={200} placeholder="기업명, 직무, 기술 키워드" />
              <button>검색</button>
            </form>
          </div>}

        <FilterPanel filters={search.filters} onToggle={search.toggle} summary={filterSummary} onReset={search.reset} />

        {/* 첫 로딩 / 오류 / 정상 결과 중 현재 상태 하나만 보여줍니다. */}
        {home && !legacy ? <div className="results-layout unified-results">
          <Suspense fallback={<div className="national-map" role="status">전국 지도를 준비하는 중입니다…</div>}><NationalMap search={search} /></Suspense>
          {search.error ? <RequestError message={search.error} onRetry={search.retry}/> : search.results[0] ? jobList(search.results[0], search.filters.region?.length ? search.filters.region.join(' · ') : '전국') : <p className="request-status" role="status">공고를 불러오는 중입니다…</p>}
        </div> : search.loading && !search.refreshingSort ? <p className="request-status" role="status">공고를 불러오는 중입니다…</p> : search.error ? <RequestError message={search.error} onRetry={search.retry} /> : home ?
      // 메인은 선택한 지역마다 "지도 + 공고 5개" 한 줄을 만듭니다.
      search.regions.map((region, index) => {
        const result = search.results[index];
        if (!result) return null;
        return <div className="results-layout" data-region={region} key={region}>
                <MapSection region={region} counts={result.district_counts[region] || {}} districts={search.districts[region] || []} onDistrict={(name, options) => search.selectDistrict(region, name, options)} />
                {jobList(result, region)}
              </div>;
      }) :
      // /jobs 화면은 전체 결과 목록 하나만 보여줍니다.
      search.results[0] && <div className="full-job-list">
              {jobList(search.results[0], search.filters.region?.length === 1 ? search.filters.region[0] : '전체')}
            </div>}
      </main>

      {/* 메인 오른쪽의 떠있는 전체 공고 바로가기입니다. */}
      {home && <FloatingRobot>
        <Link className="all-filtered-jobs" to={listLink()}>
          <strong className="floating-jobs-title">
            <span>공고 목록 보기</span>
            <small className={search.loading || search.error ? 'is-count-hidden' : ''} aria-hidden={search.loading || !!search.error}>{search.loading || search.error ? '0000건' : `${search.total.toLocaleString()}건`}</small>
            <b aria-hidden="true">→</b>
          </strong>
          <span>선택한 조건의 공고를 모아봐요.</span>
        </Link>
        </FloatingRobot>}
    </>;
}
