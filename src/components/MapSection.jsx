// 학습용 설명: 지역별 구·군 공고 수를 지도/목록으로 보여주고 선택하게 하는 부품입니다.
// 큰 흐름: counts 집계 → 평균과 비교해 색 결정 → 지도/목록 버튼 생성 → 클릭한 구·군을 부모에 전달.

import { useState } from 'react';
import '../styles/map.css';
import { regionMaps } from '../data/regionMaps';
import { regionMapPositions } from '../data/regionMapPositions';
export default function MapSection({
  region,
  counts,
  districts = [],
  onDistrict
}) {
  // region 이름으로 어떤 지도 이미지를 쓸지 찾습니다.
  const mapImage = regionMaps[region];

  // counts 예: { 해운대구: 91, 수영구: 71 }
  const entries = Object.entries(counts);
  const totalCount = entries.reduce((sum, [, count]) => sum + count, 0);
  const averageCount = entries.length ? totalCount / entries.length : 0;

  // 한 구·군이 전체 지역 결과 중 몇 %인지 계산합니다.
  function share(count) {
    return totalCount > 0 ? count / totalCount * 100 : 0;
  }

  // 한 구·군 공고 수가 그 지역의 평균보다 몇 % 수준인지 계산합니다.
  function relativeToAverage(count) {
    return averageCount > 0 ? count / averageCount * 100 : 0;
  }

  // 모든 도시가 똑같은 90% / 110% 기준을 사용합니다.
  // 도시마다 따로 경계값을 끼워 맞추지 않습니다.
  function markerLevel(count) {
    const percent = share(count);
    const relative = relativeToAverage(count);
    if (relative >= 110) return {
      marker: '#ca4242',
      percent,
      relative
    };
    if (relative >= 90) return {
      marker: '#ef8435',
      percent,
      relative
    };
    return {
      marker: '#2f8b69',
      percent,
      relative
    };
  }
  const legend = ['평균의 90% 미만', '평균의 90~110%', '평균의 110% 이상'];

  // 지도 이미지는 실제 지도 좌표가 아니라 일러스트라서, 마커 위치도 미리 정한 %값을 씁니다.
  const positions = regionMapPositions[region] || {};
  const hasPositions = entries.every(([name]) => positions[name]);

  // view는 지도/목록 중 무엇을 보고 있는지, zoom은 지도 확대 배율을 기억합니다.
  const [view, setView] = useState('map');
  const [zoom, setZoom] = useState(1);
  const selectedLabel = districts.length === 1 ? `${districts[0]} 선택됨` : districts.length > 1 ? `${districts.length}개 구 선택됨` : '';
  function isSelected(name) {
    return districts.includes(name);
  }

  // 확대/선택을 처음 상태로 되돌립니다.
  function resetMap() {
    setZoom(1);
    if (districts.length) onDistrict('', {
      multiple: true
    });
  }
  return <section className="map-section" aria-label={`${region} 지역 채용 현황`}>
      {/* 지도 상단 제목과 지도/목록 전환 버튼 */}
      <div className="map-heading">
        <svg className="map-chart-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M2 9h4v14H2zm8-6h4v20h-4zm8 3h4v17h-4z" fill="currentColor" />
        </svg>

        <h2>{region} 지역 채용 현황</h2>
        <p>
          {selectedLabel ? `${selectedLabel} · 목록에서는 여러 구를 함께 선택할 수 있습니다.` : '데모 지역 집계 · 실제 지리 좌표가 아닙니다.'}
        </p>

        <div className="map-view-options" aria-label={`${region} 지도 보기 형식`}>
          <button type="button" className={view === 'map' ? 'map-view-selected' : ''} aria-pressed={view === 'map'} onClick={() => setView('map')}>
            지도
          </button>
          <button type="button" className={view === 'list' ? 'map-view-selected' : ''} aria-pressed={view === 'list'} onClick={() => setView('list')}>
            목록
          </button>
        </div>
      </div>

      <div className="map-image-frame">
        {/* 지도 이미지와 마커 위치가 모두 준비된 경우에만 실제 지도모드를 그립니다. */}
        {view === 'map' && mapImage && hasPositions ? <>
            <div className="map-layer" style={{
          transform: `scale(${zoom})`
        }}>
              <img className="region-map" src={mapImage} alt={`${region} 지도 일러스트. 마커는 예시 위치입니다.`} />

              {/* 각 구·군을 지도 위 클릭 가능한 마커로 바꿉니다. */}
              {entries.map(([name, count]) => {
            const level = markerLevel(count);
            const point = {
              left: `${positions[name][0]}%`,
              top: `${positions[name][1]}%`
            };
            return <button type="button" key={name} className={`district-marker${isSelected(name) ? ' is-active' : ''}`} style={{
              ...point,
              '--marker-color': level.marker
            }} title={`${name} ${count}건 · ${region} 조건 결과 ${totalCount.toLocaleString()}건 중 ${level.percent.toFixed(1)}% · 지역 평균 대비 ${level.relative.toFixed(0)}%`} aria-pressed={isSelected(name)}
            // 지도 마커는 한 번에 한 구·군만 선택합니다.
            onClick={() => onDistrict(name, {
              multiple: false
            })}>
                    {name} <strong>{count}건</strong>
                  </button>;
          })}
            </div>

            {/* 블러 효과는 없고, 색깔 마커의 의미만 범례로 설명합니다. */}
            {entries.length > 0 && <div className="map-heat-legend" aria-label={`${region} 내 상대 분포: 초록 ${legend[0]}, 주황 ${legend[1]}, 빨강 ${legend[2]}`}>
                <span>{region} 구·군 평균 {averageCount.toFixed(1)}건 기준</span>
                <span><i className="heat-low" />{legend[0]}</span>
                <span><i className="heat-medium" />{legend[1]}</span>
                <span><i className="heat-high" />{legend[2]}</span>
              </div>}

            {/* 지도 확대/축소와 초기화 버튼 */}
            <div className="map-controls">
              <div className="map-zoom-controls">
                <button type="button" aria-label="지도 확대" disabled={zoom >= 1.6} onClick={() => setZoom(value => Math.min(1.6, value + 0.2))}>
                  +
                </button>
                <button type="button" aria-label="지도 축소" disabled={zoom <= 1} onClick={() => setZoom(value => Math.max(1, value - 0.2))}>
                  −
                </button>
              </div>

              <button type="button" className="map-location-button" aria-label="지도와 지역 선택 초기화" onClick={resetMap}>
                ↺
              </button>
            </div>
          </> : (/* 목록 모드는 여러 구·군을 동시에 선택할 수 있습니다. */
      <div className="district-summary">
            {view === 'map' && <p>{region} 지도 또는 구·군 표시 위치가 준비되지 않아 목록으로 표시합니다.</p>}

            {view === 'list' && <p className="district-list-guide">
                구·군을 여러 개 체크하면 해당 지역 공고를 함께 볼 수 있습니다.
              </p>}

            {entries.map(([name, count]) => <button type="button" key={name} aria-pressed={isSelected(name)} onClick={() => onDistrict(name, {
          multiple: true
        })}>
                <span className="district-list-name">
                  <i aria-hidden="true">{isSelected(name) ? '✓' : ''}</i>
                  {name}
                </span>
                <strong>{count}건</strong>
              </button>)}

            {!entries.length && <p>해당 조건의 지역 공고가 없습니다.</p>}
          </div>)}
      </div>
    </section>;
}
