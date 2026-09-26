import { test, expect } from '@playwright/test';

test('MY PDF 업로드, 다운로드, 새로고침, 교체, 삭제', async ({ page }) => {
  await page.goto('/register');
  await page.getByLabel('이름', { exact: true }).fill('이력서 사용자');
  await page.getByLabel('이메일', { exact: true }).fill(`resume-${Date.now()}@example.com`);
  await page.getByLabel('비밀번호', { exact: true }).fill('resume-password-123');
  await page.getByRole('button', { name: '가입하기' }).click();
  await expect(page).toHaveURL(/\/my$/);
  await page.getByRole('button', { name: '이력서', exact: true }).click();
  const buffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
  await page.getByLabel('PDF 이력서').setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer });
  await page.getByRole('button', { name: '이력서 업로드', exact: true }).click();
  await expect(page.locator('.resume-current')).toContainText('resume.pdf');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: '현재 PDF 다운로드' }).click();
  expect((await download).suggestedFilename()).toBe('resume.pdf');
  await page.reload();
  await expect(page.locator('.resume-current')).toContainText('resume.pdf');
  await page.getByLabel('PDF 이력서').setInputFiles({ name: 'new.pdf', mimeType: 'application/pdf', buffer });
  await page.getByRole('button', { name: '선택한 PDF로 교체' }).click();
  await expect(page.locator('.resume-current')).toContainText('new.pdf');
  await page.getByRole('button', { name: '이력서 삭제', exact: true }).click();
  await page.getByRole('button', { name: '삭제 확인', exact: true }).click();
  await expect(page.locator('.resume-panel')).toContainText('등록된 이력서가 없습니다.');
});
