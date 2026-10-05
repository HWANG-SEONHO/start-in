import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const browser = await chromium.launch({channel:'msedge',headless:true});
const page = await browser.newPage({viewport:{width:1920,height:1080}});
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.route('**/api/**', route => route.fulfill({status:503,json:{}}));
try {
  const params = new URLSearchParams({
    filters:JSON.stringify({region:['부산','서울'],category:['IT·개발']}),
    q:'개발',sort:'salary',districts:JSON.stringify({부산:['해운대구']}),
    ai:JSON.stringify({category:['IT·개발']}),pages:JSON.stringify({부산:3}),
    regionSorts:JSON.stringify({부산:'salary'}),
  });
  await page.goto(`http://127.0.0.1:5173/main?${params}`);
  await page.getByRole('button',{name:'재택근무',exact:true}).first().click();
  const selected = await page.locator('.filter-option[aria-pressed="true"]').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label')));
  const mainParams = new URL(page.url()).searchParams;
  await page.locator('.header-nav').getByRole('button',{name:'채용공고',exact:true}).click();
  assert.equal(new URL(page.url()).pathname,'/jobs');
  const jobParams = new URL(page.url()).searchParams;
  for(const key of ['filters','q','sort','districts','ai']) assert.equal(jobParams.get(key),mainParams.get(key),key);
  for(const key of ['pages','page','regionSorts']) assert.equal(jobParams.has(key),false,key);
  assert.deepEqual(await page.locator('.filter-option[aria-pressed="true"]').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label'))),selected);
  await page.reload();
  assert.deepEqual(await page.locator('.filter-option[aria-pressed="true"]').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label'))),selected);
  const jobsUrl=page.url();
  await page.locator('.header-nav').getByRole('button',{name:'채용공고',exact:true}).click();
  assert.equal(page.url(),jobsUrl);
  await page.locator('.header-nav').getByRole('button',{name:'기업정보',exact:true}).click();
  await page.locator('.header-nav').getByRole('button',{name:'채용공고',exact:true}).click();
  assert.equal(page.url(),jobsUrl);
  assert.deepEqual(errors,[]);
  console.log('PASS: 메인 선택조건·검색어·구군·정렬·AI 유지, 목록 페이지 초기화, 새로고침·메뉴 재클릭·다른 메뉴 경유');
} finally { await browser.close(); }
