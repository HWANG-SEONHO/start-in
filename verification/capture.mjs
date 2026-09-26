import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve('.cache/ms-playwright');
const { chromium } = await import('@playwright/test');

// 개발 서버 실행 후 1920×1080 화면과 레이아웃 검사 결과를 저장합니다.
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
await page.screenshot({ path: 'verification/startin-1920x1080.png', fullPage: true });
const layout = await page.evaluate(() => {
  const rect = selector => {
    const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
    return { x, y, width, height };
  };
  const headerButtons = [...document.querySelectorAll('.header-nav button')];
  const overflowing = [...document.querySelectorAll('body *')].filter(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.width && (bounds.right > innerWidth + 1 || bounds.left < -1);
  }).map(element => element.className?.baseVal ?? element.className);
  const clippedText = [...document.querySelectorAll('h1,h2,h3,p,.filter-option,.job-tags,.search-placeholder')]
    .filter(element => element.scrollWidth > element.clientWidth + 1)
    .map(element => ({ className: element.className, text: element.textContent }));
  return {
    viewport: { width: innerWidth, height: innerHeight },
    document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    headerOneLine: new Set(headerButtons.map(element => Math.round(element.getBoundingClientRect().y))).size === 1,
    hero: rect('.hero-background'),
    searchPanel: rect('.ai-search-panel'),
    filter: rect('.filter-panel'),
    map: rect('.map-section'),
    jobs: rect('.job-list-section'),
    jobCount: document.querySelectorAll('.job-card').length,
    overflowing,
    clippedText,
    imagesLoaded: [...document.images].every(image => image.complete && image.naturalWidth > 0),
  };
});
const result = { ...layout, errors };
await writeFile('verification/layout-check.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
await browser.close();
