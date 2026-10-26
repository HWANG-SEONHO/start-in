const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/a/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const out = 'E:/Project/output/tines-original-motion-20261024';
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows']
  });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    recordVideo: { dir: out, size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:4190/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(out, 'start.png') });
  const setup = await page.evaluate(() => {
    const all = [...document.querySelectorAll('body *')];
    const animated = all.filter(el => {
      const cs = getComputedStyle(el);
      return (cs.animationName && cs.animationName !== 'none') || el.getAnimations().length > 0;
    });
    const describe = el => {
      let s = el.tagName.toLowerCase();
      if (el.id) s += '#' + el.id;
      if (el.classList && el.classList.length) s += '.' + [...el.classList].slice(0, 4).join('.');
      return s;
    };
    const chosen = animated.filter(el => {
      const r = el.getBoundingClientRect();
      return r.width > 12 && r.height > 12 && r.bottom > 0 && r.top < innerHeight;
    }).slice(0, 50);
    const meta = chosen.map((el, i) => {
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      el.dataset.motionCaptureId = String(i);
      return { id: i, selector: describe(el), x: r.x, y: r.y, width: r.width, height: r.height,
        animationName: cs.animationName, animationDuration: cs.animationDuration, animationDelay: cs.animationDelay,
        transition: cs.transition, transform: cs.transform, opacity: cs.opacity,
        waapi: el.getAnimations().map(a => ({ playState: a.playState, currentTime: a.currentTime, duration: a.effect && a.effect.getTiming().duration })) };
    });
    window.__motionFrameLog = [];
    window.__motionLogging = true;
    const tick = t => {
      if (!window.__motionLogging) return;
      const row = { t, y: scrollY, items: [] };
      for (const el of chosen) {
        const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
        row.items.push([r.x, r.y, r.width, r.height, cs.transform, cs.opacity]);
      }
      window.__motionFrameLog.push(row);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return { title: document.title, url: location.href, scrollHeight: document.documentElement.scrollHeight,
      viewport: [innerWidth, innerHeight], cssAnimatedCount: animated.length, selected: meta };
  });
  // Hold the original hero in view long enough to sample idle, looping movement.
  await page.waitForTimeout(7000);
  // Then move gently down the original page in small wheel increments to reveal scroll-triggered motion.
  for (let i = 0; i < 16; i++) {
    await page.mouse.wheel(0, 48);
    await page.waitForTimeout(180);
  }
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(out, 'end.png') });
  const telemetry = await page.evaluate(() => {
    window.__motionLogging = false;
    return window.__motionFrameLog;
  });
  fs.writeFileSync(path.join(out, 'dom-animation-inventory.json'), JSON.stringify({ ...setup, errors, samples: telemetry.length }, null, 2));
  fs.writeFileSync(path.join(out, 'raf-telemetry.json'), JSON.stringify(telemetry));
  await page.close();
  const videoPath = await page.video().path();
  await context.close();
  fs.renameSync(videoPath, path.join(out, 'tines-original-motion.webm'));
  await browser.close();
  console.log(JSON.stringify({ out, video: path.join(out, 'tines-original-motion.webm'), durationSeconds: 7 + 16 * 0.18 + 1.8,
    ...setup, errors, samples: telemetry.length }, null, 2));
})().catch(e => { console.error(e); process.exit(1); });
