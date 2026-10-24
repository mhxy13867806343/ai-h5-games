/**
 * Roadster: deterministic, renderer-independent arcade simulation.
 * Units: metres, seconds and m/s; station.z is an absolute road distance.
 * All public operations mutate and return the supplied serializable state.
 */
import { initializeHazards, stepHazards } from './hazards.mjs';
import { PLAYER_START_X, PLAYER_X_LIMIT } from './road-config.mjs';
const STEP = 1 / 120;
const MAX_ELAPSED = 10;
const CAR_HALF_LENGTH = 2.1;
const ROAD_LIMIT = PLAYER_X_LIMIT;
const GRAVITY = 13.5;
const BOOST_ACCELERATION = 7.2;
const LAUNCH_IMPULSE = 8.4;
const MAX_HEIGHT = 18;
const FUEL_USE = 28;
const FUEL_RECOVERY = 34;
const CLEARANCE = 0.12;
let seedSequence = 0;
let lastRandomSeed = null;

function freshSeed(exclude = null) {
  let entropy;
  try {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    entropy = values[0];
  } catch {
    entropy = (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
  }
  let seed = (entropy ^ Math.imul(++seedSequence, 0x9e3779b9)) >>> 0;
  while (seed === lastRandomSeed || seed === exclude) seed = (seed + 0x6d2b79f5) >>> 0;
  lastRandomSeed = seed;
  return seed;
}

const clamp = (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value));
const lerp = (a, b, fraction) => a + (b - a) * fraction;
const approach = (value, target, amount) => value + clamp(target - value, -amount, amount);

function stationAfter(previous) {
  const id = previous ? previous.id + 1 : 1;
  const gap = 296 + Math.min(Math.max(id - 2, 0) * 10, 50) + (id % 3) * 16;
  return {
    id,
    z: previous ? previous.z + gap : 180,
    height: 5 + Math.min((id - 1) * 0.2, 1.8),
    depth: 7 + Math.min(Math.floor((id - 1) / 4), 3),
    passed: false,
  };
}

function fillStations(state) {
  // Retain a cleared canopy briefly so it can recede behind the camera.
  state.stations = state.stations.filter((station) => station.z + station.depth / 2 > state.distance - 70);
  while (state.stations.length < 4) {
    state.stations.push(stationAfter(state.stations.at(-1)));
  }
}

function emit(state, type, message) {
  state.event = { id: state.event.id + 1, type, message };
}

function updateScore(state) {
  state.score = Math.floor(state.distance) + state.cleared * 500 + state.overtaken * 100;
}

export function createGame(options = {}) {
  const fixedSeed = Number.isFinite(options.seed) ? options.seed >>> 0 : null;
  const seed = fixedSeed ?? freshSeed(options.excludeSeed);
  const state = {
    hazardsEnabled: options.hazards !== false,
    seed,
    fixedSeed,
    randomState: seed,
    phase: 'ready',
    time: 0,
    distance: 0,
    speed: 25,
    x: PLAYER_START_X,
    lateralVelocity: 0,
    height: 0,
    vy: 0,
    fuel: 100,
    boosting: false,
    score: 0,
    cleared: 0,
    maxHeight: 0,
    stations: [],
    event: { id: 0, type: 'ready', message: '距离收费站约 75 米时，按住冷气起飞。' },
    crashReason: '',
    boostLocked: false,
    edgeWarned: false,
  };
  fillStations(state);
  initializeHazards(state);
  return state;
}

export function startGame(state) {
  const previousEventId = state.event?.id ?? 0;
  Object.assign(state, createGame({
    hazards: state.hazardsEnabled !== false,
    seed: state.fixedSeed === null ? undefined : state.fixedSeed,
    excludeSeed: state.seed,
  }));
  state.event.id = previousEventId;
  state.phase = 'running';
  emit(state, 'start', '自动前进中 · 收费站前约 75 米，按住冷气起飞。');
  return state;
}

export function pauseGame(state) {
  if (state.phase === 'running') {
    state.phase = 'paused';
    state.boosting = false;
    emit(state, 'pause', '已暂停');
  }
  return state;
}

export function resumeGame(state) {
  if (state.phase === 'paused') {
    state.phase = 'running';
    emit(state, 'resume', '继续驾驶');
  }
  return state;
}

export function getNextStation(state) {
  return state.stations.find((station) => !station.passed) ?? null;
}

function updateSteering(state, input, dt) {
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  state.lateralVelocity = approach(state.lateralVelocity, direction * 7.2, 22 * dt);
  const requestedX = state.x + state.lateralVelocity * dt;
  state.x = clamp(requestedX, -ROAD_LIMIT, ROAD_LIMIT);
  if (requestedX !== state.x) {
    state.lateralVelocity = 0;
    if (!state.edgeWarned) emit(state, 'edge', '已到路肩，向内调整方向。');
    state.edgeWarned = true;
  } else if (Math.abs(state.x) < ROAD_LIMIT - 0.3) {
    state.edgeWarned = false;
  }
}

