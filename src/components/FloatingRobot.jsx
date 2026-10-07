import { lazy, Suspense, useEffect, useId, useRef, useState } from 'react';
import '../styles/floating-robot.css';
const Robot3D = lazy(() => import('./IntroRobot3D'));
const messages = [{
  title: 'AI 취업코치 이력서 작성',
  text: '경험을 강점으로 써드려요.'
}, {
  title: 'AI 취업코치 자소서 작성',
  text: '지원 기업에 맞춰 써드려요.'
}];
function Chevron({
  open
}) {
  return <svg className={`floating-robot-chevron${open ? ' is-open' : ''}`} viewBox="0 0 20 20" aria-hidden="true"><path d="m8 5 5 5-5 5" /></svg>;
}
export default function FloatingRobot({
  children
}) {
  const [visible, setVisible] = useState(true);
  const [messageIndex, setMessageIndex] = useState(0);
  const [bubbleOpen, setBubbleOpen] = useState(true);
  const [listOpen, setListOpen] = useState(true);
  const bubbleId = useId();
  const listId = useId();
  const startTime = useRef(performance.now());
  const motionPreference = useRef(window.matchMedia('(prefers-reduced-motion: reduce)'));
  // 스크롤과 관계없이 느린 시계로 자세를 계속 갱신합니다.
  const timeline = useRef({
    time: () => motionPreference.current.matches ? 1.2 : 1.2 + (performance.now() - startTime.current) * .00016
  });
  useEffect(() => {
    if (!visible || !bubbleOpen) return undefined;
    // 문구만 교체하고 로봇은 다시 불러오지 않습니다.
    const timer = window.setInterval(() => setMessageIndex(index => (index + 1) % messages.length), 5500);
    return () => window.clearInterval(timer);
  }, [visible, bubbleOpen]);
  if (!visible) return children;
  return <aside className="floating-robot" aria-label="STARTIN AI 취업코치 로봇">
      <div className={`floating-robot-list-link ${listOpen ? 'is-expanded' : 'is-collapsed'}`}>
        <button className="floating-robot-toggle" aria-label={listOpen ? '공고 목록 접기' : '공고 목록 펼치기'} title={listOpen ? '공고 목록 접기' : '공고 목록 펼치기'} aria-expanded={listOpen} aria-controls={listId} onClick={() => setListOpen(open => !open)}>
          <Chevron open={listOpen} />
        </button>
        <div id={listId} aria-hidden={!listOpen} inert={!listOpen}>{children}</div>
      </div>
      <div className={`floating-robot-bubble ${bubbleOpen ? 'is-expanded' : 'is-collapsed'}`}>
        <button className="floating-robot-toggle" aria-label={bubbleOpen ? '말풍선 접기' : '말풍선 펼치기'} title={bubbleOpen ? '말풍선 접기' : '말풍선 펼치기'} aria-expanded={bubbleOpen} aria-controls={bubbleId} onClick={() => setBubbleOpen(open => !open)}>
          <Chevron open={bubbleOpen} />
        </button>
        <span className="floating-robot-message-indicator" aria-hidden="true">
          {messages.map((message, index) => <i key={message.title} className={index === messageIndex ? 'is-active' : ''} />)}
        </span>
        <div id={bubbleId} aria-hidden={!bubbleOpen} inert={!bubbleOpen}>
        <div className="floating-robot-message" key={messageIndex}>
          <strong>{messages[messageIndex].title}<small className="floating-robot-ready">준비중</small></strong>
          <p>{messages[messageIndex].text}</p>
        </div>
        </div>
      </div>
      <div className="floating-robot-visual">
        <button className="floating-robot-close" aria-label="로봇 숨기기" onClick={() => setVisible(false)}>
          <svg viewBox="0 0 20 20" aria-hidden="true"><path d="m5 5 10 10M15 5 5 15" /></svg>
        </button>
        <Suspense fallback={<img src="/images/cute-home-robot-cutout.png" alt="" />}>
          <Robot3D timeline={timeline} endAt={Infinity} scrollDriven />
        </Suspense>
      </div>
      <div className="floating-robot-caption">
        <a className="floating-robot-credit" href="https://sketchfab.com/3d-models/cute-home-robot-7b75f204eb3e42b6babd883773e0789d" target="_blank" rel="noreferrer">Yandrack · CC BY</a>
      </div>
    </aside>;
}
