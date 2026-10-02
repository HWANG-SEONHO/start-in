import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('startin-cover-seen', '1'));
});

test('빠른 지역 연속 선택 후 전국 17개 지역도 멈추지 않는다', async ({ page }) => {
  let active = 0;
  let peak = 0;
  await page.route('**/api/jobs?**', async route => {
    active += 1;
    peak = Math.max(peak, active);
    try {
      const response = await route.fetch();
      await new Promise(resolve => setTimeout(resolve, 60));
      await route.fulfill({ response });
    } finally {
      active -= 1;
    }
  });
  await page.goto('/');
  await expect(page.locator('.job-card')).toHaveCount(5);
  for (const region of ['서울', '경기', '인천', '대구', '광주', '대전']) {
    await page.getByRole('button', { name: region, exact: true }).click();
  }
  await expect(page.locator('.results-layout')).toHaveCount(7);
  await expect(page.locator('.request-status[role="alert"]')).toHaveCount(0);
  // 비워진 지역 선택은 기존 설계대로 전국을 조회합니다.
  await page.goto('/?filters=%7B%7D');
  await expect(page.locator('.results-layout')).toHaveCount(17, { timeout: 25000 });
  await expect(page.locator('.job-card')).toHaveCount(85);
  expect(peak).toBeLessThanOrEqual(2);
  await page.reload();
  await expect(page.locator('.results-layout')).toHaveCount(17, { timeout: 25000 });
});
