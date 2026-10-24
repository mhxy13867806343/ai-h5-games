// Moving traffic and telegraphed anti-air fire, in absolute road coordinates.
import { LANE_CENTERS, PLAYER_START_X, TURRET_X } from './road-config.mjs';
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const lerp = (a, b, t) => a + (b - a) * t;
const CHARGE_TIME = 1.15;
const SHELL_SPEED = 94;
const emit = (s, type, message) => { s.event = { id: s.event.id + 1, type, message }; };

function random(s) {
  // Mulberry32: sampled only at spawn, and fully replayable from state.seed.
  s.randomState = (s.randomState + 0x6d2b79f5) >>> 0;
  let value = s.randomState;
  value = Math.imul(value ^ value >>> 15, value | 1);
  value ^= value + Math.imul(value ^ value >>> 7, value | 61);
  return ((value ^ value >>> 14) >>> 0) / 4294967296;
}

function car(s, id, x, z) {
  const sample = random(s);
  const kind = sample < 0.56 ? 'sedan' : sample < 0.84 ? 'suv' : 'truck';
  const cruiseSpeed = kind === 'truck' ? 10.5 + random(s) * 5.5
    : kind === 'suv' ? 12.5 + random(s) * 6 : 13.5 + random(s) * 6.5;
  return {
    id, x, z, speed: cruiseSpeed, cruiseSpeed,
    width: kind === 'truck' ? 2.2 : 1.9,
    length: kind === 'truck' ? 7 : kind === 'suv' ? 4.9 : 4.4,
    height: kind === 'truck' ? 3 : kind === 'suv' ? 1.95 : 1.5,
    kind, color: Math.floor(random(s) * 6), passed: false,
  };
}

function turret(station) {
  return {
    id: station.id, x: station.id % 2 ? TURRET_X : -TURRET_X,
    z: station.z + 85, y: 1.7, phase: 'idle', charge: 0,
    activationZ: station.z + station.depth / 2 + 2.1,
    aimX: 0, aimY: 0, aimZ: station.z,
    flash: 0, cooldown: 0,
  };
}

export function initializeHazards(s) {
  s.traffic = [];
  s.turrets = [];
  s.projectiles = [];
  s.threat = { phase: 'safe', charge: 0, turretId: null };
  s.overtaken = 0;
  s.hazardMeta = { carId: 1, shellId: 1, lastTurretId: null };
  if (!s.hazardsEnabled) return;
  const count = 6 + Math.floor(random(s) * 3);
  let z = 25 + random(s) * 20;
  for (let index = 0; index < count; index += 1) {
    // Keep the first starting-lane car beyond the initial reaction corridor.
    const lanes = z < 80 ? LANE_CENTERS.filter((x) => x !== PLAYER_START_X) : LANE_CENTERS;
    const x = lanes[Math.floor(random(s) * lanes.length)];
    s.traffic.push(car(s, s.hazardMeta.carId++, x, z));
    z += 24 + random(s) * 28;
  }
  s.turrets = s.stations.slice(0, 6).map(turret);
}

function replenish(s) {
  s.traffic = s.traffic.filter((c) => c.z > s.distance - 65).slice(0, 10);
  while (s.traffic.length < 10) {
    const id = s.hazardMeta.carId++;
    const farthest = s.traffic.reduce((z, c) => Math.max(z, c.z), s.distance + 180);
    const z = farthest + 55 + random(s) * 40;
    const x = LANE_CENTERS[Math.floor(random(s) * LANE_CENTERS.length)];
    s.traffic.push(car(s, id, x, z));
  }
  s.turrets = s.turrets.filter((t) => t.z > s.distance - 160).slice(0, 6);
  for (const station of s.stations) {
    if (s.turrets.length >= 6) break;
    if (station.z + 85 < s.distance - 160) continue;
    if (!s.turrets.some((t) => t.id === station.id)) s.turrets.push(turret(station));
  }
}

// Segment versus an origin-centred box. This also catches side swipes and
// high-speed shells that cross the entire player between render frames.
function sweep(a, b, half) {
  let enter = 0;
  let leave = 1;
  for (let axis = 0; axis < 3; axis += 1) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-10) {
      if (Math.abs(a[axis]) > half[axis]) return null;
      continue;
    }
    let t0 = (-half[axis] - a[axis]) / delta;
    let t1 = (half[axis] - a[axis]) / delta;
    if (t0 > t1) [t0, t1] = [t1, t0];
    enter = Math.max(enter, t0);
    leave = Math.min(leave, t1);
    if (enter > leave) return null;
  }
  return enter;
}

function crash(s, before, fraction, dt, reason) {
  s.distance = lerp(before.distance, s.distance, fraction);
  s.x = lerp(before.x, s.x, fraction);
  s.height = lerp(before.height, s.height, fraction);
  s.time -= dt * (1 - fraction);
  s.phase = 'over';
  s.boosting = false;
  s.vy = 0;
  s.crashReason = reason;
  emit(s, 'crash', reason);
}

