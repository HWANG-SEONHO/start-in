import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default function IntroRobot3D({ timeline, onReady, startAt = 0, endAt = 10.9, revealDuration = 0, showcase = false, scrollDriven = false }) {
  const host = useRef(null);

  useEffect(() => {
    const element = host.current;
    let renderer, frame, model, mixer, action, stopped = false, previousTime = -1;
    const disposeModel = object => object.traverse(node => {
      if (!node.isMesh) return;
      node.geometry.dispose();
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach(material => {
        Object.values(material).forEach(value => { if (value?.isTexture) value.dispose(); });
        material.dispose();
      });
    });
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      // 3D를 지원하지 않는 기기에서도 로봇 자리가 비지 않도록 이미지가 남는다.
      onReady?.();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.autoClear = false;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pivot = new THREE.Group();
    scene.add(pivot);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x837c99, 2.5));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3);
    keyLight.position.set(-3, 5, 4);
    scene.add(keyLight);
    const camera = new THREE.OrthographicCamera(-1, 1, .7, -.7, .01, 100);
    camera.position.set(2.5, 1.5, 4);
    camera.lookAt(0, .5, 0);
    const whiteMask = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false });
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      const halfWidth = .7 * width / height;
      camera.left = -halfWidth; camera.right = halfWidth;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      previousTime = -1;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    new GLTFLoader().load('/models/cute-home-robot.glb', gltf => {
      if (stopped) { disposeModel(gltf.scene); return; }
      model = gltf.scene;
      // 원본의 바닥은 빼고 로봇만 투명 배경 위에 놓는다.
      const floors = [];
      model.traverse(node => { if (node.isMesh && /Suelo/i.test(node.name)) floors.push(node); });
      floors.forEach(node => { node.removeFromParent(); disposeModel(node); });
      model.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(model);
      const center = bounds.getCenter(new THREE.Vector3());
      const height = bounds.getSize(new THREE.Vector3()).y;
      const normalized = new THREE.Group();
      model.position.sub(center);
      normalized.add(model);
      normalized.scale.setScalar(1 / height);
      normalized.position.y = .5;
      pivot.add(normalized);
      mixer = new THREE.AnimationMixer(model);
      if (gltf.animations.length) {
        // 원본 동작을 이어서 재생해 점이 커지는 동안에도 로봇이 멈춰 있지 않게 한다.
        const clip = gltf.animations[0].clone();
        action = mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat, Infinity);
        action.play();
      }
      element.dataset.ready = 'true';
      element.dataset.animationCount = String(gltf.animations.length);
      element.dataset.clipDuration = String(gltf.animations[0]?.duration ?? 0);
      // 첫 화면 전에 셰이더와 텍스처를 실제로 준비해 로봇 등장 때의 멈칫함을 줄인다.
      renderer.compile(scene, camera);
      renderer.clear();
      renderer.render(scene, camera);
      onReady?.();
      previousTime = -1;
    }, undefined, () => { element.dataset.ready = 'false'; onReady?.(); });

    const smooth = (time, start, end) => {
      const value = THREE.MathUtils.clamp((time - start) / (end - start), 0, 1);
      return value * value * (3 - 2 * value);
    };
    // 빠른 방향 전환과 한 바퀴 회전을 순서대로 연결한다. 같은 시간에는 같은 자세가 나온다.
    const performance = [
      [0, -.6, 0, 0], [1.2, -.4, 0, 0],
      [1.7, .4, -.16, -.1], [2.1, -.5, .18, .09], [2.5, .5, -.13, -.07],
      [3.05, .4, -.18, -.08], [3.85, Math.PI * 2 + .4, .16, .13],
      [4.2, Math.PI * 2 + .2, 0, 0], [4.65, Math.PI * 2 + .7, -.17, -.1],
      [5.05, Math.PI * 2 - .4, .2, .12], [5.5, Math.PI * 2 + .3, -.08, 0],
      [5.9, Math.PI * 2 - .3, -.16, .08], [6.45, Math.PI * 2 + .65, .15, -.1],
      [6.95, Math.PI * 2 + .2, 0, 0], [7.6, Math.PI * 2 - .2, -.06, -.04],
      [8.5, Math.PI * 2 + .15, 0, 0],
    ];
    const jump = (time, start, end, height) => {
      if (time <= start || time >= end) return 0;
      const progress = (time - start) / (end - start);
      // 위로 솟은 뒤 중력으로 내려오는 포물선이라 공중에서 갑자기 멈추지 않는다.
      return 4 * height * progress * (1 - progress);
    };
    const perform = time => {
      const nextIndex = performance.findIndex(pose => pose[0] >= time);
      const next = performance[nextIndex < 0 ? performance.length - 1 : nextIndex];
      const previous = performance[Math.max(0, nextIndex < 0 ? performance.length - 1 : nextIndex - 1)];
      const progress = next[0] === previous[0] ? 1 : smooth(time, previous[0], next[0]);
      const interpolate = index => THREE.MathUtils.lerp(previous[index], next[index], progress);
      pivot.rotation.y = interpolate(1);
      pivot.rotation.z = interpolate(2);
      pivot.rotation.x = .07 * Math.sin(time * 2.4) * smooth(time, 1.2, 1.7);
      pivot.position.x = interpolate(3);
      pivot.position.y = jump(time, 3.05, 4.2, .12) + jump(time, 5.9, 6.95, .09);
    };
    const render = () => {
      if (stopped) return;
      frame = requestAnimationFrame(render);
      const time = timeline.current?.time() ?? 0;
      // 재생 위치로 자세를 계산하므로 정지·되감기·배속에서도 몸이 따로 움직이지 않는다.
      if (!model || time === previousTime) return;
      previousTime = time;
      if (time < startAt || time > endAt) return;
      const localTime = time - startAt;
      if (action) action.paused = false;
      const motionTime = Math.max(0, localTime - .4) * (showcase ? 1 : .7);
      mixer.setTime(motionTime);
      if (scrollDriven) {
        // 느린 좌우 살피기 두 번 뒤 짧은 한 바퀴 회전을 반복합니다.
        const elapsed = Math.max(0, (localTime - 1.2) / .16);
        const lookDuration = 10;
        const spinDuration = 1.4;
        const phase = elapsed % (lookDuration + spinDuration);
        const spinning = phase >= lookDuration;
        const spinProgress = Math.min(1, Math.max(0, (phase - lookDuration) / spinDuration));
        const easedSpin = spinProgress * spinProgress * (3 - 2 * spinProgress);
        const yaw = spinning ? Math.PI * 2 * easedSpin : .7 * Math.sin(phase * Math.PI * 2 / 5);
        pivot.rotation.set(.025 * Math.sin(localTime * .4), .35 + yaw, .025 * Math.sin(localTime * .7));
        pivot.position.set(.02 * Math.sin(localTime * .4), 0, 0);
      }
      else if (showcase) perform(localTime * .8);
      else {
        pivot.rotation.set(0, -.65 * (1 - smooth(localTime, 3.1, 3.9)), 0);
        pivot.position.set(0, 0, 0);
      }
      element.dataset.viewAngle = pivot.rotation.y.toFixed(3);
      element.dataset.bodyLean = pivot.rotation.z.toFixed(3);
      element.dataset.jumpHeight = pivot.position.y.toFixed(3);
      element.dataset.motionTime = motionTime.toFixed(2);
      renderer.clear();
      renderer.render(scene, camera);
      // 흰 마스크도 실제 3D 윤곽으로 그려 로봇과 정확히 겹치게 한다.
      whiteMask.opacity = revealDuration ? 1 - smooth(localTime, 0, revealDuration) : 0;
      whiteMask.opacity = Math.min(1, whiteMask.opacity);
      if (whiteMask.opacity > 0) {
        renderer.clearDepth();
        scene.overrideMaterial = whiteMask;
        renderer.render(scene, camera);
        scene.overrideMaterial = null;
      }
    };
    render();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      mixer?.stopAllAction();
      if (model) { mixer?.uncacheRoot(model); disposeModel(model); }
      whiteMask.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [timeline, onReady, startAt, endAt, revealDuration, showcase, scrollDriven]);

  return <div className="intro-robot-stage" ref={host} aria-hidden="true"><img className="intro-robot-fallback" src="/images/cute-home-robot-cutout.png" alt="" /></div>;
}
