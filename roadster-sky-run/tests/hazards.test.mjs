import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, startGame, stepGame, pauseGame, resumeGame, getNextStation } from '../src/simulation.mjs';
import { LANE_CENTERS, PLAYER_START_X, TURRET_X } from '../src/road-config.mjs';

const advance = (s, duration, input = {}) => {
  for (let t = 0; t < duration && s.phase === 'running'; t += 1 / 120) stepGame(s, input, 1 / 120);
};
function emptyRoad() {
  const state = startGame(createGame({ seed: 421 }));
  state.stations.forEach((station) => { station.z += 10000; });
  state.traffic = [];
  state.turrets = [];
  return state;
}
function airTarget() {
  const state = emptyRoad();
  state.height = 18;
  state.speed = 44;
  state.time = 20;
  state.turrets = [{ id: 900, x: TURRET_X, z: 40, y: 1.7, phase: 'idle', charge: 0, aimX: 0, aimY: 0, aimZ: 0, flash: 0, cooldown: 0 }];
  return state;
}

test('traffic starts populated, advances and a ground rear-end collision ends the run', () => {
  const s = startGame(createGame());
  assert.ok(s.traffic.length >= 5);
  assert.ok(s.traffic[0].z >= 25 && s.traffic[0].z <= 45);
  const first = s.traffic[0];
  const initialZ = first.z;
  advance(s, 0.2);
  assert.ok(first.z > initialZ);
  const target = emptyRoad();
  target.traffic = [{ id: 900, x: PLAYER_START_X, z: 8, speed: 10, width: 1.9, length: 4.4, height: 1.5, kind: 'sedan', color: 0, passed: false }];
  advance(target, 1);
  assert.equal(target.phase, 'over');
  assert.match(target.crashReason, /车/);
});

test('a high car can fly over traffic and counts each overtake only once', () => {
  const s = emptyRoad();
  s.height = 18;
  s.traffic = [{ id: 900, x: PLAYER_START_X, z: 8, speed: 10, width: 1.9, length: 4.4, height: 1.5, kind: 'sedan', color: 0, passed: false }];
  advance(s, 1.3, { boost: true });
  assert.equal(s.phase, 'running');
  assert.equal(s.overtaken, 1);
  advance(s, 0.3, { boost: true });
  assert.equal(s.overtaken, 1);
});

test('turrets ignore ground traffic, then visibly charge for at least one second before firing', () => {
  const ground = airTarget();
  ground.height = 0;
  advance(ground, 2);
  assert.equal(ground.projectiles.length, 0);
  assert.equal(ground.threat.phase, 'safe');
  const air = airTarget();
  advance(air, 0.8, { boost: true });
  assert.equal(air.projectiles.length, 0);
  assert.equal(air.threat.phase, 'locking');
  assert.ok(air.threat.charge > 0 && air.threat.charge < 1);
  advance(air, 0.5, { boost: true });
  assert.ok(air.projectiles.length > 0);
});

test('predictive cannon rounds hit an airborne car that does not evade', () => {
  const s = airTarget();
  advance(s, 3, { boost: true });
  assert.equal(s.phase, 'over');
  assert.match(s.crashReason, /炮击/);
});

test('turning after lock evades the fixed shot, while dropping cancels aerial targeting', () => {
  const turn = airTarget();
  advance(turn, 0.12, { boost: true });
  assert.equal(turn.threat.phase, 'locking');
  advance(turn, 2.3, { boost: true, left: true });
  assert.equal(turn.phase, 'running', turn.crashReason);
  const drop = airTarget();
  advance(drop, 0.12, { boost: true });
  advance(drop, 2.3);
  assert.equal(drop.phase, 'running', drop.crashReason);
  assert.equal(drop.height, 0);
});

test('pause freezes all hazards and restart clears projectiles while retaining hazard preference', () => {
  const s = airTarget();
  advance(s, 1.3, { boost: true });
  assert.ok(s.projectiles.length);
  pauseGame(s);
  const copy = structuredClone(s);
  stepGame(s, { boost: true }, 4);
  assert.deepEqual(s, copy);
  resumeGame(s);
  startGame(s);
  assert.equal(s.projectiles.length, 0);
  assert.equal(s.overtaken, 0);
  assert.equal(s.threat.phase, 'safe');
  assert.ok(s.traffic.length >= 5);
  const simple = startGame(createGame({ hazards: false }));
  startGame(simple);
  assert.equal(simple.traffic.length, 0);
  assert.equal(simple.turrets.length, 0);
});

