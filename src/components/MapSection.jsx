import { useState } from 'react';
import '../styles/map.css';

const markerPositions = { '해운대구': [77, 46], '수영구': [63, 61], '금정구': [62, 22], '부산진구': [45, 51], '강서구': [23, 45] };
export default function MapSection({ region, counts, district, onDistrict }) {
  const [view, setView] = useState('map');
  const [zoom, setZoom] = useState(1);
  return <section className="map-section" aria-label={`${region} 지역 채용 현황`}>
    <div className="map-heading">
      <svg className="map-chart-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 9h4v14H2zm8-6h4v20h-4zm8 3h4v17h-4z" fill="currentColor" /></svg>
      <h2>{region} 지역 채용 현황</h2>
      <p>{district ? `${district} 선택됨 · 다시 누르면 전체 보기` : '데모 지역 집계 · 실제 지리 좌표가 아닙니다.'}</p>
      <div className="map-view-options" aria-label={`${region} 지도 보기 형식`}>
        <button type="button" className={view === 'map' ? 'map-view-selected' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')}>지도</button>
        <button type="button" className={view === 'list' ? 'map-view-selected' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}>목록</button>
      </div>
    </div>
    <div className="map-image-frame">
      {view === 'map' && region === '부산' ? <>
        <div className="map-layer" style={{ transform: `scale(${zoom})` }}>
          <img className="busan-map" src="/images/busan-map-wide.png" alt="부산 지도 일러스트. 마커는 예시 위치입니다." />
          {Object.entries(counts).map(([name, count]) => <button key={name} type="button" className={`district-marker${district === name ? ' is-active' : ''}`} style={{ left: `${(markerPositions[name] || [50, 50])[0]}%`, top: `${(markerPositions[name] || [50, 50])[1]}%`, '--density': Math.min(.9, .4 + count * .1) }} aria-pressed={district === name} onClick={() => onDistrict(name)}>{name} <strong>{count}건</strong></button>)}
        </div>
        <div className="map-controls"><div className="map-zoom-controls">
          <button type="button" aria-label="지도 확대" disabled={zoom >= 1.6} onClick={() => setZoom(value => Math.min(1.6, value + .2))}>+</button>
          <button type="button" aria-label="지도 축소" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - .2))}>−</button>
        </div><button type="button" className="map-location-button" aria-label="지도와 지역 선택 초기화" onClick={() => { setZoom(1); onDistrict(''); }}>↺</button></div>
      </> : <div className="district-summary">
        {view === 'map' && <p>{region} 지도 원본이 없어 지역별 집계로 표시합니다.</p>}
        {Object.entries(counts).map(([name, count]) => <button type="button" key={name} aria-pressed={district === name} onClick={() => onDistrict(name)}>{name}<strong>{count}건</strong></button>)}
        {!Object.keys(counts).length && <p>해당 조건의 지역 공고가 없습니다.</p>}
      </div>}
    </div>
  </section>;
}
