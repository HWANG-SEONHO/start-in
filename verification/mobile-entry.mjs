// 주소 준비만 검사합니다. 화면·API 검사는 UI_REVIEW_20261007.md에 따로 기록합니다.
import assert from 'node:assert/strict';
import { prepareMobileEntry } from '../src/services/mobileEntry.js';

function check(url, phone, expectedPath, expectedBase) {
  const location = new URL(url);
  let mobile = false;
  globalThis.window = {
    location,
    matchMedia: () => ({ matches: phone }),
    history: { replaceState: (_, __, path) => { location.href = new URL(path, location).href; } },
  };
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { maxTouchPoints: phone ? 1 : 0, userAgent: phone ? 'iPhone' : 'Desktop' } });
  globalThis.document = { documentElement: { classList: { toggle: (_, value) => { mobile = value; } } } };
  assert.equal(prepareMobileEntry(), expectedBase);
  assert.equal(location.pathname + location.search + location.hash, expectedPath);
  assert.equal(mobile, expectedBase === '/m' || location.hostname.startsWith('m.'));
}

check('https://example.com/', false, '/', '/');
check('https://example.com/', true, '/m/main', '/m');
check('https://example.com/jobs?q=design#list', true, '/m/jobs?q=design#list', '/m');
check('https://example.com/m', false, '/m/main', '/m');
check('https://example.com/m/', true, '/m/main', '/m');
check('https://example.com/m/my?tab=resume', true, '/m/my?tab=resume', '/m');
check('https://m.example.com/', true, '/main', '/');
console.log('모바일 주소 7개 사례 통과');
