import { useEffect, useRef, useState } from 'react';
import { getJobs } from '../services/api';
import { regionMaps } from '../data/regionMaps';
import { regionMapPositions } from '../data/regionMapPositions';
import '../styles/national-map.css';
import '../styles/connected-region-map.css';

// 수도권 세 지역으로 연결·확대 구도를 먼저 확인하는 시안입니다.
const tiles = [
  {name:'인천',x:0,y:210},
  {name:'서울',x:345,y:45},
  {name:'경기',x:690,y:210},
];
const tileWidth = 310, tileHeight = 220;
export default function ConnectedRegionMap({search}) {
  const frame = useRef(null);
  const drag = useRef(null);
  const [size,setSize] = useState({width:800,height:450});
  const [focus,setFocus] = useState(null);
  const [camera,setCamera] = useState({scale:.75,x:0,y:0});
  const [dragging,setDragging] = useState(false);
  const [counts,setCounts] = useState(null);
  const [error,setError] = useState('');
  const countKey = JSON.stringify({filters:{...search.filters,region:[]},query:search.query,ai:search.ai});
  useEffect(()=>{
    const controller = new AbortController();
    getJobs({...JSON.parse(countKey),districts:{},pageSize:1,signal:controller.signal})
      .then(result=>{setCounts(result.district_counts);setError('');})
      .catch(e=>{if(e.name!=='AbortError')setError('공고 집계를 불러오지 못했습니다.');});
    return()=>controller.abort();
  },[countKey]);
  useEffect(()=>{
    const observer = new ResizeObserver(([entry])=>setSize({width:entry.contentRect.width,height:entry.contentRect.height}));
    observer.observe(frame.current);
    return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const tile = tiles.find(item=>item.name===focus);
    const scale = tile ? Math.min((size.width-110)/tileWidth,(size.height-84)/tileHeight) : Math.min((size.width-36)/1000,(size.height-52)/475);
    setCamera({scale,x:size.width/2-(tile?tile.x+tileWidth/2:500)*scale,y:size.height/2-(tile?tile.y+tileHeight/2:237.5)*scale});
  },[focus,size.width,size.height]);
  function choose(name) {
    setFocus(name);
    if(!search.filters.region?.includes(name))search.toggle('region',name);
  }
  function beginDrag(event) {
    if(event.target.closest('button'))return;
    drag.current={x:event.clientX,y:event.clientY,camera};
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  }
  function moveDrag(event) {
    if(!drag.current)return;
    const origin=drag.current;
    setCamera({...origin.camera,x:origin.camera.x+event.clientX-origin.x,y:origin.camera.y+event.clientY-origin.y});
  }
  function endDrag(){drag.current=null;setDragging(false);}
  return <section className="national-map connected-map" aria-label="연결형 지역 지도 시안">
    <header><div><small>CONNECTED REGIONS / PREVIEW</small><h2>{focus?`${focus} 채용 지도`:'지역을 따라, 기회를 찾아'}</h2></div><button type="button" onClick={()=>setFocus(null)}>전체 연결 보기</button></header>
    <div className={`connected-map-frame${dragging?' is-dragging':''}`} ref={frame} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
      <div className="connected-map-world" style={{transform:`translate(${camera.x}px,${camera.y}px) scale(${camera.scale})`}}>
        <svg className="connected-map-links" viewBox="0 0 1000 475" aria-hidden="true"><path d="M310 320H327V155H345M655 155H672V320H690"/><circle cx="327" cy="237" r="5"/><circle cx="672" cy="237" r="5"/></svg>
        {tiles.map(tile=>{
          const entries=Object.entries(counts?.[tile.name] || {});
          const total=counts===null?'—':entries.reduce((sum,[,count])=>sum+count,0).toLocaleString();
          const active=tile.name===focus;
          const positions=regionMapPositions[tile.name] || {};
          return <article key={tile.name} className={`connected-map-tile${active?' is-focused':''}${focus&&!active?' is-neighbor':''}`} style={{left:tile.x,top:tile.y}}>
            <button type="button" className="connected-map-tile-open" onClick={()=>choose(tile.name)} aria-label={`${tile.name} 지도 확대`} aria-pressed={active}>
              <img src={regionMaps[tile.name]} alt={`${tile.name} 지역 일러스트`} draggable="false"/>
              <span className="connected-map-tile-heading"><b>{tile.name}</b><span>{total}건 <i aria-hidden="true">↗</i></span></span>
            </button>
            {active&&entries.map(([name,count])=>positions[name]&&<button type="button" key={name} className="connected-map-district" style={{left:`${positions[name][0]}%`,top:`${positions[name][1]}%`,transform:`translate(-50%,-50%) scale(${1/camera.scale})`}} aria-pressed={!!search.districts[tile.name]?.includes(name)} onClick={()=>search.selectDistrict(tile.name,name,{multiple:true})}>{name} <b>{count}건</b></button>)}
          </article>;
        })}
      </div>
      <p className="connected-map-hint">{focus?'주변 지역은 드래그로 이어서 살펴보세요':'지역 박스를 누르면 그 박스가 커집니다'}</p>
    </div>
    <nav className="connected-map-navigation" aria-label="연결된 지역">{tiles.map(tile=><button type="button" key={tile.name} aria-pressed={focus===tile.name} onClick={()=>choose(tile.name)}>{tile.name}<span aria-hidden="true">↗</span></button>)}</nav>
    <footer><span>수도권 3개 지역 연결 시안</span><small>기존 이미지 사용 · 실제 지리 배치가 아닌 탐색 구도</small></footer>
    {error&&<p role="status">{error}</p>}
  </section>;
}
