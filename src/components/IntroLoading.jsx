import { useEffect, useId, useRef, useState } from 'react';
export default function IntroLoading({
  robotReady,
  onReveal,
  onComplete
}) {
  const root = useRef(null);
  const frontWave = useRef(null),
    backWave = useRef(null);
  const id = useId().replaceAll(':', '');
  const revealStarted = useRef(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [performanceDone, setPerformanceDone] = useState(false);
  useEffect(() => {
    let stopped = false;
    const map = new Image();
    const mapReady = new Promise(resolve => {
      map.onload = map.onerror = resolve;
      map.src = '/images/busan-map-wide.webp';
    });
    Promise.all([document.fonts.ready, mapReady]).then(() => {
      if (!stopped) setAssetsReady(true);
    });
    return () => {
      stopped = true;
    };
  }, []);
  useEffect(() => {
    const gsap = window.gsap;
    if (!gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPerformanceDone(true);
      return;
    }
    let stopWind;
    const context = gsap.context(() => {
      const bounds = root.current.getBoundingClientRect();
      const particles = Array.from(root.current.querySelectorAll('.intro-firefly')).map((element, index) => ({
        element,
        x: parseFloat(element.style.left) / 100 * bounds.width,
        y: parseFloat(element.style.top) / 100 * bounds.height,
        vx: 0,
        vy: 0,
        drag: .8 + index % 7 * .24,
        phase: index * 2.399,
        windLag: index % 6 * .11,
        windResponse: .45 + index % 5 * .13
      }));
      gsap.set(particles.map(particle => particle.element), {
        left: 0,
        top: 0
      });
      let windTime = 0;
      // 입자마다 관성과 주변 소용돌이가 달라, 같은 바람에도 서로 다른 궤적을 따른다.
      const moveDust = (_, deltaMs) => {
        const dt = Math.min(deltaMs / 1000, .04);
        windTime += dt;
        particles.forEach(particle => {
          const cycle = (windTime - particle.windLag + 7.2) % 7.2;
          const wind = 230 * Math.exp(-Math.pow((cycle - 1.9) / .7, 2)) - 230 * Math.exp(-Math.pow((cycle - 5.3) / .8, 2));
          const localFlow = .65 + .35 * Math.sin(particle.y / 170 + particle.phase);
          const targetX = wind * localFlow * particle.windResponse + 32 * Math.sin(windTime * .7 + particle.phase + particle.y / 90);
          const targetY = 36 * Math.sin(windTime * .9 + particle.phase + particle.x / 120) + Math.abs(wind) * .2 * Math.sin(particle.x / 180 + particle.phase);
          const response = 1 - Math.exp(-particle.drag * dt);
          particle.vx += (targetX - particle.vx) * response;
          particle.vy += (targetY - particle.vy) * response;
          particle.x += particle.vx * dt;
          particle.y += particle.vy * dt;
          if (particle.x < -25) particle.x = bounds.width + 25;
          if (particle.x > bounds.width + 25) particle.x = -25;
          if (particle.y < -25) particle.y = bounds.height + 25;
          if (particle.y > bounds.height + 25) particle.y = -25;
          particle.element.style.transform = `translate3d(${particle.x}px,${particle.y}px,0)`;
        });
      };
      moveDust(0, 0);
      gsap.ticker.add(moveDust);
      stopWind = () => gsap.ticker.remove(moveDust);
      const water = {
        progress: 0,
        time: 0
      };
      const droplets = Array.from(root.current.querySelectorAll('.intro-liquid-drop')).map((element, index) => ({
        element,
        start: [1.05, 2.65][Math.floor(index / 3)] + index % 3 * .06,
        y: [90, 160, 210][index % 3],
        duration: .9 + index % 3 * .08,
        origin: null
      }));
      // 진행은 느리게, 물결은 계속 움직인다. 두 겹의 곡선이 같은 네 글자 안을 채운다.
      const surface = (offset, phase) => {
        // 다 채워지면 물결 경계를 글자 밖에 고정해 다시 비워지지 않게 한다.
        if (water.progress >= 1.04) return 'M-140 -40H1140V340H-140Z';
        const edge = -100 + water.progress * 1200 + offset;
        // 세 번째 밀물부터 잔물결과 뒤틀림을 서서히 줄여 큰 물결로 마무리한다.
        const lastWaveAge = Math.max(0, water.time - 2.92);
        const blend = Math.min(1, lastWaveAge / 1.5);
        const settling = blend * blend * (3 - 2 * blend);
        const waveTime = water.time - .55 * (lastWaveAge - 1 + Math.exp(-lastWaveAge));
        let path = 'M-140 -40';
        for (let y = -40; y <= 340; y += 4) {
          // 매 프레임 난수를 쓰지 않고 서로 다른 파동을 섞어 튀지 않는 불규칙한 흐름을 만든다.
          const strength = 42 + 20 * Math.sin(waveTime * 1.37 + phase);
          const drift = waveTime * 2.6 + .8 * Math.sin(waveTime * 1.9);
          const verticalSurge = 32 * Math.sin(waveTime * 2.1 + phase);
          const swell = strength * Math.sin((y + verticalSurge) * .024 - drift + phase);
          const ripple = (14 + 7 * Math.sin(waveTime * 2.13 + y * .008)) * Math.sin(y * .052 + waveTime * 3.7 + phase);
          const eddy = 11 * Math.sin(y * .037 + waveTime * 1.73 + phase * 2) * Math.sin(y * .011 - waveTime * 2.31);
          // 위아래가 먼저 밀려가고 가운데는 늦게 찬다. 마지막에는 오목한 부분도 완전히 채운다.
          const center = 150 + 24 * Math.sin(waveTime * 1.4 + phase);
          const centerLag = 180 * Math.exp(-Math.pow((y - center) / 72, 2) / 2) * Math.sin(Math.PI * Math.min(1, water.progress));
          // 위와 아래에 반대 힘을 준다. 위가 밀려오면 아래는 물러나고, 다음에는 반대로 흐른다.
          const upper = Math.exp(-Math.pow((y - 55) / 65, 2) / 2);
          const lower = Math.exp(-Math.pow((y - 245) / 65, 2) / 2);
          const alternatingSurge = 100 * Math.sin(waveTime * 3.1) * (upper - lower) * Math.sin(Math.PI * Math.min(1, water.progress));
          // 마지막에는 큰 물결의 마루가 위에서 아래로 이동하며 밀어준다. 전체를 뒤로 빼지는 않는다.
          const finalAge = Math.max(0, water.time - 3.26);
          const crestY = 45 + 215 * Math.min(1, finalAge / 1.3);
          const finalCrest = 85 * settling * Math.exp(-Math.pow((y - crestY) / 58, 2) / 2) * Math.sin(Math.PI * Math.min(1, finalAge / 1.6));
          // 마지막 물결의 위쪽만 뒤따르게 기울여 오른쪽 위가 가장 늦게 채워진다.
          const finalBlend = Math.min(1, finalAge / .65);
          // 끝부분에서 지연을 가속해 풀어준다. 장면의 전체 시간은 늘리지 않는다.
          const cornerFinish = Math.max(0, Math.min(1, (finalAge - 1.15) / .45));
          const topLag = 220 * finalBlend * finalBlend * (3 - 2 * finalBlend) * Math.pow(1 - Math.max(0, Math.min(1, (y - 40) / 230)), 2) * (1 - cornerFinish * cornerFinish * cornerFinish);
          path += `L${(edge + swell * .55 + (ripple + eddy) * (1 - settling * .55) - centerLag + alternatingSurge * (1 - settling * .85) + finalCrest - topLag).toFixed(2)} ${y}`;
        }
        return path + 'L-140 340Z';
      };
      const paint = () => {
        frontWave.current.setAttribute('d', surface(0, 0));
        backWave.current.setAttribute('d', surface(-38, 1.1));
        // 물방울은 물결과 독립된 포물선으로 흩어진다. 다시 글자로 끌어당기지 않는다.
        droplets.forEach((drop, index) => {
          const age = water.time - drop.start;
          if (age < 0 || age > drop.duration) {
            drop.element.setAttribute('opacity', '0');
            return;
          }
          if (drop.origin === null) drop.origin = -100 + water.progress * 1200;
          const progress = age / drop.duration;
          const x = drop.origin + (180 + index % 3 * 70) * age;
          const y = drop.y - (230 + index % 3 * 30) * age + 180 * age * age;
          // 날아가는 방향으로 늘어난 방울이 중력으로 휘며 둥글어진 뒤 사라진다.
          const angle = Math.atan2(-230 - index % 3 * 30 + 360 * age, 180 + index % 3 * 70) * 180 / Math.PI;
          const size = .72 + index % 3 * .2;
          const stretch = 1 + .65 * Math.exp(-progress * 4);
          drop.element.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${angle.toFixed(2)}) scale(${(size * stretch).toFixed(3)} ${(size / Math.sqrt(stretch)).toFixed(3)})`);
          const fade = Math.min(1, progress / .12) * Math.min(1, (1 - progress) / .3);
          drop.element.setAttribute('opacity', String(fade));
        });
      };
      paint();
      const tl = gsap.timeline({
        onUpdate: paint,
        onComplete: () => setPerformanceDone(true)
      });
      // 되밀림은 짧게 줄이고, 마지막 물결은 서서히 가속해 채운 뒤 그대로 머문다.
      tl.to(water, {
        progress: .60,
        duration: 1.15,
        ease: 'sine.inOut'
      }, .25).to(water, {
        progress: .57,
        duration: .32,
        ease: 'sine.inOut'
      }).to(water, {
        progress: .84,
        duration: 1.2,
        ease: 'sine.inOut'
      }).to(water, {
        progress: .82,
        duration: .34,
        ease: 'sine.inOut'
      }).to(water, {
        progress: 1.04,
        duration: 1.6,
        ease: 'power1.in'
      });
      tl.to(water, {
        time: 5.15,
        duration: 5.15,
        ease: 'none'
      }, 0);
      tl.timeScale(.57);
    }, root);
    return () => {
      stopWind?.();
      context.revert();
    };
  }, []);
  useEffect(() => {
    if (!assetsReady || !robotReady || !performanceDone || revealStarted.current) return;
    revealStarted.current = true;
    onReveal();
    const gsap = window.gsap;
    if (!gsap || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onComplete();
      return;
    }
    const exit = gsap.timeline({
      onComplete
    });
    exit.to('.intro-loading-word', {
      y: -30,
      scale: .96,
      opacity: 0,
      duration: .3,
      ease: 'power2.in'
    });
    exit.to(root.current, {
      clipPath: 'inset(0 0 100% 0)',
      duration: .75,
      ease: 'power3.inOut'
    }, .15);
    return () => {
      exit.kill();
    };
  }, [assetsReady, robotReady, performanceDone, onReveal, onComplete]);
  return <div className="intro-loading" ref={root} role="status" aria-label="스타트인 준비 중">
    <div className="intro-loading-fireflies" aria-hidden="true">
      {[[12, 62], [21, 79], [8, 37], [31, 69], [42, 86], [56, 77], [68, 71], [79, 83], [89, 57], [83, 32], [26, 25], [65, 20], [6, 76], [17, 44], [24, 91], [35, 82], [47, 72], [59, 91], [73, 62], [86, 74], [94, 42], [91, 89], [77, 17], [53, 12], [37, 30], [15, 18], [5, 53], [95, 25], [33, 15], [70, 87]].map(([left, top], index) => <span className="intro-firefly" key={index} style={{
        left: `${left}%`,
        top: `${top}%`,
        '--fly-size': `${1.5 + index % 3 * .5}px`,
        '--fly-time': '7.2s',
        '--fly-delay': `${-index * 1.7}s`,
        '--wind-delay': `${index % 7 * -.055}s`,
        '--fly-x': `${20 + index % 5 * 4}vw`,
        '--fly-y': `${-30 - index % 4 * 18}px`,
        '--fly-light': index % 3 === 0 ? '#d8ff94' : '#ffe5a0',
        '--glow-time': `${2.5 + index % 4 * .7}s`
      }}><span /></span>)}
      {/* 작은 빛 알갱이가 기존 바람을 함께 타며 화면 깊이를 만든다. */}
      {Array.from({
        length: 54
      }, (_, index) => <span className="intro-firefly intro-firefly-dust" key={`dust-${index}`} style={{
        left: `${3 + index * 37 % 94}%`,
        top: `${4 + index * 29 % 91}%`,
        '--fly-size': `${.65 + index % 4 * .15}px`,
        '--fly-delay': `${-index * .83}s`,
        '--glow-time': `${3.1 + index % 5 * .6}s`,
        '--fly-light': index % 3 === 0 ? '#d8ff94' : '#fff2cd'
      }}><span /></span>)}
    </div>
    <svg className="intro-loading-word intro-liquid-word" viewBox="0 0 1000 300" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-letter-shade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f0ffab" />
          <stop offset=".42" stopColor="#c5ff36" />
          <stop offset="1" stopColor="#8bd721" />
        </linearGradient>
        <filter id={`${id}-letter-shadow`} x="-20%" y="-30%" width="140%" height="170%" colorInterpolationFilters="sRGB">
          <feDropShadow dx=".16" dy=".16" stdDeviation="0" floodColor="#555555" floodOpacity="1" />
          <feDropShadow dx=".24" dy=".24" stdDeviation="0" floodColor="#333333" floodOpacity="1" />
          <feDropShadow dx=".32" dy=".32" stdDeviation="0" floodColor="#181818" floodOpacity="1" />
          <feDropShadow dx=".4" dy=".48" stdDeviation=".24" floodColor="#000000" floodOpacity=".7" />
          <feComposite in2="SourceAlpha" operator="out" />
        </filter>
        <radialGradient id={`${id}-droplet`} cx="32%" cy="25%" r="80%">
          <stop offset="0" stopColor="#efffb0" />
          <stop offset=".38" stopColor="#c5ff36" />
          <stop offset="1" stopColor="#78bd17" />
        </radialGradient>
        <clipPath id={`${id}-front`}><path ref={frontWave} d="M-140 -40H-100V340H-140Z" /></clipPath>
        <clipPath id={`${id}-back`}><path ref={backWave} d="M-140 -40H-100V340H-140Z" /></clipPath>
      </defs>
      {/* 앞면의 채움은 빼고 고정된 글자 바깥의 음영만 남긴다. */}
      <text x="500" y="230" textAnchor="middle" fill="#202020" filter={`url(#${id}-letter-shadow)`}>스타트인</text>
      <text className="intro-liquid-outline" x="500" y="230" textAnchor="middle">스타트인</text>
      <g>
        <text className="intro-liquid-front" x="500" y="230" textAnchor="middle" clipPath={`url(#${id}-front)`}>스타트인</text>
        <text className="intro-liquid-back" x="500" y="230" textAnchor="middle" style={{
          fill: `url(#${id}-letter-shade)`
        }} clipPath={`url(#${id}-back)`}>스타트인</text>
      </g>
      <g>{Array.from({
          length: 6
        }, (_, index) => <g className="intro-liquid-drop" key={index} opacity="0">
        <path d="M-9 0C-5-1-2-5 3-5C10-5 11 4 5 5C0 6-4 2-9 0Z" fill={`url(#${id}-droplet)`} />
        <path d="M0-2.7C2-4 4-4 6-2.6" fill="none" stroke="#f4ffc9" strokeWidth="1.1" strokeLinecap="round" opacity=".8" />
      </g>)}</g>
    </svg>

  </div>;
}
