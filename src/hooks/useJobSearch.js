// 이 파일은 채용검색 화면의 "검색 두뇌"입니다.
// URL에 적힌 조건을 읽고 → FastAPI에 공고를 요청하고 → 결과/정렬/페이지/지도 선택을 관리합니다.
// 중요한 생각: 검색 상태를 URL에 넣어두면 새로고침하거나 뒤로 가도 같은 조건을 다시 만들 수 있습니다.

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { defaultFilters, filterGroups } from '../data/filters';
import { api, getJobs } from '../services/api';

const VALID_SORTS = ['latest', 'salary', 'size'];

// page=abc처럼 이상한 값이 와도 화면이 깨지지 않게 1페이지로 고칩니다.
function validPage(value) {
  const pageNumber = Number(value);
  return Number.isSafeInteger(pageNumber) && pageNumber > 0 ? pageNumber : 1;
}

// filters라는 URL 값을 안전하게 읽습니다.
function readFilters(params) {
  try {
    const parsed = params.has('filters')
      ? JSON.parse(params.get('filters'))
      : defaultFilters;

    return Object.fromEntries(
      Object.entries(parsed)
        // 우리 사이트가 실제로 아는 필터만 남깁니다.
        .filter(([key]) => key in filterGroups)
        .map(([key, values]) => [
          key,
          Array.isArray(values)
            ? values.filter(value => (
              filterGroups[key].options.includes(value)
              && value !== filterGroups[key].neutral
            ))
            : [],
        ]),
    );
  } catch {
    // URL의 JSON이 망가졌다면 기본 필터로 돌아갑니다.
    return defaultFilters;
  }
}

// 지도에서 선택한 "지역 → 구·군 여러 개" 정보를 읽습니다.
function readDistricts(params) {
  try {
    const raw = JSON.parse(params.get('districts') || '{}');
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};

    return Object.fromEntries(
      Object.entries(raw)
        .filter(([region]) => filterGroups.region.options.includes(region))
        .map(([region, value]) => {
          // 옛 주소의 구 이름 하나도 배열로 바꿔, 복수 선택과 같은 흐름으로 읽습니다.
          let values = [];
          if (Array.isArray(value)) values = value;
          else if (typeof value === 'string' && value) values = [value];

          // 중복을 없애고, 너무 긴 값이나 너무 많은 값은 잘라냅니다.
          const safeValues = [...new Set(
            values.filter(district => typeof district === 'string' && district.length <= 40),
          )].slice(0, 30);

          return [region, safeValues];
        })
        .filter(([, values]) => values.length),
    );
  } catch {
    return {};
  }
}

// 메인 화면은 도시마다 페이지 번호가 다를 수 있으므로 { 부산: 1, 서울: 2 }처럼 읽습니다.
function readRegionPages(params) {
  try {
    const parsed = JSON.parse(params.get('pages') || '{}');
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([region]) => filterGroups.region.options.includes(region))
        .map(([region, page]) => [region, validPage(page)]),
    );
  } catch {
    return {};
  }
}

// 메인 화면의 도시별 정렬 상태를 읽습니다.
function readRegionSorts(params) {
  try {
    const parsed = JSON.parse(params.get('regionSorts') || '{}');
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([region, value]) => (
          filterGroups.region.options.includes(region)
          && VALID_SORTS.includes(value)
        )),
    );
  } catch {
    return {};
  }
}

// AI가 해석해 둔 검색조건도 URL에서 복원합니다.
function readAiConditions(params) {
  try {
    return params.has('ai') ? JSON.parse(params.get('ai')) : null;
  } catch {
    return null;
  }
}