function moveTraffic(s, before, dt) {
  // Work from the leading vehicles backwards, preserving a following gap.
  const ordered = [...s.traffic].sort((a, b) => b.z - a.z);
  for (const c of ordered) {
    const oldZ = c.z;
    // Older injected/save-state vehicles without cruiseSpeed keep their own
    // existing speed; never regenerate cruise speed from id or frame time.
    if (!Number.isFinite(c.cruiseSpeed)) c.cruiseSpeed = c.speed;
    let targetSpeed = c.cruiseSpeed;
    const station = s.stations.find((st) => st.z + 12 > c.z);
    if (station && station.z - c.z < 42) targetSpeed = 6;
    const leader = ordered.filter((other) => other !== c && other.z > c.z && Math.abs(other.x - c.x) < 2.4)
      .sort((a, b) => a.z - b.z)[0];
    if (leader) {
      const gap = leader.z - c.z - (leader.length + c.length) / 2;
      targetSpeed = Math.min(targetSpeed, Math.max(0, (gap - 5) * 1.3));
    }
    c.speed += clamp(targetSpeed - c.speed, -7 * dt, 2 * dt);
    c.z += Math.max(0, c.speed) * dt;
    if (leader) c.z = Math.min(c.z, leader.z - (leader.length + c.length) / 2 - 5);
    const hit = sweep(
      [before.x - c.x, before.height + 0.65 - c.height / 2, before.distance - oldZ],
      [s.x - c.x, s.height + 0.65 - c.height / 2, s.distance - c.z],
      [0.9 + c.width / 2, 0.65 + c.height / 2, 2.1 + c.length / 2],
    );
    if (hit !== null) {
      crash(s, before, hit, dt, '撞上了前方车辆！变道避让，或用冷气从车顶飞过。');
      return;
    }
    if (!c.passed && s.distance - 2.1 > c.z + c.length / 2) {
      c.passed = true;
      s.overtaken += 1;
      emit(s, 'traffic', `超越 ${s.overtaken} 辆车 · +100`);
    }
  }
}

function predictedHeight(s, time) {
  const acceleration = s.boosting ? 7.2 : -13.5;
  return clamp(s.height + s.vy * time + acceleration * time * time / 2, 0, 18) + 0.65;
}

function updateAim(s, t) {
  let flight = 0.5;
  for (let index = 0; index < 8; index += 1) {
    t.aimZ = s.distance + s.speed * flight;
    flight = Math.hypot(t.aimX - t.x, t.aimY - t.y, t.aimZ - t.z) / SHELL_SPEED;
  }
  return flight;
}

function fire(s, t) {
  if (s.projectiles.length >= 18) return;
  updateAim(s, t);
  const dx = t.aimX - t.x;
  const dy = t.aimY - t.y;
  const dz = t.aimZ - t.z;
  const length = Math.hypot(dx, dy, dz) || 1;
  s.projectiles.push({
    id: s.hazardMeta.shellId++, x: t.x, y: t.y, z: t.z,
    vx: dx / length * SHELL_SPEED, vy: dy / length * SHELL_SPEED,
    vz: dz / length * SHELL_SPEED, radius: 0.42, life: 3.2,
  });
  t.flash = 0.19;
  t.phase = 'cooldown';
  t.charge = 0;
  t.cooldown = 3.8;
  s.hazardMeta.lastTurretId = t.id;
  emit(s, 'shot', '炮弹来袭！立即左右变向，避开弹道。');
}

function updateTurrets(s, dt) {
  for (const t of s.turrets) {
    t.flash = Math.max(0, t.flash - dt);
    t.cooldown = Math.max(0, t.cooldown - dt);
    if (t.cooldown > 0) { t.phase = 'cooldown'; continue; }
    const eligible = s.distance >= (t.activationZ ?? -Infinity)
      && s.height > 2.8 && Math.abs(t.z - s.distance) < 130;
    if (!eligible) {
      if (t.phase === 'tracking') emit(s, 'dodge', '已脱离锁定');
      t.phase = 'idle';
      t.charge = 0;
      continue;
    }
    if (t.phase !== 'tracking') {
      t.phase = 'tracking';
      t.charge = 0;
      // The warning marks a committed lateral/vertical aim corridor. Forward
      // lead continues updating until launch; sideways movement or dropping
      // after the warning can therefore evade, even before the shot launches.
      t.aimX = s.x;
      t.aimY = predictedHeight(s, CHARGE_TIME + 0.5);
      emit(s, 'lock', '被炮台锁定！左右变向，或松开冷气下降。');
    }
    updateAim(s, t);
    t.charge = Math.min(1, t.charge + dt / CHARGE_TIME);
    if (t.charge >= 1) fire(s, t);
  }
}

function moveShells(s, before, dt) {
  for (const p of s.projectiles) {
    const old = [p.x, p.y, p.z];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    const hit = sweep(
      [old[0] - before.x, old[1] - before.height - 0.65, old[2] - before.distance],
      [p.x - s.x, p.y - s.height - 0.65, p.z - s.distance],
      [0.9 + p.radius, 0.65 + p.radius, 2.1 + p.radius],
    );
    if (hit !== null) {
      crash(s, before, hit, dt, '遭到炮击！看到锁定后变向，越站后及时下降。');
      return;
    }
  }
  s.projectiles = s.projectiles.filter((p) => p.life > 0 && p.y > -2 && Math.abs(p.z - s.distance) < 300).slice(0, 18);
}

function updateThreat(s) {
  if (s.projectiles.length) {
    s.threat = { phase: 'incoming', charge: 1, turretId: s.hazardMeta.lastTurretId };
    return;
  }
  const locking = s.turrets.filter((t) => t.phase === 'tracking').sort((a, b) => b.charge - a.charge)[0];
  s.threat = locking
    ? { phase: 'locking', charge: locking.charge, turretId: locking.id }
    : { phase: 'safe', charge: 0, turretId: null };
}

export function stepHazards(s, before, dt) {
  if (!s.hazardsEnabled) return;
  moveTraffic(s, before, dt);
  if (s.phase !== 'running') return;
  moveShells(s, before, dt);
  if (s.phase !== 'running') return;
  updateTurrets(s, dt);
  replenish(s);
  updateThreat(s);
}
