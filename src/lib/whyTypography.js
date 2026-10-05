// Live font outlines + sampled 3D transforms. No reference image or video assets.
export async function createWhyTypography(canvas) {
const gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:true,antialias:true,preserveDrawingBuffer:true});
if(!gl) throw new Error('WebGL을 사용할 수 없습니다.');
function shader(kind,source){const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s;}
const program=gl.createProgram();
gl.attachShader(program,shader(gl.VERTEX_SHADER,`attribute vec2 position;attribute vec2 uv;varying vec2 texcoord;uniform vec4 box;uniform vec3 pose;void main(){float x=box.x+position.x*box.z;float y=box.y+position.y*box.w;float a=pose.x;float z=-x*sin(a);float q=1.0+z/425.0;float rx=x*cos(a)+pose.y;gl_Position=vec4(rx/288.0,-(y+pose.z-21.0*q)/225.0,0.0,q);texcoord=uv;}`));
gl.attachShader(program,shader(gl.FRAGMENT_SHADER,`precision mediump float;varying vec2 texcoord;uniform sampler2D glyph;uniform float exposure;uniform vec3 ink;void main(){float a=texture2D(glyph,texcoord).a*exposure;gl_FragColor=vec4(ink*a,a);}`));
gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program));
gl.useProgram(program);
const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,0,0,1,0,1,0,0,1,0,1,0,1,0,1,1,0,1,0,1,1,1,1]),gl.STATIC_DRAW);
for(const [name,offset] of [['position',0],['uv',8]]){const a=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,16,offset);}
const uniforms=Object.fromEntries(['box','pose','exposure','ink'].map(n=>[n,gl.getUniformLocation(program,n)]));
gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE);gl.clearColor(0,0,0,0);
const face=new FontFace('IntroMotionNoto','local("Noto Sans KR")',{weight:'100 900'});
try{document.fonts.add(await face.load());}catch{}
const fontFamily='IntroMotionNoto,"Malgun Gothic",sans-serif';
const meta={"rotate": {"x": 112, "y": 420, "w": 168, "h": 90}, "while": {"x": 30, "y": 516, "w": 248, "h": 85}, "change": {"x": 300, "y": 420, "w": 245, "h": 87}, "effect": {"x": 300, "y": 515, "w": 170, "h": 88}, "follow": {"x": 43, "y": 420, "w": 168, "h": 87}, "make": {"x": 44, "y": 515, "w": 241, "h": 88}};
const tracks={"rotate": [[0.051, 108.5], [0.085, 147.0], [0.119, 191.75], [0.153, 223.0], [0.187, 248.0], [0.221, 270.0], [0.255, 284.0], [0.289, 297.0], [0.323, 306.75], [0.357, 315.75], [0.391, 323.0], [0.425, 330.25], [0.459, 336.0], [0.493, 338.5], [0.527, 343.0], [0.561, 345.75], [0.595, 347.25], [0.629, 350.25], [0.663, 352.5], [0.697, 354.75], [0.731, 356.25], [0.765, 356.5], [0.799, 357.75], [0.833, 358.5], [0.867, 358.5], [0.901, 358.5], [0.935, 358.5], [0.969, 358.5], [1.003, 360.0], [1.037, 361.75], [1.071, 363.5], [1.105, 365.5], [1.139, 368.5], [1.173, 372.5], [1.207, 377.5], [1.241, 384.75], [1.275, 394.5], [1.309, 410.5], [1.343, 434.75], [1.377, 434.75]], "while": [[0.289, 106.75], [0.323, 146.25], [0.357, 189.75], [0.391, 223.25], [0.425, 249.25], [0.459, 270.0], [0.493, 283.25], [0.527, 294.5], [0.561, 303.5], [0.595, 316.75], [0.629, 324.0], [0.663, 330.25], [0.697, 335.25], [0.731, 339.75], [0.765, 345.5], [0.799, 348.5], [0.833, 350.75], [0.867, 353.0], [0.901, 355.0], [0.935, 356.5], [0.969, 358.0], [1.003, 358.75], [1.037, 359.5], [1.071, 359.5], [1.105, 359.5], [1.139, 360.0], [1.173, 360.0], [1.207, 360.0], [1.241, 360.0], [1.275, 363.0], [1.309, 365.0], [1.343, 367.0], [1.377, 369.75], [1.411, 373.75], [1.445, 378.5], [1.479, 385.25], [1.513, 395.25], [1.547, 410.5], [1.581, 436.0], [1.615, 436.0]], "change": [[1.411, -78.0], [1.445, -51.25], [1.479, -35.75], [1.513, -26.0], [1.547, -19.0], [1.581, -14.0], [1.615, -10.0], [1.649, -7.0], [1.683, -4.75], [1.717, -3.5], [1.751, -2.0], [1.785, -1.25], [1.819, -0.5], [1.853, 0.0], [1.887, 0.0], [1.921, 0.0], [1.955, 0.0], [1.989, 0.0], [2.023, 0.0], [2.057, 0.0], [2.091, 0.0], [2.125, 0.0], [2.159, 0.0], [2.193, 0.0], [2.227, 0.0]], "effect": [[1.683, -51.25], [1.717, -36.0], [1.751, -26.25], [1.785, -19.0], [1.819, -14.25], [1.853, -10.0], [1.887, -7.25], [1.921, -4.5], [1.955, -3.0], [1.989, -1.75], [2.023, -1.0], [2.057, -0.25], [2.091, 0.0], [2.125, 0.0], [2.159, 0.0], [2.193, 0.0], [2.227, 0.0], [2.261, 0.0], [2.295, 0.0], [2.329, 0.0], [2.363, 0.0], [2.397, 0.0], [2.431, 0.0]], "changeX": [[2.057, 0.025], [2.091, -1.205], [2.125, -2.976], [2.159, -7.024], [2.193, -14.411], [2.227, -28.56]], "effectX": [[2.295, -2.607], [2.329, -6.768], [2.363, -14.192], [2.397, -28.189], [2.431, -60.728]], "followX": [[2.261, 232.076], [2.295, 123.136], [2.329, 75.972], [2.363, 51.078], [2.397, 35.144], [2.431, 24.054], [2.465, 15.978], [2.499, 10.246], [2.533, 6.031], [2.567, 2.868], [2.601, 0.946], [2.635, 0.226], [2.669, 0.007], [2.703, 0.007], [2.737, 0.007], [2.771, 0.007], [2.805, 0.007], [2.839, 0.019], [2.873, 7.146], [2.907, 38.628], [2.941, 121.932], [2.975, 261.869], [3.009, 368.515], [3.043, 407.714], [3.077, 435.124]], "makeX": [[2.465, 90.198], [2.499, 55.539], [2.533, 37.37], [2.567, 25.766], [2.601, 17.631], [2.635, 11.822], [2.669, 7.746], [2.703, 4.391], [2.737, 2.231], [2.771, 1.331], [2.805, 0.003], [2.839, 0.183], [2.873, 0.173], [2.907, 0.198], [2.941, 0.199], [2.975, 0.2], [3.009, 0.227], [3.043, 7.422], [3.077, 38.965], [3.111, 122.809], [3.145, 261.949], [3.179, 340.087], [3.213, 371.287], [3.247, 398.278], [3.281, 415.677]]};
function fitText(target,text,left,top,width,height,color='#fff',weight=600){
 target.save();target.font=`${weight} 80px ${fontFamily}`;target.fillStyle=color;target.textAlign='left';target.textBaseline='alphabetic';const m=target.measureText(text);
 target.translate(left,top);target.scale(width/(m.actualBoundingBoxLeft+m.actualBoundingBoxRight),height/(m.actualBoundingBoxAscent+m.actualBoundingBoxDescent));target.fillText(text,m.actualBoundingBoxLeft,m.actualBoundingBoxAscent);target.restore();
}
const words={rotate:'복잡한',while:'구직을',change:'더',effect:'쉽게',follow:'복잡한 구직을',make:'더쉽게'};
const glyphBounds={"rotate": {"left": 120, "top": 426, "width": 152, "height": 78}, "while": {"left": 38, "top": 519, "width": 234, "height": 77}, "change": {"left": 305, "top": 426, "width": 236, "height": 76}, "effect": {"left": 305, "top": 519, "width": 159, "height": 79}, "follow": {"left": 48, "top": 426, "width": 158, "height": 76}, "make": {"left": 49, "top": 521, "width": 231, "height": 77}};
const textures={};
const measure=document.createElement('canvas').getContext('2d');measure.font=`600 80px ${fontFamily}`;
for(const [name,word] of Object.entries(words)){
 const g=glyphBounds[name],metrics=measure.measureText(word);
 g.width=((metrics.actualBoundingBoxLeft+metrics.actualBoundingBoxRight)*g.height/(metrics.actualBoundingBoxAscent+metrics.actualBoundingBoxDescent));
 const shrink=Math.min(1,(name.startsWith('summary')?500:410)/g.width);g.width*=shrink;g.height*=shrink;
 if(name.startsWith('summary'))g.left=(576-g.width)/2;
 if(name==='rotate'||name==='while')g.left=272-g.width;
 meta[name]={x:Math.floor(g.left)-8,y:g.top-6,w:Math.ceil(g.width)+16,h:g.height+12};
}
let previousSize='',textureDensity=0;
function resize(cssWidth,cssHeight,pixelRatio=window.devicePixelRatio||1){
 if(cssWidth<=0||cssHeight<=0)return false;
 const width=Math.ceil(cssWidth*pixelRatio),height=Math.ceil(cssHeight*pixelRatio);
 const key=`${width}:${height}`;if(key===previousSize)return false;previousSize=key;
 canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);
 // Re-rasterize the font above display resolution to retain sharp edges during perspective magnification.
 const desiredDensity=Math.max(2,Math.max(width/576,height/450)*2);
 const limit=gl.getParameter(gl.MAX_TEXTURE_SIZE);
 const nextDensity=Math.min(desiredDensity,...Object.values(meta).map(b=>limit/Math.max(b.w,b.h)));
 if(nextDensity!==textureDensity){
  textureDensity=nextDensity;
  for(const [name,word] of Object.entries(words)){
   const b=meta[name],g=glyphBounds[name],glyph=document.createElement('canvas');
   glyph.width=Math.ceil(b.w*textureDensity);glyph.height=Math.ceil(b.h*textureDensity);
   const ink=glyph.getContext('2d');ink.setTransform(glyph.width/b.w,0,0,glyph.height/b.h,0,0);
   fitText(ink,word,g.left-b.x,g.top-b.y,g.width,g.height);
   if(textures[name])gl.deleteTexture(textures[name]);
   const t=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,t);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,glyph);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
   gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);textures[name]=t;
  }
 }
 canvas.dataset.renderSize=`${width} × ${height}`;canvas.dataset.glyphDensity=textureDensity.toFixed(2);return true;
}
const initial=canvas.getBoundingClientRect();resize(initial.width,initial.height);

