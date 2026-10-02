import { useEffect, useRef, useState } from 'react';
import '../styles/cover.css';
import { api } from '../services/api';

const LENGTH = 15;
const titles = ['DISCOVER', 'DEFINE', 'CONNECT', 'START IN'];

function Letters({ children, className = '' }) {
  return <span className={`cover-letters ${className}`} aria-label={children}>
    {[...children].map((letter, index) => <span aria-hidden="true" key={index}>{letter === ' ' ? '\u00a0' : letter}</span>)}
  </span>;
}

function Arrow({ className = '' }) {
  return <svg className={className} viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M16 84 84 16M16 16h68v68" stroke="currentColor" strokeWidth="12" /></svg>;
}

function ServiceWindow() {
  return <div className="cover-browser">
    <div className="cover-browser-bar"><span>● ● ●</span><small>STARTIN / CAREER EXPLORER</small><b>↗</b></div>
    <div className="cover-product-heading"><b>START<span>IN</span></b><small>나에게 맞는 시작.</small></div>
    <div className="cover-product-search"><span>⌕</span>부산에서 나에게 맞는 기회를 찾아줘<b>→</b></div>
    <div className="cover-product-filters">{['부산', '서울', '신입', 'IT · 개발'].map(text => <span key={text}>✓ {text}</span>)}</div>
    <div className="cover-product-results">
      <div className="cover-product-map"><img src="/images/busan-map-wide.png" alt="" /><span>부산 지역 채용 현황<b>413</b></span></div>
      <div className="cover-product-jobs"><p>나의 다음 기회 <b>↗</b></p>{['프론트엔드 개발자', '데이터 엔지니어', '서비스 기획자'].map((text, index) => <div key={text}><small>0{index + 1} / DEMO</small><strong>{text}</strong><span>조건별 탐색 · 공고 저장</span></div>)}</div>
    </div>
  </div>;
}