function updateFlight(state, input, dt) {
  if (!input.boost) state.boostLocked = false;
  const wasAirborne = state.height > 0;
  const canLaunch = wasAirborne || state.fuel >= 12;
  state.boosting = Boolean(input.boost && !state.boostLocked && state.fuel > 0 && canLaunch);

  if (state.boosting) {
    if (!wasAirborne) {
      state.vy = LAUNCH_IMPULSE;
      emit(state, 'launch', '保持冷气，越过棚顶后松开降落。');
    }
    const poweredTime = Math.min(dt, state.fuel / FUEL_USE);
    state.fuel = Math.max(0, state.fuel - FUEL_USE * dt);
    state.vy += BOOST_ACCELERATION * poweredTime - GRAVITY * (dt - poweredTime);
    if (state.fuel < 0.000001) {
      state.fuel = 0;
      state.boosting = false;
      state.boostLocked = true;
      emit(state, 'fuel', '冷气已耗尽，松开按钮，落地后自动补充。');
    }
  } else if (wasAirborne) {
    state.vy -= GRAVITY * dt;
  }

  state.height = Math.max(0, state.height + state.vy * dt);
  if (state.height >= MAX_HEIGHT) {
    state.height = MAX_HEIGHT;
    state.vy = Math.min(state.vy, 0);
  }
  state.maxHeight = Math.max(state.maxHeight, state.height);
  if (state.height === 0) {
    state.vy = 0;
    if (wasAirborne) emit(state, 'land', '平稳落地 · 冷气正在补充');
    if (!state.boosting) state.fuel = Math.min(100, state.fuel + FUEL_RECOVERY * dt);
  }
}

function checkStations(state, beforeDistance, beforeHeight, dt) {
  const movement = state.distance - beforeDistance;
  for (const station of state.stations) {
    if (station.passed) continue;
    // Expand the canopy by the car's front/rear extent, then sweep the centre.
    const entry = station.z - station.depth / 2 - CAR_HALF_LENGTH;
    const exit = station.z + station.depth / 2 + CAR_HALF_LENGTH;
    if (state.distance < entry) break;
    const overlapStart = Math.max(beforeDistance, entry);
    const overlapEnd = Math.min(state.distance, exit);
    if (overlapStart <= overlapEnd && movement > 0) {
      const startFraction = clamp((overlapStart - beforeDistance) / movement, 0, 1);
      const endFraction = clamp((overlapEnd - beforeDistance) / movement, 0, 1);
      const startHeight = lerp(beforeHeight, state.height, startFraction);
      const endHeight = lerp(beforeHeight, state.height, endFraction);
      const requiredHeight = station.height + CLEARANCE;
      if (Math.min(startHeight, endHeight) < requiredHeight) {
        let fraction = startFraction;
        if (startHeight >= requiredHeight && state.height < beforeHeight) {
          fraction = clamp((requiredHeight - beforeHeight) / (state.height - beforeHeight), startFraction, endFraction);
        }
        state.distance = lerp(beforeDistance, state.distance, fraction);
        state.height = lerp(beforeHeight, state.height, fraction);
        state.time -= dt * (1 - fraction);
        state.phase = 'over';
        state.boosting = false;
        state.crashReason = startHeight < requiredHeight
          ? '高度不足，撞上了收费站。提前按住冷气再试一次。'
          : '降落过早，碰到了收费站棚顶。整车越过后再松开冷气。';
        state.vy = 0;
        emit(state, 'crash', state.crashReason);
        return;
      }
    }
    if (state.distance >= exit) {
      station.passed = true;
      state.cleared += 1;
      emit(state, 'clear', `成功飞越第 ${state.cleared} 座收费站！+500`);
    }
  }
}

/**
 * Apply a control sample. Ordinary frames are split into <= 1/120 s steps.
 * At most ten seconds are accepted per call, bounding background-tab work;
 * swept canopy checks still prevent a long frame from skipping collisions.
 */
export function stepGame(state, input = {}, dt = 0) {
  if (state.phase !== 'running' || !Number.isFinite(dt) || dt <= 0) return state;
  const elapsed = Math.min(dt, MAX_ELAPSED);
  const count = Math.ceil(elapsed / STEP);
  const h = elapsed / count;
  for (let index = 0; index < count && state.phase === 'running'; index += 1) {
    const beforeDistance = state.distance;
    const beforeHeight = state.height;
    const before = { distance: beforeDistance, height: beforeHeight, x: state.x };
    state.time += h;
    updateSteering(state, input, h);
    updateFlight(state, input, h);
    const cruiseSpeed = Math.min(44, 25 + state.time * 1.65);
    const targetSpeed = input.brake ? 22 : cruiseSpeed + (state.boosting ? 2 : 0);
    state.speed = approach(state.speed, targetSpeed, (input.brake ? 8 : 4) * h);
    state.distance += state.speed * h;
    stepHazards(state, before, h);
    if (state.phase === 'running') checkStations(state, beforeDistance, beforeHeight, h);
    updateScore(state);
    if (state.phase === 'running') fillStations(state);
  }
  return state;
}
