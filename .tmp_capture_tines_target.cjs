const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/a/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const out = 'E:/Project/output/tines-original-motion-20261024';
  const framesDir = path.join(out, 'frames');
  fs.mkdirSync(framesDir, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'] });
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto('http://localhost:4190/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2200);
  await page.evaluate(() => scrollTo(0, 1550));
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(out, 'target-section-start.png') });
  const canvasInfo = await page.evaluate(() => {
    const c = document.querySelector('[class*="HomeMonitorBanner"][class*="canvas"]');
    if (!c) return { found: false };
    const ctx = c.getContext('2d');
    const scaled = document.createElement('canvas'); scaled.width = 120; scaled.height = 95;
    const sampleCtx = scaled.getContext('2d', { willReadFrequently: true });
    const regions = { left:[0,0,48,95], center:[48,0,24,95], right:[72,0,48,95], upper:[0,0,120,55], lower:[0,55,120,40] };
    window.__canvasMotionSamples = [];
    let previous = null;
    const sample = t => {
      const top = c.getBoundingClientRect();
      if (ctx) sampleCtx.drawImage(c, 0, 0, scaled.width, scaled.height);
      const pixels = ctx ? sampleCtx.getImageData(0,0,scaled.width,scaled.height).data : null;
      const metrics = {};
      if (pixels && previous) for (const [name,[x,y,w,h]] of Object.entries(regions)) {
        let sum=0, changed=0, n=0;
        for(let yy=y;yy<y+h;yy++) for(let xx=x;xx<x+w;xx++) {
          const i=(yy*scaled.width+xx)*4; let d=0;
          for(let k=0;k<3;k++){const v=Math.abs(pixels[i+k]-previous[i+k]);d+=v;}
          sum+=d; if(d>24) changed++; n++;
        }
        metrics[name]={ meanAbsRGB: +(sum/(n*3)).toFixed(4), changedPercent: +(100*changed/n).toFixed(3) };
      }
      window.__canvasMotionSamples.push({t,scrollY,canvasY:+top.y.toFixed(3),metrics});
      if(pixels) previous = new Uint8ClampedArray(pixels);
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
    return {found:true,width:c.width,height:c.height,cssRect:[c.getBoundingClientRect().width,c.getBoundingClientRect().height],context:!!ctx};
  });
  const inventory = await page.evaluate(() => {
    const h = [...document.querySelectorAll('h2')].find(e => /AI made everyone a builder/i.test(e.innerText));
    const section = h?.parentElement?.parentElement;
    const nodes = [...(section?.querySelectorAll('*') || [])];
    return {
      section: { tag: section?.tagName, className: String(section?.className), y: section?.getBoundingClientRect().y + scrollY, height: section?.getBoundingClientRect().height },
      elements: nodes.filter(e => ['svg','canvas','video','img'].includes(e.tagName.toLowerCase())).map(e => {
        const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        return { tag: e.tagName, className: String(e.className?.baseVal || e.className || ''), x:r.x,y:r.y,w:r.width,h:r.height,
          animations:e.getAnimations().map(a=>({state:a.playState,time:a.currentTime,duration:a.effect?.getTiming().duration})),
          animationName:cs.animationName, transform:cs.transform, opacity:cs.opacity, src:e.currentSrc || undefined };
      })
    };
  });
  const cdp = await context.newCDPSession(page);
  const captured = [];
  const startedAt = Date.now();
  let pending = Promise.resolve();
  cdp.on('Page.screencastFrame', ev => {
    const i = captured.length;
    captured.push({ data: ev.data, timestamp: ev.metadata.timestamp, arrivalMs: Date.now() - startedAt, sessionId: ev.sessionId, scroll: ev.metadata });
    pending = pending.then(() => cdp.send('Page.screencastFrameAck', { sessionId: ev.sessionId })).catch(()=>{});
  });
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 88, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  await page.waitForTimeout(4000);
  // Move the page 450 CSS pixels over four seconds, sampling scroll position on every animation frame.
  await page.evaluate(() => new Promise(resolve => {
    const start = performance.now(), from = scrollY, distance = 450, duration = 4000;
    const step = now => { const p = Math.min(1, (now - start) / duration); scrollTo(0, from + distance * p); if (p < 1) requestAnimationFrame(step); else resolve(); };
    requestAnimationFrame(step);
  }));
  await page.waitForTimeout(3000);
  await cdp.send('Page.stopScreencast');
  await pending;
  const final = await page.evaluate(() => ({ scrollY, scrollHeight: document.documentElement.scrollHeight }));
  const canvasSamples = await page.evaluate(() => window.__canvasMotionSamples || []);
  await page.screenshot({ path: path.join(out, 'target-section-end.png') });
  await cdp.detach(); await page.close(); await context.close(); await browser.close();
  for (let i=0;i<captured.length;i++) fs.writeFileSync(path.join(framesDir, `frame-${String(i).padStart(5,'0')}.jpg`), Buffer.from(captured[i].data,'base64'));
  const ts = captured.map(f=>f.timestamp).filter(Number.isFinite);
  const arrivals = captured.map(f=>f.arrivalMs);
  const intervals = arrivals.slice(1).map((t,i)=>t-arrivals[i]);
  fs.writeFileSync(path.join(out,'canvas-motion-samples.json'), JSON.stringify(canvasSamples));
  fs.writeFileSync(path.join(out,'capture-metadata.json'), JSON.stringify({url:'http://localhost:4190/', viewport:[1920,1080], inventory,
    errors, canvasInfo, frames:captured.length, timestamps:ts, arrivalMs:arrivals, intervalsMs:intervals, canvasSamples:canvasSamples.length, final},null,2));
  console.log(JSON.stringify({out,framesDir,frames:captured.length,firstTimestamp:ts[0],lastTimestamp:ts.at(-1),
    canvasInfo, canvasSamples:canvasSamples.length,
    meanIntervalMs:intervals.reduce((a,b)=>a+b,0)/Math.max(1,intervals.length),minIntervalMs:Math.min(...intervals),maxIntervalMs:Math.max(...intervals),inventory,errors,final},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
