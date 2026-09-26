import { test, expect } from '@playwright/test';

test('AI 조건 → DB 검색, 필터 독립성, URL 복원과 키 없음 fallback', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.job-card')).toHaveCount(5);
  const selected = () => page.locator('.filter-option').evaluateAll(elements => elements.map(el => el.getAttribute('aria-pressed')));
  const before = await selected();
  await page.route('**/api/search/interpret', route => route.fulfill({ json: {
    mode: 'ai', conditions: { regions: ['부산'], category: 'IT·개발', experience: '신입', work_mode: null, salary_min: 4000, keywords: ['Python'] }, message: '조건 해석 완료',
  } }));
  await page.getByRole('textbox', { name: '공고 검색어' }).fill('부산 신입 Python 개발직 연봉 4000 이상');
  await page.getByRole('button', { name: '공고 검색', exact: true }).click();
  await expect(page.locator('.job-card')).toHaveCount(1);
  await expect(page.locator('.search-guidance')).toContainText('AI 해석: 부산');
  expect(await selected()).toEqual(before);
  await page.reload();
  await expect(page.locator('.job-card')).toHaveCount(1);
  await expect(page.locator('.search-guidance')).toContainText('4000만원');
  await page.getByRole('link', { name: '공고 목록에서 보기' }).click();
  await expect(page.locator('.job-card')).toHaveCount(1);
  await expect(page.locator('.demo-notice')).toContainText('AI 해석');
  await page.goto('/');
  await page.unroute('**/api/search/interpret');
  await page.getByRole('textbox', { name: '공고 검색어' }).fill('Python');
  await page.getByRole('button', { name: '공고 검색', exact: true }).click();
  await expect(page.locator('.search-guidance')).toContainText('키워드 검색');
  await expect(page.locator('.job-card').first()).toBeVisible();
  expect(new URL(page.url()).searchParams.has('ai')).toBe(false);
});
