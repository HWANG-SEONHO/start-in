import { useSearchParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { filterGroups, defaultFilters } from '../data/filters';
import { api, getJobs } from '../services/api';

function validPage(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 1;
}
export function useJobSearch({ home = false } = {}) {
  const [params, setParams] = useSearchParams();
  let filters;
  try {
    const parsed = params.has('filters') ? JSON.parse(params.get('filters')) : defaultFilters;
    filters = Object.fromEntries(Object.entries(parsed).filter(([key]) => key in filterGroups)
      .map(([key, values]) => [key, Array.isArray(values) ? values.filter(value => filterGroups[key].options.includes(value) && value !== filterGroups[key].neutral) : []]));
  } catch { filters = defaultFilters; }
  const query = (params.get('q') || '').slice(0, 200);
  let ai = null;
  try { ai = params.has('ai') ? JSON.parse(params.get('ai')) : null; } catch { /* 일반 검색으로 복원합니다. */ }
  const [interpreting, setInterpreting] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const interpretation = useRef(null);
  useEffect(() => () => interpretation.current?.abort(), []);
  let districts = {};
  let pages = {};
  try {
    districts = Object.fromEntries(Object.entries(JSON.parse(params.get('districts') || '{}'))
      .filter(([region, district]) => filterGroups.region.options.includes(region) && typeof district === 'string' && district.length <= 40));
  } catch { /* 손상된 URL의 지도 선택은 무시합니다. */ }
  try {
    pages = Object.fromEntries(Object.entries(JSON.parse(params.get('pages') || '{}'))
      .filter(([region]) => filterGroups.region.options.includes(region)).map(([region, page]) => [region, validPage(page)]));
  } catch { /* 손상된 페이지는 첫 페이지로 표시합니다. */ }
  const page = validPage(params.get('page'));
  const sort = ['latest', 'salary', 'size'].includes(params.get('sort')) ? params.get('sort') : 'latest';
  const regions = filters.region?.length ? filters.region : filterGroups.region.options;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState({ results: [], error: '', key: '' });
  const requestKey = JSON.stringify({ filters, query, sort, districts, pages, page, home, revision, ai });
  useEffect(() => {
    const controller = new AbortController();
    const request = JSON.parse(requestKey);
    const selectedRegions = request.filters.region?.length ? request.filters.region : filterGroups.region.options;
    // 메인은 지역별 페이지를 요청하고, 지도에는 전체 조건의 집계를 사용합니다.
    const requests = request.home ? selectedRegions.map(region => getJobs({ ...request,
      filters: { ...request.filters, region: [region] }, page: request.pages[region] || 1, pageSize: 5, signal: controller.signal,
    })) : [getJobs({ ...request, pageSize: 10, signal: controller.signal })];
    Promise.all(requests)
      .then(results => setState({ results, error: '', key: requestKey }))
      .catch(error => { if (error.name !== 'AbortError') setState({ results: [], error: error.message, key: requestKey }); });
    return () => controller.abort();
  }, [requestKey]);

  function cancelInterpretation() {
    interpretation.current?.abort(); interpretation.current = null;
    setInterpreting(false); setAiMessage('');
  }
  function update(nextFilters, nextQuery = query, nextSort = sort, nextAi = ai) {
    cancelInterpretation();
    setParams({ filters: JSON.stringify(nextFilters), ...(nextQuery ? { q: nextQuery } : {}), sort: nextSort, ...(nextAi ? { ai: JSON.stringify(nextAi) } : {}) });
  }
  async function searchWithAI(text) {
    cancelInterpretation();
    if (!text) { update(filters, '', sort, null); return; }
    const controller = new AbortController();
    interpretation.current = controller; setInterpreting(true);
    try {
      const result = await api('/search/interpret', { method: 'POST', body: { query: text }, signal: controller.signal });
      if (interpretation.current !== controller) return;
      update(filters, text, sort, result.conditions);
      setAiMessage(result.message);
    } catch (error) {
      if (error.name !== 'AbortError' && interpretation.current === controller) {
        update(filters, text, sort, null);
        setAiMessage('AI 해석 연결이 어려워 입력한 문구로 키워드 검색합니다.');
      }
    }
  }
  function toggle(field, value) {
    const current = filters[field] || [];
    const next = value === filterGroups[field].neutral ? [] : current.includes(value) ? current.filter(item => item !== value) : [...current, value];
    update({ ...filters, [field]: next });
  }
  function selectDistrict(region, district) {
    cancelInterpretation();
    setParams(previous => {
      const next = new URLSearchParams(previous);
      next.set('districts', JSON.stringify({ ...districts, [region]: districts[region] === district ? '' : district }));
      next.delete('page'); next.delete('pages');
      return next;
    });
  }
  function setPage(value, region) {
    cancelInterpretation();
    setParams(previous => {
      const next = new URLSearchParams(previous);
      if (region) next.set('pages', JSON.stringify({ ...pages, [region]: value }));
      else next.set('page', String(value));
      return next;
    });
  }
  const loading = state.key !== requestKey;
  const results = loading ? [] : state.results;
  const aiDescription = ai && typeof ai === 'object' ? [...(Array.isArray(ai.regions) ? ai.regions : []), ai.category, ai.experience, ai.work_mode,
    ai.salary_min != null ? `연봉 ${ai.salary_min}만원 이상` : '', ...(Array.isArray(ai.keywords) ? ai.keywords : [])].filter(value => typeof value === 'string' && value).join(' · ') : '';
  return { filters, regions, districts, selectDistrict, query, sort, results, setPage, searchWithAI, interpreting, aiMessage, aiDescription,
    total: results.reduce((count, result) => count + result.total, 0),
    companyCount: new Set(results.flatMap(result => result.company_ids)).size,
    loading, error: loading ? '' : state.error,
    toggle, reset: () => update(defaultFilters, '', 'latest', null), search: text => update(filters, text, sort, null),
    setSort: value => { cancelInterpretation(); setParams(previous => { const next = new URLSearchParams(previous); next.set('sort', value); next.delete('page'); next.delete('pages'); return next; }); },
    retry: () => setRevision(value => value + 1) };
}