export function useJobSearch({ home = false } = {}) {
  // useSearchParams는 현재 URL의 ?뒤 값을 React에서 읽고 바꾸게 해줍니다.
  const [params, setParams] = useSearchParams();

  // ---- 1. 현재 URL → 화면이 사용할 검색 상태로 바꾸기 ----
  const filters = readFilters(params);
  const query = (params.get('q') || '').slice(0, 200);
  const ai = readAiConditions(params);
  const districts = readDistricts(params);
  const pages = readRegionPages(params);
  const page = validPage(params.get('page'));
  const sort = VALID_SORTS.includes(params.get('sort')) ? params.get('sort') : 'latest';
  const regionSorts = readRegionSorts(params);
  const regions = filters.region?.length ? filters.region : filterGroups.region.options;

  // ---- 2. AI 검색을 해석하는 동안 필요한 작은 상태 ----
  const [interpreting, setInterpreting] = useState(false);
  const [aiMessage, setAiMessage] = useState('');
  const interpretationRequest = useRef(null);

  // 화면이 사라질 때 아직 진행 중인 AI 요청이 있으면 취소합니다.
  useEffect(() => () => interpretationRequest.current?.abort(), []);

  // retry를 누르면 revision 숫자가 바뀌어 같은 조건도 다시 요청됩니다.
  const [revision, setRevision] = useState(0);

  // 마지막으로 성공한 결과를 보관합니다.
  const [state, setState] = useState({
    results: [],
    error: '',
    key: '',
    regions: [],
  });

  // 아래 값 중 하나라도 바뀌면 "새 검색 요청"이라고 판단할 수 있는 열쇠입니다.
  const requestKey = JSON.stringify({
    filters,
    query,
    sort,
    regionSorts,
    districts,
    pages,
    page,
    home,
    revision,
    ai,
  });

  // ---- 3. 검색조건이 바뀔 때 FastAPI에서 공고 가져오기 ----
  useEffect(() => {
    const controller = new AbortController();
    const request = JSON.parse(requestKey);
    const selectedRegions = request.filters.region?.length
      ? request.filters.region
      : filterGroups.region.options;

    // 메인 화면은 부산/서울처럼 지역별 카드가 따로 있으므로 지역마다 요청을 하나씩 만듭니다.
    // /jobs 일반 화면은 전체 결과 하나만 요청합니다.
    const requests = request.home
      ? selectedRegions.map(region => getJobs({
          ...request,
          sort: request.regionSorts[region] || request.sort,
          filters: { ...request.filters, region: [region] },
          districts: request.districts[region]
            ? { [region]: request.districts[region] }
            : {},
          page: request.pages[region] || 1,
          pageSize: 5,
          signal: controller.signal,
        }))
      : [getJobs({ ...request, pageSize: 10, signal: controller.signal })];

    Promise.all(requests)
      .then(results => {
        setState({
          results,
          error: '',
          key: requestKey,
          regions: selectedRegions,
        });
      })
      .catch(error => {
        // 새 검색 때문에 이전 요청을 취소한 AbortError는 사용자에게 오류로 보여주지 않습니다.
        if (error.name !== 'AbortError') {
          setState({ results: [], error: error.message, key: requestKey, regions: [] });
        }
      });

    // 조건이 또 바뀌면 이전 요청을 취소해 오래된 결과가 늦게 덮어쓰지 못하게 합니다.
    return () => controller.abort();
  }, [requestKey]);

  // AI 해석 요청을 멈추고 관련 표시도 초기화합니다.
  function cancelInterpretation() {
    interpretationRequest.current?.abort();
    interpretationRequest.current = null;
    setInterpreting(false);
    setAiMessage('');
  }

  // 검색 상태를 URL에 저장하는 공통 함수입니다.
  function updateSearchParams(
    nextFilters,
    nextQuery = query,
    nextSort = sort,
    nextAi = ai,
    nextRegionSorts = regionSorts,
  ) {
    cancelInterpretation();

    setParams({
      filters: JSON.stringify(nextFilters),
      ...(nextQuery ? { q: nextQuery } : {}),
      sort: nextSort,
      ...(Object.keys(nextRegionSorts).length
        ? { regionSorts: JSON.stringify(nextRegionSorts) }
        : {}),
      ...(nextAi ? { ai: JSON.stringify(nextAi) } : {}),
    }, { preventScrollReset: true });
  }

  // 자연어 검색문장을 FastAPI의 AI 해석 API로 보냅니다.
  async function searchWithAI(text) {
    cancelInterpretation();

    // 빈 검색어면 일반 검색 상태로 돌아갑니다.
    if (!text) {
      updateSearchParams(filters, '', sort, null);
      return;
    }

    const controller = new AbortController();
    interpretationRequest.current = controller;
    setInterpreting(true);

    try {
      const result = await api('/search/interpret', {
        method: 'POST',
        body: { query: text },
        signal: controller.signal,
      });

      // 이 요청 뒤에 더 최신 요청이 시작됐다면 오래된 답은 무시합니다.
      if (interpretationRequest.current !== controller) return;

      updateSearchParams(filters, text, sort, result.conditions);
      setAiMessage(result.message);
    } catch (error) {
      // AI만 실패해도 검색 전체를 막지 않고 평범한 키워드 검색으로 바꿉니다.
      if (error.name !== 'AbortError' && interpretationRequest.current === controller) {
        updateSearchParams(filters, text, sort, null);
        setAiMessage('AI 해석 연결이 어려워 입력한 문구로 키워드 검색합니다.');
      }
    }
  }

  // 필터 버튼 하나를 켜거나 끕니다.
  function toggleFilter(field, value) {
    const currentValues = filters[field] || [];

    // neutral(예: "무관", "전체")을 누르면 그 항목의 제한을 모두 지웁니다.
    // 무관이면 모두 비우고, 이미 고른 값이면 빼고, 새 값이면 더합니다.
    // 이렇게 만든 목록을 URL에 저장하면 화면과 다음 검색이 같은 조건을 사용합니다.
    let nextValues;
    if (value === filterGroups[field].neutral) {
      nextValues = [];
    } else if (currentValues.includes(value)) {
      nextValues = currentValues.filter(item => item !== value);
    } else {
      nextValues = [...currentValues, value];
    }

    updateSearchParams({ ...filters, [field]: nextValues });
  }

  // 지도/목록에서 구·군을 선택합니다.
  function selectDistrict(region, district, { multiple = false } = {}) {
    cancelInterpretation();

    setParams(previous => {
      const nextParams = new URLSearchParams(previous);
      const nextDistricts = readDistricts(previous);
      const currentDistricts = nextDistricts[region] || [];
      let selectedDistricts;

      if (!district) {
        selectedDistricts = [];
      } else if (multiple) {
        // 목록 모드는 여러 구·군을 동시에 체크할 수 있습니다.
        selectedDistricts = currentDistricts.includes(district)
          ? currentDistricts.filter(item => item !== district)
          : [...currentDistricts, district];
      } else {
        // 지도 마커는 같은 곳을 다시 누르면 선택 해제, 다른 곳을 누르면 하나만 선택합니다.
        selectedDistricts = currentDistricts.length === 1 && currentDistricts[0] === district
          ? []
          : [district];
      }

      if (selectedDistricts.length) nextDistricts[region] = selectedDistricts;
      else delete nextDistricts[region];

      nextParams.set('districts', JSON.stringify(nextDistricts));
      // 조건이 달라졌으니 페이지는 다시 첫 페이지부터 봅니다.
      nextParams.delete('page');
      nextParams.delete('pages');
      return nextParams;
    }, { preventScrollReset: true });
  }

  // 일반 목록 또는 특정 지역 카드의 페이지를 바꿉니다.
  function setPage(nextPage, region) {
    cancelInterpretation();

    setParams(previous => {
      const nextParams = new URLSearchParams(previous);

      if (region) {
        const currentPages = readRegionPages(previous);
        nextParams.set('pages', JSON.stringify({ ...currentPages, [region]: nextPage }));
      } else {
        nextParams.set('page', String(nextPage));
      }

      return nextParams;
    }, { preventScrollReset: true });
  }

  // 정렬 방법을 바꿉니다.
  function setSort(nextSort, region) {
    if (!VALID_SORTS.includes(nextSort)) return;
    cancelInterpretation();

    setParams(previous => {
      const nextParams = new URLSearchParams(previous);

      if (home && region) {
        const currentRegionSorts = readRegionSorts(previous);
        const currentPages = readRegionPages(previous);
        nextParams.set('regionSorts', JSON.stringify({ ...currentRegionSorts, [region]: nextSort }));
        nextParams.set('pages', JSON.stringify({ ...currentPages, [region]: 1 }));
      } else {
        nextParams.set('sort', nextSort);
        nextParams.delete('page');
      }

      return nextParams;
    }, { preventScrollReset: true });
  }

  // ---- 4. 화면에 보여줄 최종 상태 만들기 ----
  const loading = state.key !== requestKey;

  // 새 결과를 기다리는 동안 기존 결과의 높이를 유지해 스크롤이 맨 위로 튀지 않게 합니다.
  const refreshingSort = loading && state.results.length > 0;
  // 첫 요청에는 빈 목록, 다시 검색할 때는 직전 목록을 보여줘 화면 높이를 유지합니다.
  let results = state.results;
  if (loading && !refreshingSort) results = [];
  const displayRegions = refreshingSort && state.regions.length ? state.regions : regions;

  // AI가 해석한 조건을 사용자가 읽을 수 있는 한 줄 설명으로 바꿉니다.
  const aiDescription = ai && typeof ai === 'object'
    ? [
        ...(Array.isArray(ai.regions) ? ai.regions : []),
        ai.category,
        ai.experience,
        ai.work_mode,
        ai.salary_min != null ? `연봉 ${ai.salary_min}만원 이상` : '',
        ...(Array.isArray(ai.keywords) ? ai.keywords : []),
      ]
        .filter(value => typeof value === 'string' && value)
        .join(' · ')
    : '';

  // 이 hook을 쓰는 SearchPage가 필요한 값과 함수만 한 묶음으로 돌려줍니다.
  return {
    filters,
    regions: displayRegions,
    districts,
    selectDistrict,
    query,
    sort,
    regionSorts,
    results,
    setPage,
    searchWithAI,
    interpreting,
    aiMessage,
    aiDescription,
    total: results.reduce((count, result) => count + result.total, 0),
    companyCount: new Set(results.flatMap(result => result.company_ids)).size,
    loading,
    refreshingSort,
    error: loading ? '' : state.error,
    toggle: toggleFilter,
    reset: () => updateSearchParams(defaultFilters, '', 'latest', null, {}),
    search: text => updateSearchParams(filters, text, sort, null),
    setSort,
    retry: () => setRevision(value => value + 1),
  };
}
