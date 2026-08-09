/* 螺旋泡泡柱2 — 1:1 复刻版
 * HTML5 Canvas · 750×563
 * 玩法：螺旋柱内泡泡消除，鼠标瞄准，点击发射，3+ 同色消除
 */
(() => {
  'use strict';

  // ====== 常量配置 ======
  const W = 750, H = 563;
  const COLS = 13;                   // 螺旋的列数
  const ROWS = 18;                   // 螺旋的行数
  const R = 18;                      // 泡泡半径
  const COLORS = ['red', 'green', 'orange'];
  const COLOR_RGB = {
    red:   { main: [225, 50, 50],  light: [255, 200, 180], dark: [120, 10, 10] },
    green: { main: [60, 200, 90],  light: [200, 255, 200], dark: [10, 90, 30]  },
    orange:{ main: [255, 150, 30], light: [255, 230, 180], dark: [150, 70, 0]  },
  };
  const FUNNEL = {
    topW: 380,        // 顶部宽度
    botW: 260,        // 底部宽度
    topY: 18,         // 顶部 y
    botY: 510,        // 底部 y
    cx: 280,          // 螺旋中心 x（偏左）
    color: '#a37047',
    dark: '#5a3a22',
    light: '#d6a878',
  };
  const SHOOTER = { x: 510, y: 480, r: 22 };   // 发射器位置
  const WALL_X = 540;                          // 右侧反弹墙
  const CEIL_Y = 20;                           // 顶部天花板
  const DANGER_Y = 470;                        // 警戒线 y
  const SHOT_SPEED = 18;                       // 子弹速度

  // ====== 工具函数 ======
  const rnd = (a, b) => a + Math.random() * (b - a);
  const rndi = (a, b) => Math.floor(rnd(a, b + 1));
  const choice = arr => arr[rndi(0, arr.length - 1)];
  const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const TAU = Math.PI * 2;

  // ====== 音频系统（WebAudio 合成） ======
  const Audio = (() => {
    let ctx = null, master = null, muted = false;
    function ensure() {
      if (!ctx) {
        try {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          master = ctx.createGain();
          master.gain.value = 0.35;
          master.connect(ctx.destination);
        } catch (e) { ctx = null; }
      }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function tone(freq, dur, type = 'sine', vol = 1) {
      if (muted) return;
      const c = ensure(); if (!c) return;
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(master);
      o.start(t); o.stop(t + dur + 0.02);
    }
    return {
      shoot()  { tone(620, 0.08, 'square', 0.5); setTimeout(() => tone(880, 0.06, 'square', 0.4), 30); },
      pop()    { tone(900, 0.06, 'triangle', 0.7); tone(1300, 0.08, 'sine', 0.5); },
      bigPop() { for (let i = 0; i < 4; i++) setTimeout(() => tone(600 + i * 200, 0.1, 'triangle', 0.6), i * 25); },
      fall()   { tone(220, 0.18, 'sine', 0.4); },
      win()    { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'triangle', 0.6), i * 110)); },
      lose()   { [400, 300, 200, 130].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.5), i * 140)); },
      click()  { tone(800, 0.05, 'square', 0.3); },
      setMuted(v) { muted = v; },
      toggle() { muted = !muted; return muted; },
    };
  })();

  // ====== 泡泡渲染（3D 球面效果） ======
  function drawBubble(ctx, x, y, r, color, alpha = 1, scale = 1, highlight = 1) {
    const c = COLOR_RGB[color];
    const rad = r * scale;
    ctx.save();
    ctx.globalAlpha = alpha;
    // 外圈阴影
    const sh = ctx.createRadialGradient(x + rad * 0.15, y + rad * 0.2, rad * 0.2, x, y, rad);
    sh.addColorStop(0, `rgba(${c.light.join(',')},1)`);
    sh.addColorStop(0.35, `rgba(${c.main.join(',')},1)`);
    sh.addColorStop(0.85, `rgba(${c.main.join(',')},1)`);
    sh.addColorStop(1, `rgba(${c.dark.join(',')},1)`);
    ctx.fillStyle = sh;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fill();
    // 内部高光（左上）
    const hl = ctx.createRadialGradient(x - rad * 0.35, y - rad * 0.4, 0, x - rad * 0.35, y - rad * 0.4, rad * 0.65);
    hl.addColorStop(0, `rgba(255,255,255,${0.65 * highlight})`);
    hl.addColorStop(0.5, `rgba(255,255,255,${0.1 * highlight})`);
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fill();
    // 下方反光（深色）
    const rf = ctx.createRadialGradient(x + rad * 0.2, y + rad * 0.55, 0, x + rad * 0.2, y + rad * 0.55, rad * 0.65);
    rf.addColorStop(0, 'rgba(255,255,255,0)');
    rf.addColorStop(0.6, `rgba(${c.dark.join(',')},0.35)`);
    rf.addColorStop(1, `rgba(${c.dark.join(',')},0.85)`);
    ctx.fillStyle = rf;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.fill();
    // 主高光小点
    ctx.fillStyle = `rgba(255,255,255,${0.9 * highlight})`;
    ctx.beginPath();
    ctx.arc(x - rad * 0.4, y - rad * 0.45, rad * 0.14, 0, TAU);
    ctx.fill();
    // 描边
    ctx.strokeStyle = `rgba(${c.dark.join(',')},0.4)`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(x, y, rad, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  // 带刺绿球（发射器/当前泡泡）
  function drawSpikeBall(ctx, x, y, r, rot) {
    const c = COLOR_RGB.green;
    // 刺
    const spikes = 12;
    for (let i = 0; i < spikes; i++) {
      const a = (i / spikes) * TAU + rot;
      const x1 = x + Math.cos(a) * r * 0.6;
      const y1 = y + Math.sin(a) * r * 0.6;
      const x2 = x + Math.cos(a) * r * 1.35;
      const y2 = y + Math.sin(a) * r * 1.35;
      const g = ctx.createLinearGradient(x1, y1, x2, y2);
      g.addColorStop(0, '#3a8b3a');
      g.addColorStop(0.5, '#7ad06b');
      g.addColorStop(1, '#2a5d27');
      ctx.strokeStyle = g;
      ctx.lineWidth = r * 0.18;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
    // 球体
    const g2 = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
    g2.addColorStop(0, '#c8f0a0');
    g2.addColorStop(0.5, '#52b04a');
    g2.addColorStop(1, '#1c5b1c');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    // 高光
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.4, r * 0.15, 0, TAU);
    ctx.fill();
  }

  // ====== 螺旋柱生成 ======
  // 标准六边形蜂巢网格 + 3D 透视渲染（仿原版视觉）
  // 每行泡泡数随关卡减少形成"螺旋下窄"效果
  // 渲染时根据泡泡在网格中的位置做 3D 透视（左/右边缘变小、变暗）
  // 整体外层由"棕色漏斗"包围，呈现螺旋柱观感
  function buildSpiral(level) {
    const cx = FUNNEL.cx;
    // 列数：随关卡减少（柱体向下收窄）
    const colByLevel = [13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 7];
    const COLS = colByLevel[Math.min(level - 1, colByLevel.length - 1)] || 11;
    // 行数：足够的空间
    const ROWS = 20;
    // 横向间距（六边形）
    const dx = R * 1.86;        // 略小于 2R，留点空隙
    const dy = R * 1.62;        // 略小于 sqrt(3)*R
    // 每行从顶部开始的总宽：随关卡变窄
    const topW = FUNNEL.topW * 0.92;
    const botW = FUNNEL.botW * 1.05;
    // 顶部 y
    const topY = FUNNEL.topY + 38;

    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      // 该行 x 范围（用线性插值形成上宽下窄）
      const t = r / (ROWS - 1);
      const w = lerp(topW, botW, t);
      // 该行泡泡数（每两行可能减 1，形成自然过渡）
      const colsThis = Math.max(5, Math.round(COLS - r * 0.35));
      const startX = cx - w / 2 + (w - colsThis * dx) / 2 + dx / 2;
      const row = [];
      for (let c = 0; c < colsThis; c++) {
        const x = startX + c * dx + (r % 2 ? dx / 2 : 0);
        const y = topY + r * dy;
        // 计算该泡泡距中心水平距离（用于 3D 透视）
        const offX = (x - cx) / (w / 2);  // -1..1
        // 透视：3D 圆柱上泡泡的高度 (y) 应该是 y_3d = sin(angle) * radius
        // 屏幕 y = base_y + sin(angle) * radius * perspective
        // 屏幕 x = base_x = sin(angle) * radius
        // 因此 offX = sin(angle) → angle = asin(offX)
        // y_3d = sin(angle) * radius = offX * radius（屏幕 y 加这个偏移）
        // 但我们已经用 x 表达了 sin(angle)，所以屏幕 y 不需要再偏移
        // 深度 = cos(angle) = sqrt(1 - offX^2)
        const depth = Math.sqrt(Math.max(0, 1 - offX * offX));
        row.push({
          x, y,
          offX, depth,
          color: null,
          ring: r, i: c,
        });
      }
      if (row.length) rows.push(row);
    }

    // 填充颜色：保证无初始 3 连
    function fillRow(ri, full) {
      if (ri >= rows.length) return;
      const row = rows[ri];
      for (let bi = 0; bi < row.length; bi++) {
        const b = row[bi];
        let color;
        let tries = 0;
        do {
          color = COLORS[rndi(0, COLORS.length - 1)];
          tries++;
          // 同 row 左右
          const sameL = bi > 0 && row[bi - 1].color === color;
          const sameL2 = bi > 1 && row[bi - 2].color === color;
          // 上一行同列 + 偏移
          const prev = ri > 0 ? rows[ri - 1] : null;
          const sameA = prev && prev[bi] && prev[bi].color === color;
          const sameA2 = prev && prev[bi - 1] && prev[bi - 1].color === color;
          if (sameL && sameL2) continue;
          if (sameL && sameA) continue;
          if (sameA && sameA2) continue;
          if (sameL2 && sameA) continue;
          break;
        } while (tries < 12);
        b.color = color;
      }
    }
    // 初始已填充行数（关卡越高填得越多）
    const filled = 3 + Math.min(level - 1, 5);
    for (let r = 0; r < rows.length; r++) {
      if (r < filled) fillRow(r, true);
      else if (r === filled) {
        // 半填充：随机散落
        rows[r].forEach((b, i) => { if (Math.random() < 0.3) b.color = COLORS[rndi(0, 2)]; });
      } else break;
    }
    return { rows, COLS, dx, dy };
  }
  function weightedChoice(weights) {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return COLORS[i];
    }
    return COLORS[COLORS.length - 1];
  }

  // ====== 游戏状态 ======
  const STATE = { MENU: 0, PLAYING: 1, PAUSED: 2, OVER: 3, WIN: 4 };
  const game = {
    state: STATE.MENU,
    level: 1,
    score: 0,
    target: 1500,
    grid: null,
    flying: null,         // 飞行中的泡泡 {x,y,vx,vy,color}
    current: null,        // 下一个要发射的泡泡
    nextColor: null,
    angle: -Math.PI / 2,
    particles: [],
    popAnims: [],
    scoreFloats: [],
    time: 0,
    shots: 0,
    lastTime: 0,
    requestRef: 0,
    aimDir: { x: 0, y: -1 },
    mouseX: W / 2, mouseY: H / 2,
  };

  // ====== 螺旋数学：位置 → 网格索引 ======
  // 找最近的"槽位"（行内位置），用于吸附
  function findNearestSlot(spiral, px, py) {
    let best = null, bestD = Infinity;
    for (let r = 0; r < spiral.rows.length; r++) {
      const row = spiral.rows[r];
      // 候选范围：当前行 + 上一行 + 下一行
      for (let i = 0; i < row.length; i++) {
        const b = row[i];
        if (b.color && b.color !== '__falling__') continue; // 已被占据
        const d = dist2(b.x, b.y, px, py);
        // 行越靠下越优先（避免飞到顶部）
        if (best && r > best.r) continue;
        if (d < bestD) { bestD = d; best = { r, i, b }; }
      }
    }
    if (!best) return null;
    // 在该槽位 4 邻域内不允许有已占用
    return best;
  }

  // 更严格的吸附：找最近的空位，且周围有已占据的同列/相邻列泡泡（保证能停住）
  function findSnappedSlot(spiral, px, py) {
    let best = null, bestD = Infinity;
    const rowRange = 2; // 候选行范围
    for (let r = 0; r < spiral.rows.length; r++) {
      const row = spiral.rows[r];
      for (let i = 0; i < row.length; i++) {
        const b = row[i];
        if (b.color) continue;
        // 该位置需接触至少一个已占的槽位（前一行/后一行/左右）
        const neighbors = [
          spiral.rows[r - 1] && spiral.rows[r - 1][i],
          spiral.rows[r - 1] && spiral.rows[r - 1][i - 1],
          spiral.rows[r - 1] && spiral.rows[r - 1][i + 1],
          spiral.rows[r + 1] && spiral.rows[r + 1][i],
          row[i - 1],
          row[i + 1],
        ];
        let hasNeighbor = false;
        for (const n of neighbors) {
          if (n && n.color) { hasNeighbor = true; break; }
        }
        if (!hasNeighbor && r > 0) continue;
        const d = dist2(b.x, b.y, px, py);
        if (d < bestD) { bestD = d; best = { r, i, b }; }
      }
    }
    return best;
  }

  // 取所有邻居：基于位置（距离 < 2R）—— 适配 3D 螺旋
  function getNeighbors(spiral, r, i) {
    const out = [];
    const row = spiral.rows[r];
    if (!row) return out;
    const b = row[i];
    if (!b) return out;
    const bR = R * 2 - 1;
    const bR2 = bR * bR;
    // 同层
    for (let j = 0; j < row.length; j++) {
      if (j === i) continue;
      const n = row[j];
      if (dist2(b.x, b.y, n.x, n.y) < bR2) out.push({ r, i: j, b: n });
    }
    // 上下层
    for (const dr of [-1, 1]) {
      const rr = r + dr;
      if (rr < 0 || rr >= spiral.rows.length) continue;
      const rr2 = spiral.rows[rr];
      for (let j = 0; j < rr2.length; j++) {
        const n = rr2[j];
        if (dist2(b.x, b.y, n.x, n.y) < bR2) out.push({ r: rr, i: j, b: n });
      }
    }
    return out;
  }

  // 找与指定位置连通的同色簇（BFS）
  function findCluster(spiral, r, i) {
    const start = spiral.rows[r] && spiral.rows[r][i];
    if (!start || !start.color) return [];
    const target = start.color;
    const visited = new Set();
    const stack = [{ r, i }];
    const out = [];
    while (stack.length) {
      const cur = stack.pop();
      const key = cur.r + ',' + cur.i;
      if (visited.has(key)) continue;
      visited.add(key);
      const b = spiral.rows[cur.r] && spiral.rows[cur.r][cur.i];
      if (!b || !b.color || b.color !== target) continue;
      out.push({ r: cur.r, i: cur.i, b });
      for (const n of getNeighbors(spiral, cur.r, cur.i)) {
        const nk = n.r + ',' + n.i;
        if (!visited.has(nk)) stack.push(n);
      }
    }
    return out;
  }

  // 找与顶部连通的泡泡
  function findConnectedToTop(spiral) {
    const connected = new Set();
    const stack = [];
    if (spiral.rows[0]) {
      for (let i = 0; i < spiral.rows[0].length; i++) {
        if (spiral.rows[0][i].color) {
          stack.push({ r: 0, i });
          connected.add('0,' + i);
        }
      }
    }
    while (stack.length) {
      const cur = stack.pop();
      for (const n of getNeighbors(spiral, cur.r, cur.i)) {
        const k = n.r + ',' + n.i;
        if (connected.has(k)) continue;
        if (n.b.color) { connected.add(k); stack.push({ r: n.r, i: n.i }); }
      }
    }
    return connected;
  }

  // ====== 游戏行为 ======
  function startLevel(lv) {
    game.level = lv;
    game.target = 1200 + (lv - 1) * 900;
    game.score = 0;
    game.shots = 0;
    game.grid = buildSpiral(lv);
    game.flying = null;
    game.particles = [];
    game.popAnims = [];
    game.scoreFloats = [];
    game.nextColor = choice(COLORS);
    game.current = choice(COLORS);
  }

  function shoot() {
    if (game.flying || !game.current) return;
    const dir = game.aimDir;
    const speed = SHOT_SPEED;
    game.flying = {
      x: SHOOTER.x,
      y: SHOOTER.y - 20,
      vx: dir.x * speed,
      vy: dir.y * speed,
      color: game.current,
      age: 0,
    };
    game.current = game.nextColor;
    game.nextColor = choice(COLORS);
    game.shots++;
    Audio.shoot();
  }

  function updateFlying(dt) {
    const f = game.flying;
    if (!f) return;
    f.x += f.vx;
    f.y += f.vy;
    f.age += dt;
    // 左右反弹
    if (f.x - R < 40) { f.x = 40 + R; f.vx = Math.abs(f.vx); Audio.click(); }
    if (f.x + R > WALL_X) { f.x = WALL_X - R; f.vx = -Math.abs(f.vx); Audio.click(); }
    // 顶部天花板
    if (f.y - R < CEIL_Y + 8) {
      f.y = CEIL_Y + 8 + R;
      f.vy = Math.abs(f.vy);
    }
    // 与已占据泡泡碰撞
    const spiral = game.grid;
    for (let r = 0; r < spiral.rows.length; r++) {
      const row = spiral.rows[r];
      for (let i = 0; i < row.length; i++) {
        const b = row[i];
        if (!b.color) continue;
        if (dist2(b.x, b.y, f.x, f.y) <= (R * 2 - 2) * (R * 2 - 2)) {
          // 吸附
          snapBubble(f.color, f.x, f.y);
          game.flying = null;
          return;
        }
      }
    }
    // 飞太久或飞太远
    if (f.age > 4 || f.y > H + 40) game.flying = null;
  }

  function snapBubble(color, x, y) {
    const spiral = game.grid;
    // 找最近的空槽
    let best = null, bestD = Infinity;
    for (let r = 0; r < spiral.rows.length; r++) {
      const row = spiral.rows[r];
      for (let i = 0; i < row.length; i++) {
        const b = row[i];
        if (b.color) continue;
        const d = dist2(b.x, b.y, x, y);
        if (d < bestD) { bestD = d; best = { r, i, b }; }
      }
    }
    if (!best) return;
    best.b.color = color;
    best.b.justAdded = true;
    setTimeout(() => { if (best.b) best.b.justAdded = false; }, 250);
    // 找同色簇
    const cluster = findCluster(spiral, best.r, best.i);
    if (cluster.length >= 3) {
      // 消除
      const popN = cluster.length;
      cluster.forEach(p => {
        const px = p.b.x, py = p.b.y;
        spawnPop(px, py, p.b.color);
        p.b.color = null;
        p.b.justAdded = false;
      });
      Audio.pop();
      if (popN >= 5) Audio.bigPop();
      game.score += popN * 60 + (popN - 3) * 40;
      // 找孤立泡泡
      const connected = findConnectedToTop(spiral);
      const fallers = [];
      for (let r = 0; r < spiral.rows.length; r++) {
        const row = spiral.rows[r];
        for (let i = 0; i < row.length; i++) {
          const b = row[i];
          if (!b.color) continue;
          const k = r + ',' + i;
          if (!connected.has(k)) {
            fallers.push({ r, i, b });
          }
        }
      }
      if (fallers.length) {
        Audio.fall();
        const bonus = fallers.length * 80;
        game.score += bonus;
        spawnScoreFloat(SHOOTER.x, 380, '+' + bonus, '#fff5b0');
        fallers.forEach(f => {
          f.b.vx = rnd(-2, 2);
          f.b.vy = rnd(-3, -1);
          f.b.color = null;
          f.b.falling = true;
          f.b.fx = f.b.x;
          f.b.fy = f.b.y;
          spawnPop(f.b.x, f.b.y, f.b.color || 'green');
        });
      }
      spawnScoreFloat(SHOOTER.x, 360, '+' + popN * 60, '#ffe28a');
      checkLevelEnd();
    }
  }

  function checkLevelEnd() {
    if (game.score >= game.target) {
      game.state = STATE.WIN;
      Audio.win();
      showOverlay('level-clear');
      document.getElementById('clear-score').textContent = game.score;
      setTimeout(() => {
        if (game.state === STATE.WIN) {
          hideOverlay();
          startLevel(game.level + 1);
          game.state = STATE.PLAYING;
        }
      }, 2200);
    } else {
      // 警戒线判定
      const spiral = game.grid;
      let lowestY = 0;
      for (let r = 0; r < spiral.rows.length; r++) {
        for (let i = 0; i < spiral.rows[r].length; i++) {
          const b = spiral.rows[r][i];
          if (b.color && b.y > lowestY) lowestY = b.y;
        }
      }
      if (lowestY >= DANGER_Y) {
        gameOver();
      }
    }
  }

  function gameOver() {
    game.state = STATE.OVER;
    Audio.lose();
    showOverlay('game-over');
    document.getElementById('final-score').textContent = game.score;
  }

  function spawnPop(x, y, color) {
    for (let i = 0; i < 14; i++) {
      const ang = Math.random() * TAU;
      const sp = rnd(2, 6);
      game.particles.push({
        x, y,
        vx: Math.cos(ang) * sp,
        vy: Math.sin(ang) * sp - 1,
        life: rnd(0.4, 0.9),
        age: 0,
        color,
        size: rnd(2, 5),
      });
    }
  }

  function spawnScoreFloat(x, y, text, color) {
    game.scoreFloats.push({ x, y, text, color, age: 0, life: 1.2 });
  }

  function updateParticles(dt) {
    for (let i = game.particles.length - 1; i >= 0; i--) {
      const p = game.particles[i];
      p.age += dt;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25;
      if (p.age >= p.life) game.particles.splice(i, 1);
    }
    for (let i = game.scoreFloats.length - 1; i >= 0; i--) {
      const s = game.scoreFloats[i];
      s.age += dt;
      s.y -= 1.2;
      if (s.age >= s.life) game.scoreFloats.splice(i, 1);
    }
  }

  // ====== 渲染 ======
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function drawBackground() {
    // 粉紫渐变
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#9b6cb0');
    g.addColorStop(0.5, '#c98eb2');
    g.addColorStop(1, '#f0b8c0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 远景光斑
    ctx.save();
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 6; i++) {
      const x = (i * 137 + 80) % W;
      const y = (i * 73 + 40) % H;
      const r = 30 + (i * 11) % 25;
      const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, 'rgba(255,255,255,0.6)');
      rg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = rg;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.restore();
  }

  function drawFunnel() {
    const { topW, botW, topY, botY, cx, color, dark, light } = FUNNEL;
    const topL = cx - topW / 2, topR = cx + topW / 2;
    const botL = cx - botW / 2 + 40, botR = cx + botW / 2 - 10;
    // 主体
    const g = ctx.createLinearGradient(topL, 0, topR, 0);
    g.addColorStop(0, dark);
    g.addColorStop(0.3, color);
    g.addColorStop(0.7, color);
    g.addColorStop(1, dark);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(topL, topY);
    ctx.lineTo(topR, topY);
    ctx.lineTo(botR, botY);
    ctx.lineTo(botL, botY);
    ctx.closePath();
    ctx.fill();
    // 顶部椭圆开口
    ctx.save();
    ctx.fillStyle = '#1a0c08';
    ctx.beginPath();
    ctx.ellipse(cx, topY, topW / 2, 14, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = light;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, topY, topW / 2, 14, 0, 0, TAU);
    ctx.stroke();
    // 顶部高光
    const hl = ctx.createLinearGradient(cx, topY - 14, cx, topY + 14);
    hl.addColorStop(0, 'rgba(255,255,255,0.4)');
    hl.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = hl;
    ctx.beginPath();
    ctx.ellipse(cx - topW / 4, topY, topW / 4, 8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 螺旋纹路
    ctx.save();
    ctx.strokeStyle = `rgba(255,220,170,0.22)`;
    ctx.lineWidth = 1.4;
    const lines = 9;
    for (let i = 0; i < lines; i++) {
      const t = i / (lines - 1);
      const y = topY + 20 + (botY - topY - 20) * t;
      const w = lerp(topW, botW, t);
      const skew = Math.sin(t * 6 + game.time * 0.3) * 10;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2 + skew, y);
      ctx.bezierCurveTo(
        cx - w / 4 + skew * 1.5, y + 6,
        cx + w / 4 - skew * 1.5, y + 6,
        cx + w / 2 - skew, y
      );
      ctx.stroke();
    }
    // 边缘高光
    ctx.strokeStyle = light;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(topL, topY); ctx.lineTo(botL, botY); ctx.stroke();
    ctx.strokeStyle = dark;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(topR, topY); ctx.lineTo(botR, botY); ctx.stroke();
    ctx.restore();
  }

  function drawSpiralBubbles() {
    const spiral = game.grid;
    if (!spiral) return;
    // 收集所有可见泡泡，按 depth 升序（先远后近）
    const list = [];
    for (let r = 0; r < spiral.rows.length; r++) {
      const row = spiral.rows[r];
      for (let i = 0; i < row.length; i++) {
        const b = row[i];
        if (!b.color) continue;
        list.push(b);
      }
    }
    list.sort((a, b) => a.depth - b.depth);
    for (const b of list) {
      // 深度效果：靠后（depth 小）更小、更暗
      const d = b.depth; // -1..1
      const depthAlpha = 0.55 + 0.45 * Math.max(0, (d + 1) / 2); // 0.55..1
      const depthScale = 0.78 + 0.22 * Math.max(0, (d + 1) / 2);  // 0.78..1
      let pscale = 1;
      if (b.justAdded) pscale = 0.6 + 0.4 * Math.min(1, b.justAddedT || 0);
      // 椭圆透视：y 也跟着 depth 微微偏移
      drawBubble(ctx, b.x, b.y, R * depthScale * pscale, b.color, depthAlpha, 1, 0.6 + 0.4 * Math.max(0, d));
    }
  }

  function drawAimer() {
    if (!game.current || game.state !== STATE.PLAYING) return;
    const sx = SHOOTER.x, sy = SHOOTER.y;
    const dx = game.mouseX - sx, dy = game.mouseY - sy;
    let ang = Math.atan2(dy, dx);
    // 限制：只能向上
    if (ang > -0.05 && ang < Math.PI + 0.05) {
      ang = -Math.PI / 2;
    }
    if (ang > 0) ang = -ang;
    if (ang < -Math.PI + 0.1) ang = -Math.PI + 0.1;
    const dirX = Math.cos(ang), dirY = Math.sin(ang);
    game.aimDir.x = dirX; game.aimDir.y = dirY;
    // 瞄准虚线
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(sx + dirX * 40, sy + dirY * 40);
    let ex = sx + dirX * 40, ey = sy + dirY * 40;
    for (let i = 0; i < 20; i++) {
      ex += dirX * 14; ey += dirY * 14;
      if (ex < 50 || ex > WALL_X) break;
      if (ey < CEIL_Y + 10) break;
      // 撞到泡泡？
      let hit = false;
      const spiral = game.grid;
      if (spiral) {
        for (let r = 0; r < spiral.rows.length && !hit; r++) {
          for (let ii = 0; ii < spiral.rows[r].length && !hit; ii++) {
            const b = spiral.rows[r][ii];
            if (b.color && dist2(b.x, b.y, ex, ey) < (R * 1.6) * (R * 1.6)) hit = true;
          }
        }
      }
      if (hit) break;
    }
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
    // 下一个泡泡预览
    const nx = sx - 80, ny = sy + 40;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.arc(nx, ny, R * 1.3, 0, TAU); ctx.fill();
    drawBubble(ctx, nx, ny, R * 0.85, game.nextColor);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', nx, ny + R * 1.7);
    ctx.restore();
  }

  function drawShooter() {
    const sx = SHOOTER.x, sy = SHOOTER.y;
    // 炮筒（短管）
    ctx.save();
    const tubeLen = 36;
    const dirX = game.aimDir.x, dirY = game.aimDir.y;
    const tx = sx + dirX * 8, ty = sy + dirY * 8;
    const ex = sx + dirX * (tubeLen + 8), ey = sy + dirY * (tubeLen + 8);
    const g = ctx.createLinearGradient(tx, ty, ex, ey);
    g.addColorStop(0, '#7a3e22');
    g.addColorStop(0.5, '#c89060');
    g.addColorStop(1, '#5a2e15');
    ctx.strokeStyle = g;
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.restore();
    // 绿球（待发射泡泡）
    if (game.current) {
      drawSpikeBall(ctx, sx, sy, R + 2, game.time * 0.02);
    }
    // 底座
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(sx, sy + 28, 40, 8, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  function drawFlying() {
    const f = game.flying;
    if (!f) return;
    drawBubble(ctx, f.x, f.y, R, f.color);
  }

  function drawParticles() {
    for (const p of game.particles) {
      const a = 1 - p.age / p.life;
      const c = COLOR_RGB[p.color] || COLOR_RGB.green;
      ctx.fillStyle = `rgba(${c.main.join(',')},${a})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, TAU);
      ctx.fill();
    }
  }

  function drawScoreFloats() {
    for (const s of game.scoreFloats) {
      const a = 1 - s.age / s.life;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = s.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeText(s.text, s.x, s.y);
      ctx.fillText(s.text, s.x, s.y);
      ctx.restore();
    }
  }

  function drawDangerLine() {
    ctx.save();
    const grad = ctx.createLinearGradient(0, DANGER_Y, W, DANGER_Y);
    grad.addColorStop(0, 'rgba(255,80,80,0)');
    grad.addColorStop(0.5, 'rgba(255,80,80,0.55)');
    grad.addColorStop(1, 'rgba(255,80,80,0)');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(40, DANGER_Y); ctx.lineTo(WALL_X, DANGER_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(255,120,120,0.8)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('⚠ 警戒线', 48, DANGER_Y - 4);
    ctx.restore();
  }

  function render() {
    drawBackground();
    drawFunnel();
    if (game.state === STATE.PLAYING || game.state === STATE.PAUSED || game.state === STATE.WIN || game.state === STATE.OVER) {
      drawDangerLine();
    }
    drawSpiralBubbles();
    drawFlying();
    drawParticles();
    drawShooter();
    drawAimer();
    drawScoreFloats();
  }

  // ====== 主循环 ======
  function loop(ts) {
    const dt = Math.min(0.033, (ts - (game.lastTime || ts)) / 1000);
    game.lastTime = ts;
    game.time += dt;
    if (game.state === STATE.PLAYING) {
      updateFlying(dt);
      updateParticles(dt);
      // 落体动画（占位）
      const sp = game.grid;
      if (sp) {
        for (let r = 0; r < sp.rows.length; r++) {
          for (let i = 0; i < sp.rows[r].length; i++) {
            const b = sp.rows[r][i];
            // 不做真实落体，pop 阶段已清空
          }
        }
      }
    }
    updateHud();
    render();
    game.requestRef = requestAnimationFrame(loop);
  }

  function updateHud() {
    document.getElementById('hud-level').textContent = game.level;
    document.getElementById('hud-score').textContent = game.score;
    document.getElementById('hud-target').textContent = game.target;
  }

  // ====== UI 切换 ======
  function showOverlay(which) {
    const ov = document.getElementById('overlay');
    ov.classList.remove('fadeout');
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    const p = document.getElementById(which);
    if (p) p.classList.remove('hidden');
  }
  function hideOverlay() {
    const ov = document.getElementById('overlay');
    ov.classList.add('fadeout');
  }
  function isOverlayVisible() {
    return !document.getElementById('overlay').classList.contains('fadeout');
  }

  // ====== 输入 ======
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    game.mouseX = (e.clientX - rect.left) * scaleX;
    game.mouseY = (e.clientY - rect.top) * scaleY;
  });
  canvas.addEventListener('click', e => {
    if (game.state !== STATE.PLAYING) return;
    if (isOverlayVisible()) return;
    if (game.flying) return;
    shoot();
  });
  // 触屏支持
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    if (e.touches.length) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      game.mouseX = (t.clientX - rect.left) * scaleX;
      game.mouseY = (t.clientY - rect.top) * scaleY;
      if (game.state === STATE.PLAYING && !game.flying) shoot();
    }
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (e.touches.length) {
      const rect = canvas.getBoundingClientRect();
      const t = e.touches[0];
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      game.mouseX = (t.clientX - rect.left) * scaleX;
      game.mouseY = (t.clientY - rect.top) * scaleY;
    }
  }, { passive: false });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
      togglePause();
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (game.state === STATE.PLAYING && !game.flying) {
        e.preventDefault(); shoot();
      }
    }
  });

  function togglePause() {
    if (game.state === STATE.PLAYING) {
      game.state = STATE.PAUSED;
      showOverlay('pause');
    } else if (game.state === STATE.PAUSED) {
      game.state = STATE.PLAYING;
      hideOverlay();
    }
  }

  // ====== 按钮绑定 ======
  function bindUI() {
    document.getElementById('btn-start').onclick = () => {
      Audio.click();
      hideOverlay();
      startLevel(1);
      game.state = STATE.PLAYING;
    };
    document.getElementById('btn-help').onclick = () => {
      Audio.click();
      showOverlay('help');
    };
    document.getElementById('btn-help-back').onclick = () => {
      Audio.click();
      showOverlay('menu');
    };
    document.getElementById('btn-pause').onclick = () => {
      Audio.click(); togglePause();
    };
    document.getElementById('btn-restart').onclick = () => {
      Audio.click();
      hideOverlay();
      startLevel(game.level);
      game.state = STATE.PLAYING;
    };
    document.getElementById('btn-resume').onclick = () => {
      Audio.click();
      hideOverlay();
      game.state = STATE.PLAYING;
    };
    document.getElementById('btn-quit').onclick = () => {
      Audio.click();
      showOverlay('menu');
      game.state = STATE.MENU;
    };
    document.getElementById('btn-retry').onclick = () => {
      Audio.click();
      hideOverlay();
      startLevel(game.level);
      game.state = STATE.PLAYING;
    };
    document.getElementById('btn-back-menu').onclick = () => {
      Audio.click();
      showOverlay('menu');
      game.state = STATE.MENU;
    };
    document.getElementById('btn-mute').onclick = () => {
      const m = Audio.toggle();
      document.getElementById('btn-mute').textContent = m ? '✕' : '♪';
    };
  }

  // ====== 启动 ======
  bindUI();
  showOverlay('menu');
  game.state = STATE.MENU;
  game.lastTime = performance.now();
  requestAnimationFrame(loop);

  // 调试：暴露给控制台
  window.__game = game;
})();