test('moving world maintains entity bounds and a long frame cannot skip a traffic collision', () => {
  const s = emptyRoad();
  s.traffic = [{ id: 900, x: PLAYER_START_X, z: 8, speed: 10, width: 1.9, length: 4.4, height: 1.5, kind: 'sedan', color: 0, passed: false }];
  stepGame(s, {}, 5);
  assert.equal(s.phase, 'over');
  const world = emptyRoad();
  for (let index = 0; index < 50; index += 1) {
    world.distance += 100;
    world.height = 18;
    world.fuel = 100;
    stepGame(world, { boost: true }, 0.01);
    assert.equal(world.phase, 'running');
    assert.ok(world.traffic.length <= 10);
    assert.ok(world.turrets.length <= 6);
    assert.ok(world.projectiles.length <= 18);
  }
});

test('launched shells keep their velocity after the player changes direction', () => {
  const s = airTarget();
  advance(s, 1.18, { boost: true });
  const shell = s.projectiles[0];
  assert.ok(shell);
  const velocity = [shell.vx, shell.vy, shell.vz];
  advance(s, 0.08, { boost: true, left: true });
  assert.deepEqual([shell.vx, shell.vy, shell.vz], velocity);
});

test('simultaneously ready turrets cannot exceed the projectile limit', () => {
  const s = airTarget();
  const sample = s.turrets[0];
  s.turrets = Array.from({ length: 6 }, (_, index) => ({ ...sample, id: 900 + index, phase: 'tracking', charge: 1, aimY: 18.65 }));
  s.projectiles = Array.from({ length: 18 }, (_, index) => ({ id: index + 1, x: 1000, y: 20, z: 50, vx: 0, vy: 0, vz: 20, radius: 0.42, life: 3 }));
  advance(s, 0.02, { boost: true });
  assert.equal(s.projectiles.length, 18);
  assert.equal(s.phase, 'running');
});

test('75 m jumps, telegraphed lane changes and visible traffic gaps clear three default stations', () => {
  const s = startGame(createGame({ seed: 20261020 }));
  let targetX = PLAYER_START_X;
  let lastTurret = null;
  while (s.phase === 'running' && s.cleared < 3 && s.time < 60) {
    if (s.threat.phase === 'locking' && s.threat.turretId !== lastTurret) {
      lastTurret = s.threat.turretId;
      targetX = s.x >= 0 ? LANE_CENTERS[0] : LANE_CENTERS[3];
    }
    if (s.height < 1) {
      const lanes = LANE_CENTERS.map((x) => ({
        x,
        gap: Math.min(160, ...s.traffic.filter((c) => Math.abs(c.x - x) < 2.2 && c.z > s.distance - 7).map((c) => c.z - s.distance)),
      })).sort((a, b) => b.gap - a.gap);
      if (lanes[0].gap > 25) targetX = lanes[0].x;
    }
    stepGame(s, {
      boost: getNextStation(s).z - s.distance <= 75,
      left: s.x > targetX + 0.18,
      right: s.x < targetX - 0.18,
    }, 1 / 60);
  }
  assert.equal(s.phase, 'running', s.crashReason);
  assert.equal(s.cleared, 3);
  assert.ok(s.overtaken > 5);
});

test('ordinary restarts use fresh seeds and traffic layouts while explicit seeds replay', () => {
  const s = createGame();
  const layouts = new Set();
  const seeds = new Set();
  for (let index = 0; index < 12; index += 1) {
    startGame(s);
    layouts.add(JSON.stringify(s.traffic));
    seeds.add(s.seed);
  }
  assert.equal(layouts.size, 12);
  assert.equal(seeds.size, 12);
  const a = startGame(createGame({ seed: 123456 }));
  const b = startGame(createGame({ seed: 123456 }));
  assert.deepEqual(a.traffic, b.traffic);
  const original = structuredClone(a.traffic);
  startGame(a);
  assert.deepEqual(a.traffic, original);
  assert.equal(a.seed, 123456);
});

