import { useEffect, useRef, useState } from 'react';
import { createWhyTypography, whyTypographyTime } from '../lib/whyTypography';

// A hot module replacement must not reuse a canvas whose context was lost.
const CANVAS_INSTANCE = Date.now();
export default function IntroWhyTypography({
  timeline
}) {
  const canvas = useRef(null);
  const [failed, setFailed] = useState(false);
  const [contextVersion, setContextVersion] = useState(0);
  useEffect(() => {
    let renderer,
      frame,
      disposed = false,
      last;
    const element = canvas.current;
    setFailed(false);
    const lost = event => {
      event.preventDefault();
      cancelAnimationFrame(frame);
      setFailed(true);
    };
    const restored = () => setContextVersion(version => version + 1);
    element.addEventListener('webglcontextlost', lost);
    element.addEventListener('webglcontextrestored', restored);
    createWhyTypography(element).then(value => {
      if (disposed) {
        value.destroy();
        return;
      }
      renderer = value;
      const tick = () => {
        if (disposed || !element.isConnected) return;
        const seconds = timeline.current?.time() ?? 0;
        const staticMode = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const time = staticMode ? 2.65 : whyTypographyTime(seconds);
        const bounds = element.getBoundingClientRect();
        const resized = renderer.resize(bounds.width, bounds.height);
        if (time !== last || resized) {
          try {
            renderer.render(time);
            last = time;
            element.dataset.motionTime = time.toFixed(3);
          } catch {
            setFailed(true);
            return;
          }
        }
        frame = requestAnimationFrame(tick);
      };
      tick();
    }).catch(() => {
      if (!disposed) setFailed(true);
    });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      element.removeEventListener('webglcontextlost', lost);
      element.removeEventListener('webglcontextrestored', restored);
      renderer?.destroy();
    };
  }, [timeline, contextVersion]);
  return <div className="intro-why-motion" role="img" aria-label="복잡한 구직을 더 쉽게. 수많은 공고 사이에서 나에게 맞는 기회를 찾는 방법.">
  <canvas key={CANVAS_INSTANCE} className={failed ? 'is-motion-hidden' : ''} ref={canvas} width="1" height="1" aria-hidden="true" />
  {failed && <div className="intro-why-motion-fallback">복잡한 구직을<br /><strong>더쉽게</strong></div>}
 </div>;
}
