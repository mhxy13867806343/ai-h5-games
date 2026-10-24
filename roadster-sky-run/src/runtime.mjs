import { createGame, startGame, stepGame, pauseGame, resumeGame, getNextStation } from './simulation.mjs';
import { createRoadsterScene } from './scene.mjs';
import { createGameAudio } from './audio.mjs';

const keyControls = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', Space: 'boost', ArrowDown: 'brake', KeyS: 'brake' };
const bestKey = 'roadster-sky-run-chase-best-v2';

export function createGameRuntime({ root, canvas, onUpdate, onNotice, onError, sceneFactory = createRoadsterScene, audioFactory = createGameAudio }) {
  const state = createGame();
  const pressed = { left: new Set(), right: new Set(), boost: new Set(), brake: new Set() };
  const sound = audioFactory();
  const cleanups = [];
  let scene;
  let lastFrame = 0;
  let lastHud = 0;
  let frameId;
  let disposed = false;
  let armed = false;
  let muted = true;
  let lastEvent = -1;
  let lastThreatKey = 'safe:null';
  let best = 0;
  let previousBest = 0;
  let renderFailed = false;
  try { best = Math.max(0, Number(localStorage.getItem(bestKey)) || 0); } catch {}
  previousBest = best;

  const listen = (target, event, callback, options) => {
    target.addEventListener(event, callback, options);
    cleanups.push(() => target.removeEventListener(event, callback, options));
  };

  function currentInput() {
    return Object.fromEntries(Object.entries(pressed).map(([key, sources]) => [key, sources.size > 0]));
  }

  function clearInputs() {
    for (const sources of Object.values(pressed)) sources.clear();
    state.boosting = false;
  }

  function sync() {
    const station = getNextStation(state);
    const remaining = station ? station.z - state.distance : 0;
    onUpdate({
      phase: state.phase, score: state.score, cleared: state.cleared,
      speed: state.phase === 'ready' ? 0 : Math.round(state.speed * 3.6),
      fuel: Math.round(state.fuel), height: state.height,
      distance: state.distance, nextDistance: Math.max(0, Math.ceil(remaining)),
      stationHeight: station?.height ?? 5, boosting: state.boosting,
      input: currentInput(), best, newBest: state.score > previousBest,
      maxHeight: state.maxHeight, crashReason: state.crashReason,
      overtaken: state.overtaken ?? 0,
      nearbyTraffic: (state.traffic ?? []).filter(car => car.z > state.distance && car.z < state.distance + 150).length,
      threat: { ...(state.threat ?? { phase: 'safe', charge: 0, turretId: null }) },
      muted, renderFailed,
    });
  }

  function flushEvent() {
    const threat = state.threat ?? { phase: 'safe', turretId: null };
    const threatKey = `${threat.phase}:${threat.turretId}`;
    const threatChanged = threatKey !== lastThreatKey;
    lastThreatKey = threatKey;
    const hasEvent = state.event.id !== lastEvent;
    const type = hasEvent ? state.event.type : null;
    if (hasEvent) {
      lastEvent = state.event.id;
      const { message } = state.event;
      sound.event(type);
      if (['clear', 'land', 'fuel', 'edge', 'lock', 'shot', 'dodge'].includes(type)) onNotice(message, type);
      if (type === 'crash') {
        clearInputs();
        if (state.score > best) {
          best = state.score;
          try { localStorage.setItem(bestKey, String(best)); } catch {}
        }
        onNotice('', type);
      }
    }
    // Clearing a toll and acquiring a lock can share a simulation frame.
    // Its final event may be 'clear'; the live threat still needs one warning.
    const threatEvent = threat.phase === 'locking' ? 'lock' : threat.phase === 'incoming' ? 'shot' : null;
    if (state.phase === 'running' && threatChanged && threatEvent && type !== threatEvent) {
      sound.event(threatEvent);
      onNotice(threatEvent === 'lock'
        ? '被炮台锁定！左右变向，或松开冷气下降。'
        : '炮弹来袭！立即左右变向，避开弹道。', threatEvent);
    }
    if (hasEvent || threatChanged) sync();
  }

  function pause() {
    clearInputs();
    pauseGame(state);
    sound.update(state, 0);
    flushEvent();
    sync();
  }

  function resume() {
    if (renderFailed) return;
    clearInputs();
    resumeGame(state);
    armed = true;
    lastFrame = 0;
    flushEvent();
  }

  function start() {
    if (renderFailed) return;
    clearInputs();
    previousBest = best;
    startGame(state);
    armed = true;
    lastFrame = 0;
    onNotice('', 'start');
    flushEvent();
    if (!muted) sound.unlock();
  }

  function resize() {
    if (!scene || disposed) return;
    const box = canvas.getBoundingClientRect();
    scene.resize(Math.max(1, box.width), Math.max(1, box.height));
  }

  function restoreScene() {
    try {
      scene?.dispose();
      scene = sceneFactory(canvas);
      renderFailed = false;
      resize();
      scene.render(state, 0);
      onError('');
      sync();
      return true;
    } catch (error) {
      renderFailed = true;
      onError('此预览暂时无法启动 3D 画面。请使用支持 WebGL 的浏览器，或点击下方重试。');
      sync();
      return false;
    }
  }

  function setInput(control, active, source = 'pointer') {
    if (!(control in pressed)) return;
    if (active && state.phase !== 'running') return;
    if (active) { pressed[control].add(source); armed = true; }
    else pressed[control].delete(source);
    sync();
  }

  function releasePointer(event) {
    for (const sources of Object.values(pressed)) sources.delete(`pointer:${event.pointerId}`);
    sync();
  }

  function toggleSound() {
    muted = !muted;
    sound.setMuted(muted);
    if (!muted) sound.unlock();
    sync();
  }

  listen(root, 'pointerdown', () => { armed = true; });
  listen(root, 'focusin', () => { armed = true; });
  listen(document, 'focusin', event => {
    if (!root.contains(event.target)) {
      armed = false;
      if (state.phase === 'running') pause();
    }
  });
  listen(document, 'pointerdown', event => {
    if (!root.contains(event.target)) {
      armed = false;
      if (state.phase === 'running') pause();
    }
  });
  listen(window, 'keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!armed && !root.contains(document.activeElement)) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    const control = keyControls[event.code];
    if (control && state.phase === 'running') {
      event.preventDefault();
      setInput(control, true, `key:${event.code}`);
    } else if (['KeyP', 'Escape'].includes(event.code) && !event.repeat) {
      if (!['running', 'paused'].includes(state.phase)) return;
      event.preventDefault();
      state.phase === 'running' ? pause() : resume();
    } else if (event.code === 'KeyR' && state.phase === 'over' && !event.repeat) {
      event.preventDefault(); start();
    } else if (event.code === 'KeyM' && !event.repeat) {
      event.preventDefault(); toggleSound();
    }
  });
  listen(window, 'keyup', event => {
    const control = keyControls[event.code];
    if (control) setInput(control, false, `key:${event.code}`);
  });
  listen(window, 'pointerup', releasePointer);
  listen(window, 'pointercancel', releasePointer);
  listen(window, 'blur', () => { armed = false; pause(); });
  listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
  listen(canvas, 'webglcontextlost', event => {
    event.preventDefault();
    pause();
    renderFailed = true;
    onError('3D 画面暂时中断。游戏已暂停，可以点击重新加载画面。');
    sync();
  });
  listen(canvas, 'webglcontextrestored', () => { restoreScene(); });
  let observer;
  if (typeof ResizeObserver !== 'undefined') {
    observer = new ResizeObserver(resize);
    observer.observe(canvas);
  } else listen(window, 'resize', resize);

  restoreScene();
  sync();
  function frame(now) {
    if (disposed) return;
    const dt = lastFrame ? Math.min(Math.max((now - lastFrame) / 1000, 0), 0.05) : 0;
    lastFrame = now;
    if (!renderFailed) {
      stepGame(state, currentInput(), dt);
      try { scene.render(state, dt); }
      catch {
        pause(); renderFailed = true;
        onError('3D 画面暂时中断。请点击重新加载画面后继续。');
      }
    }
    sound.update(state, dt);
    flushEvent();
    if (now - lastHud > 70) { sync(); lastHud = now; }
    frameId = requestAnimationFrame(frame);
  }
  frameId = requestAnimationFrame(frame);

  return {
    start, pause, resume, setInput, toggleSound, retryScene: restoreScene,
    getState: () => state,
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearInputs();
      observer?.disconnect();
      cleanups.forEach(cleanup => cleanup());
      sound.dispose();
      scene?.dispose();
    },
  };
}
