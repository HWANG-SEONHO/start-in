import {useEffect,useRef,useState} from 'react';
import {createAiTypography} from '../lib/aiTypography';

export default function IntroAiTypography({timeline}){
 const canvas=useRef(null),[failed,setFailed]=useState(false);
 useEffect(()=>{let frame,renderer,disposed=false,last;
  document.fonts.ready.then(()=>{if(disposed)return;try{renderer=createAiTypography(canvas.current)}catch{setFailed(true);return}
   // First step: animate only the three opening text objects.
   const tick=()=>{if(disposed)return;const seconds=timeline.current?.time()??0;
    const time=matchMedia('(prefers-reduced-motion: reduce)').matches?2.3:seconds-29.1;
    const resized=renderer.resize();if(time!==last||resized){try{renderer.render(time);canvas.current.dataset.motionTime=time.toFixed(3);last=time}catch{setFailed(true);return}}frame=requestAnimationFrame(tick)};tick();
  });return()=>{disposed=true;cancelAnimationFrame(frame);renderer?.destroy()};
 },[timeline]);
 return <div className="intro-ai-typography" role="img" aria-label="찾고, 준비하고. 내게 맞는 기회를 찾는 것부터 나의 경험을 설득력 있게 전하는 것까지. AI 취업코치와 다음을 준비합니다. 맞춤 검색: 내 조건과 경험에 맞는 공고 탐색. 이력서: 흩어진 경험을 나의 강점으로 정리. 자기소개서: 지원 직무에 맞게 나의 이야기 구성.">
  <canvas ref={canvas} aria-hidden="true" style={{visibility:failed?'hidden':'visible'}}/>
  {failed&&<div className="intro-ai-text-fallback"><h2 className="intro-personal-title">찾고,<br/><em>준비하고.</em></h2><p>내게 맞는 기회를 찾는 것부터<br/>나의 경험을 설득력 있게 전하는 것까지.<br/>AI 취업코치와 다음을 준비합니다.</p></div>}
 </div>;
}
