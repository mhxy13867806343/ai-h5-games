import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createGame,
  startGame,
  stepGame,
  pauseGame,
  resumeGame,
  getNextStation,
} from '../src/simulation.mjs';
import { PLAYER_X_LIMIT } from '../src/road-config.mjs';

function advance(state, seconds, input = {}) {
  const frames = Math.ceil(seconds * 60);
  for (let frame = 0; frame < frames; frame += 1) {
    stepGame(state, input, seconds / frames);
  }
}

function moveStationsAway(state) {
  for (const station of state.stations) station.z += 10_000;
}

function flyUntilCleared(state, goal, launchDistance = 75, timeLimit = 60) {
  while (state.phase === 'running' && state.cleared < goal && state.time < timeLimit) {
    const next = getNextStation(state);
    stepGame(state, { boost: next && next.z - state.distance <= launchDistance }, 1 / 60);
  }
}

test('staying on the road crashes at the first toll station', () => {
  const state = startGame(createGame({ hazards: false }));
  advance(state, 12);
  assert.equal(state.phase, 'over');
  assert.equal(state.cleared, 0);
  assert.equal(state.event.type, 'crash');
  assert.ok(state.crashReason.length > 0);
  assert.ok(state.distance < 180, 'the front of the car hits before its centre reaches the station');
});

test('holding boost at a 75 m lead clears three consecutive stations', () => {
  const state = startGame(createGame({ hazards: false }));
  flyUntilCleared(state, 3);
  assert.equal(state.phase, 'running', state.crashReason);
  assert.equal(state.cleared, 3);
  assert.ok(state.score >= 1_500);
  assert.ok(state.maxHeight <= 18);
  assert.ok(state.stations.length <= 4);
});

test('both ends of the 65–90 m launch window are playable', () => {
  for (const launchDistance of [65, 90]) {
    const state = startGame(createGame({ hazards: false }));
    flyUntilCleared(state, 3, launchDistance);
    assert.equal(state.phase, 'running', `launch at ${launchDistance} m: ${state.crashReason}`);
    assert.equal(state.cleared, 3);
  }
});

test('exhausted fuel stops thrust, then landing allows fuel to recover', () => {
  const state = startGame(createGame({ hazards: false }));
  moveStationsAway(state);
  while (state.time < 6 && state.fuel > 0) stepGame(state, { boost: true }, 1 / 60);
  assert.equal(state.fuel, 0);
  assert.equal(state.boosting, false);
  assert.ok(state.height > 0);
  assert.ok(state.maxHeight <= 18);
  advance(state, 6);
  assert.equal(state.height, 0);
  assert.equal(state.vy, 0);
  assert.equal(state.fuel, 100);
  assert.equal(state.phase, 'running');
});

test('pausing freezes position, fuel, timers and score until resumed', () => {
  const state = startGame(createGame({ hazards: false }));
  advance(state, 1, { boost: true, left: true });
  pauseGame(state);
  const paused = structuredClone(state);
  stepGame(state, { boost: true, right: true, brake: true }, 20);
  assert.deepEqual(state, paused);
  resumeGame(state);
  stepGame(state, {}, 0.1);
  assert.equal(state.phase, 'running');
  assert.ok(state.distance > paused.distance);
});

test('one station only awards one clear when the car moves beyond it', () => {
  const state = startGame(createGame({ hazards: false }));
  flyUntilCleared(state, 1);
  const firstStation = state.stations.find((station) => station.id === 1);
  assert.equal(firstStation.passed, true);
  advance(state, 0.6);
  assert.equal(state.cleared, 1);
  assert.equal(firstStation.passed, true);
  assert.equal(getNextStation(state).id, 2);
});

test('a clear is awarded only after the rear of the car leaves the canopy', () => {
  const state = startGame(createGame({ hazards: false }));
  state.stations = [{ id: 1, z: 30, height: 5, depth: 10, passed: false }];
  state.distance = 35;
  state.height = 15;
  stepGame(state, {}, 0.01);
  assert.equal(state.cleared, 0);
  stepGame(state, {}, 0.12);
  assert.equal(state.cleared, 1);
});

test('a long frame cannot tunnel through a toll station', () => {
  const state = startGame(createGame({ hazards: false }));
  state.distance = 155;
  state.speed = 44;
  stepGame(state, {}, 5);
  assert.equal(state.phase, 'over');
  assert.equal(state.cleared, 0);
  assert.ok(state.distance < 180);
});

test('releasing boost too early can collide while descending onto the canopy', () => {
  const state = startGame(createGame({ hazards: false }));
  state.distance = 174;
  state.height = 6;
  state.vy = -10;
  state.speed = 44;
  stepGame(state, {}, 0.6);
  assert.equal(state.phase, 'over');
  assert.equal(state.cleared, 0);
});

test('steering clamps at the road shoulder without ending the run', () => {
  const state = startGame(createGame({ hazards: false }));
  advance(state, 2, { right: true });
  assert.ok(state.x > 4);
  assert.ok(state.x <= PLAYER_X_LIMIT);
  assert.equal(state.phase, 'running');
  advance(state, 1, { left: true });
  assert.ok(state.x < 4);
  assert.ok(state.x >= -PLAYER_X_LIMIT);
});

test('ready and completed runs do not advance, and restart resets the same object', () => {
  const state = createGame({ hazards: false });
  const ready = structuredClone(state);
  stepGame(state, { boost: true }, 5);
  assert.deepEqual(state, ready);
  startGame(state);
  advance(state, 12);
  const ended = structuredClone(state);
  stepGame(state, { boost: true }, 5);
  assert.deepEqual(state, ended);
  assert.equal(startGame(state), state);
  assert.equal(state.distance, 0);
  assert.equal(state.cleared, 0);
  assert.equal(state.score, 0);
  assert.equal(state.fuel, 100);
  assert.equal(state.phase, 'running');
  assert.ok(state.event.id > ended.event.id);
});
