import { test, expect } from '@playwright/test';

test('최신본: 다중 지역, URL 복원과 상세 이동', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('.job-card')).toHaveCount(5);
  await page.getByRole('button', { name: '서울', exact: true }).click();
  await expect(page.locator('.results-layout')).toHaveCount(2);
  await expect(page.locator('[data-region="서울"] .job-card')).toHaveCount(5);
  await page.reload();
  await expect(page.getByRole('button', { name: '서울', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('[data-region="부산"] .job-description a').first().click();
  await expect(page.locator('.job-facts')).toBeVisible();
  expect(errors).toEqual([]);
});

test('최신본: 공고 1000개 페이지 이동과 기업 150개', async ({ page }) => {
  await page.goto('/jobs?filters=%7B%7D');
  await expect(page.locator('.job-list-title-group')).toContainText('1,000건');
  await expect(page.locator('.job-card')).toHaveCount(10);
  const first = await page.locator('.job-description a').first().getAttribute('href');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.locator('.pagination')).toContainText('2 / 100');
  expect(await page.locator('.job-description a').first().getAttribute('href')).not.toBe(first);
  await page.reload();
  await expect(page.locator('.pagination')).toContainText('2 / 100');
  await page.goto('/companies');
  await expect(page.locator('.company-directory > a')).toHaveCount(150);
});

test('최신본: 가입 후 MY와 이력서 탭 진입', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('이름', { exact: true }).fill('검증 사용자');
  await page.getByLabel('이메일', { exact: true }).fill(`latest-${Date.now()}@example.com`);
  await page.getByLabel('비밀번호', { exact: true }).fill('latest-test-password-123');
  await page.getByRole('button', { name: '가입하기' }).click();
  await expect(page).not.toHaveURL(/\/register$/);
  await page.goto('/my?tab=resume');
  await expect(page.getByRole('heading', { name: '내 이력서' })).toBeVisible();
  await expect(page.getByText('등록된 이력서가 없습니다.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '내 이력서' })).toBeVisible();
});
