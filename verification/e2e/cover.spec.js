import { test, expect } from '@playwright/test';

test('1920 화면의 장면별 시각 검증', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/intro');
  for (let chapter = 0; chapter < 4; chapter += 1) {
    await expect(page.locator('.cover-page')).toHaveAttribute('data-chapter', String(chapter));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `.cache/cover-scene-${chapter}.png` });
  }
  await page.getByRole('button', { name: '모션 일시정지' }).click();
  expect(errors).toEqual([]);
});

test('커버 자동 진입, API 준비와 메인에서 재노출 방지', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.cover-page')).toBeVisible();
  await expect(page.locator('.cover-server')).toContainText('서비스 연결 완료');
  await expect(page).toHaveURL(/\/main$/, { timeout: 20000 });
  await expect(page.locator('.job-card')).toHaveCount(5);
  await expect(page.getByRole('button', { name: /다시보기/ })).toHaveCount(0);
  await page.goto('/');
  await expect(page.locator('.cover-page')).toHaveCount(0);
});

test('커버 일시정지, 다시보기와 즉시 진입', async ({ page }) => {
  await page.goto('/intro');
  await page.getByRole('button', { name: '모션 일시정지' }).click();
  await expect(page.getByRole('button', { name: '모션 재생' })).toBeVisible();
  await page.getByRole('button', { name: '다시보기 ↻' }).click();
  await expect(page.locator('.cover-page')).toHaveAttribute('data-chapter', '0');
  await page.getByRole('button', { name: '서비스 바로가기 ↗' }).click();
  await expect(page).toHaveURL(/\/main$/);
  await expect(page.locator('.job-card')).toHaveCount(5);
});

test('모바일과 모션 감소 설정에서도 진입 가능', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/intro');
  await expect(page.locator('.cover-page')).toHaveAttribute('data-static', 'true');
  await expect(page.getByRole('button', { name: 'STARTIN 시작하기' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'STARTIN 시작하기' }).click();
  await expect(page).toHaveURL(/\/main$/);
});
