const { chromium } = require('C:/Users/a/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://localhost:4190/', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const texts = [...document.querySelectorAll('h1,h2,h3,p')].map(e => { const r=e.getBoundingClientRect(); return {tag:e.tagName,text:e.innerText?.trim().slice(0,160),y:r.y+scrollY,h:r.height, cls:e.className?.toString().slice(0,140)}; }).filter(x=>x.text);
    const hits = [...document.querySelectorAll('body *')].filter(e => e.children.length===0 && /AI made everyone|100× harder|security and IT got/i.test(e.textContent||'')).map(e=>{const r=e.getBoundingClientRect();return {text:e.textContent.trim(),y:r.y+scrollY,cls:e.className?.toString(),parent:e.parentElement?.className?.toString()}});
    return {scrollHeight:document.documentElement.scrollHeight,texts,hits};
  });
  console.log(JSON.stringify(r,null,2)); await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