function sample(keys,t){if(t<=keys[0][0])return keys[0][1];if(t>=keys.at(-1)[0])return keys.at(-1)[1];let i=0;while(keys[i+1][0]<t)i++;const [ta,va]=keys[i],[tb,vb]=keys[i+1],dt=tb-ta,u=(t-ta)/dt,s=(vb-va)/dt;function slope(k){if(k===0)return(keys[1][1]-keys[0][1])/(keys[1][0]-keys[0][0]);if(k===keys.length-1)return(keys[k][1]-keys[k-1][1])/(keys[k][0]-keys[k-1][0]);const a=(keys[k][1]-keys[k-1][1])/(keys[k][0]-keys[k-1][0]),b=(keys[k+1][1]-keys[k][1])/(keys[k+1][0]-keys[k][0]);return a*b<=0?0:2*a*b/(a+b);}let m0=slope(i),m1=slope(i+1);if(s===0)m0=m1=0;else{const q=(m0/s)**2+(m1/s)**2;if(q>9){const factor=3/Math.sqrt(q);m0*=factor;m1*=factor;}}return(2*u**3-3*u**2+1)*va+(u**3-2*u**2+u)*dt*m0+(-2*u**3+3*u**2)*vb+(u**3-u**2)*dt*m1;}
tracks.rotate.unshift([.034,90]);tracks.rotate.push([1.394,450]);tracks.while.unshift([.272,90]);tracks.while.push([1.632,450]);
tracks.change.unshift([1.394,-90]);tracks.effect.unshift([1.632,-90]);
tracks.followX[0][1]=174;tracks.followX.unshift([2.244,248]);
tracks.makeX.unshift([2.448,151]);
tracks.followX.push([3.111,560]);tracks.makeX.push([3.315,620]);
function pose(name,t){
 if(name==='rotate')return t<.034||t>=1.394?null:[sample(tracks.rotate,t),0,0];
 if(name==='while')return t<.272||t>=1.632?null:[sample(tracks.while,t),0,0];
 if(name==='change')return t<1.394||t>=2.252?null:[sample(tracks.change,t),t>=2.057?sample(tracks.changeX,t):0,0];
 if(name==='effect')return t<1.632||t>=2.448?null:[sample(tracks.effect,t),t>=2.295?sample(tracks.effectX,t):0,0];
 if(name==='follow')return t<2.252||t>=3.111?null:[0,sample(tracks.followX,t),0];
 if(name==='make')return t<2.448||t>=3.315?null:[0,sample(tracks.makeX,t),0];
}