export default function CoverPage({ onEnter }) {
  const root = useRef(null);
  const timeline = useRef(null);
  const leaving = useRef(false);
  const review = useRef(false);
  const speed = useRef(1);
  const [run, setRun] = useState(0);
  const [chapter, setChapter] = useState(0);
  const [remaining, setRemaining] = useState(LENGTH);
  const [paused, setPaused] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [position, setPosition] = useState(0);
  const [backendReady, setBackendReady] = useState(false);

  // 커버를 보는 동안 서버도 깨어나도록 상태 확인 요청을 미리 보냅니다.
  useEffect(() => {
    const controller = new AbortController();
    api('/health', { signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setBackendReady(true); })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  function enter() {
    if (leaving.current) return;
    leaving.current = true;
    timeline.current?.pause();
    onEnter();
  }

  function replay() {
    setPaused(false);
    setPosition(0);
    setRemaining(LENGTH);
    setRun(value => value + 1);
  }

  function togglePause() {
    if (!timeline.current) return;
    const next = !timeline.current.paused();
    timeline.current.paused(next);
    setPaused(next);
  }

  function changeSpeed(event) {
    const value = Number(event.target.value);
    speed.current = value;
    setPlaybackRate(value);
    timeline.current?.timeScale(value);
  }

  function seek(event) {
    const value = Number(event.target.value);
    // 검수 중에는 자동 이동 없이 원하는 순간을 멈춰 확인합니다.
    review.current = true;
    setReviewing(true);
    timeline.current?.pause().seek(value, true);
    setPaused(true);
    setPosition(value);
    setRemaining(Math.ceil(LENGTH - value));
    setChapter(value >= 10.5 ? 3 : value >= 7.1 ? 2 : value >= 3.6 ? 1 : 0);
  }

  function finishPlayback() {
    if (!review.current) enter();
    else setPaused(true);
  }

  useEffect(() => {
    leaving.current = false;
    const gsap = window.gsap;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    root.current.focus({ preventScroll: true });
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let fallback;
    let countdown;
    let context;
    if (!gsap || reduced) {
      root.current.dataset.static = 'true';
      setChapter(3);
      fallback = setTimeout(finishPlayback, LENGTH * 1000);
      const started = performance.now();
      countdown = setInterval(() => setRemaining(Math.max(0, LENGTH - Math.floor((performance.now() - started) / 1000))), 1000);
    } else {
      delete root.current.dataset.static;
      context = gsap.context(() => {
        const scenes = gsap.utils.toArray('.cover-scene');
        gsap.set(scenes, { autoAlpha: 0 });
        gsap.set('.cover-transition', { scaleX: 0 });
        const tl = gsap.timeline({ onComplete: finishPlayback, onUpdate: () => {
          setPosition(tl.time());
          setRemaining(Math.max(0, Math.ceil(LENGTH - tl.time())));
        } });
        timeline.current = tl;
        tl.timeScale(speed.current);
        // 전환이 화면을 덮는 순간 장면을 교체합니다.
        [0, 3.6, 7.1, 10.5].forEach((at, index) => {
          tl.call(() => setChapter(index), [], at);
          tl.set(scenes[index], { autoAlpha: 1 }, at);
          if (index) {
            tl.to('.cover-transition', { scaleX: 1, transformOrigin: 'left', duration: .22, ease: 'power4.in' }, at - .23);
            tl.set(scenes[index - 1], { autoAlpha: 0 }, at);
            tl.set('.cover-transition', { transformOrigin: 'right' }, at);
            tl.to('.cover-transition', { scaleX: 0, duration: .32, ease: 'expo.out' }, at + .01);
          }
        });
        tl.from('.cover-opening .cover-letters > span', { yPercent: 145, rotation: 12, scaleY: 1.7, duration: .7, stagger: .025, ease: 'expo.out' }, .05);
        tl.from('.cover-opening .cover-note', { y: 20, opacity: 0, duration: .45 }, .7);
        tl.from('.cover-ghost', { xPercent: -35, opacity: 0, duration: 1, ease: 'expo.out' }, .2);
        tl.from('.cover-orbit', { scale: 0, rotation: -150, duration: .9, ease: 'expo.out' }, .3);
        tl.to('.cover-orbit', { rotation: 160, duration: 2.5, ease: 'none' }, .9);
        tl.fromTo('.cover-type-flash', { autoAlpha: 0, scaleX: .2, scaleY: 2.5, rotation: -7 }, { autoAlpha: 1, scaleX: 1, scaleY: 1, rotation: 0, duration: .18, ease: 'expo.out' }, 2.15);
        tl.to('.cover-type-flash', { xPercent: 120, skewX: -20, duration: .26, ease: 'expo.in' }, 2.48);
        tl.to('.cover-opening h1', { scale: 1.06, xPercent: -2, duration: .35, ease: 'power4.in' }, 2.9);
        tl.to('.cover-opening .cover-letters > span', { yPercent: -140, rotation: -9, duration: .3, stagger: .01, ease: 'power4.in' }, 3.18);

        tl.from('.cover-define .cover-letters > span', { x: 180, rotationY: 85, opacity: 0, duration: .65, stagger: .026, ease: 'expo.out' }, 3.62);
        tl.fromTo('.cover-command',
          { y: 130, rotationX: 12, rotationY: -24, rotationZ: 0, scale: .9, opacity: 0 },
          { y: 0, rotationX: 6, rotationY: -12, rotationZ: 0, scale: 1, opacity: 1, duration: .85, ease: 'power3.out' }, 3.8);
        tl.from('.cover-command-row', { x: 100, opacity: 0, duration: .32, stagger: .1, ease: 'power3.out' }, 4.35);
        tl.from('.cover-command-line', { scaleX: 0, transformOrigin: 'left', duration: .7, ease: 'expo.inOut' }, 4.9);
        tl.to('.cover-command', { rotationX: 0, rotationY: 0, rotationZ: 0, y: 0, duration: 1.1, ease: 'power2.inOut' }, 5.1);
        tl.to('.cover-define .cover-letters', { xPercent: -130, skewX: 12, duration: .35, stagger: .04, ease: 'power4.in' }, 6.65);

        tl.from('.cover-action-word', { yPercent: 120, rotationX: -80, duration: .5, stagger: .16, ease: 'expo.out' }, 7.15);
        tl.from('.cover-mega-arrow', { scale: 0, rotation: -90, duration: .85, ease: 'expo.out' }, 7.4);
        tl.to('.cover-action-word', { x: (_, target) => target.dataset.shift === 'left' ? -60 : 70, duration: .4, stagger: .08, ease: 'expo.inOut' }, 8.55);
        tl.from('.cover-signal span', { scaleY: 0, transformOrigin: 'bottom', duration: .5, stagger: .06, ease: 'expo.out' }, 7.6);
        tl.to('.cover-mega-arrow', { rotation: 45, scale: 10, duration: .55, ease: 'expo.in' }, 9.9);

        tl.from('.cover-finale .cover-letters > span', { yPercent: 140, rotationX: -75, duration: .65, stagger: .045, ease: 'expo.out' }, 10.6);
        // 창 전체를 한 평면으로 회전하고 정면으로 돌려 메인 진입을 준비합니다.
        tl.fromTo('.cover-browser',
          { y: 130, rotationX: 12, rotationY: -24, rotationZ: 0, scale: .9, opacity: 0 },
          { y: 0, rotationX: 6, rotationY: -12, rotationZ: 0, scale: 1, opacity: 1, duration: 1, ease: 'power3.out' }, 10.8);
        tl.from('.cover-product-search', { scaleX: 0, transformOrigin: 'left', duration: .55, ease: 'expo.out' }, 11.5);
        tl.from('.cover-product-jobs > div', { x: 50, opacity: 0, duration: .4, stagger: .08 }, 11.7);
        tl.from('.cover-final-copy', { y: 20, opacity: 0, duration: .5, stagger: .12 }, 11.65);
        tl.to('.cover-browser', { rotationX: 0, rotationY: 0, rotationZ: 0, duration: 2.6, ease: 'power2.inOut' }, 12);
        tl.to('.cover-progress > span', { scaleX: 1, duration: LENGTH, ease: 'none' }, 0);
      }, root);
    }
    return () => {
      clearTimeout(fallback);
      clearInterval(countdown);
      gsap?.killTweensOf(root.current);
      context?.revert();
      timeline.current = null;
      document.body.style.overflow = previousOverflow;
    };
  }, [run]);

  return <section className="cover-page" ref={root} tabIndex={-1} aria-label="STARTIN 모션 커버" data-chapter={chapter}>
    <header className="cover-header"><b>STARTIN<span>®</span></b><small>AI-ASSISTED. HUMAN-DIRECTED.</small><button onClick={enter}>서비스 바로가기 <span>↗</span></button></header>
    <div className="cover-scene cover-opening">
      <span className="cover-ghost" aria-hidden="true">NEXT NEXT NEXT</span>
      <div className="cover-orbit" aria-hidden="true"><i /><Arrow /></div>
      <div className="cover-editorial"><p className="cover-eyebrow">01 — THE POSSIBILITY</p><h1><Letters>가능성은</Letters><Letters className="cover-outline">흩어져 있다.</Letters></h1><p className="cover-note">수많은 공고 사이에서,<br />내가 시작할 곳은 어디일까.</p></div>
      <div className="cover-side-label">OPPORTUNITIES ARE EVERYWHERE / YOURS IS NEXT.</div>
      <div className="cover-type-flash" aria-hidden="true">YOUR NEXT.</div>
    </div>
    <div className="cover-scene cover-define">
      <div className="cover-editorial"><p className="cover-eyebrow">02 — MAKE IT YOURS</p><h2><Letters>내 조건이</Letters><Letters>방향이 된다.</Letters></h2><p className="cover-note">지역, 직무, 경력.<br />찾고 싶은 기회를 더 선명하게.</p></div>
      <div className="cover-command"><div className="cover-command-top">YOUR NEXT / SEARCH SYSTEM <b>↗</b></div>{[['LOCATION','부산 · 서울'],['CAREER','신입 · 경력'],['INTEREST','IT · 개발']].map(([label,value]) => <div className="cover-command-row" key={label}><small>{label}</small><strong>{value}</strong><span>✓</span></div>)}<div className="cover-command-bottom">DEFINE YOUR DIRECTION<span>→</span><i className="cover-command-line" /></div></div>
    </div>
    <div className="cover-scene cover-connect">
      <p className="cover-eyebrow">03 — FROM POSSIBILITY TO ACTION</p>
      <div className="cover-action-type"><div><span className="cover-action-word" data-shift="left">찾다.</span></div><div><span className="cover-action-word cover-outline" data-shift="right">선택하다.</span></div><div><span className="cover-action-word" data-shift="left">시작하다.</span></div></div>
      <Arrow className="cover-mega-arrow" /><div className="cover-signal" aria-hidden="true">{[45,80,60,100,72,42,88,55].map((height,index) => <span key={index} style={{height:`${height}%`}} />)}</div><p className="cover-connect-note">좋은 시작은, 나에게 맞는 기회를 발견하는 것.</p>
    </div>
    <div className="cover-scene cover-finale">
      <div className="cover-editorial"><p className="cover-eyebrow">04 — MEET THE PRODUCT</p><h2><Letters>START</Letters><Letters className="cover-blue">IN.</Letters></h2><p className="cover-final-copy cover-final-title">당신의 다음을 찾는 새로운 시작.</p><p className="cover-final-copy cover-final-description">조건 검색 · 지역 지도 · 공고 저장 · 개인 지원현황<br />실제로 작동하는 구직 탐색 프로젝트.</p><button className="cover-enter cover-final-copy" onClick={enter}>STARTIN 시작하기 <Arrow /></button><small className="cover-final-copy cover-demo">1,000개 공고 · 150개 기업 / 가상 데모 데이터</small><small className="cover-final-copy cover-server" role="status">{backendReady ? '● 서비스 연결 완료' : '○ 서버 연결 준비 중 · 진입 후에도 이어집니다'}</small></div>
      <ServiceWindow />
    </div>
    <div className="cover-transition" aria-hidden="true" />
    <footer className="cover-footer"><div className="cover-chapters">{titles.map((title,index) => <span className={chapter === index ? 'current' : ''} key={title}><small>0{index+1}</small>{title}</span>)}</div><div className="cover-controls"><button onClick={togglePause} disabled={!window.gsap} aria-label={paused ? '모션 재생' : '모션 일시정지'}>{paused ? '▶' : 'Ⅱ'}</button><button onClick={replay}>다시보기 ↻</button><select aria-label="모션 배속" value={playbackRate} onChange={changeSpeed}><option value="0.25">0.25×</option><option value="0.5">0.5×</option><option value="1">1×</option></select><input aria-label="모션 재생 위치" type="range" min="0" max={LENGTH} step="0.05" value={position} onChange={seek} /><label><input type="checkbox" checked={reviewing} onChange={event => { review.current = event.target.checked; setReviewing(event.target.checked); }} /> 검수</label><span>{reviewing ? `${position.toFixed(1)} / ${LENGTH}초 · 자동 이동 꺼짐` : `${Math.ceil(remaining / playbackRate)}초 후 서비스로 이동`}</span></div></footer>
    <div className="cover-progress"><span /></div>
  </section>;
}
