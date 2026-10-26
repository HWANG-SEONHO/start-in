const { chromium } = require('C:/Users/a/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const b = await chromium.launch({ headless: true, executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' });
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  await p.goto('http://localhost:4190/', { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1800); await p.evaluate(()=>scrollTo(0,1550)); await p.waitForTimeout(900);
  const r = await p.evaluate(() => {
    const h=[...document.querySelectorAll('h2')].find(e=>/AI made everyone a builder/i.test(e.innerText));
    let ancestors=[]; for(let e=h;e && ancestors.length<8;e=e.parentElement){let r=e.getBoundingClientRect();ancestors.push({tag:e.tagName,cls:String(e.className).slice(0,160),y:r.y+scrollY,h:r.height,children:e.children.length});}
    const section=h?.parentElement?.parentElement;
    const els=[...(section?.querySelectorAll('*')||[])].filter(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return r.width>12&&r.height>12&&r.bottom>0&&r.top<innerHeight&&(cs.animationName!=='none'||e.getAnimations().length>0)}).map(e=>{const cs=getComputedStyle(e),r=e.getBoundingClientRect();return {tag:e.tagName,cls:String(e.className).slice(0,150),x:r.x,y:r.y,w:r.width,h:r.height,a:cs.animationName,d:cs.animationDuration,t:cs.transform,o:cs.opacity,n:e.getAnimations().length}});
    return {scrollY,ancestors,sectionCls:String(section?.className),sectionY:section?.getBoundingClientRect().y+scrollY,animated:els};
  });
  console.log(JSON.stringify(r,null,2)); await p.screenshot({path:'E:/Project/output/tines-original-motion-20261024/target-before.png'}); await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
