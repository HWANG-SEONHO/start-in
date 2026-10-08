import { useEffect, useMemo, useRef, useState } from 'react';
import atlas from '../data/nationalMap.json';
import { getJobs } from '../services/api';
import '../styles/national-map.css';

// 일러스트 구도에 맞춘 표시 위치입니다. 실제 행정경계 좌표와 구분합니다.
const artworkAnchors = {
  서울:[307,134], 인천:[285,145], 경기:[330,121], 강원:[449,80],
  충남:[286,205], 세종:[342,193], 대전:[350,216], 충북:[388,179],
  전북:[315,266], 광주:[293,306], 전남:[324,338], 경북:[472,210],
  대구:[454,263], 경남:[437,309], 울산:[522,280], 부산:[516,310], 제주:[298,402],
};
const illustrationRegions = atlas.regions.map(region => {
  const anchor = artworkAnchors[region.name];
  const project = ([x,y]) => [anchor[0]+80+(x-region.center[0])*.45,anchor[1]+(y-region.center[1])*.45];
  return {...region,center:[anchor[0]+80,anchor[1]],bounds:[...project(region.bounds.slice(0,2)),...project(region.bounds.slice(2))]};
});
function districtCenter(region, center) {
  const original = atlas.regions.find(point => point.name === region);
  const anchor = artworkAnchors[region];
  return [anchor[0]+80+(center[0]-original.center[0])*.45,anchor[1]+(center[1]-original.center[1])*.45];
}

// 지도는 하나만 유지합니다. 선택한 경계의 합집합에 카메라를 맞춥니다.
function fitCamera(regions, width, height) {
  if (!regions.length) {
    const scale = Math.min(width/800,height/450);
    return {scale,x:(width-800*scale)/2,y:(height-450*scale)/2};
  }
  const boxes = regions.length ? regions.map(r => r.bounds) : [[80,0,880,450]];
  const left = Math.min(...boxes.map(b => b[0])) - 80;
  const top = Math.min(...boxes.map(b => b[1]));
  const right = Math.max(...boxes.map(b => b[2])) - 80;
  const bottom = Math.max(...boxes.map(b => b[3]));
  const scale = Math.min(4.5,(width-130)/(right-left+50),(height-100)/(bottom-top+50));
  return { scale, x: width/2-(left+right)/2*scale, y: height/2-(top+bottom)/2*scale };
}

// 숫자 말풍선은 화면 크기를 유지하며 서로 겹치지 않는 가까운 자리를 찾습니다.
function placeLabels(points, camera, width, height) {
  const placed = [];
  for (const point of points) {
    const anchorX = (point.center[0]-80)*camera.scale+camera.x;
    const anchorY = point.center[1]*camera.scale+camera.y;
    if(anchorX < -20 || anchorX > width+20 || anchorY < -20 || anchorY > height+20) continue;
    for (let trial=0;trial<160;trial++) {
      const angle=trial*2.4, radius=trial ? 12*Math.sqrt(trial) : 0;
      const x=Math.max(48,Math.min(width-48,anchorX+Math.cos(angle)*radius));
      const y=Math.max(24,Math.min(height-65,anchorY+Math.sin(angle)*radius));
      if(placed.some(p=>Math.abs(p.x-x)<96 && Math.abs(p.y-y)<43)) continue;
      placed.push({...point,x,y,anchorX,anchorY}); break;
    }
  }
  return placed;
}

