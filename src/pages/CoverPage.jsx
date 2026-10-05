import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import IntroLoading from '../components/IntroLoading';
import IntroWhyTypography from '../components/IntroWhyTypography';
import IntroAiTypography from '../components/IntroAiTypography';
import '../styles/cover.css';

const LENGTH = 49;
const BASE_STARTS = [0, 9.8, 17.6, 22.6, 27.1];
const STARTS = [0, 9.8, 19, 29, 39];
const CHAPTERS = ['INTRO', 'WHY', 'WHERE', 'FOR YOU', 'START'];
// 짧은 이동 뒤 긴 감속을 잇는다. 구간 경계에서 위치뿐 아니라 속도도 공유한다.
const MAP_CAMERA_PATH = [
  { t: 0, scale: 1.24, xPercent: 7, yPercent: 2, rotation: -2.4 },
  { t: .48, scale: 1.64, xPercent: -8, yPercent: 3, rotation: 1.7 },
  { t: 2.8, scale: 1.72, xPercent: -12, yPercent: 2, rotation: 2.4 },
  { t: 3.22, scale: 1.76, xPercent: 10, yPercent: -3, rotation: -1.8 },
  { t: 5.65, scale: 1.8, xPercent: 13, yPercent: -4, rotation: -2.4 },
  { t: 6.2, scale: 1.25, xPercent: 0, yPercent: 0, rotation: .2 },
  { t: 10.4, scale: 1.3172, xPercent: -2.688, yPercent: -1.176, rotation: .872 },
];
function mapCameraFrames() {
  const keys = ['scale', 'xPercent', 'yPercent', 'rotation'];
  const slope = (i, key) => {
    const a = MAP_CAMERA_PATH[i], b = MAP_CAMERA_PATH[i + 1];
    return (b[key] - a[key]) / (b.t - a.t);
  };
  const velocity = (i, key) => {
    if (i === 0) return slope(0, key) * 2;
    if (i === MAP_CAMERA_PATH.length - 1) return slope(i - 1, key);
    const before = slope(i - 1, key), after = slope(i, key);
    return before * after <= 0 ? 0 : 2 * before * after / (before + after);
  };
  return Array.from({ length: Math.round(MAP_CAMERA_PATH.at(-1).t * 60) }, (_, frame) => {
    const t = (frame + 1) / 60;
    const i = Math.min(MAP_CAMERA_PATH.length - 2, MAP_CAMERA_PATH.findLastIndex(p => p.t < t));
    const a = MAP_CAMERA_PATH[i], b = MAP_CAMERA_PATH[i + 1];
    const dt = b.t - a.t, u = (t - a.t) / dt;
    const values = Object.fromEntries(keys.map(key => [key,
      (2*u**3 - 3*u**2 + 1)*a[key] + (u**3 - 2*u**2 + u)*dt*velocity(i,key)
      + (-2*u**3 + 3*u**2)*b[key] + (u**3 - u**2)*dt*velocity(i+1,key),
    ]));
    return { ...values, duration: 1/60, ease: 'none' };
  });
}
const IntroRobot3D = lazy(() => import('../components/IntroRobot3D'));
const magazineLetters = [
  ['ji', 'yeok'], ['gyeong', 'ryeok'], ['jik', 'mu'],
  ['geun', 'mu2', 'jo', 'geon'], ['geup', 'yeo'], ['gong', 'go'],
];
const introConditions = [
  { title: '지역', detail: '어디에서 일할까', path: 'M12 22s7-6 7-13a7 7 0 0 0-14 0c0 7 7 13 7 13ZM9 9a3 3 0 1 0 6 0a3 3 0 1 0-6 0' },
  { title: '경력', detail: '지금의 나에 맞게', path: 'M4 21V14H8V21M10 21V9H14V21M16 21V3H20V21' },
  { title: '직무', detail: '내가 잘하는 일', path: 'M3 8H21V21H3ZM8 8V3H16V8M3 13H21M10 12V15H14V12' },
  { title: '근무조건', detail: '나의 일하는 방식', path: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18M12 7V12L16 15' },
  { title: '급여', detail: '기대하는 보상', path: 'M3 6H21V20H3ZM3 10H21M17 14H21M7 3H19V6' },
  { title: '공고', detail: '수많은 기회 속에서', path: 'M5 3H15L19 7V21H5ZM15 3V7H19M8 11H16M8 15H16M8 18H12' },
];

function Line({ children, className = '' }) {
  return <span className={`intro-line ${className}`}><span>{children}</span></span>;
}
function Arrow({ className = '', direction = '' }) {
  return <svg className={`intro-arrow ${className} ${direction}`} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M5 16H27M18 7L27 16L18 25" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
function PlayIcon() { return <svg className="intro-control-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4L20 12L7 20Z" fill="currentColor" /></svg>; }
function PauseIcon() { return <svg className="intro-control-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx=".5" fill="currentColor" /><rect x="14" y="4" width="4" height="16" rx=".5" fill="currentColor" /></svg>; }
function ReplayIcon() { return <svg className="intro-control-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 8A8 8 0 1 1 4 14M5 3V8H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>; }
function SkipIcon({ forward = false }) { return <svg className="intro-skip-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><g transform={forward ? 'translate(24 0) scale(-1 1)' : undefined}><path d="M11 6L5 12L11 18M19 6L13 12L19 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></g></svg>; }
function Tick() {
  return <svg viewBox="0 0 60 60" fill="none" aria-hidden="true"><path d="M12 30 25 43 49 16" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
// 문구가 끝난 뒤 왼쪽 세로줄, 오른쪽 세로줄을 연달아 채점한다.
const conditionCheckBurst = [[22, 17], [78, 26], [16, 49], [84, 61], [24, 84], [77, 90]].map(([left, top], index) => ({
  left, top, size: 22 + index % 3 * 3,
  at: [18.3, 18.81, 18.47, 18.98, 18.64, 19.15][index],
}));
function ConditionChecks({ index }) {
  const textureId = useId().replace(/:/g, '');
  // 손으로 그린 선은 조금 어긋난다. 여러 가는 획과 종이결을 겹쳐 색연필 자국을 만든다.
  // 채점하듯 5~6시에서 출발한다. 끝은 덜 닫히거나 시작선을 지나 겹치게 한다.
  const endings = [
    'C187 162 180 173 172 180',
    'C180 173 161 190 139 201C121 210 105 213 91 207',
    'C183 171 166 185 146 195C125 207 102 215 75 216',
    'C178 176 155 195 130 205C118 209 108 210 101 209',
    'C186 164 176 177 162 186',
    'C180 174 159 193 136 203C124 208 114 211 105 212',
  ];
  // 같은 도장을 찍은 느낌을 피하려고 손이 지나가는 굴곡을 원마다 달리한다.
  const outlines = [
    'M150 192C120 212 86 200 58 184C28 167 12 130 22 98C27 57 48 36 81 21C113 5 161 23 181 47C204 79 215 113 192 151',
    'M150 192C117 207 81 211 58 184C35 164 12 137 19 98C17 67 53 26 81 21C120 14 150 10 181 47C210 69 206 124 192 151',
    'M150 192C115 217 87 198 58 184C23 155 20 131 19 98C29 64 43 29 81 21C124 4 161 26 181 47C213 81 205 115 192 151',
    'M150 192C124 215 79 203 58 184C31 158 10 134 19 98C20 62 47 36 81 21C114 7 159 16 181 47C209 71 216 119 192 151',
    'M150 192C111 207 85 213 58 184C23 168 16 125 19 98C29 55 45 33 81 21C119 13 160 12 181 47C202 84 215 114 192 151',
    'M150 192C126 213 88 204 58 184C30 164 11 137 19 98C24 63 54 26 81 21C123 6 154 23 181 47C214 76 203 119 192 151',
  ];
  const circle = outlines[index] + endings[index];
  // 선의 양쪽 가장자리를 직접 만든다. 손에 힘이 들어간 구간은 굵고, 빠진 구간은 가늘어진다.
  // 굵기가 갑자기 바뀌지 않도록 곡선을 따라 조금씩 이어 준다.
  const values = circle.match(/-?\d+(?:\.\d+)?/g).map(Number);
  const points = [{ x: values[0], y: values[1] }];
  for (let segment = 2; segment < values.length; segment += 6) {
    const start = points[points.length - 1];
    const [x1, y1, x2, y2, x3, y3] = values.slice(segment, segment + 6);
    for (let step = 1; step <= 24; step++) {
      const t = step / 24, u = 1 - t;
      points.push({ x: u*u*u*start.x + 3*u*u*t*x1 + 3*u*t*t*x2 + t*t*t*x3,
        y: u*u*u*start.y + 3*u*u*t*y1 + 3*u*t*t*y2 + t*t*t*y3 });
    }
  }
  const sides = [[], []];
  points.forEach((point, position) => {
    const before = points[Math.max(0, position - 1)];
    const after = points[Math.min(points.length - 1, position + 1)];
    const dx = after.x - before.x, dy = after.y - before.y;
    const length = Math.hypot(dx, dy) || 1;
    const progress = position / (points.length - 1);
    const pressure = 2.8 + .9*Math.sin(progress*15 + index*1.7) + .5*Math.sin(progress*37 + index);
    const tip = Math.min(1, .38 + progress*18, .4 + (1-progress)*15);
    const halfWidth = pressure * tip * 1.15;
    sides[0].push(`${point.x-dy/length*halfWidth},${point.y+dx/length*halfWidth}`);
    sides[1].push(`${point.x+dy/length*halfWidth},${point.y-dx/length*halfWidth}`);
  });
  const sectionCount = 8;
  // 겹치는 끝부분이 먼저 보이지 않도록 짧은 획마다 자기 마스크를 가진다.
  const sections = Array.from({ length: sectionCount }, (_, section) => {
    const first = Math.floor(section * (points.length - 1) / sectionCount);
    const last = Math.floor((section + 1) * (points.length - 1) / sectionCount);
    return {
      outline: `M${sides[0].slice(first, last + 1).join('L')}L${sides[1].slice(first, last + 1).reverse().join('L')}Z`,
      center: `M${points.slice(first, last + 1).map(point => `${point.x},${point.y}`).join('L')}`,
    };
  });
  const revealId = `${textureId}-reveal`;
  return <svg className="intro-condition-check intro-pencil-circle" viewBox="0 0 220 220" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <filter id={textureId} x="-15%" y="-20%" width="130%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency=".7" numOctaves="3" seed={index + 7} result="grain" />
        <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.3" xChannelSelector="R" yChannelSelector="G" result="rough" />
        <feColorMatrix in="grain" type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1.8 -.38" result="paper" />
        <feComposite in="rough" in2="paper" operator="in" />
      </filter>
      {sections.map((section, part) => <mask key={part} id={`${revealId}-${part}`} maskUnits="userSpaceOnUse" x="0" y="0" width="220" height="220">
        <path className="intro-pencil-section-reveal" style={{ '--section-index': part, '--section-count': sectionCount }} d={section.center} pathLength="1" strokeDasharray="1 1" stroke="white" strokeWidth="14" strokeLinecap="butt" strokeLinejoin="round" fill="none" />
      </mask>)}
    </defs>
    <g filter={`url(#${textureId})`}>
      {sections.map((section, part) => <path key={part} d={section.outline} fill="currentColor" mask={`url(#${revealId}-${part})`} />)}
    </g>
  </svg>;
}
// 글자를 이루던 점을 그대로 지도에 옮겨 '공고 → 분포'를 한 번의 동작으로 보여준다.
function makeParticles() {
  const canvas = document.createElement('canvas');
  canvas.width = 600; canvas.height = 240;
  const ctx = canvas.getContext('2d');
  ctx.font = '900 220px "Malgun Gothic", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('공고', 300, 121.1);
  const pixels = ctx.getImageData(0, 0, 600, 240).data;
  const points = [];
  for (let y = 12; y < 240; y += 12) {
    for (let x = 12; x < 600; x += 12) {
      if (pixels[(y * 600 + x) * 4 + 3] < 160) continue;
      const index = points.length;
      const group = index % 10 < 5 ? 0 : index % 10 < 8 ? 1 : 2;
      const centers = [[27, 53], [52, 40], [76, 59]];
      const radius = Math.sqrt(Math.floor(index / 3)) * .85;
      const angle = index * 2.4;
      points.push({ x: 15 + x / 600 * 70, y: 5 + y / 240 * 90, endX: centers[group][0] + Math.cos(angle) * radius, endY: centers[group][1] + Math.sin(angle) * radius, group });
    }
  }
  return points;
}

export default function CoverPage({ onEnter }) {
  const requestedNotebook = new URLSearchParams(window.location.search).get('notebook');
  const notebookVariant = ['open', 'single', 'top', 'narrow'].includes(requestedNotebook) ? requestedNotebook : 'top';
  const root = useRef(null), timeline = useRef(null), leaving = useRef(false), review = useRef(false), speed = useRef(1);
  const particles = useMemo(makeParticles, []);
  const [run, setRun] = useState(0), [chapter, setChapter] = useState(0), [position, setPosition] = useState(0);
  const [paused, setPaused] = useState(false), [reviewing, setReviewing] = useState(false), [playbackRate, setPlaybackRate] = useState(1);
  const [robotReady, setRobotReady] = useState(false), [introReady, setIntroReady] = useState(false), [showLoading, setShowLoading] = useState(true);
  const markRobotReady = useCallback(() => setRobotReady(true), []);
  const revealIntro = useCallback(() => setIntroReady(true), []);
  const finishLoading = useCallback(() => setShowLoading(false), []);
  function replayLoading() {
    timeline.current?.pause();
    setIntroReady(false);
    setShowLoading(true);
  }
  function enter() {
    if (leaving.current) return;
    leaving.current = true; timeline.current?.pause(); onEnter();
  }
  function goTo(time) {
    const next = Math.max(0, Math.min(LENGTH, time));
    review.current = true; setReviewing(true); timeline.current?.pause().seek(next, true);
    setPaused(true); setPosition(next); setChapter(Math.max(0, STARTS.findLastIndex(at => next >= at)));
  }
  function seek(event) { goTo(Number(event.target.value)); }
  function togglePlayback() {
    if (!timeline.current) return;
    if (timeline.current.time() >= LENGTH) timeline.current.restart();
    else timeline.current.paused(!timeline.current.paused());
    setPaused(timeline.current.paused());
  }
  useEffect(() => {
    if (!introReady) return;
    const gsap = window.gsap;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; root.current.focus({ preventScroll: true });
    leaving.current = false; setPaused(false); setPosition(0); setChapter(0);
    let context;
    if (!gsap || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      root.current.dataset.static = 'true'; setChapter(4);
      return () => { document.body.style.overflow = previousOverflow; };
    }
    delete root.current.dataset.static;
    context = gsap.context(() => {
      const scenes = gsap.utils.toArray('.intro-scene');
      gsap.set(scenes, { autoAlpha: 0 });
      gsap.set('.intro-dot', { opacity: 0 });
      gsap.set('.intro-job-word', { opacity: 0 });
      gsap.set('.intro-ai-robot', { autoAlpha: 0, clipPath: 'inset(0% 0% 100% 0%)' });
      gsap.set('.intro-why-words', { '--ring-progress': '0deg' });
      const whyRing = root.current.querySelector('.intro-why-ring:not(.intro-why-ring-ink)');
      const ringStroke = parseFloat(getComputedStyle(whyRing).borderTopWidth);
      gsap.set(whyRing, { autoAlpha: 0, scale: .015, borderWidth: ringStroke * 5 });
      gsap.set('.intro-why-ring-ink', { autoAlpha: 0 });
      gsap.set('.intro-why-note', { autoAlpha: 0, y: 30 });
      gsap.set('.intro-map-image', { opacity: 0 });
      gsap.set('.intro-map-camera', { scale: MAP_CAMERA_PATH[0].scale, xPercent: MAP_CAMERA_PATH[0].xPercent, yPercent: MAP_CAMERA_PATH[0].yPercent, rotation: MAP_CAMERA_PATH[0].rotation, rotationX: 0, rotationY: 0, transformOrigin: '50% 50%' });
      let lastTick = -1;
      const tl = gsap.timeline({ onComplete: () => { if (review.current) setPaused(true); else enter(); }, onUpdate: () => {
        const time = tl.time(), tick = Math.floor(time * 20);
        if (tick !== lastTick) { lastTick = tick; setPosition(time); setChapter(Math.max(0, STARTS.findLastIndex(at => time >= at))); }
      } });
      timeline.current = tl; tl.timeScale(speed.current);
      BASE_STARTS.forEach((at, index) => {
        // 02는 9초부터 원 안에서 보이지만 장면 선택 기준은 9.8초다.
        tl.set(scenes[index], { autoAlpha: 1 }, index === 1 ? 9 : at);
        if (index) {
          tl.set(scenes[index], { zIndex: index + 1 }, index === 1 ? 9 : at);
          // 내용은 자리를 지킨다. 화면 전체를 쏘듯 밀지 않고 짧은 겹침으로 연결한다.
          const incoming = scenes[index];
          // 흰 지도 장면 자체가 오른쪽에서 왼쪽으로 커튼처럼 펼쳐진다.
          if (index === 2) tl.fromTo(incoming, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.15, ease: 'sine.inOut', immediateRender: false }, at);


          if (index === 3) {
            // 제목의 마침표에서 새 장면이 자란다. 되감아도 같은 원 중심으로 돌아간다.
            const circleFromPeriod = radius => () => {
              const dot = root.current.querySelector('.intro-where-period').getBoundingClientRect();
              const bounds = root.current.getBoundingClientRect();
              const x = dot.left - bounds.left + dot.width / 2;
              const y = dot.top - bounds.top + dot.height / 2;
              return `circle(${radius ?? dot.width / 2}px at ${x}px ${y}px)`;
            };
            tl.fromTo(incoming, { clipPath: circleFromPeriod() }, { clipPath: circleFromPeriod(Math.hypot(innerWidth, innerHeight)), duration: 1.4, ease: 'power3.inOut', immediateRender: false }, at);
          }
          if (index === 4) tl.fromTo(incoming, { clipPath: 'inset(50% 0% 50% 0%)', y: 20 }, { clipPath: 'inset(0% 0% 0% 0%)', y: 0, duration: 1.2, ease: 'power3.inOut', immediateRender: false }, at);
          tl.set(scenes[index - 1], { autoAlpha: 0 }, at + (index === 1 ? 1.5 : 1.3));
        }
      });
      // 단색 덮개 대신 02 자체를 원 안에서 드러낸다. 원이 커지는 동안 글자와 카드도 함께 보인다.
      const period = root.current.querySelector('.intro-opening-period');
      const periodBox = period.getBoundingClientRect();
      const pageBox = root.current.getBoundingClientRect();
      const periodStyle = getComputedStyle(period);
      const measure = document.createElement('canvas').getContext('2d');
      measure.font = `${periodStyle.fontWeight} ${periodStyle.fontSize} ${periodStyle.fontFamily}`;
      const glyph = measure.measureText('.');
      const dotSize = Math.max(glyph.actualBoundingBoxLeft + glyph.actualBoundingBoxRight, glyph.actualBoundingBoxAscent + glyph.actualBoundingBoxDescent);
      const baseline = (periodBox.height - glyph.fontBoundingBoxAscent - glyph.fontBoundingBoxDescent) / 2 + glyph.fontBoundingBoxAscent;
      gsap.set('.intro-opening-dot-wipe', { left: periodBox.left - pageBox.left + (glyph.actualBoundingBoxRight - glyph.actualBoundingBoxLeft) / 2, top: periodBox.top - pageBox.top + baseline - (glyph.actualBoundingBoxAscent - glyph.actualBoundingBoxDescent) / 2, width: dotSize, height: dotSize, xPercent: -50, yPercent: -50, autoAlpha: 0 });
      const pointX = periodBox.left - pageBox.left + (glyph.actualBoundingBoxRight - glyph.actualBoundingBoxLeft) / 2;
      const pointY = periodBox.top - pageBox.top + baseline - (glyph.actualBoundingBoxAscent - glyph.actualBoundingBoxDescent) / 2;
      tl.set('.intro-opening-period', { opacity: 0 }, 9);
      tl.fromTo(scenes[1], { clipPath: `circle(${dotSize / 2}px at ${pointX}px ${pointY}px)` }, { clipPath: `circle(${Math.hypot(pageBox.width, pageBox.height)}px at ${pointX}px ${pointY}px)`, duration: 1.5, ease: 'sine.inOut', immediateRender: false }, 9);
      // 위·가운데·아래의 같은 글자가 빈자리를 이어받아 끊기지 않는 롤링을 만든다.
      gsap.utils.toArray('.intro-opening-roll-track').forEach((track, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        const height = track.getBoundingClientRect().height;
        // 한 칸을 지날 때 좌표만 되감는다. 앞뒤에 같은 글자가 있어 되감는 순간도 이어 보인다.
        const wrap = value => ((parseFloat(value) + height / 2) % height + height) % height - height / 2;
        // 속도를 단계별로 바꾸지 않는다. 빠른 시작부터 정지까지 한 곡선으로 계속 감속한다.
        tl.fromTo(track, { y: -direction * height * (4 + index * .05) * (16 / (4.8 + index * .06)) }, { y: 0, duration: 4 + index * .05, ease: 'power3.out', modifiers: { y: value => wrap(value) + 'px' }, force3D: true }, .08 + index * .045);
      });
      tl.fromTo('.intro-opening-detail', { '--divider-progress': 0 }, { '--divider-progress': 1, duration: 1.1, ease: 'power2.out' }, .6);
      tl.from('.intro-project-title', { clipPath: 'inset(0 100% 0 0)', duration: 1.1, ease: 'power2.out' }, .6);
      tl.from('.intro-purpose', { opacity: 0, y: 24, duration: .6 }, .9);
      // 화면 오른쪽 바깥에서 출발하므로 화면 폭이 달라도 중간에 갑자기 나타나지 않는다.
      const robot = '.intro-opening-robot';
      const robotBox = root.current.querySelector(robot).getBoundingClientRect();
      gsap.set(robot, { x: pageBox.right - robotBox.left + 12, autoAlpha: 0, scale: 1, y: 0 });
      tl.set(robot, { autoAlpha: 1 }, .4);
      tl.to(robot, { x: 0, duration: 3.2, ease: 'sine.out' }, .4);
      // 작은 원이 가속하며 커져 문장 전체를 감싼다.
      tl.fromTo('.intro-why-note', { autoAlpha: .15, y: 30 }, { autoAlpha: 1, y: 0, duration: .8, ease: 'sine.out', immediateRender: false }, 16.75);
      tl.set(whyRing, { autoAlpha: 1 }, 9.6);
      tl.to(whyRing, { scale: 1, borderWidth: ringStroke, duration: 2.35, ease: 'power3.inOut' }, 9.6);
      tl.from('.intro-marking-paper', { opacity: 0, y: 15, duration: .7, ease: 'power2.out' }, 9);
      tl.from('.intro-job-slip', { x: (_, el) => Number(el.dataset.x) * .25, y: (_, el) => Number(el.dataset.y) * .25, scale: .9, opacity: 0, duration: .5, ease: 'power3.out' }, 8.5);
      gsap.utils.toArray('.intro-job-slip').forEach((card, index) => {
        // 카드마다 주기와 출발점을 달리해 부드럽게 떠다닌다. 같은 재생 시계를 써서 정지와 되감기도 맞는다.
        const phase = index * .9;
        const orbit = Array.from({ length: 360 }, (_, frame) => {
          const time = (frame + 1) / 30;
          const angle = time * (.65 + index * .035);
          return { x: .5 * (Math.sin(angle * .7 + phase) - Math.sin(phase)), y: .7 * (Math.sin(angle + phase) - Math.sin(phase)), rotation: .1 * (Math.sin(angle * .8 + phase) - Math.sin(phase)), duration: 1 / 30, ease: 'none' };
        });
        tl.to(card, { keyframes: orbit, ease: 'none' }, 9);
      });
      // 왼쪽 문장에 시선이 머물도록 잡지 글자는 작은 폭으로 천천히 움직인다.
      // 난수의 출발값을 고정해 일시정지하거나 되감아도 같은 동작을 다시 볼 수 있다.
      gsap.utils.toArray('.intro-cutout-letter').forEach((letter, index) => {
        let seed = (index + 1) * 7919;
        const random = () => {
          seed = (seed * 16807) % 2147483647;
          return seed / 2147483647;
        };
        const frames = [{ duration: .075 + random() * .3 }];
        // 글자마다 동작 길이가 달라도 전환 완료까지 움직임을 확보한다.
        while (frames.reduce((sum, frame) => sum + frame.duration, 0) < 11.8) {
          const x = (random() - .5) * 3;
          const y = (random() - .5) * 4.5;
          const rotation = (random() - .5) * 4;
          const hold = .0625 + random() * .0875;
          frames.push(
            { x, y, rotation, duration: .0875 + random() * .0625, ease: 'sine.inOut' },
            { duration: hold },
            { x: x * .45 + (random() - .5) * .75, y: y * .65, rotation: rotation * .55, duration: .1625 + random() * .1125, ease: 'sine.inOut' },
          );
        }
        // 이동과 회전만 사용한다. 글자의 가로·세로 비율은 그대로 둔다.
        tl.to(letter, { keyframes: frames, ease: 'none' }, 9.15);
      });
      // 지도만 먼저 보여준다. 공고 글자와 점의 등장·낙하 연출은 잠시 제외한다.
      tl.from(['.intro-where-heading', '.intro-map-description', '.intro-map-caption'], { opacity: 0, duration: .3, ease: 'sine.out' }, 18.65);
      tl.to('.intro-map-image', { opacity: 1, duration: 1.2, ease: 'power2.out' }, 18.65);
      // 원본의 빠른 재구도와 긴 잔여 움직임을 연속 곡선으로 재현한다.
      tl.to('.intro-map-camera', { keyframes: mapCameraFrames(), ease: 'none' }, 18.65);
      tl.from(['.density-c', '.density-b', '.density-a'], { autoAlpha: 0, y: 32, duration: .7, stagger: 1.3, ease: 'back.out(1.35)' }, 19.8);
      // 전환이 끝난 다음 로봇 윤곽이 위에서 아래로 드러난다. 초기 숨김도 명시해 미리 보이지 않는다.
      tl.set('.intro-ai-robot', { autoAlpha: 1 }, 24.3);
      tl.to('.intro-ai-robot', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.2, ease: 'power3.out' }, 24.3);
      // 04 heading follows the same absolute clock in IntroAiTypography.


      tl.from('.intro-ai-caption', { opacity: 0, duration: .6 }, 25.45);
      tl.to('.intro-ai-robot', { keyframes: [{ y: -9, duration: 1.6, ease: 'sine.inOut' }, { y: 0, duration: 1.9, ease: 'sine.inOut' }, { y: -5, duration: 1.4, ease: 'sine.inOut' }, { y: 0, duration: 1.2, ease: 'sine.inOut' }] }, 25.6);
      // 마지막은 효과를 더하지 않고 문장을 크게 찍은 뒤 시작 버튼에 시선을 모은다.
      tl.from('.intro-end-title', { scale: 1.45, opacity: 0, duration: .6, ease: 'power4.out' }, 28.12);
      tl.from('.intro-end-underline', { scaleX: 0, transformOrigin: 'left', duration: .6, ease: 'power2.out' }, 28.7);
      tl.from('.intro-end-actions', { opacity: 0, duration: .6 }, 28.2);
      // 장면마다 약 10초를 준다. 원래 시각을 한 번만 옮겨 중복 이동을 막는다.
      tl.getChildren(false, true, true).forEach(animation => {
        const at = animation.startTime();
        const isCheck = animation.targets?.().some(target => target.matches?.('.intro-condition-check'));
        const delay = isCheck ? 0 : at >= 27.1 ? 11.9 : at >= 22.6 ? 6.4 : at >= 17.6 ? 1.4 : 0;
        animation.startTime(at + delay);
      });
      tl.to('.intro-progress > span', { scaleX: 1, duration: LENGTH, ease: 'none' }, 0);
    }, root);
    return () => { context?.revert(); timeline.current = null; document.body.style.overflow = previousOverflow; };
  }, [run, introReady]);

  return <section className="cover-page intro-v2" ref={root} tabIndex={-1} aria-label="START IN 프로젝트 소개" data-chapter={chapter}>
    {showLoading && <IntroLoading robotReady={robotReady} onReveal={revealIntro} onComplete={finishLoading} />}
    <button className="intro-entry" onClick={enter}>서비스 바로가기 <Arrow /></button>
    <div className="intro-scene intro-opening"><header className="intro-header"><span>START IN / PROJECT FILM</span></header><div className="intro-opening-layout">
      <h1 aria-label="학습용 PORTFOLIO."><span className="intro-opening-fixed" aria-hidden="true">학습용</span><span className="intro-opening-word intro-opening-english" aria-hidden="true">{Array.from('PORTFOLIO').map((letter, index) => <span className="intro-opening-roll" key={index} style={{ '--letter-width': `${{ P: .64, O: .75, R: .7, T: .6, F: .57, L: .57, I: .28 }[letter]}em` }}><span className="intro-opening-roll-track"><span>{letter}</span><span>{letter}</span><span>{letter}</span></span></span>)}<span className="intro-opening-period">.</span></span></h1>
      <div className="intro-opening-detail"><p className="intro-project-title">START IN<br />프로젝트 소개 <Arrow direction="down" /></p><p className="intro-purpose">구직의 복잡함을 줄이는<br /><b>더 쉬운 탐색 경험을 만듭니다.</b></p><div className="intro-opening-robot-area"><div className="intro-opening-robot" aria-label="구직 과정을 정리하는 AI 로봇"><div className="intro-robot-visual"><Suspense fallback={<img src="/images/cute-home-robot-cutout.png" alt="" />}><IntroRobot3D timeline={timeline} onReady={markRobotReady} /></Suspense></div><p className="intro-robot-name">AI 취업코치</p><a href="https://sketchfab.com/3d-models/cute-home-robot-7b75f204eb3e42b6babd883773e0789d" target="_blank" rel="noreferrer">Cute Home Robot · Yandrack / CC BY</a></div></div></div>
    </div><span className="intro-opening-caption">채용 탐색 서비스를 직접 설계하고 구현하는 프로젝트</span><i className="intro-opening-dot-wipe" aria-hidden="true" /></div>
    <div className="intro-scene intro-why"><header className="intro-header"><span>START IN / PROJECT FILM</span></header><div className="intro-two-columns"><div className="intro-copy">
      <div className="intro-why-words"><i className="intro-why-ring" aria-hidden="true" /><i className="intro-why-ring intro-why-ring-ink" aria-hidden="true" /><IntroWhyTypography timeline={timeline} /><p className="intro-why-note"><span className="intro-why-note-line"><span>수많은 공고 사이에서</span></span><span className="intro-why-note-line"><span>나에게 맞는 기회를 찾는 방법.</span></span></p></div>
    </div><div className="intro-scatter"><div className={`intro-marking-paper intro-notebook-${notebookVariant}`} aria-hidden="true"><img src={`/images/intro-notebook-${notebookVariant === 'narrow' ? 'trimmed' : notebookVariant}-${notebookVariant === 'open' ? 'v2' : 'v3'}.png`} alt="" fetchPriority="high" /></div><div className="intro-notebook-contents">{introConditions.map((condition, index) => <div className={`intro-job-slip intro-slip-${index}`} key={condition.title} data-x={(index % 2 ? 1 : -1) * 180} data-y={index * 40 - 100}><div className={`intro-cutout-group${index === 3 ? ' intro-cutout-long' : ''}`} aria-label={condition.title}>{magazineLetters[index].map((asset, letterIndex) => <span className="intro-cutout-letter" key={asset}><img src={`/images/intro-cutout-${asset}.png`} alt="" aria-hidden="true" style={{ rotate: `${[-3, 4, -2, 3][letterIndex]}deg` }} /></span>)}</div></div>)}</div></div></div></div>
    <div className="intro-scene intro-where"><header className="intro-header"><span>START IN / PROJECT FILM</span></header><div className="intro-where-content"><div className="intro-where-heading"><h2>기회가 모인 곳을, <b>한눈에<i className="intro-where-period" aria-hidden="true" /></b></h2></div><div className="intro-map-block"><p className="intro-map-description">선택한 지역 안에서<br />조건에 맞는 공고의 분포를 비교해요.</p><div className="intro-map-stage"><div className="intro-map-camera"><img className="intro-map-image" src="/images/busan-map-wide.png" alt="부산 지역을 표현한 지도 일러스트" /><svg className="intro-job-word" viewBox="0 0 600 240" preserveAspectRatio="none" aria-hidden="true"><text x="300" y="120" textAnchor="middle" dominantBaseline="central">공고</text></svg><div className="intro-particles" aria-hidden="true">{particles.map((point, index) => <i className="intro-dot" key={index} style={{ left: point.x + '%', top: point.y + '%' }} data-end-x={point.endX} data-end-y={point.endY} data-group={point.group} />)}</div></div><span className="intro-density-label density-a">기회를 발견하고</span><span className="intro-density-label density-b">지역을 비교하고</span><span className="intro-density-label density-c">나의 선택으로</span></div></div></div></div>
    <div className="intro-scene intro-personal"><header className="intro-header"><span>START IN / PROJECT FILM</span></header><div className="intro-two-columns"><div className="intro-copy"><span className="intro-kicker">04 / AI CAREER COACH</span><IntroAiTypography timeline={timeline} /></div><div className="intro-ai-art"><div className="intro-ai-robot"><Suspense fallback={<img src="/images/cute-home-robot-cutout.png" alt="" />}><IntroRobot3D timeline={timeline} startAt={30.7} endAt={40.4} revealDuration={1.2} showcase /></Suspense></div><div className="intro-ai-caption"><span>YOUR NEXT, TOGETHER.</span><b>AI 취업코치</b><small>AI 연동으로 이어갈 구직 경험</small><span className="intro-ai-credit" title="변경: 바닥 제외, 표시 각도 및 애니메이션 속도 조정"><a href="https://sketchfab.com/3d-models/cute-home-robot-7b75f204eb3e42b6babd883773e0789d" target="_blank" rel="noreferrer">Cute Home Robot · Yandrack / CC BY</a></span></div></div></div></div>
    <div className="intro-scene intro-end"><header className="intro-header"><span>START IN / PROJECT FILM</span></header><div className="intro-end-content"><span className="intro-kicker">YOUR NEXT STARTS HERE</span><h2 className="intro-end-title">나의 다음을<br /><span>시작하다.<i className="intro-end-underline" /></span></h2><div className="intro-end-actions"><p>학습용 포트폴리오 · 데모 채용 데이터</p></div></div></div>
    {introReady && <footer className="intro-footer">
      <nav className="intro-chapters" aria-label="인트로 장면 선택"><button onClick={replayLoading}>00 이름</button>{CHAPTERS.map((title, index) => <button key={title} className={chapter === index ? 'current' : ''} aria-current={chapter === index ? 'step' : undefined} onClick={() => goTo(STARTS[index] + (index > 1 ? 1.35 : 0))}>{String(index + 1).padStart(2, '0')} {['소개', '목적', '지도', 'AI', '시작'][index]}</button>)}</nav>
      <div className="intro-playback">
        <button className="intro-play-toggle" aria-label={paused ? '모션 재생' : '모션 일시정지'} onClick={togglePlayback}>{paused ? <PlayIcon /> : <PauseIcon />}{paused ? '재생' : '일시정지'}</button>
        <button aria-label="2초 이전" title="2초 이전" onClick={() => goTo(timeline.current.time() - 2)} className="intro-skip"><SkipIcon /></button>
        <input aria-label="모션 재생 위치" type="range" min="0" max={LENGTH} step=".05" value={position} onChange={seek} />
        <span className="intro-time">{position.toFixed(2)} / {LENGTH}초</span>
        <button aria-label="2초 다음" title="2초 다음" onClick={() => goTo(timeline.current.time() + 2)} className="intro-skip"><SkipIcon forward /></button>
        <button onClick={() => setRun(value => value + 1)}><ReplayIcon />처음부터</button>
        <label>배속<select aria-label="모션 배속" value={playbackRate} onChange={event => { const value = Number(event.target.value); speed.current = value; setPlaybackRate(value); timeline.current?.timeScale(value); }}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option></select></label>
        <label className="intro-review-check"><input type="checkbox" checked={reviewing} onChange={event => { review.current = event.target.checked; setReviewing(event.target.checked); }} />메인화면 자동이동 끄기</label>
      </div>
    </footer>}<div className="intro-progress"><span /></div>
  </section>;
}


