import { test, expect } from '@playwright/test';

test('추천검색어 8개는 입력만 변경하고 모든 필터와 현재 결과를 보존한다', async ({ page }) => {
  const filters = {
    region: ['부산', '서울'], category: ['IT·개발', '경영·사무'], education: ['대졸 이상'],
    experience: ['1~3년'], salary: ['5천만원 이상'], employment: ['정규직'],
    work_mode: ['하이브리드'], salary_type: ['연봉'], conditions: ['주5일'],
    company_type: ['중소기업'], industry: ['IT·정보통신'], requirements: ['관련전공'], benefits: ['건강검진'],
  };
  await page.goto(`/?${new URLSearchParams({ filters: JSON.stringify(filters), q: '플랫폼', sort: 'salary' })}`);
  await expect(page.locator('.job-card')).toHaveCount(2);
  await page.waitForLoadState('networkidle');
  const urlBefore = page.url();
  const selectedStates = () => page.locator('.filter-option').evaluateAll(elements => elements.map(element => [element.textContent, element.getAttribute('aria-pressed')]));
  const statesBefore = await selectedStates();
  const resultBefore = await page.locator('.job-card').allTextContents();
  let searchRequests = 0;
  page.on('request', request => { if (new URL(request.url()).pathname === '/api/jobs') searchRequests++; });
  const phrases = ['부산 신입 채용', '재택 가능한 일자리', '복지 좋은 중소기업', '면접 후기 좋은 회사', '경력무관 채용공고', '연봉 5천 이상 공고', '워라밸 좋은 기업', '야근 적은 회사'];
  for (const phrase of phrases) {
    await test.step(phrase, async () => {
      await page.locator('.suggestion-row button').filter({ hasText: phrase }).click();
      await expect(page.getByRole('textbox', { name: '공고 검색어' })).toHaveValue(phrase);
      await expect(page.getByRole('textbox', { name: '공고 검색어' })).toBeFocused();
      expect(await selectedStates()).toEqual(statesBefore);
      expect(page.url()).toBe(urlBefore);
      expect(await page.locator('.job-card').allTextContents()).toEqual(resultBefore);
      expect(searchRequests).toBe(0);
    });
  }
  // 추천 문구를 입력한 뒤에도 필터는 독립적으로 동작합니다.
  await page.getByRole('button', { name: '서울', exact: true }).click();
  await expect(page.getByRole('button', { name: '서울', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('textbox', { name: '공고 검색어' })).toHaveValue('야근 적은 회사');
  const updatedStates = await selectedStates();
  await page.getByRole('button', { name: '공고 검색', exact: true }).click();
  await expect(page.locator('.empty-results')).toHaveCount(1);
  expect(await selectedStates()).toEqual(updatedStates);
});
