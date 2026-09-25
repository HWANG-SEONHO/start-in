(() => {
  'use strict';

  /* --------------------------------------------------------------------------
   * 01. DOM helpers / responsive master-canvas scaling
   * ----------------------------------------------------------------------- */
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const MASTER_WIDTH = 1920;
  const MASTER_HEIGHT = 1080;
  const DESIGN_WIDTH = 1763.5555555556;

  const fitCanvas = () => {
    const frameWidth = Math.min(MASTER_WIDTH, document.documentElement.clientWidth);
    const scale = frameWidth / DESIGN_WIDTH;

    $('#design-canvas').style.transform = `scale(${scale})`;
    $('#viewport-frame').style.width = `${frameWidth}px`;
    $('#viewport-frame').style.height = `${MASTER_HEIGHT * frameWidth / MASTER_WIDTH}px`;
  };

  fitCanvas();
  window.addEventListener('resize', fitCanvas);

  /* --------------------------------------------------------------------------
   * 02. Inline SVG icon set
   * ----------------------------------------------------------------------- */
  const icons = {
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4M11 2h2"/>',
    search: '<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
    arrow: '<path d="M3 12h18m-7-7 7 7-7 7"/>',
    document: '<path d="M5 2h10l5 5v15H5Z" fill="currentColor" stroke="none"/><path d="M14 3v5h5M8 11h8M8 15h8M8 19h6" stroke="white" stroke-width="1.5"/>',
    building: '<path d="M4 21V5l8-3v19M12 8h7v13M2 21h20M7 6v1m0 3v1m0 3v1m0 3v1m9-8v1m0 3v1m0 3v1"/>',
    people: '<circle cx="12" cy="6" r="3.7" fill="currentColor" stroke="none"/><circle cx="3.5" cy="8" r="2.8" fill="currentColor" stroke="none"/><circle cx="20.5" cy="8" r="2.8" fill="currentColor" stroke="none"/><path d="M6 22v-5a6 6 0 0 1 12 0v5ZM0 20v-5q0-5 5-4M24 20v-5q0-5-5-4" fill="currentColor" stroke="none"/>',
    sparkles: '<path d="M9 8c1.2 6.5 2.5 7.8 9 9-6.5 1.2-7.8 2.5-9 9C7.8 19.5 6.5 18.2 0 17c6.5-1.2 7.8-2.5 9-9ZM18 0c.7 4.3 1.7 5.3 6 6-4.3.7-5.3 1.7-6 6-.7-4.3-1.7-5.3-6-6 4.3-.7 5.3-1.7 6-6Z" fill="currentColor" stroke="none"/>',
    shield: '<path d="m12 2 9 4v7c0 5-9 9-9 9S3 18 3 13V6Z" fill="currentColor" stroke="none"/><path d="m7.5 12 3 3 6-7" stroke="white"/>',
    pin: '<path d="M12 23S3 13.5 3 8.5a9 9 0 0 1 18 0C21 13.5 12 23 12 23Z" fill="currentColor" stroke="none"/><circle cx="12" cy="8" r="3" stroke="white"/>',
    reset: '<path d="M20 9a8 8 0 0 0-14-5L3 7m0-5v5h5M4 15a8 8 0 0 0 14 5l3-3m0 5v-5h-5"/>',
    briefcase: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V3h8v4M3 12l9 3 9-3M10 13v4h4v-4"/>',
    layers: '<path d="m2 8 10-6 10 6-10 6ZM2 12l10 6 10-6M2 16l10 6 10-6"/>',
    person: '<circle cx="12" cy="6" r="4"/><path d="M3 22v-2a9 9 0 0 1 18 0v2Z"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6h4"/>',
    remote: '<path d="M6 8h12v11H6ZM9 19v3h6v-3M2 11h4m12 0h4M2 15h4m12 0h4M5 3l2 2m10 0 2-2M10 2v3m4-3v3"/><circle cx="12" cy="11" r="2"/>',
    gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v10h14V12M12 8v14M12 8C4 9 5 0 9 2c3 1 3 6 3 6Zm0 0c8 1 7-8 3-6-3 1-3 6-3 6Z"/>',
    chart: '<path d="M3 21V11q0-2 2-2h2v12ZM10 21V5q0-2 2-2h2v18ZM17 21V8q0-2 2-2h2v15Z" fill="currentColor" stroke="none"/>',
    navigation: '<path d="m3 10 18-7-7 18-3-8Z"/>'
  };

  $$('[data-icon]').forEach((element) => {
    const viewBoxHeight = element.dataset.icon === 'sparkles' ? 27 : 24;
    element.innerHTML = `<svg viewBox="0 0 24 ${viewBoxHeight}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[element.dataset.icon] || icons.briefcase}</svg>`;
  });

  /* --------------------------------------------------------------------------
   * 03. General recruitment filters
   * React 전환 시 이 배열을 API/상태 데이터로 교체하면 된다.
   * ----------------------------------------------------------------------- */
  const groups = [
    {
      id: 'region', label: '지역', icon: 'building',
      parts: [{
        key: 'region',
        values: ['부산', '서울', '경기', '인천', '대구', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'],
        selected: ['부산']
      }]
    },
    {
      id: 'role', label: '직무', icon: 'briefcase',
      parts: [{
        key: 'role',
        values: ['경영·사무', '영업·판매', 'IT·개발', '마케팅·광고', '디자인', '생산·제조', '물류·운송', '교육', '의료·보건', '건설·시설', '금융·보험', '서비스', '연구·R&D', '미디어·문화', '기타'],
        selected: ['경영·사무']
      }]
    },
    {
      id: 'education', label: '학력', icon: 'layers',
      parts: [
        {
          key: 'education',
          values: ['무관', '고졸 이상', '초대졸 이상', '대졸 이상', '석사 이상', '박사 이상'],
          selected: ['무관']
        },
        {
          key: 'qualification', label: '지원조건',
          values: ['전공무관', '관련전공', '자격증 우대', '외국어 우대', '컴퓨터활용 우대'],
          selected: ['전공무관']
        }
      ]
    },
    {
      id: 'career', label: '경력', icon: 'person',
      parts: [
        {
          key: 'career',
          values: ['경력무관', '신입', '1~3년', '3~5년', '5~10년', '10년 이상'],
          selected: ['경력무관']
        },
        {
          key: 'employment', label: '고용형태',
          values: ['정규직', '계약직', '인턴', '아르바이트', '프리랜서'],
          selected: ['정규직']
        },
        {
          key: 'workplace', label: '근무형태',
          values: ['오피스', '재택근무', '하이브리드'],
          selected: ['오피스']
        }
      ]
    },
    {
      id: 'salary', label: '급여', icon: 'clock',
      parts: [
        {
          key: 'salary',
          values: ['전체', '회사내규', '3천만원 이상', '4천만원 이상', '5천만원 이상', '7천만원 이상', '1억원 이상'],
          selected: ['전체']
        },
        {
          key: 'payType', label: '급여형태',
          values: ['연봉', '월급', '시급', '일급'],
          selected: ['연봉']
        }
      ]
    },
    {
      id: 'workCondition', label: '근무조건', icon: 'remote',
      parts: [
        {
          key: 'workCondition',
          values: ['무관', '주5일', '유연근무', '재택가능', '교대근무', '주말근무 없음'],
          selected: ['무관']
        },
        {
          key: 'size', label: '기업형태',
          values: ['스타트업', '중소기업', '중견기업', '대기업', '공기업', '외국계'],
          selected: []
        }
      ]
    },
    {
      id: 'welfare', label: '복리후생', icon: 'gift',
      parts: [
        {
          key: 'welfare',
          values: ['유연근무', '식대지원', '재택근무', '교육비지원', '건강검진', '성과급', '휴가비', '경조사지원'],
          selected: []
        },
        {
          key: 'industry', label: '산업군',
          values: ['IT·정보통신', '제조', '금융', '유통·서비스', '건설', '의료'],
          selected: []
        }
      ]
    }
  ];

  let inputIndex = 0;
  $('#filters').innerHTML = groups.map((row) => `
    <div class="filter-row" data-row="${row.id}">
      <span class="filter-label">
        <i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[row.icon]}</svg></i>
        ${row.label}
      </span>
      ${row.parts.map((group) => `
        <div class="filter-group" data-group="${group.key}" role="group" aria-label="${group.label || row.label}">
          ${group.label ? `<strong>${group.label}</strong>` : ''}
          ${group.values.map((value) => `
            <label class="filter-chip">
              <input id="filter-${inputIndex++}" type="checkbox" name="${group.key}" value="${value}" ${group.selected.includes(value) ? 'checked' : ''}>
              <span class="check-mark" aria-hidden="true"></span>${value}
            </label>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `).join('');

  /* --------------------------------------------------------------------------
   * 04. Shared feedback helpers
   * ----------------------------------------------------------------------- */
  const toast = (message) => {
    const element = $('#toast');
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 3000);
  };

  const dialog = (title, text) => {
    $('#dialog-title').textContent = title;
    $('#dialog-body').textContent = text;
    $('#info-dialog').showModal();
  };

  $('.dialog-confirm').addEventListener('click', () => $('#info-dialog').close());
  $('#info-dialog').addEventListener('click', (event) => {
    if (event.target !== $('#info-dialog')) return;
    const rect = event.target.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) event.target.close();
  });

  /* --------------------------------------------------------------------------
   * 05. Search / filter prototype interactions
   * ----------------------------------------------------------------------- */
  const jobs = $$('.job-row');
  jobs.forEach((row, index) => { row.dataset.initialOrder = index; });
  const headingCount = $('#jobs-title strong');

  const searchJobs = () => {
    const query = $('#search-input').value.trim().toLowerCase();
    const tokens = query.split(/\s+/).filter(Boolean);
    let visibleCount = 0;

    jobs.forEach((row) => {
      const text = row.textContent.toLowerCase();
      const visible = !tokens.length || tokens.some((token) => text.includes(token));
      row.hidden = !visible;
      row.style.display = visible ? '' : 'none';
      if (visible) visibleCount += 1;
    });

    headingCount.textContent = query ? `${visibleCount}건` : '1,248건';
    toast(query ? `시안에 있는 예시 공고 ${visibleCount}건을 검색했습니다.` : '전체 예시 공고를 표시했습니다.');
  };

  $('#search-form').addEventListener('submit', (event) => {
    event.preventDefault();
    searchJobs();
  });

  $$('.suggestions [data-query]').forEach((button) => {
    button.addEventListener('click', () => {
      $('#search-input').value = button.dataset.query;
      $('#search-input').focus();
    });
  });

  $('#filters').addEventListener('change', () => {
    const selectedCount = $$('#filters input:checked').length;
    toast(`선택한 조건 ${selectedCount}개 · 시안의 선택 상태가 변경되었습니다.`);
  });

  $('#reset-filters').addEventListener('click', () => {
    $('#filters').reset();
    $('#search-input').value = '';
    jobs.forEach((job) => {
      job.hidden = false;
      job.style.display = '';
    });
    headingCount.textContent = '1,248건';
    toast('처음 시안의 조건으로 돌아왔습니다.');
  });

  /* --------------------------------------------------------------------------
   * 06. Job result prototype interactions
   * ----------------------------------------------------------------------- */
  $$('[data-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!['salary', 'latest'].includes(button.dataset.sort)) {
        dialog(button.textContent, '해당 정렬에는 실제 조회수·지원자 수·매칭 점수 데이터가 필요합니다. 현재 파일은 시안에 있는 예시 공고 5건을 포함합니다.');
        return;
      }

      $$('[data-sort]').forEach((item) => {
        item.classList.toggle('is-active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });

      const ordered = [...jobs].sort((a, b) => {
        if (button.dataset.sort === 'salary') return Number(b.dataset.salary) - Number(a.dataset.salary);
        return Number(a.dataset.initialOrder) - Number(b.dataset.initialOrder);
      });

      ordered.forEach((row) => $('.jobs-list').append(row));
    });
  });

  let savedJobs = [];
  try {
    savedJobs = JSON.parse(localStorage.getItem('startin-saved') || '[]');
    if (!Array.isArray(savedJobs)) savedJobs = [];
  } catch {
    savedJobs = [];
  }

  $$('[data-bookmark]').forEach((button) => {
    button.setAttribute('aria-pressed', String(savedJobs.includes(button.dataset.bookmark)));
    button.addEventListener('click', () => {
      const active = button.getAttribute('aria-pressed') !== 'true';
      button.setAttribute('aria-pressed', String(active));
      savedJobs = active
        ? [...new Set([...savedJobs, button.dataset.bookmark])]
        : savedJobs.filter((id) => id !== button.dataset.bookmark);

      try {
        localStorage.setItem('startin-saved', JSON.stringify(savedJobs));
      } catch {
        // localStorage가 차단된 환경에서는 현재 세션의 버튼 상태만 유지한다.
      }

      toast(active ? '관심 공고에 저장했습니다.' : '관심 공고에서 해제했습니다.');
    });
  });

  /* --------------------------------------------------------------------------
   * 07. Busan map prototype
   * x/y는 map-body 기준 퍼센트 좌표. React 전환 시 API 좌표 데이터로 교체 가능.
   * ----------------------------------------------------------------------- */
  const districts = [
    ['강서구', 18, 14, 42],
    ['북구', 24, 44, 19],
    ['금정구', 48, 59, 15],
    ['동래구', 121, 73, 24],
    ['해운대구', 186, 87, 31],
    ['사상구', 36, 31, 35],
    ['연제구', 72, 55, 38],
    ['수영구', 95, 78, 47],
    ['서구', 28, 39, 57],
    ['중구', 30, 52, 58],
    ['남구', 47, 67, 55],
    ['사하구', 52, 22, 65],
    ['영도구', 29, 71, 75]
  ];

  const levelClass = (count) => {
    if (count >= 121) return 'is-high';
    if (count >= 71) return 'is-mid';
    return 'is-low';
  };

  $('.district-hotspots').innerHTML = districts.map(([name, count, x, y]) => `
    <button
      type="button"
      class="${levelClass(count)}"
      data-district="${name}"
      aria-label="${name}, 공고 ${count}건"
      style="left:${x}%;top:${y}%"
    >
      <span>${name}</span><strong>${count}</strong>
    </button>
  `).join('');

  $('#district-list').innerHTML = districts.map(([name, count]) => `
    <button type="button" data-district="${name}">${name}<strong>${count}건</strong></button>
  `).join('');

  $$('[data-district]').forEach((button) => {
    button.addEventListener('click', () => {
      $$('[data-district]').forEach((item) => item.classList.toggle('is-selected', item.dataset.district === button.dataset.district));
      const count = districts.find(([name]) => name === button.dataset.district)[1];
      toast(`${button.dataset.district} · ${count}건 (시안 기준)`);
    });
  });

  $$('[data-map-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const showList = button.dataset.mapTab === 'list';
      $('#map-view').hidden = showList;
      $('#district-list').hidden = !showList;

      $$('[data-map-tab]').forEach((item) => {
        item.classList.toggle('is-active', item === button);
        item.setAttribute('aria-pressed', String(item === button));
      });
    });
  });

  let mapZoom = 1;
  $$('[data-map-zoom]').forEach((button) => {
    button.addEventListener('click', () => {
      const delta = Number(button.dataset.mapZoom);
      mapZoom = delta === 0 ? 1 : Math.max(1, Math.min(1.6, mapZoom + delta * 0.15));
      $('.map-art').style.transform = `scale(${mapZoom})`;
      $('.district-hotspots').style.transform = `scale(${mapZoom})`;
    });
  });

  /* --------------------------------------------------------------------------
   * 08. Placeholder dialogs for features that move to React/API later
   * ----------------------------------------------------------------------- */
  $$('[data-dialog]').forEach((button) => {
    button.addEventListener('click', () => {
      const title = button.dataset.dialog;
      const message = title.includes('검색')
        ? '희망 지역, 직무, 경력, 급여 등을 검색창에 입력해 보세요.\n현재 파일에서는 시안의 공고 5건을 대상으로 키워드 검색을 체험할 수 있습니다. 실제 AI 서비스는 연결되어 있지 않습니다.'
        : `${title} 화면으로 연결할 버튼입니다.\n현재 파일은 메인 화면을 HTML/CSS/JavaScript로 구현한 React 전 단계 시안입니다.`;
      dialog(title, message);
    });
  });

  $('.jobs-explain').addEventListener('click', () => {
    dialog('AI 추천 결과란?', '시안에 표시된 기업명·공고·연봉·건수는 디자인 예시입니다.\n현재 채용 중인 실제 정보나 AI 분석 결과가 아닙니다.');
  });

  $('[data-action="more-jobs"]').addEventListener('click', () => {
    dialog('채용공고', '현재 HTML에는 시안의 예시 공고 5건이 포함되어 있습니다. 추가 공고는 서비스 데이터 연결 후 제공할 수 있습니다.');
  });
})();
