import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { defaultFilters, filterGroups, sortRegions } from '../src/data/filters.js';

const expectedOrder = ['서울', '경기', '인천', '강원', '대전', '세종', '충북', '충남', '광주', '전북', '전남', '대구', '경북', '부산', '울산', '경남', '제주'];
assert.deepEqual(filterGroups.region.options, expectedOrder);
assert.deepEqual(sortRegions([...expectedOrder].reverse()), expectedOrder);
assert.deepEqual(defaultFilters.region, ['서울']);
assert.deepEqual(sortRegions(['부산', '경기', '서울', '부산', '없는 지역']), ['서울', '경기', '부산']);

// 실제 검색 hook에 URL과 API 응답을 넣어 지역/결과가 함께 정렬되는지 확인합니다.
const bundled = await build({
  stdin: {
    contents: readFileSync('src/hooks/useJobSearch.js', 'utf8') + '\nexport { readFilters };',
    resolveDir: fileURLToPath(new URL('../src/hooks/', import.meta.url)),
  },
  bundle: true, write: false, platform: 'node', format: 'cjs',
  plugins: [{ name: 'mock-search', setup(plugin) {
    plugin.onResolve({ filter: /^(react|react-router-dom)$|services\/api$/ }, args => ({ path: args.path, namespace: 'mock' }));
    plugin.onLoad({ filter: /.*/, namespace: 'mock' }, args => ({ contents:
      args.path === 'react'
        ? 'export const useEffect = effect => globalThis.effects.push(effect); export const useRef = value => ({current:value}); export const useState = value => [value, next => {if (next?.results) globalThis.searchResult = next;}];'
        : args.path === 'react-router-dom'
          ? 'export const useSearchParams = () => [globalThis.params, next => {globalThis.updated = next;}];'
          : 'export const api = async () => ({}); export const getJobs = async request => { const region = request.filters.region[0]; globalThis.requests.push(region); return {region, items:[], total:1, company_ids:[]}; };',
    }));
  } }],
});
const module = { exports: {} };
new Function('require', 'module', 'exports', bundled.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
const { readFilters, useJobSearch } = module.exports;

assert.deepEqual(readFilters(new URLSearchParams()).region, ['서울']);
assert.deepEqual(readFilters(new URLSearchParams({ filters: '{bad' })).region, ['서울']);
assert.deepEqual(readFilters(new URLSearchParams({ filters: JSON.stringify({ region: ['부산', '서울'], education: ['대졸 이상'] }) })), { region: ['서울', '부산'], education: ['대졸 이상'] });

for (const selected of [['부산', '서울'], ['경남', '광주', '경기', '대구', '강원'], [...expectedOrder].reverse(), [], ['부산']]) {
  globalThis.params = new URLSearchParams({ filters: JSON.stringify({ region: selected }) });
  globalThis.effects = [];
  globalThis.requests = [];
  globalThis.searchResult = null;
  const search = useJobSearch({ home: true });
  const expected = selected.length ? sortRegions(selected) : filterGroups.region.options;
  assert.deepEqual(search.regions, expected);
  const cleanup = globalThis.effects.map(effect => effect());
  await new Promise(resolve => setTimeout(resolve, 350));
  assert.deepEqual(globalThis.requests, expected);
  assert.deepEqual(globalThis.searchResult.regions, expected);
  assert.deepEqual(globalThis.searchResult.results.map(result => result.region), expected);
  cleanup.forEach(dispose => dispose?.());
  if (selected.length === 1) {
    search.toggle('region', '서울');
    assert.deepEqual(JSON.parse(globalThis.updated.filters).region, ['서울', '부산']);
  }
  search.reset();
  assert.deepEqual(JSON.parse(globalThis.updated.filters).region, ['서울']);
}
console.log('PASS: 권역별 필터 순서, 기존 URL, 다중 선택, 전체 지역, API 결과 대응, 초기화');
