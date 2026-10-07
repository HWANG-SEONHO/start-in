import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

process.env.PLAYWRIGHT_BROWSERS_PATH ||= resolve('.cache/ms-playwright');
await mkdir('.cache/robot-bundle-review', { recursive: true });
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
const baselineStates = new Map();

try {
  for (const [name, port] of [['baseline', 4176], ['split', 4175]]) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => requests.push(request.url()));
    // DB·운영 서버 상태와 무관하게 배포 번들의 3D 동작을 확인합니다.
    await page.route('**/api/**', route => route.fulfill({ status: 503, json: { detail: 'Local bundle verification' } }));
    await page.goto(`http://127.0.0.1:${port}/main`);
    await page.locator('.brand-wordmark').first().waitFor();
    assert(!requests.some(url => /three-|IntroRobot3D|cute-home-robot\.glb/.test(url)), '메인에서 3D를 미리 내려받음');

    await page.goto(`http://127.0.0.1:${port}/intro`);
    await page.locator('.intro-robot-stage[data-ready="true"]').first().waitFor({ state: 'attached', timeout: 60000 });
    await page.waitForFunction(() => !document.querySelector('.intro-loading'), { timeout: 60000 });
    for (const [label, time, index] of [['opening', '4.5', 0], ['showcase', '34.5', 1]]) {
      await page.getByLabel('모션 재생 위치').fill(time);
      const robot = page.locator('.intro-robot-stage').nth(index);
      await page.waitForFunction(({ index }) => {
        const element = document.querySelectorAll('.intro-robot-stage')[index];
        return element?.dataset.motionTime !== undefined;
      }, { index });
      await robot.screenshot({ path: `.cache/robot-bundle-review/${name}-${label}.png` });
      const state = await robot.evaluate(element => ({ ...element.dataset }));
      if (name === 'baseline') baselineStates.set(label, state);
      else assert.deepEqual(state, baselineStates.get(label), `${label} 로봇 자세·애니메이션 변경`);
      console.log(JSON.stringify({ name, label, state }));
    }
    if (name === 'split') {
      for (const chunk of ['three-core', 'three-renderer', 'three-loaders', 'IntroRobot3D']) {
        assert(requests.some(url => url.includes(chunk)), `${chunk} 번들이 로드되지 않음`);
      }
    }
    assert.deepEqual(errors, [], '브라우저 실행 오류 발생');
    await page.getByRole('button', { name: '서비스 바로가기', exact: true }).click();
    await page.waitForURL('**/main');
    await page.waitForFunction(() => !document.querySelector('.intro-route-transition'));
    await page.close();
  }
  for (const label of ['opening', 'showcase']) {
    const before = await readFile(`.cache/robot-bundle-review/baseline-${label}.png`);
    const after = await readFile(`.cache/robot-bundle-review/split-${label}.png`);
    console.log(JSON.stringify({ label, identicalPng: before.equals(after), note: 'PNG 차이는 캡처를 열어 별도 시각 확인' }));
  }
  console.log('PASS: 메인 3D 미로딩, 분리 번들 로딩, 원본/수정 로봇 자세·애니메이션 동일, 메인 전환');
} finally {
  await browser.close();
}