test('many seeds keep four-lane starting traffic staggered and the first 65 m clear', () => {
  const lanes = [-6.15, -2.05, 2.05, 6.15];
  const kinds = new Set();
  const colors = new Set();
  for (let seed = 1; seed <= 120; seed += 1) {
    const s = startGame(createGame({ seed }));
    assert.equal(s.x, -2.05);
    assert.ok(s.traffic.length >= 6 && s.traffic.length <= 8);
    assert.ok(s.traffic[0].z >= 25 && s.traffic[0].z <= 45);
    assert.ok(s.traffic.every((c) => lanes.includes(c.x)));
    assert.ok(s.traffic.every((c) => c.x !== s.x || c.z - c.length / 2 >= 65));
    for (let index = 1; index < s.traffic.length; index += 1) {
      const previous = s.traffic[index - 1];
      const current = s.traffic[index];
      assert.ok(current.z - previous.z > (current.length + previous.length) / 2 + 10);
    }
    for (const c of s.traffic) {
      kinds.add(c.kind);
      colors.add(c.color);
      assert.ok(c.cruiseSpeed > 9 && c.cruiseSpeed < 22);
      assert.equal(c.speed, c.cruiseSpeed);
    }
    assert.ok(s.turrets.every((t) => Math.abs(t.x) === 10.9));
    advance(s, 1.5);
    assert.equal(s.phase, 'running', `unsafe seed ${seed}`);
  }
  assert.equal(kinds.size, 3);
  assert.equal(colors.size, 6);
});

test('cars retain their sampled cruising speed and later traffic consumes the seeded random stream', () => {
  const s = startGame(createGame({ seed: 7654 }));
  s.stations.forEach((station) => { station.z += 10000; });
  const sample = { ...s.traffic[0], x: 6.15, z: 80 };
  s.traffic = [sample];
  s.turrets = [];
  const initialSpeed = sample.cruiseSpeed;
  advance(s, 1);
  assert.equal(sample.cruiseSpeed, initialSpeed);
  assert.ok(Math.abs(sample.speed - initialSpeed) < 1e-8);
  const generated = s.traffic.filter((c) => c.id !== sample.id);
  assert.ok(generated.length > 0);
  assert.ok(generated.every((c) => c.z >= 235));
  assert.ok(new Set(generated.map((c) => c.cruiseSpeed)).size > 3);
  const a = startGame(createGame({ seed: 54321 }));
  const b = startGame(createGame({ seed: 54321 }));
  advance(a, 1);
  advance(b, 1);
  assert.deepEqual(a.traffic, b.traffic);
  assert.equal(a.randomState, b.randomState);
});

function flyPastFirstStation() {
  const s = startGame(createGame({ seed: 1 }));
  const first = s.stations[0];
  while (s.phase === 'running' && s.cleared === 0 && s.time < 15) {
    if (s.distance < first.z + first.depth / 2 + 2.1) {
      assert.equal(s.threat.phase, 'safe');
      assert.equal(s.projectiles.length, 0);
    }
    stepGame(s, { boost: first.z - s.distance <= 75 }, 1 / 120);
  }
  assert.equal(s.phase, 'running', s.crashReason);
  assert.equal(s.cleared, 1);
  return s;
}

test('a visible cannon ahead only locks and fires after the whole car clears its toll station', () => {
  const s = flyPastFirstStation();
  const cannon = s.turrets.find((t) => t.id === 1);
  assert.equal(cannon.z, 265);
  assert.equal(cannon.activationZ, 185.6);
  assert.equal(s.threat.phase, 'locking');
  advance(s, 0.9, { boost: true });
  assert.equal(s.projectiles.length, 0);
  advance(s, 0.3, { boost: true });
  assert.equal(s.phase, 'running');
  assert.ok(cannon.z > s.distance);
  assert.ok(s.projectiles.length > 0);
  assert.ok(cannon.flash > 0);
  advance(s, 1, { boost: true });
  assert.equal(s.phase, 'over');
  assert.match(s.crashReason, /炮击/);
});

test('turning after the first post-toll lock evades its real shot', () => {
  const s = flyPastFirstStation();
  advance(s, 2.1, { boost: true, right: true });
  assert.equal(s.phase, 'running', s.crashReason);
  assert.ok(s.projectiles.length > 0);
  assert.ok(s.x > 5);
});
