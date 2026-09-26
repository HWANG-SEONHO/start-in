import Header from '../components/Header';
import Hero from '../components/Hero';
import FilterPanel from '../components/FilterPanel';
import MapSection from '../components/MapSection';
import JobList from '../components/JobList';
import { useJobSearch } from '../hooks/useJobSearch';

export default function SearchPage({ home = false }) {
  const search = useJobSearch({ home });
  function jobList(result, region = '전체') {
    const district = search.districts[region];
    return <JobList region={district ? `${region} ${district}` : region} jobs={result.items} total={result.total}
      page={result.page} totalPages={result.total_pages} onPage={page => search.setPage(page, home ? region : undefined)} sort={search.sort} onSort={search.setSort} />;
  }
  return <>
    {home && <div className="hero-background"><Header /><Hero key={search.query} query={search.query} onSearch={search.searchWithAI} searching={search.interpreting} guidance={search.aiDescription ? `AI 해석: ${search.aiDescription} · 선택한 필터와 함께 적용` : search.aiMessage} count={search.loading ? '—' : search.total} companyCount={search.loading ? '—' : search.companyCount} /></div>}
    <main>
      {!home && search.aiDescription && <p className="demo-notice">AI 해석: {search.aiDescription} · 직접 선택한 필터와 함께 적용됩니다.</p>}
      {!home && <div className="page-search-heading"><h1>채용공고</h1><form onSubmit={event => { event.preventDefault(); search.search(new FormData(event.currentTarget).get('q').trim()); }}><input key={search.query} name="q" aria-label="공고 검색어" defaultValue={search.query} maxLength={200} placeholder="기업명, 직무, 기술 키워드" /><button>검색</button></form></div>}
      <FilterPanel filters={search.filters} onToggle={search.toggle} summary={`${search.filters.region?.length ? search.filters.region.join('·') : '전국'} · ${search.loading ? '검색 중…' : search.error ? '조회 실패' : `${search.total}건`} · 조건 ${Object.entries(search.filters).filter(([key]) => key !== 'region').reduce((count, [, values]) => count + values.length, 0)}개${Object.values(search.districts).filter(Boolean).length ? ` · 지도 선택: ${Object.values(search.districts).filter(Boolean).join('·')}` : ''}${search.query ? ` · 검색어: ${search.query}` : ''}`} onReset={search.reset} />
      {search.loading ? <p className="request-status" role="status">공고를 불러오는 중입니다…</p> : search.error ? <div className="request-status" role="alert">{search.error}<button onClick={search.retry}>다시 시도</button></div> : home ? search.regions.map((region, index) => {
        const result = search.results[index];
        return <div className="results-layout" data-region={region} key={region}>
          <MapSection region={region} counts={result.district_counts[region] || {}} district={search.districts[region] || ''} onDistrict={name => search.selectDistrict(region, name)} />
          {jobList(result, region)}
        </div>;
      }) : search.results[0] && <div className="full-job-list">{jobList(search.results[0])}</div>}
    </main>
  </>;
}