function render(time) {
 gl.clear(gl.COLOR_BUFFER_BIT);
 const count=32,shutter=.024;
 gl.uniform1f(uniforms.exposure,1/count);
 for(let j=0;j<count;j++) {
 const st=time+((j+.5)/count-.5)*shutter;
 for(const name of Object.keys(words)) {
 const p=pose(name,st);if(!p)continue;const b=meta[name];
 const lower=['while','effect','make'].includes(name);
 gl.uniform3f(uniforms.ink,...(lower?[.718,.765,1]:[.933,.914,.871]));
 gl.uniform4f(uniforms.box,b.x-288,b.y-512,b.w,b.h);gl.uniform3f(uniforms.pose,p[0]*Math.PI/180,p[1],p[2]);
 gl.bindTexture(gl.TEXTURE_2D,textures[name]);gl.drawArrays(gl.TRIANGLES,0,6);
 }
 }

}
return {render,resize,destroy(){Object.values(textures).forEach(t=>gl.deleteTexture(t));gl.deleteBuffer(buffer);gl.deleteProgram(program);}};
}
// Fit the study into scene 02, with a readable hold before the next scene.
export function whyTypographyTime(seconds) {
 if(seconds<10.9)return -1;
 return Math.min(2.82,(seconds-10.9)/2);
}
