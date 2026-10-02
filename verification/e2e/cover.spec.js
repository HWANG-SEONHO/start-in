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
  await expect(page).toHaveURL(/\/main$/, { timeout: 25000 });
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
  await expect(page.locator('.intro-route-transition')).toHaveClass(/closing/);
  await expect(page).toHaveURL(/\/main$/);
  await expect(page.locator('.intro-route-transition')).toHaveClass(/opening/);
  await page.screenshot({ path: '.cache/intro-main-transition.png' });
  await expect(page.locator('.intro-route-transition')).toHaveCount(0);
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

test('슬로우 배속과 타임라인 검수에서는 자동 이동하지 않음', async ({ page }) => {
  await page.goto('/intro');
  await page.getByLabel('모션 배속').selectOption('0.25');
  await expect(page.getByLabel('모션 배속')).toHaveValue('0.25');
  await page.getByLabel('모션 재생 위치').fill('14.8');
  await expect(page.getByLabel('검수', { exact: true })).toBeChecked();
  await expect(page.getByRole('button', { name: '모션 재생', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '모션 재생', exact: true }).click();
  await expect(page.getByLabel('모션 재생 위치')).toHaveValue('15');
  await expect(page.getByRole('button', { name: '모션 재생', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/intro$/);
  await expect(page.locator('.cover-controls')).toContainText('자동 이동 꺼짐');
});

test('서비스 창은 한 카메라로 투영되고 마지막에 정면으로 정렬됨', async ({ page }) => {
  await page.goto('/intro');
  await page.getByLabel('모션 재생 위치').fill('12.5');
  await page.screenshot({ path: '.cache/intro-window-perspective.png' });
  await page.getByLabel('모션 재생 위치').fill('14.8');
  await page.screenshot({ path: '.cache/intro-window-front.png' });
  const camera = await page.locator('.cover-finale').evaluate(element => getComputedStyle(element).perspective);
  expect(camera).toBe('2000px');
  const matrix = await page.locator('.cover-browser').evaluate(element => new DOMMatrix(getComputedStyle(element).transform).toString());
  expect(matrix).toBe('matrix(1, 0, 0, 1, 0, 0)');
});

test('파란 장면은 흰색 제목이며 조건 창도 정면으로 돌아옴', async ({ page }) => {
  await page.goto('/intro');
  await page.getByLabel('모션 재생 위치').fill('6.3');
  await page.screenshot({ path: '.cache/intro-command-front.png' });
  const color = await page.locator('.cover-define h2 .cover-letters').last().evaluate(element => getComputedStyle(element).color);
  expect(color).toBe('rgb(255, 255, 255)');
  expect(await page.locator('.cover-header').evaluate(element => getComputedStyle(element).mixBlendMode)).toBe('normal');
  expect(await page.locator('.cover-footer').evaluate(element => getComputedStyle(element).mixBlendMode)).toBe('normal');
  const matrix = await page.locator('.cover-command').evaluate(element => new DOMMatrix(getComputedStyle(element).transform).toString());
  expect(matrix).toBe('matrix(1, 0, 0, 1, 0, 0)');
});

test('상단 등록 표식과 NEXT 배경의 가독성', async ({ page }) => {
  await page.goto('/intro');
  await page.getByLabel('모션 재생 위치').fill('1.5');
  await page.screenshot({ path: '.cache/intro-opening-legibility.png' });
  expect(await page.locator('.cover-header > b > span').evaluate(element => getComputedStyle(element).fontSize)).toBe('17px');
  const alpha = await page.locator('.cover-ghost').evaluate(element => Number(getComputedStyle(element).color.match(/[\d.]+/g).at(-1)));
  expect(alpha).toBeCloseTo(.15, 2);
});
