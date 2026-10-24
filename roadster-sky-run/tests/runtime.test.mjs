import test from 'node:test';
import assert from 'node:assert/strict';
import { createGameRuntime } from '../src/runtime.mjs';
import { LANE_CENTERS, PLAYER_START_X, TURRET_X } from '../src/road-config.mjs';

// These tests exercise the real runtime and simulation. Only browser surfaces,
// rendering, audio and the animation clock are replaced; no GPU is involved.
function fixture(t, options = {}) {
  const saved = new Map();
  const install = (name, value) => {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
  };
  const window = new EventTarget();
  const document = new EventTarget();
  const root = new EventTarget();
  const canvas = new EventTarget();
  const insideButton = { tagName: 'BUTTON', ownerRoot: root };
  const outsideButton = { tagName: 'BUTTON' };
  root.contains = element => element === root || element?.ownerRoot === root;
  canvas.getBoundingClientRect = () => ({ width: 900, height: 600 });
  document.activeElement = outsideButton;
  document.hidden = false;
  const pendingFrames = new Map();
  let nextFrame = 1;
  let now = 1000;
  const storage = new Map(Object.entries(options.storage ?? {}));
  install('window', window);
  install('document', document);
  install('ResizeObserver', undefined);
  install('localStorage', {
    getItem(key) {
      if (options.storageThrows) throw new Error('Storage is unavailable');
      return storage.get(key) ?? null;
    },
    setItem(key, value) {
      if (options.storageThrows) throw new Error('Storage is unavailable');
      storage.set(key, String(value));
    },
  });
  install('requestAnimationFrame', callback => {
    const id = nextFrame++;
    pendingFrames.set(id, callback);
    return id;
  });
  install('cancelAnimationFrame', id => pendingFrames.delete(id));
  const snapshots = [];
  const errors = [];
  const notices = [];
  const scenes = [];
  const audio = {
    updates: [], events: [], muted: [], unlocks: 0, disposed: false,
    update(state, dt) { this.updates.push({ phase: state.phase, boosting: state.boosting, dt }); },
    event(type) { this.events.push(type); },
    setMuted(value) { this.muted.push(value); },
    unlock() { this.unlocks += 1; },
    dispose() { this.disposed = true; },
  };
  const fault = { create: Boolean(options.createFails), render: false };
  const runtime = createGameRuntime({
    root, canvas,
    onUpdate: snapshot => snapshots.push(structuredClone(snapshot)),
    onError: message => errors.push(message),
    onNotice: (message, type) => notices.push({ message, type }),
    audioFactory: () => audio,
    sceneFactory: () => {
      if (fault.create) throw new Error('Synthetic WebGL initialization failure');
      const scene = {
        renders: 0, sizes: [], disposed: false,
        resize(width, height) { this.sizes.push({ width, height }); },
        render() {
          this.renders += 1;
          if (fault.render) throw new Error('Synthetic WebGL frame failure');
        },
        dispose() { this.disposed = true; },
      };
      scenes.push(scene);
      return scene;
    },
  });
  // Ordinary control/lifecycle checks use the simulation's explicit replay
  // configuration, preserving all real hazards while removing random flakes.
  // Separate randomRuns tests below leave the shipped default untouched.
  if (!options.randomRuns) runtime.getState().fixedSeed = options.seed ?? 123;
  let cleaned = false;
  function cleanup() {
    if (cleaned) return;
    cleaned = true;
    runtime.dispose();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
  t.after(cleanup);
  function dispatch(target, type, values = {}) {
    const event = new Event(type, { cancelable: true });
    for (const [key, value] of Object.entries(values)) {
      Object.defineProperty(event, key, { value, configurable: true });
    }
    target.dispatchEvent(event);
    return event;
  }
  function tick(milliseconds = 50) {
    now += milliseconds;
    const callbacks = [...pendingFrames.values()];
    pendingFrames.clear();
    for (const callback of callbacks) callback(now);
  }
  function advance(milliseconds, step = 50) {
    const end = now + milliseconds;
    while (now < end) tick(Math.min(step, end - now));
  }
  return {
    runtime, state: runtime.getState(), root, window, document, canvas,
    insideButton, outsideButton, storage, scenes, audio, fault, snapshots,
    notices, errors, pendingFrames, dispatch, tick, advance, cleanup,
    get ui() { return snapshots.at(-1); },
    keydown: (code, extra = {}) => dispatch(window, 'keydown', { code, ...extra }),
    keyup: code => dispatch(window, 'keyup', { code }),
  };
}

test('Space starts and releases thrust, and keyboard input is scoped until the game is armed', t => {
  const f = fixture(t);
  assert.equal(f.ui.phase, 'ready');
  assert.equal(f.ui.speed, 0);
  assert.equal(f.keydown('Space').defaultPrevented, false);
  assert.equal(f.ui.input.boost, false);
  f.runtime.start();
  f.tick();
  assert.equal(f.keydown('Space').defaultPrevented, true);
  f.tick();
  assert.equal(f.state.boosting, true);
  assert.ok(f.state.height > 0);
  assert.ok(f.state.fuel < 100);
  f.keyup('Space');
  assert.equal(f.ui.input.boost, false);
  f.tick();
  assert.equal(f.state.boosting, false);
  assert.equal(f.ui.phase, 'running');
});

test('releasing one keyboard alias does not erase another held key for the same action', t => {
  const f = fixture(t);
  f.runtime.start();
  f.keydown('ArrowLeft');
  f.keydown('KeyA');
  f.keyup('ArrowLeft');
  assert.equal(f.ui.input.left, true);
  f.tick();
  f.tick();
  assert.ok(f.state.x < PLAYER_START_X);
  f.keyup('KeyA');
  assert.equal(f.ui.input.left, false);
});

test('pointer and keyboard sources remain independent, including pointercancel', t => {
  const f = fixture(t);
  f.runtime.start();
  f.keydown('Space');
  f.runtime.setInput('boost', true, 'pointer:11');
  f.runtime.setInput('boost', true, 'pointer:12');
  f.dispatch(f.window, 'pointercancel', { pointerId: 11 });
  assert.equal(f.ui.input.boost, true);
  f.keyup('Space');
  assert.equal(f.ui.input.boost, true);
  f.dispatch(f.window, 'pointerup', { pointerId: 12 });
  assert.equal(f.ui.input.boost, false);
  f.runtime.setInput('left', true, 'pointer:21');
  f.runtime.setInput('boost', true, 'pointer:22');
  f.dispatch(f.window, 'pointercancel', { pointerId: 21 });
  assert.equal(f.ui.input.left, false);
  assert.equal(f.ui.input.boost, true);
  f.dispatch(f.window, 'pointercancel', { pointerId: 22 });
  assert.equal(f.ui.input.boost, false);
});

test('blur and page hiding pause immediately, release all input and freeze distance', t => {
  const f = fixture(t);
  f.runtime.start();
  f.tick();
  f.keydown('Space');
  f.runtime.setInput('left', true, 'pointer:4');
  f.tick();
  f.dispatch(f.window, 'blur');
  assert.equal(f.ui.phase, 'paused');
  assert.deepEqual(f.ui.input, { left: false, right: false, boost: false, brake: false });
  assert.equal(f.audio.updates.at(-1).phase, 'paused');
  const distance = f.state.distance;
  f.advance(1000);
  assert.equal(f.state.distance, distance);
  f.runtime.resume();
  f.tick();
  assert.equal(f.state.distance, distance, 'the first resumed frame does not apply an old time delta');
  f.tick();
  assert.ok(f.state.distance > distance);
  f.document.hidden = true;
  f.dispatch(f.document, 'visibilitychange');
  assert.equal(f.ui.phase, 'paused');
  const hiddenDistance = f.state.distance;
  f.advance(1000);
  assert.equal(f.state.distance, hiddenDistance);
  f.document.hidden = false;
  f.dispatch(f.document, 'visibilitychange');
  assert.equal(f.state.phase, 'paused', 'showing a tab must not resume without player intent');
});

test('clicking outside the game pauses, and text editing shortcuts are not consumed', t => {
  const f = fixture(t);
  f.runtime.start();
  f.keydown('KeyD');
  f.document.activeElement = { tagName: 'INPUT', ownerRoot: f.root };
  assert.equal(f.keydown('Space').defaultPrevented, false);
  assert.equal(f.ui.input.boost, false);
  f.keyup('KeyD');
  assert.equal(f.ui.input.right, false, 'keyup clears an old hold even after focus enters an input');
  f.document.activeElement = f.outsideButton;
  f.dispatch(f.document, 'pointerdown', { target: f.outsideButton });
  assert.equal(f.state.phase, 'paused');
  assert.equal(f.keydown('KeyP').defaultPrevented, false);
  assert.equal(f.state.phase, 'paused');
});

test('moving keyboard focus outside the game pauses and releases host-page shortcuts', t => {
  const f = fixture(t);
  f.runtime.start();
  f.document.activeElement = f.insideButton;
  f.dispatch(f.root, 'focusin', { target: f.insideButton });
  f.keydown('Space');
  f.document.activeElement = f.outsideButton;
  f.dispatch(f.document, 'focusin', { target: f.outsideButton });
  assert.equal(f.state.phase, 'paused');
  assert.equal(f.ui.input.boost, false);
  assert.equal(f.keydown('Space').defaultPrevented, false);
  assert.equal(f.keydown('KeyP').defaultPrevented, false);
  assert.equal(f.state.phase, 'paused');
});

test('P/Escape pause and resume only on the initial keydown', t => {
  const f = fixture(t);
  f.runtime.start();
  f.tick();
  f.tick();
  assert.equal(f.keydown('KeyP').defaultPrevented, true);
  assert.equal(f.state.phase, 'paused');
  f.keydown('KeyP', { repeat: true });
  assert.equal(f.state.phase, 'paused');
  const distance = f.state.distance;
  f.advance(1000);
  f.keydown('Escape');
  assert.equal(f.ui.phase, 'running');
  f.tick(2000);
  assert.equal(f.state.distance, distance);
  f.tick(2000);
  assert.ok(f.state.distance - distance < 3, 'an unusually long frame is capped at 50 ms');
});

test('real collision updates HUD/best score and R restarts the same state cleanly', t => {
  const f = fixture(t);
  const originalState = f.state;
  f.runtime.start();
  f.tick();
  f.advance(10000);
  assert.equal(f.state.phase, 'over');
  assert.equal(f.ui.phase, 'over');
  assert.ok(f.ui.score > 0);
  assert.equal(f.ui.best, f.ui.score);
  assert.equal(f.ui.newBest, true);
  // Random traffic may stop the unattended run before the canopy; both are
  // actual ground hazards. Keep them enabled and verify the reported cause.
  assert.match(f.ui.crashReason, /车辆|收费站/);
  assert.equal(f.ui.crashReason, f.state.crashReason);
  assert.equal(f.storage.get('roadster-sky-run-chase-best-v2'), String(f.ui.score));
  const best = f.ui.best;
  f.keydown('KeyR');
  assert.equal(f.runtime.getState(), originalState);
  assert.equal(f.ui.phase, 'running');
  assert.equal(f.state.distance, 0);
  assert.equal(f.state.x, PLAYER_START_X);
  assert.equal(f.state.height, 0);
  assert.equal(f.state.fuel, 100);
  assert.equal(f.ui.cleared, 0);
  assert.equal(f.ui.score, 0);
  assert.equal(f.ui.best, best);
  assert.equal(f.ui.newBest, false);
  assert.deepEqual(f.ui.input, { left: false, right: false, boost: false, brake: false });
  f.tick();
  f.tick();
  assert.ok(f.state.distance > 0);
});

test('paused restart resets flight and held inputs, and sound stays a user preference', t => {
  const f = fixture(t);
  f.runtime.start();
  f.runtime.toggleSound();
  assert.equal(f.ui.muted, false);
  assert.equal(f.audio.unlocks, 1);
  f.tick();
  f.keydown('Space');
  f.advance(500);
  assert.ok(f.state.height > 0);
  f.runtime.pause();
  f.runtime.start();
  assert.equal(f.ui.phase, 'running');
  assert.equal(f.ui.height, 0);
  assert.equal(f.ui.fuel, 100);
  assert.equal(f.ui.input.boost, false);
  assert.equal(f.ui.muted, false);
  assert.equal(f.audio.unlocks, 2);
});

test('render failure pauses and freezes simulation until successful recovery and resume', t => {
  const f = fixture(t);
  f.runtime.start();
  f.tick();
  f.keydown('Space');
  f.fault.render = true;
  f.tick();
  assert.equal(f.state.phase, 'paused');
  assert.match(f.errors.at(-1), /中断/);
  const distance = f.state.distance;
  const oldScene = f.scenes[0];
  const renderCount = oldScene.renders;
  f.advance(1000);
  assert.equal(f.state.distance, distance);
  assert.equal(oldScene.renders, renderCount);
  assert.equal(f.ui.renderFailed, true);
  assert.equal(f.ui.input.boost, false);
  f.runtime.resume();
  f.runtime.start();
  assert.equal(f.state.phase, 'paused');
  assert.equal(f.state.distance, distance);
  f.fault.render = false;
  assert.equal(f.runtime.retryScene(), true);
  assert.equal(oldScene.disposed, true);
  assert.equal(f.scenes.length, 2);
  assert.equal(f.errors.at(-1), '');
  assert.equal(f.ui.renderFailed, false);
  assert.equal(f.state.phase, 'paused');
  f.runtime.resume();
  f.tick();
  f.tick();
  assert.ok(f.state.distance > distance);
});

test('initial rendering failure does not start invisible play and can recover', t => {
  const f = fixture(t, { createFails: true });
  assert.equal(f.ui.renderFailed, true);
  assert.match(f.errors.at(-1), /WebGL/);
  f.runtime.start();
  f.advance(2000);
  assert.equal(f.state.phase, 'ready');
  assert.equal(f.state.distance, 0);
  f.fault.create = false;
  assert.equal(f.runtime.retryScene(), true);
  assert.equal(f.ui.renderFailed, false);
  assert.equal(f.state.phase, 'ready');
  f.runtime.start();
  f.tick();
  f.tick();
  assert.ok(f.state.distance > 0);
});

test('WebGL context loss pauses and restoration rebuilds the scene without auto-resuming', t => {
  const f = fixture(t);
  f.runtime.start();
  f.tick();
  f.tick();
  const event = f.dispatch(f.canvas, 'webglcontextlost');
  assert.equal(event.defaultPrevented, true);
  assert.equal(f.state.phase, 'paused');
  assert.equal(f.ui.renderFailed, true);
  const distance = f.state.distance;
  f.advance(1000);
  assert.equal(f.state.distance, distance);
  f.dispatch(f.canvas, 'webglcontextrestored');
  assert.equal(f.scenes[0].disposed, true);
  assert.equal(f.scenes.length, 2);
  assert.equal(f.ui.renderFailed, false);
  assert.equal(f.state.phase, 'paused');
  assert.equal(f.state.distance, distance);
});

test('unavailable storage is non-fatal through collision and restart', t => {
  const f = fixture(t, { storageThrows: true });
  assert.equal(f.ui.best, 0);
  f.runtime.start();
  f.tick();
  f.advance(10000);
  assert.equal(f.state.phase, 'over');
  assert.equal(f.ui.best, f.ui.score);
  f.runtime.start();
  assert.equal(f.ui.phase, 'running');
});

test('dispose cancels animation and detaches browser input, scene and sound resources', t => {
  const f = fixture(t);
  f.runtime.start();
  f.tick();
  f.keydown('Space');
  f.runtime.dispose();
  assert.equal(f.pendingFrames.size, 0);
  assert.equal(f.audio.disposed, true);
  assert.equal(f.scenes[0].disposed, true);
  const distance = f.state.distance;
  const snapshotCount = f.snapshots.length;
  f.keydown('KeyA');
  f.dispatch(f.window, 'blur');
  f.dispatch(f.canvas, 'webglcontextlost');
  f.tick();
  assert.equal(f.state.distance, distance);
  assert.equal(f.snapshots.length, snapshotCount);
});

function driveDefaultUntil(f, predicate, maxFrames = 260, { holdAfterFirstClear = false, evade = true } = {}) {
  // Read the actual four-lane traffic and react using real control samples.
  // Do not remove enemies, move stations, or inject player positions/heights.
  let targetX = PLAYER_START_X;
  f.tick();
  for (let frame = 0; frame < maxFrames && f.state.phase === 'running' && !predicate(); frame += 1) {
    const station = f.state.stations.find(item => !item.passed);
    const remaining = station ? station.z - f.state.distance : Infinity;
    const ahead = x => f.state.traffic.filter(car => Math.abs(car.x - x) < 2.1 && car.z > f.state.distance - 6)
      .reduce((gap, car) => Math.min(gap, car.z - f.state.distance - car.length / 2), Infinity);
    if (f.state.height < 2.8 && ahead(targetX) < 40) {
      targetX = [...LANE_CENTERS].sort((a, b) => {
        const safety = x => Math.min(ahead(x), 150) - Math.abs(x - f.state.x) * 3;
        return safety(b) - safety(a);
      })[0];
    }
    if (evade && f.state.threat.phase === 'locking') {
      const turret = f.state.turrets.find(item => item.id === f.state.threat.turretId);
      targetX = (turret?.aimX ?? f.state.x) <= 0 ? LANE_CENTERS.at(-1) : LANE_CENTERS[0];
    }
    const stoppingX = f.state.x + f.state.lateralVelocity * Math.abs(f.state.lateralVelocity) / 44;
    f.runtime.setInput('left', stoppingX > targetX + 0.09, 'test:driver');
    f.runtime.setInput('right', stoppingX < targetX - 0.09, 'test:driver');
    f.runtime.setInput('boost', remaining <= 78 || (holdAfterFirstClear && f.state.cleared === 1)
      || (f.state.height < 2.8 && ahead(f.state.x) < 28), 'test:driver');
    f.tick();
  }
}

test('default chase mode populates moving traffic and freezes every hazard while paused', t => {
  const f = fixture(t);
  f.runtime.start();
  assert.ok(f.state.traffic.length >= 5, 'default play must include traffic');
  assert.ok(f.state.turrets.length > 0, 'default play must include roadside cannons');
  const initialCarZ = f.state.traffic[0].z;
  f.tick();
  f.advance(500);
  assert.ok(f.state.traffic[0].z > initialCarZ);
  assert.equal(f.ui.nearbyTraffic, f.state.traffic.filter(car => car.z > f.state.distance && car.z < f.state.distance + 150).length);
  f.runtime.pause();
  const frozen = structuredClone({
    traffic: f.state.traffic, turrets: f.state.turrets,
    projectiles: f.state.projectiles, threat: f.state.threat,
    time: f.state.time, distance: f.state.distance,
  });
  f.advance(5000);
  assert.deepEqual({
    traffic: f.state.traffic, turrets: f.state.turrets,
    projectiles: f.state.projectiles, threat: f.state.threat,
    time: f.state.time, distance: f.state.distance,
  }, frozen);
  f.runtime.resume();
  f.tick();
  f.tick();
  assert.ok(f.state.traffic[0].z > frozen.traffic[0].z);
});

test('post-toll airborne chase reports locking and incoming fire, freezes live rounds, and clears them on restart', t => {
  const f = fixture(t);
  f.runtime.start();
  const station = f.state.stations[0];
  const firstTurret = f.state.turrets.find(turret => turret.id === station.id);
  assert.equal(firstTurret.z, station.z + 85);
  assert.equal(Math.abs(firstTurret.x), TURRET_X);
  assert.ok(firstTurret.activationZ >= station.z + station.depth / 2 + 2.1);
  driveDefaultUntil(f, () => f.state.projectiles.length > 0, 260, { holdAfterFirstClear: true });
  assert.equal(f.state.phase, 'running', f.state.crashReason);
  assert.ok(f.state.projectiles.length > 0, 'remaining airborne after a real toll clearance should expose cannon fire');
  assert.equal(f.state.cleared, 1);
  assert.ok(f.state.distance >= firstTurret.activationZ);
  assert.ok(f.snapshots.every(snapshot => snapshot.cleared > 0 || snapshot.threat.phase === 'safe'),
    'a cannon must not lock or fire before the player clears its corresponding toll station');
  assert.ok(f.snapshots.some(snapshot => snapshot.threat.phase === 'locking'));
  assert.equal(f.ui.threat.phase, 'incoming');
  assert.equal(f.ui.threat.turretId, f.state.threat.turretId);
  assert.equal(f.notices.filter(notice => notice.type === 'lock').length, 1,
    'a lock concurrent with toll clearance must produce exactly one warning');
  assert.equal(f.audio.events.filter(type => type === 'lock').length, 1,
    'the transition warning must not duplicate or omit the lock sound');
  assert.ok(f.notices.some(notice => notice.type === 'shot'));
  f.runtime.pause();
  const bullets = structuredClone(f.state.projectiles);
  const turrets = structuredClone(f.state.turrets);
  const traffic = structuredClone(f.state.traffic);
  const warning = structuredClone(f.state.threat);
  f.advance(3000);
  assert.deepEqual(f.state.projectiles, bullets);
  assert.deepEqual(f.state.turrets, turrets);
  assert.deepEqual(f.state.traffic, traffic);
  assert.deepEqual(f.ui.threat, warning);
  f.runtime.start();
  assert.equal(f.state.projectiles.length, 0);
  assert.equal(f.ui.threat.phase, 'safe');
  assert.equal(f.ui.overtaken, 0);
  assert.equal(f.state.distance, 0);
  assert.ok(f.state.traffic.length >= 5);
  assert.ok(f.state.turrets.every(turret => turret.phase === 'idle'));
  assert.equal(f.ui.input.boost, false);
});

function firstPostTollShot(f, evade) {
  const station = structuredClone(f.state.stations.find(item => item.id === 1));
  let lockedAt = null;
  let shotAt = null;
  let lockedX = null;
  let lockedDistance = null;
  driveDefaultUntil(f, () => {
    if (lockedAt === null && f.state.threat.phase === 'locking') {
      lockedAt = f.state.time;
      lockedX = f.state.x;
      lockedDistance = f.state.distance;
    }
    if (shotAt === null && f.state.projectiles.length) shotAt = f.state.time;
    return shotAt !== null && f.state.time >= shotAt + 0.9;
  }, 260, { holdAfterFirstClear: true, evade });
  assert.ok(lockedAt !== null, 'a normal post-toll flight should receive a lock warning');
  assert.ok(shotAt !== null, 'holding altitude should allow the warning to reach an actual shot');
  assert.ok(shotAt - lockedAt >= 1.05, 'the warning should allow at least one second to react');
  assert.ok(shotAt - lockedAt <= 1.3, 'the warning should finish charging without an unexplained delay');
  assert.ok(lockedDistance >= station.z + station.depth / 2 + 2.1);
  return { lockedAt, shotAt, lockedX };
}

test('holding a straight high flight after a real toll clearance exposes a delayed cannon hit', t => {
  const f = fixture(t);
  f.runtime.start();
  firstPostTollShot(f, false);
  assert.equal(f.state.phase, 'over');
  assert.match(f.ui.crashReason, /炮击/);
  assert.equal(f.ui.cleared, 1);
});

test('changing lanes on a post-toll lock lets the committed shot pass without a hit', t => {
  const f = fixture(t);
  f.runtime.start();
  const result = firstPostTollShot(f, true);
  assert.equal(f.state.phase, 'running', f.state.crashReason);
  assert.ok(Math.abs(f.state.x - result.lockedX) > 3, 'actual steering must move the player out of the aiming corridor');
  assert.ok(f.state.projectiles.some(projectile => projectile.z < f.state.distance - 5),
    'the cannon round should have passed the player, not merely be waiting to arrive');
  assert.equal(f.ui.cleared, 1);
});

test('moving traffic updates the overtake HUD and a new random run clears counters with a fresh wave', t => {
  const f = fixture(t, { seed: 123 });
  f.runtime.start();
  const initialTraffic = structuredClone(f.state.traffic);
  const initialTurrets = structuredClone(f.state.turrets);
  driveDefaultUntil(f, () => f.state.overtaken > 0);
  assert.equal(f.state.phase, 'running', f.state.crashReason);
  assert.ok(f.state.overtaken > 0, 'a normal run should overtake an actual moving car');
  f.runtime.pause(); // Force a synchronous final HUD snapshot before comparison.
  assert.equal(f.ui.overtaken, f.state.overtaken);
  assert.equal(f.ui.nearbyTraffic, f.state.traffic.filter(car => car.z > f.state.distance && car.z < f.state.distance + 150).length);
  const completed = f.ui.overtaken;
  f.advance(1000);
  assert.equal(f.ui.overtaken, completed);
  // Return from the explicit replay fixture to the real user restart path.
  f.state.fixedSeed = null;
  f.runtime.start();
  assert.equal(f.ui.overtaken, 0);
  assert.notDeepEqual(f.state.traffic, initialTraffic);
  assert.deepEqual(f.state.turrets, initialTurrets);
  assert.deepEqual(f.state.projectiles, []);
});

test('ordinary runtime restarts use new random four-lane layouts and clear all run state', t => {
  const f = fixture(t, { randomRuns: true });
  assert.equal(f.state.fixedSeed, null);
  let previousSeed = f.state.seed;
  let previousLayout = f.state.traffic.map(({ x, z, kind, color, cruiseSpeed }) => ({ x, z, kind, color, cruiseSpeed }));
  for (let run = 0; run < 8; run += 1) {
    f.runtime.start();
    const layout = f.state.traffic.map(({ x, z, kind, color, cruiseSpeed }) => ({ x, z, kind, color, cruiseSpeed }));
    assert.notEqual(f.state.seed, previousSeed);
    assert.notDeepEqual(layout, previousLayout);
    assert.ok(layout.every(car => LANE_CENTERS.includes(car.x)));
    assert.equal(f.state.fixedSeed, null);
    assert.equal(f.state.x, PLAYER_START_X);
    assert.equal(f.ui.overtaken, 0);
    assert.equal(f.ui.score, 0);
    assert.equal(f.ui.threat.phase, 'safe');
    assert.deepEqual(f.state.projectiles, []);
    assert.deepEqual(f.ui.input, { left: false, right: false, boost: false, brake: false });
    previousSeed = f.state.seed;
    previousLayout = layout;
    f.runtime.pause();
  }
});

test('pausing and resuming a random run retains its seed, layout and live traffic state', t => {
  const f = fixture(t, { randomRuns: true });
  f.runtime.start();
  f.tick();
  f.advance(350);
  const seed = f.state.seed;
  f.runtime.pause();
  const pausedTraffic = structuredClone(f.state.traffic);
  const pausedRandomState = f.state.randomState;
  f.advance(5000);
  assert.equal(f.state.seed, seed);
  assert.equal(f.state.randomState, pausedRandomState);
  assert.deepEqual(f.state.traffic, pausedTraffic);
  f.runtime.resume();
  assert.equal(f.state.seed, seed);
  assert.deepEqual(f.state.traffic, pausedTraffic);
  f.tick();
  f.tick();
  assert.equal(f.state.seed, seed);
  assert.deepEqual(f.state.traffic.map(car => [car.id, car.x, car.kind, car.color, car.cruiseSpeed]),
    pausedTraffic.map(car => [car.id, car.x, car.kind, car.color, car.cruiseSpeed]));
  assert.ok(f.state.traffic[0].z > pausedTraffic[0].z);
});
