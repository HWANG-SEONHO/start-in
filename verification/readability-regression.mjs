import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// 정리 전 사본과 현재 코드를 같은 입력으로 실행해 결과가 달라지지 않았는지 검사합니다.
// 사용법: node verification/readability-regression.mjs <정리 전 프로젝트 폴더>
const baseline = process.argv[2];
assert.ok(baseline, '정리 전 프로젝트 폴더를 지정하세요.');
async function load(root, file, exports, mockHooks = false) {
  const path = resolve(root, file);
  const result = await build({
    stdin: { contents: readFileSync(path, 'utf8') + '\nexport { ' + exports + ' };', resolveDir: dirname(path), loader: 'jsx' },
    bundle: true, write: false, platform: 'node', format: 'cjs', jsx: 'automatic',
    define: { 'import.meta.env.VITE_API_BASE_URL': 'undefined' },
    loader: { '.css': 'empty' }, external: ['react', 'react/jsx-runtime', 'react-router-dom'],
    plugins: mockHooks ? [{ name: 'test-hooks', setup(plugin) {
      plugin.onResolve({ filter: /^(react|react-router-dom)$/ }, args => ({ path: args.path, namespace: 'test' }));
      plugin.onLoad({ filter: /.*/, namespace: 'test' }, args => ({ contents: args.path === 'react'
        ? 'export const useEffect=()=>{}; export const useRef=value=>({current:value}); export const useState=value=>[value,()=>{}];'
        : 'export const useSearchParams=()=>[globalThis.testParams, value=>{globalThis.testUpdated=typeof value === "function"?value(globalThis.testParams):value;}];' }));
    } }] : [],
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', result.outputFiles[0].text)(createRequire(import.meta.url), module, module.exports);
  return module.exports;
}
const oldApi = await load(baseline, 'src/services/api.js', 'normalizeDistricts');
const newApi = await load('.', 'src/services/api.js', 'normalizeDistricts');
const districtCases = [null, [], {}, { 부산: '해운대구' }, { 부산: ['', '수영구', '수영구', 1, null] }, { 부산: [...Array(30).fill('해운대구'), '수영구'] }, Object.fromEntries(Array.from({length:20}, (_,i)=>['지역'+i,['구']]))];
for (const input of districtCases) assert.deepEqual(newApi.normalizeDistricts(input), oldApi.normalizeDistricts(input));
for (const detail of ['서버 설명', [], [{msg:'invalid'}], null, 42]) {
  for (const path of ['/jobs', '/auth/login']) {
    globalThis.fetch = async () => ({ ok: false, status: 422, json: async () => ({detail}) });
    const outcome = async api => { try { await api.api(path); } catch(error) { return [error.message,error.status]; } };
    assert.deepEqual(await outcome(newApi), await outcome(oldApi));
  }
}
const hookExports = 'readFilters, readDistricts, readRegionPages, readRegionSorts, readAiConditions';
const oldHook = await load(baseline, 'src/hooks/useJobSearch.js', hookExports, true);
const newHook = await load('.', 'src/hooks/useJobSearch.js', hookExports, true);
for (const raw of ['', '{bad', 'null', '[]', '{}', '{"부산":"해운대구"}', '{"부산":["", "수영구", "수영구", 1]}']) {
  const params = new URLSearchParams({filters:raw,districts:raw,pages:raw,regionSorts:raw,ai:raw});
  for(const name of hookExports.split(', ')) assert.deepEqual(newHook[name](params), oldHook[name](params));
}
function action(module, name, args, home = true) {
  globalThis.testParams = new URLSearchParams({ filters: JSON.stringify({region:['부산','서울'],education:['대졸 이상']}), districts:JSON.stringify({부산:['수영구']}), pages:JSON.stringify({부산:2,서울:3}) });
  globalThis.testUpdated = null;
  const hook = module.useJobSearch({home});
  hook[name](...args);
  return globalThis.testUpdated?.toString?.() === '[object Object]' ? JSON.stringify(globalThis.testUpdated) : String(globalThis.testUpdated);
}
for(const [name,args] of [['toggle',['region','부산']],['toggle',['region','경기']],['toggle',['education','무관']],['selectDistrict',['부산','해운대구',{multiple:true}]],['selectDistrict',['부산','수영구']],['setSort',['salary','서울']],['setPage',[4,'서울']],['reset',[]],['search',['Python']]]) {
  assert.equal(action(newHook,name,args),action(oldHook,name,args));
}
const oldCard = await load(baseline, 'src/components/JobCard.jsx', 'CompanyLogo');
const newCard = await load('.', 'src/components/JobCard.jsx', 'CompanyLogo');
for(const company of ['네이버','카카오','LINE PLUS','LG전자','현대자동차','데모기업','toString','__proto__','']) {
  const markup = module => renderToStaticMarkup(React.createElement(module.CompanyLogo,{company}));
  assert.equal(markup(newCard),markup(oldCard));
}
console.log('PASS: 원본 대비 구·군 입력 정리, API 오류, URL 복원, 필터/지도/정렬/페이지 동작, 회사 로고 일치');