export default function NationalMap({ search }) {
  const frame = useRef(null);
  const drag = useRef(null);
  const overview = useRef(false);
  const previousSelection = useRef(null);
  const [size,setSize] = useState({width:720,height:450});
  const [camera,setCamera] = useState({scale:.4,x:200,y:0});
  const [dragging,setDragging] = useState(false);
  const [country,setCountry] = useState(null);
  const [error,setError] = useState('');
  const selected = search.filters.region || [];
  const selectedKey = selected.join('|');
  // 지역 선택과 별도로, 같은 직무·급여 조건의 전국 집계를 가져옵니다.
  const countKey=JSON.stringify({filters:{...search.filters,region:[]},query:search.query,ai:search.ai});
  useEffect(()=>{
    const controller=new AbortController();
    getJobs({...JSON.parse(countKey),districts:{},pageSize:1,signal:controller.signal})
      .then(result=>{setCountry(result.district_counts);setError('');})
      .catch(e=>{if(e.name!=='AbortError')setError('전국 집계를 불러오지 못했습니다.');});
    return()=>controller.abort();
  },[countKey]);
  useEffect(()=>{
    const observer=new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(frame.current); return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    if (previousSelection.current !== selectedKey) overview.current = false;
    previousSelection.current = selectedKey;
    setCamera(fitCamera(overview.current ? [] : illustrationRegions.filter(r=>selected.includes(r.name)),size.width,size.height));
  },[selectedKey,size.width,size.height]);

  const counts=country || search.results[0]?.district_counts || {};
  const showDistricts=camera.scale>1.4 && selected.length>0 && selected.length<=3;
  const points=useMemo(()=>{
    if(!showDistricts) return illustrationRegions.map(r=>({...r,id:r.name,showCount:selected.includes(r.name),count:counts[r.name] ? Object.values(counts[r.name]).reduce((a,b)=>a+b,0) : country ? 0 : null}));
    return selected.flatMap(region=>Object.entries(counts[region] || {}).map(([name,count])=>{
      const matches=atlas.districts.filter(d=>d.region===region&&(d.name===name||d.name.endsWith(name)||d.name.startsWith(name)));
      if(!matches.length) return null;
      const center=[0,1].map(i=>matches.reduce((sum,d)=>sum+d.center[i],0)/matches.length);
      return {id:region+'/'+name,name,region,count,center:districtCenter(region,center),showCount:true};
    }).filter(Boolean));
  },[counts,selectedKey,showDistricts]);
  const labels=placeLabels(points,camera,size.width,size.height);

  function zoom(factor) {
    setCamera(c=>{const scale=Math.min(6,Math.max(.25,c.scale*factor));const ratio=scale/c.scale;
      return {scale,x:size.width/2-(size.width/2-c.x)*ratio,y:size.height/2-(size.height/2-c.y)*ratio};});
  }
  function beginDrag(event) {
    if(event.target.closest('button'))return;
    drag.current={x:event.clientX,y:event.clientY,camera};
    event.currentTarget.setPointerCapture(event.pointerId);setDragging(true);
  }
  function moveDrag(event) {
    if(!drag.current)return;
    const origin=drag.current;
    setCamera({...origin.camera,x:origin.camera.x+event.clientX-origin.x,y:origin.camera.y+event.clientY-origin.y});
  }
  function endDrag(){drag.current=null;setDragging(false);}
  function choose(point) {
    if(point.region) search.selectDistrict(point.region,point.name,{multiple:true});
    else search.toggle('region',point.name);
  }
  return <section className="national-map" aria-label="전국 채용 지도">
    <header><div><small>NATIONWIDE JOBS</small><h2>전국 채용 지도</h2></div><button onClick={()=>{overview.current=true;setCamera(fitCamera([],size.width,size.height));}}>전국 보기</button></header>
    <div ref={frame} className={`national-map-frame${dragging?' is-dragging':''}`} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <div className="national-map-world" style={{transform:`translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`}}>
        <svg viewBox="80 0 800 450" width="800" height="450" aria-hidden="true">
          <image href="/images/national-illustration-clean-v1.png" x="80" y="0" width="800" height="450" preserveAspectRatio="xMidYMid meet"/>
        </svg>
      </div>
      <svg className="national-map-leaders" width={size.width} height={size.height} aria-hidden="true">{labels.filter(p=>p.showCount).map(p=><line key={p.id} x1={p.anchorX} y1={p.anchorY} x2={p.x} y2={p.y}/>)}</svg>
      {labels.map(p=><button key={p.id} className={`national-map-label${!p.showCount?' is-region-name':''}${(p.region?search.districts[p.region]?.includes(p.name):selected.includes(p.name))?' is-active':''}`} style={{left:p.x,top:p.y}} onClick={()=>choose(p)} aria-pressed={p.region?!!search.districts[p.region]?.includes(p.name):selected.includes(p.name)} aria-label={`${p.region||''} ${p.name} ${p.showCount?(p.count===null?'집계 중':p.count+'건'):''}`.trim()}><span>{p.name}</span>{p.showCount && <strong>{p.count===null?'—':p.count.toLocaleString()}<small>건</small></strong>}</button>)}
      <div className="national-map-controls"><button aria-label="지도 확대" onClick={()=>zoom(1.3)}>+</button><button aria-label="지도 축소" onClick={()=>zoom(1/1.3)}>−</button></div>
      <span className="national-map-hint">{showDistricts?'구·군을 눌러 공고를 좁혀보세요':'지역을 추가하면 하나의 지도에서 이어집니다'} · 드래그로 이동</span>
    </div>
    <footer><span>{selected.length?selected.join(' · '):'전국'} 선택{search.loading?' · 공고 갱신 중…':''}</span><small>데모 공고 · 경계: 통계청 2018 / southkorea-maps · 일러스트는 지형 연출</small></footer>
    <div className="national-district-options" aria-label="선택 지역 구군">{showDistricts ? selected.flatMap(region=>Object.entries(counts[region]||{}).map(([name,count])=><button key={region+'/'+name} aria-pressed={!!search.districts[region]?.includes(name)} onClick={()=>search.selectDistrict(region,name,{multiple:true})}>{region} {name} <b>{count}</b></button>)) : <p>확대하면 구·군별 공고 수와 선택 목록이 나타납니다.</p>}</div>
    {error && <p role="status">{error}</p>}
  </section>;
}
