const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/a/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
  const out='E:/Project/output/tines-original-motion-20261024';
  const videoDir=path.join(out,'playwright-video-temp'); fs.mkdirSync(videoDir,{recursive:true});
  const b=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows']});
  const c=await b.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,recordVideo:{dir:videoDir,size:{width:1920,height:1080}}});
  const p=await c.newPage(), errors=[]; p.on('pageerror',e=>errors.push(String(e)));
  await p.goto('http://localhost:4190/',{waitUntil:'domcontentloaded',timeout:30000}); await p.waitForTimeout(2200);
  await p.evaluate(()=>scrollTo(0,1550)); await p.waitForTimeout(900);
  await p.screenshot({path:path.join(out,'target-section-start.png')});
  const init=await p.evaluate(()=>{
    const source=document.querySelector('[class*="HomeMonitorBanner"][class*="canvas"]');
    const ctx=source?.getContext('2d'); const small=document.createElement('canvas'); small.width=120; small.height=95;
    const sctx=small.getContext('2d',{willReadFrequently:true}); let prev=null;
    const regions={left:[0,0,48,95],center:[48,0,24,95],right:[72,0,48,95],upper:[0,0,120,55],lower:[0,55,120,40]};
    window.__frameSamples=[];
    const tick=t=>{
      if(ctx){sctx.drawImage(source,0,0,small.width,small.height);const px=sctx.getImageData(0,0,small.width,small.height).data;const stats={};
        if(prev)for(const [name,[x,y,w,h]] of Object.entries(regions)){let sum=0,changed=0,n=0;for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const i=(yy*small.width+xx)*4;let d=0;for(let k=0;k<3;k++){const v=Math.abs(px[i+k]-prev[i+k]);d+=v;}sum+=d;if(d>24)changed++;n++;}stats[name]={meanAbsRGB:+(sum/(n*3)).toFixed(4),changedPercent:+(100*changed/n).toFixed(3)};}
        window.__frameSamples.push({t,scrollY,stats});prev=new Uint8ClampedArray(px);
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    return {found:!!source,width:source?.width,height:source?.height,cssSize:[source?.clientWidth,source?.clientHeight],has2d:!!ctx};
  });
  await p.waitForTimeout(4000);
  await p.evaluate(()=>new Promise(resolve=>{const start=performance.now(),from=scrollY,distance=450,duration=4000;const step=now=>{const q=Math.min(1,(now-start)/duration);scrollTo(0,from+distance*q);if(q<1)requestAnimationFrame(step);else resolve();};requestAnimationFrame(step);}));
  await p.waitForTimeout(3000); await p.screenshot({path:path.join(out,'target-section-end.png')});
  const sample=await p.evaluate(()=>window.__frameSamples||[]);
  await p.close(); const vp=await p.video().path(); await c.close(); await b.close();
  const target=path.join(out,'tines-original-motion-25fps.webm'); fs.copyFileSync(vp,target);
  fs.writeFileSync(path.join(out,'raf-canvas-analysis.json'),JSON.stringify({url:'http://localhost:4190/',viewport:[1920,1080],canvas:init,errors,samples:sample},null,2));
  console.log(JSON.stringify({video:target,videoPath:vp,canvas:init,errors,sampleCount:sample.length,first:sample[0]?.t,last:sample.at(-1)?.t,
    scroll:[Math.min(...sample.map(x=>x.scrollY)),Math.max(...sample.map(x=>x.scrollY))],videoBytes:fs.statSync(target).size},null,2));
})().catch(e=>{console.error(e);process.exit(1)});
