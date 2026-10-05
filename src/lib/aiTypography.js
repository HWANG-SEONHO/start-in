// Native glyphs and temporal motion samples. Copy moves in readable groups.
const INK='#f3f1e9',LIME='#d8ef70',BG='#424cd5';
const clamp=v=>Math.max(0,Math.min(1,v));
function spring(t,at,from,to,velocity,drag=8,freq=22){
 const dt=t-at;if(dt<=0)return from;
 const a=from-to,b=(velocity+drag*a)/freq;
 return to+Math.exp(-drag*dt)*(a*Math.cos(freq*dt)+b*Math.sin(freq*dt));
}
function arrive(t,start,end,from,to,velocity,drag=8,freq=22){
 if(t>=end)return spring(t,end,to,to,velocity,drag,freq);
 const u=clamp((t-start)/(end-start));
 return (2*u**3-3*u**2+1)*from+(-2*u**3+3*u**2)*to+(u**3-u**2)*(end-start)*velocity;
}
export function aiTypographyState(t){
 const top=t<.96?203:spring(t,.96,203,100,-800,9,22);
 return {scale:arrive(t,.15,.4,.002,1,3.5,10,26),top,
  lower:t<.96?arrive(t,.84,.96,660,289,-800,9,22):top+86,angle:0,
  notesX:arrive(t,1.08,1.36,-640,0,700,10,24)};
}
export function createAiTypography(canvas){
 // Extra space to the right preserves full lines after left alignment.
 const W=768,H=640,cache=new Map(),layer=document.createElement('canvas'),sum=document.createElement('canvas');
 let density=2,lastWidth=0,lastHeight=0;
 const family=getComputedStyle(canvas).fontFamily;
 function resize(){const bounds=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.max(1,Math.round(bounds.width*d)),h=Math.max(1,Math.round(bounds.height*d));if(w===lastWidth&&h===lastHeight)return false;lastWidth=w;lastHeight=h;for(const el of [canvas,layer,sum]){el.width=w;el.height=h}density=Math.max(2,w/W*2);cache.clear();return true}
 function glyph(word,height,color,weight=800){const key=[word,height,color,weight].join(':');if(cache.has(key))return cache.get(key);const measure=document.createElement('canvas').getContext('2d');measure.font=`${weight} 100px ${family}`;const m=measure.measureText(word),asc=m.actualBoundingBoxAscent,desc=m.actualBoundingBoxDescent;
  const width=(m.actualBoundingBoxLeft+m.actualBoundingBoxRight)*height/(asc+desc),g=document.createElement('canvas');g.width=Math.ceil((width+4)*density);g.height=Math.ceil((height+4)*density);const c=g.getContext('2d');c.scale(density,density);c.font=measure.font;c.fillStyle=color;c.translate(2,2);c.scale(height/(asc+desc),height/(asc+desc));c.fillText(word,m.actualBoundingBoxLeft,asc);const value={g,width,height};cache.set(key,value);return value}
 function text(c,word,x,y,height,color=INK,weight=800){const q=glyph(word,height,color,weight);c.drawImage(q.g,x-2,y-2,q.width+4,height+4);return q.width}
 const notes=['내게 맞는 기회를 찾는 것부터','나의 경험을 설득력 있게 전하는 것까지.','AI 취업코치와 다음을 준비합니다.'];
 const services=[
  ['맞춤 검색','내 조건과 경험에 맞는 공고 탐색'],
  ['이력서','흩어진 경험을 나의 강점으로 정리'],
  ['자기소개서','지원 직무에 맞게 나의 이야기 구성'],
 ];
 const centerX=380;
 function centered(c,word,y,height,color=INK,weight=800){
  const width=glyph(word,height,color,weight).width;
  text(c,word,-width/2,y,height,color,weight);
 }
 function yaw(c,word,cx,cy,height,angle){
  const q=glyph(word,height,INK),w=q.width+4,h=height+4;
  if(Math.abs(angle)<.001){text(c,word,cx-q.width/2,cy-height/2,height);return;}
  for(let i=0;i<32;i++){
   const a=-w/2+i*w/32,b=a+w/32,m=(a+b)/2;
   const qa=1-a*Math.sin(angle)/800,qb=1-b*Math.sin(angle)/800,qm=1-m*Math.sin(angle)/800;
   const xa=cx+a*Math.cos(angle)/qa,xb=cx+b*Math.cos(angle)/qb;
   c.drawImage(q.g,i*q.g.width/32,0,q.g.width/32,q.g.height,xa,cy-h/2/qm,Math.max(.01,xb-xa+.1),h/qm);
  }
 }
 function scene(c,t){
  if(t>=5.55){
   const angle=arrive(t,5.55,5.77,Math.PI*.485,0,-2,10,25);
   const cy=t<6.05?264:spring(t,6.05,264,244,-240,9,22);
   yaw(c,'찾고,',centerX,cy,78,angle);
   if(t>=5.95){c.save();c.translate(centerX,t<6.05?arrive(t,5.95,6.05,450,320,-240):cy+56);
    centered(c,'준비하고.',0,40,LIME,500);c.restore();}
   if(t>=6.55)text(c,'AI 취업코치',arrive(t,6.55,6.78,-600,170,650,9,22),348,40,LIME);
   if(t>=6.95){const scale=arrive(t,6.95,7.13,.002,1,3,10,24);c.save();c.translate(412,348);c.scale(scale,scale);text(c,'기회',0,0,25);c.restore();}
   if(t>=7.45)text(c,'맞춤 검색',arrive(t,7.45,7.68,1000,412,-550,9,22),379,27,INK,500);
   if(t>=7.85)text(c,'이력서',arrive(t,7.85,8.08,-600,293,650,9,22),398,38,LIME);
   if(t>=8.15)text(c,'자기소개서',412,arrive(t,8.15,8.4,690,412,-1100,9,22),27,INK,500);
   if(t<6.15){const u=clamp((t-5.55)/.6);c.save();c.globalAlpha=1-u;c.strokeStyle=LIME;c.lineWidth=2;
    for(let i=0;i<7;i++){const a=-Math.PI/2+i*Math.PI*2/7,r=100+u*45,len=24*(1-u);
     c.beginPath();c.moveTo(centerX+Math.cos(a)*r,264+Math.sin(a)*r);
     c.lineTo(centerX+Math.cos(a)*(r+len),264+Math.sin(a)*(r+len));c.stroke();}
    c.restore();}
   return;
  }
  if(t>=2.85){
   const shrink=1-clamp((t-5.2)/.35)**2;
   c.save();c.translate(centerX,264);c.scale(shrink,shrink);c.translate(-centerX,-264);
   const servicesLeft=centerX-glyph('준비하고.',78,LIME).width/2;
   // LET / US / CREATE: two horizontal arrivals and one vertical arrival.
   for(let i=0;i<services.length;i++){
    const at=2.85+i*.4;if(t<at)continue;
    const x=i<2?arrive(t,at,at+.3,1000,servicesLeft,-650,9,22):servicesLeft;
    const y=i<2?100+i*116:arrive(t,at,at+.3,690,332,-650,9,22);
    c.save();c.translate(x,y);
    text(c,services[i][0],0,0,58,LIME);
    text(c,services[i][1],0,72,25,INK,500);
    c.restore();
   }
   c.restore();
   return;
  }
  const pose=aiTypographyState(t),first=glyph('찾고,',78,INK);
  c.save();
  // All three objects leave together, with their internal spacing intact.
  const exit=clamp((t-2.45)/.32);
  c.translate(0,140*exit*exit);
  c.globalAlpha=1-exit*exit;
  // Three objects follow BOOST / YOUR / BUSINESS from the reference opening.
  if(t>=.15){c.save();c.translate(centerX,pose.top+39);
   c.scale(pose.scale,pose.scale);text(c,'찾고,',-first.width/2,-39,78);c.restore();}
  if(t>=.84){c.save();c.translate(centerX,pose.lower);centered(c,'준비하고.',0,78,LIME);c.restore();}
  if(t>=1.08){c.save();c.translate(centerX+pose.notesX,278);
   const notesLeft=-glyph('준비하고.',78,LIME).width/2;
   for(let i=0;i<notes.length;i++)text(c,notes[i],notesLeft,i*30,25,i===2?LIME:INK,i===2?700:500);
   c.restore();}
  c.restore();
 }
 function render(t){const resized=resize(),c=canvas.getContext('2d'),a=sum.getContext('2d'),s=layer.getContext('2d');a.clearRect(0,0,sum.width,sum.height);const count=t>=0&&t<9?32:1;
  for(let i=0;i<count;i++){s.setTransform(1,0,0,1,0,0);s.fillStyle=BG;s.fillRect(0,0,layer.width,layer.height);s.setTransform(layer.width/W,0,0,layer.height/H,0,0);scene(s,t+((i+.5)/count-.5)*.04);a.globalAlpha=1/(i+1);a.drawImage(layer,0,0)}a.globalAlpha=1;c.drawImage(sum,0,0);return resized;
 }
 return {render,resize,destroy(){cache.clear();layer.width=sum.width=1}};
}



