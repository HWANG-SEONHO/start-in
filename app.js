(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  // Native 1920×1080 maximum. Uniform scaling only on smaller viewports.
  const MASTER_WIDTH=1920, MASTER_HEIGHT=1080, DESIGN_WIDTH=1763.5555555556;
  const fit=()=>{
    const width=Math.min(MASTER_WIDTH,document.documentElement.clientWidth);
    const scale=width/DESIGN_WIDTH;
    $('#design-canvas').style.transform=`scale(${scale})`;
    $('#viewport-frame').style.width=`${width}px`;
    $('#viewport-frame').style.height=`${MASTER_HEIGHT*width/MASTER_WIDTH}px`;
  };
  fit();window.addEventListener('resize',fit);
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
  $$('[data-icon]').forEach(el => el.innerHTML = `<svg viewBox="0 0 24 ${el.dataset.icon === 'sparkles' ? 27 : 24}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[el.dataset.icon] || icons.briefcase}</svg>`);
  const groups = [
    {
      id: 'region', label: '지역', icon: 'building',
      parts: [{ key: 'region', values: ['부산','서울','경기','인천','대구','광주','대전','울산','세종','강원','충북','충남','전북','전남','경북','경남','제주'], selected: ['부산'] }]
    },
    {
      id: 'role', label: '직무', icon: 'briefcase',
      parts: [{ key: 'role', values: ['경영·사무','영업·판매','IT·개발','마케팅·광고','디자인','생산·제조','물류·운송','교육','의료·보건','건설·시설','금융·보험','서비스','연구·R&D','미디어·문화','기타'], selected: ['경영·사무'] }]
    },
    {
      id: 'tech', label: '학력', icon: 'layers',
      parts: [
        { key: 'education', values: ['무관','고졸 이상','초대졸 이상','대졸 이상','석사 이상','박사 이상'], selected: ['무관'] },
        { key: 'qualification', label: '지원조건', values: ['전공무관','관련전공','자격증 우대','외국어 우대','컴퓨터활용 우대'], selected: ['전공무관'] }
      ]
    },
    {
      id: 'career', label: '경력', icon: 'person',
      parts: [
        { key: 'career', values: ['경력무관','신입','1~3년','3~5년','5~10년','10년 이상'], selected: ['경력무관'] },
        { key: 'employment', label: '고용형태', values: ['정규직','계약직','인턴','아르바이트','프리랜서'], selected: ['정규직'] },
        { key: 'workplace', label: '근무형태', values: ['오피스','재택근무','하이브리드'], selected: ['오피스'] }
      ]
    },
    {
      id: 'salary', label: '급여', icon: 'clock',
      parts: [
        { key: 'salary', values: ['전체','회사내규','3천만원 이상','4천만원 이상','5천만원 이상','7천만원 이상','1억원 이상'], selected: ['전체'] },
        { key: 'payType', label: '급여형태', values: ['연봉','월급','시급','일급'], selected: ['연봉'] }
      ]
    },
    {
      id: 'remote', label: '근무조건', icon: 'remote',
      parts: [
        { key: 'workCondition', values: ['무관','주5일','유연근무','재택가능','교대근무','주말근무 없음'], selected: ['무관'] },
        { key: 'size', label: '기업형태', values: ['스타트업','중소기업','중견기업','대기업','공기업','외국계'], selected: [] }
      ]
    },
    {
      id: 'welfare', label: '복리후생', icon: 'gift',
      parts: [
        { key: 'welfare', values: ['유연근무','식대지원','재택근무','교육비지원','건강검진','성과급','휴가비','경조사지원'], selected: [] },
        { key: 'industry', label: '산업군', values: ['IT·정보통신','제조','금융','유통·서비스','건설','의료'], selected: [] }
      ]
    }
  ];
  let inputIndex = 0;
  $('#filters').innerHTML = groups.map(row => `<div class="filter-row" data-row="${row.id}"><span class="filter-label"><i><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[row.icon]}</svg></i>${row.label}</span>${row.parts.map(g => `<div class="filter-group" data-group="${g.key}" role="group" aria-label="${g.label || row.label}">${g.label ? `<strong>${g.label}</strong>` : ''}${g.values.map(v => `<label class="filter-chip"><input id="filter-${inputIndex++}" type="checkbox" name="${g.key}" value="${v}" ${g.selected.includes(v) ? 'checked' : ''}><span class="check-mark" aria-hidden="true"></span>${v}</label>`).join('')}${g.more ? `<button type="button" class="filter-more" data-more="${g.key}">+ 더보기</button>` : ''}</div>`).join('')}</div>`).join('');
  const toast = message => { const el=$('#toast'); el.textContent=message; el.classList.add('show'); clearTimeout(toast.timer); toast.timer=setTimeout(()=>el.classList.remove('show'),3000); };
  const dialog = (title, text) => { $('#dialog-title').textContent=title; $('#dialog-body').textContent=text; $('#info-dialog').showModal(); };
  $('.dialog-confirm').addEventListener('click',()=>$('#info-dialog').close());
  $('#info-dialog').addEventListener('click', e => { if(e.target===$('#info-dialog')) {const r=e.target.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) e.target.close();} });
  const jobs=$$('.job-row');
  jobs.forEach((row,i)=>{row.dataset.initialOrder=i;});
  const headingCount=$('#jobs-title strong');
  const search = () => {
    const q=$('#search-input').value.trim().toLowerCase();
    const tokens=q.split(/\s+/).filter(Boolean);
    let n=0;
    jobs.forEach(row=>{const text=row.textContent.toLowerCase(); const show=!tokens.length||tokens.some(t=>text.includes(t)); row.hidden=!show; row.style.display=show?'':'none'; if(show)n++;});
    headingCount.textContent=q?`${n}건`:'1,248건';
    toast(q?`시안에 있는 예시 공고 ${n}건을 검색했습니다.`:'전체 예시 공고를 표시했습니다.');
  };
  $('#search-form').addEventListener('submit', e=>{e.preventDefault();search();});
  $$('.suggestions [data-query]').forEach(b=>b.addEventListener('click',()=>{ $('#search-input').value=b.dataset.query; $('#search-input').focus(); }));
  $('#filters').addEventListener('change',()=>{const n=$$('#filters input:checked').length; toast(`선택한 조건 ${n}개 · 시안의 선택 상태가 변경되었습니다.`);});
  $('#reset-filters').addEventListener('click',()=>{$('#filters').reset();$('#search-input').value='';jobs.forEach(j=>{j.hidden=false;j.style.display='';});headingCount.textContent='1,248건';toast('처음 시안의 조건으로 돌아왔습니다.');});
  $$('[data-more]').forEach(b=>b.addEventListener('click',()=>dialog('상세 조건 더보기','이 HTML은 화면 시안입니다.\n추가 조건과 실제 공고 필터링은 서비스 데이터를 연결하면 사용할 수 있습니다.')));
  $$('[data-sort]').forEach(b=>b.addEventListener('click',()=>{
    if(!['salary','latest'].includes(b.dataset.sort)){dialog(b.textContent,'해당 정렬에는 실제 조회수·지원자 수·매칭 점수 데이터가 필요합니다. 현재 파일은 시안에 있는 예시 공고 5건을 포함합니다.');return;}
    $$('[data-sort]').forEach(x=>{x.classList.toggle('is-active',x===b);x.setAttribute('aria-pressed',String(x===b));});
    const ordered=[...jobs].sort((a,z)=>b.dataset.sort==='salary'?Number(z.dataset.salary)-Number(a.dataset.salary):Number(a.dataset.initialOrder)-Number(z.dataset.initialOrder));
    ordered.forEach(row=>$('.jobs-list').append(row));
  }));
  let saved=[];try{saved=JSON.parse(localStorage.getItem('startin-saved')||'[]');if(!Array.isArray(saved))saved=[];}catch{}
  $$('[data-bookmark]').forEach(b=>{
    b.setAttribute('aria-pressed',String(saved.includes(b.dataset.bookmark)));
    b.addEventListener('click',()=>{const active=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(active));saved=active?[...new Set([...saved,b.dataset.bookmark])]:saved.filter(id=>id!==b.dataset.bookmark);try{localStorage.setItem('startin-saved',JSON.stringify(saved));}catch{}toast(active?'관심 공고에 저장했습니다.':'관심 공고에서 해제했습니다.');});
  });
  const districts=[['강서구',18,69,100,72,52],['북구',24,294,33,72,48],['금정구',48,402,20,73,44],['동래구',121,516,46,77,48],['해운대구',186,641,60,94,56],['사상구',36,197,78,75,47],['연제구',72,381,90,83,48],['수영구',95,553,118,79,48],['서구',28,255,146,72,49],['중구',30,356,151,73,49],['남구',47,463,142,76,48],['사하구',52,124,169,79,50],['영도구',29,495,204,77,48]];
  $('.district-hotspots').innerHTML=districts.map(([name,count,x,y,w,h])=>`<button data-district="${name}" aria-label="${name}, 공고 ${count}건" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px">${name} ${count}건</button>`).join('');
  $('#district-list').innerHTML=districts.map(([name,count])=>`<button data-district="${name}">${name}<strong>${count}건</strong></button>`).join('');
  $$('[data-district]').forEach(b=>b.addEventListener('click',()=>{$$('.district-hotspots button').forEach(x=>x.classList.toggle('is-selected',x.dataset.district===b.dataset.district));toast(`${b.dataset.district} · ${districts.find(d=>d[0]===b.dataset.district)[1]}건 (시안 기준)`);}));
  $$('[data-map-tab]').forEach(b=>b.addEventListener('click',()=>{const list=b.dataset.mapTab==='list';$('#map-view').hidden=list;$('#district-list').hidden=!list;$$('[data-map-tab]').forEach(x=>{x.classList.toggle('is-active',x===b);x.setAttribute('aria-pressed',String(x===b));});}));
  let zoom=1;
  $$('[data-map-zoom]').forEach(b=>b.addEventListener('click',()=>{const delta=Number(b.dataset.mapZoom);zoom=delta===0?1:Math.max(1,Math.min(1.6,zoom+delta*.15));$('.map-art').style.transform=`scale(${zoom})`;$('.district-hotspots').style.transform=`scale(${zoom})`;}));
  $$('[data-dialog]').forEach(b=>b.addEventListener('click',()=>{
    const title=b.dataset.dialog;
    const msg=title.includes('검색')?'희망 지역, 직무, 기술, 연봉 등을 검색창에 입력해 보세요.\n현재 파일에서는 시안의 공고 5건을 대상으로 키워드 검색을 체험할 수 있습니다. 실제 AI 서비스는 연결되어 있지 않습니다.':`${title} 화면으로 연결할 버튼입니다.\n현재 파일은 제공받은 메인 화면을 HTML로 구현한 시안입니다.`;
    dialog(title,msg);
  }));
  $('.jobs-explain').addEventListener('click',()=>dialog('AI 추천 결과란?','시안에 표시된 기업명·공고·연봉·건수는 디자인 예시입니다.\n현재 채용 중인 실제 정보나 AI 분석 결과가 아닙니다.'));
  $('[data-action="more-jobs"]').addEventListener('click',()=>dialog('채용공고','현재 HTML에는 시안의 예시 공고 5건이 포함되어 있습니다. 추가 공고는 서비스 데이터 연결 후 제공할 수 있습니다.'));
})();
