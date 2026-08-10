/* ============================================================
 *  Fruit Ninja 1:1 复刻版 — Canvas 2D
 *  - 抛物运动水果
 *  - 鼠标 / 触屏划动切水果
 *  - 炸弹 Game Over
 *  - 连击 Combo / Critical
 *  - 关卡递进
 *  - 资源来自原版 Poki CDN (FruitAtlas / splat / Dojo / Bomb)
 * ============================================================ */

(() => {
  'use strict';

  // ---------- 资源 ----------
  const ASSET_BASE = 'assets/';
  const IMG = {
    atlas:    'FruitAtlas.png',
    shadow:   'Fruit_shadow.png',
    bomb:     'BombRedCross.png',
    dojo:     'Dojo_Basic.png',
    splat1:   'splat11.png',
    splat2:   'splat12.png',
    splat3:   'splat13.png',
    splat4:   'splat14.png',
    splash:   'SplashSlice.png',
    splash2:  'SplashSlice2.png',
    wood:     'HeaderWood.png',
    border:   'BorderWood.png',
    logoFruit: 'LogoFruit.png',
    logoNinja: 'LogoNinja.png',
  };

  const atlas = new Image();
  const shadow = new Image();
  const bombImg = new Image();
  const dojo = new Image();
  const wood = new Image();
  const border = new Image();
  const logoFruit = new Image();
  const logoNinja = new Image();
  const splatImages = [new Image(), new Image(), new Image(), new Image()];
  const splashes = [new Image(), new Image()];

  let assetsLoaded = 0;
  const TOTAL_ASSETS = 12;
  function assetOk() {
    if (++assetsLoaded >= TOTAL_ASSETS) onAllLoaded();
  }
  atlas.onload = assetOk;     atlas.src = ASSET_BASE + IMG.atlas;
  shadow.onload = assetOk;    shadow.src = ASSET_BASE + IMG.shadow;
  bombImg.onload = assetOk;   bombImg.src = ASSET_BASE + IMG.bomb;
  dojo.onload = assetOk;      dojo.src = ASSET_BASE + IMG.dojo;
  wood.onload = assetOk;      wood.src = ASSET_BASE + IMG.wood;
  border.onload = assetOk;    border.src = ASSET_BASE + IMG.border;
  logoFruit.onload = assetOk; logoFruit.src = ASSET_BASE + IMG.logoFruit;
  logoNinja.onload = assetOk; logoNinja.src = ASSET_BASE + IMG.logoNinja;
  splatImages[0].onload = assetOk; splatImages[0].src = ASSET_BASE + IMG.splat1;
  splatImages[1].onload = assetOk; splatImages[1].src = ASSET_BASE + IMG.splat2;
  splatImages[2].onload = assetOk; splatImages[2].src = ASSET_BASE + IMG.splat3;
  splatImages[3].onload = assetOk; splatImages[3].src = ASSET_BASE + IMG.splat4;
  splashes[0].onload = assetOk; splashes[0].src = ASSET_BASE + IMG.splash;
  splashes[1].onload = assetOk; splashes[1].src = ASSET_BASE + IMG.splash2;

  // ---------- Fruit Atlas 拆解 ----------
  // 原版 FruitAtlas.png 是 1024x512 大小（实际可能不同），每格 128 像素
  // 8 列 × 4 行 = 32 格，每种水果占用 2 格（whole + slice）
  // 视觉识别（从原版游戏中观察）:
  //   0: 苹果 (red apple)    1: 苹果 (slice)
  //   2: 西瓜 (watermelon)   3: 西瓜 (slice)
  //   4: 橘子 (orange)       5: 橘子 (slice)
  //   6: 菠萝 (pineapple)    7: 菠萝 (slice)
  //   8: 香蕉 (banana)       9: 香蕉 (slice)
  //  10: 梨 (pear)          11: 梨 (slice)
  //  12: 草莓 (strawberry)  13: 草莓 (slice)
  //  14: 猕猴桃 (kiwi)      15: 猕猴桃 (slice)
  //  16: 火龙果 (dragon)    17: 火龙果 (slice)
  //  18: 椰子 (coconut)     19: 椰子 (slice)
  //  20: 桃子 (peach)       21: 桃子 (slice)
  //  22: 芒果 (mango)       23: 芒果 (slice)
  //  24: 柠檬 (lemon)       25: 柠檬 (slice)
  //  26: 石榴 (pomegranate) 27: 石榴 (slice)
  //  28: 苹果 (green apple) 29: 苹果 (slice)
  //  30: 樱桃 (cherry)      31: 樱桃 (slice)
  // 上面的索引基于观察，Poki 实际可能略有不同。
  // 我们在 init 时动态读取 atlas 实际尺寸。

  const FRUITS_DEF = [
    // 每行：[wholeCol, wholeRow, halfCol, halfRow, color, name]
    // row/col 都是 0-based，行高列宽都是 CELL 像素
    { col: 2, row: 0, sliceCol: 3, sliceRow: 0, color: '#c92e2e', name: '苹果' },
    { col: 0, row: 0, sliceCol: 1, sliceRow: 0, color: '#c92e2e', name: '西瓜' },
    { col: 4, row: 0, sliceCol: 5, sliceRow: 0, color: '#ff9a00', name: '橙子' },
    { col: 6, row: 0, sliceCol: 7, sliceRow: 0, color: '#ffd84a', name: '菠萝' },
    { col: 0, row: 1, sliceCol: 1, sliceRow: 1, color: '#fff6b0', name: '香蕉' },
    { col: 2, row: 1, sliceCol: 3, sliceRow: 1, color: '#a8d455', name: '梨' },
    { col: 4, row: 1, sliceCol: 5, sliceRow: 1, color: '#ff3c4a', name: '草莓' },
    { col: 0, row: 2, sliceCol: 1, sliceRow: 2, color: '#b78930', name: '猕猴桃' },
    { col: 2, row: 2, sliceCol: 3, sliceRow: 2, color: '#e9388e', name: '火龙果' },
    { col: 4, row: 2, sliceCol: 5, sliceRow: 2, color: '#7c4a16', name: '椰子' },
    { col: 0, row: 3, sliceCol: 1, sliceRow: 3, color: '#ff8a64', name: '桃子' },
    { col: 2, row: 3, sliceCol: 3, sliceRow: 3, color: '#ffd63a', name: '芒果' },
  ];

  // 实际坐标运行时计算
  let CELL = 128;
  let ATLAS_COLS = 8;
  let ATLAS_ROWS = 4;

  // ---------- 画布 ----------
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = () => canvas.width;
  const H = () => canvas.height;

  function resize() {
    const wrap = canvas.parentElement;
    const ratio = 9 / 16;
    const maxW = Math.min(wrap.clientWidth, 720);
    const maxH = Math.min(window.innerHeight - 200, 900);
    let w = maxW;
    let h = w * ratio;
    if (h > maxH) { h = maxH; w = h / ratio; }
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    canvas.width  = Math.round(w * devicePixelRatio);
    canvas.height = Math.round(h * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  window.addEventListener('resize', resize);

  // ---------- 状态 ----------
  const STATE = { LOAD: 0, MENU: 1, PLAY: 2, OVER: 3, INTRO: 4 };
  let state = STATE.LOAD;
  let score = 0;
  let high = +(localStorage.getItem('fn.high') || 0);
  let lives = 3;       // 切到 bomb 立刻 game over，原版只有一次机会
  let combo = 0;
  let comboTimer = 0;
  let elapsed = 0;
  let spawnTimer = 0;
  let fruits = [];
  let slicedFruits = [];
  let particles = [];
  let screenSplats = [];     // 屏幕背景污渍
  let bladeTrail = [];
  let dojoOffsetY = 0;
  let bombStreak = 0;  // 距离下一次 bomb 的水果数
  let fruitsSinceSplash = 0;
  let splashAlpha = 0;
  let lastTime = 0;

  function setState(s) { state = s; }

  // ---------- 工具 ----------
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];

  // ---------- 抛水果 ----------
  function spawnWave() {
    const n = Math.min(8, 1 + Math.floor(elapsed / 12) + Math.floor(Math.random() * 3));
    for (let i = 0; i < n; i++) {
      setTimeout(() => spawnFruit(), i * 90);
    }
  }

  function spawnFruit() {
    if (state !== STATE.PLAY) return;
    // 每隔一定数量水果后放炸弹
    bombStreak++;
    const bombChance = Math.min(0.18, 0.05 + elapsed * 0.0008);
    const isBomb = bombStreak > 5 && Math.random() < bombChance;
    bombStreak = isBomb ? 0 : bombStreak;

    const w = W() / devicePixelRatio;
    const h = H() / devicePixelRatio;
    const r = 36 + Math.random() * 14;     // 半径（视觉尺寸）
    const x = rand(w * 0.15, w * 0.85);
    const y = h + r;
    // 抛物线：让水果飞过画面
    const targetY = h * rand(0.1, 0.35);
    const dy = targetY - y;
    const g = 1100;                        // 重力 px/s^2
    // 解 0 = dy + vy0*t + 0.5*g*t^2，到达 targetY 时 t = sqrt(-2*dy/g) (vy0=0)
    // 想要水果在 1.0~1.6s 飞过，给一个初始向上速度
    const t = rand(1.0, 1.5);
    const vy0 = (-dy - 0.5 * g * t * t) / t;
    const vx = rand(-120, 120);
    const spin = rand(-6, 6);

    if (isBomb) {
      fruits.push({
        kind: 'bomb', x, y, vx, vy: vy0, g, r, rot: 0, spin, sliced: false,
      });
    } else {
      const def = pick(FRUITS_DEF);
      fruits.push({
        kind: 'fruit', def, x, y, vx, vy: vy0, g, r, rot: 0, spin,
        sliced: false, juiceColor: def.color,
      });
    }
  }

  // ---------- 切水果 ----------
  // 用线段与圆相交检测
  function segHitsCircle(x1, y1, x2, y2, cx, cy, r) {
    const dx = x2 - x1, dy = y2 - y1;
    const fx = x1 - cx, fy = y1 - cy;
    const a = dx * dx + dy * dy;
    const b = 2 * (fx * dx + fy * dy);
    const c = fx * fx + fy * fy - r * r;
    let disc = b * b - 4 * a * c;
    if (a < 0.00001) return false;
    if (disc < 0) return false;
    disc = Math.sqrt(disc);
    const t1 = (-b - disc) / (2 * a);
    const t2 = (-b + disc) / (2 * a);
    return (t1 >= 0 && t1 <= 1) || (t2 >= 0 && t2 <= 1) || (t1 < 0 && t2 > 1);
  }

  // 把整个 blade 路径与每个水果检测
  function checkSlice(prevX, prevY, x, y) {
    if (state !== STATE.PLAY) return;
    // 速度阈值，避免静止划痕
    const dx = x - prevX, dy = y - prevY;
    if (dx * dx + dy * dy < 4) return;

    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      if (f.sliced) continue;
      const hit = segHitsCircle(prevX, prevY, x, y, f.x, f.y, f.r);
      if (hit) {
        sliceFruit(f, x - prevX, y - prevY);
        fruits.splice(i, 1);
      }
    }
  }

  function sliceFruit(f, vx, vy) {
    f.sliced = true;
    if (f.kind === 'bomb') {
      // 切到 bomb → game over
      gameOver();
      return;
    }
    // 切两半
    const angle = Math.atan2(vy, vx);
    const speed = Math.hypot(vx, vy);
    const power = Math.min(2.0, 0.7 + speed / 800);
    // 左半
    slicedFruits.push({
      def: f.def, side: 'L',
      x: f.x, y: f.y,
      vx: f.vx - Math.cos(angle) * 90 * power,
      vy: f.vy - Math.sin(angle) * 90 * power,
      g: f.g, r: f.r, rot: f.rot, spin: -6 - Math.random() * 4,
      life: 2.2,
    });
    // 右半
    slicedFruits.push({
      def: f.def, side: 'R',
      x: f.x, y: f.y,
      vx: f.vx + Math.cos(angle) * 90 * power,
      vy: f.vy + Math.sin(angle) * 90 * power,
      g: f.g, r: f.r, rot: f.rot, spin: 6 + Math.random() * 4,
      life: 2.2,
    });

    // 果汁粒子
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(80, 280);
      particles.push({
        x: f.x, y: f.y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60,
        g: 600, r: rand(2, 5),
        color: f.juiceColor, life: rand(0.5, 1.0),
      });
    }

    // 屏幕污渍
    screenSplats.push({
      x: f.x, y: f.y,
      img: pick(splatImages),
      scale: rand(0.6, 1.1),
      rot: rand(0, Math.PI * 2),
      alpha: 0.6,
    });
    if (screenSplats.length > 20) screenSplats.shift();

    // 飞溅水花
    fruitsSinceSplash++;
    if (fruitsSinceSplash >= 3) {
      fruitsSinceSplash = 0;
      splashAlpha = 1;
    }

    // 计分 + 连击
    combo += 1;
    comboTimer = 0.7;
    const isCritical = combo >= 3;
    const gain = isCritical ? 3 : 1;
    score += gain;
    if (score > high) {
      high = score;
      localStorage.setItem('fn.high', high);
    }

    // 浮动得分
    floatingTexts.push({
      x: f.x, y: f.y - 20,
      text: isCritical ? `+${gain} 暴击!` : `+${gain}`,
      color: isCritical ? '#ffe34a' : '#fff',
      life: 0.9, vy: -50,
    });
  }

  const floatingTexts = [];

  function gameOver() {
    setState(STATE.OVER);
    // 屏幕震动
    shake = 0.6;
    // 爆炸粒子
    const w = W() / devicePixelRatio, h = H() / devicePixelRatio;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(150, 500);
      particles.push({
        x: w / 2, y: h / 2,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        g: 600, r: rand(3, 8),
        color: pick(['#ff5722', '#ff9a00', '#fff', '#1a1a1a']),
        life: rand(0.8, 1.5),
      });
    }
  }

  let shake = 0;

  // ---------- 输入 ----------
  const pointer = { x: 0, y: 0, prevX: 0, prevY: 0, down: false };

  canvas.addEventListener('mousedown', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    pointer.prevX = pointer.x = (e.clientX - r.left) * (W() / devicePixelRatio / r.width);
    pointer.prevY = pointer.y = (e.clientY - r.top)  * (H() / devicePixelRatio / r.height);
    pointer.down = true;
    if (state === STATE.MENU || state === STATE.INTRO) startGame();
    else if (state === STATE.OVER) restart();
  });
  canvas.addEventListener('mousemove', e => {
    if (!pointer.down) return;
    const r = canvas.getBoundingClientRect();
    const w = W() / devicePixelRatio, h = H() / devicePixelRatio;
    pointer.prevX = pointer.x;
    pointer.prevY = pointer.y;
    pointer.x = (e.clientX - r.left) * (w / r.width);
    pointer.y = (e.clientY - r.top)  * (h / r.height);
    checkSlice(pointer.prevX, pointer.prevY, pointer.x, pointer.y);
    bladeTrail.push({ x: pointer.x, y: pointer.y, life: 0.4 });
    if (bladeTrail.length > 30) bladeTrail.shift();
  });
  canvas.addEventListener('mouseup', () => pointer.down = false);
  canvas.addEventListener('mouseleave', () => pointer.down = false);

  // 触屏
  function touchXY(e) {
    const r = canvas.getBoundingClientRect();
    const w = W() / devicePixelRatio, h = H() / devicePixelRatio;
    return [
      (e.touches[0].clientX - r.left) * (w / r.width),
      (e.touches[0].clientY - r.top)  * (h / r.height)
    ];
  }
  canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    const [x, y] = touchXY(e);
    pointer.prevX = pointer.x = x;
    pointer.prevY = pointer.y = y;
    pointer.down = true;
    if (state === STATE.MENU || state === STATE.INTRO) startGame();
    else if (state === STATE.OVER) restart();
  }, { passive: false });
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const [x, y] = touchXY(e);
    pointer.prevX = pointer.x;
    pointer.prevY = pointer.y;
    pointer.x = x; pointer.y = y;
    checkSlice(pointer.prevX, pointer.prevY, x, y);
    bladeTrail.push({ x, y, life: 0.4 });
    if (bladeTrail.length > 30) bladeTrail.shift();
  }, { passive: false });
  canvas.addEventListener('touchend', () => pointer.down = false);

  // 阻止右键
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // ---------- 启动 / 重开 ----------
  function startGame() {
    score = 0; combo = 0; comboTimer = 0;
    elapsed = 0; spawnTimer = 0; bombStreak = 0;
    lives = 3;
    fruits.length = slicedFruits.length = particles.length = 0;
    screenSplats.length = 0; floatingTexts.length = 0;
    bladeTrail.length = 0;
    setState(STATE.PLAY);
    spawnWave();
  }
  function restart() {
    if (state !== STATE.OVER) return;
    setState(STATE.INTRO);
    setTimeout(startGame, 100);
  }

  // 包装页按钮
  document.getElementById('btn-start').addEventListener('click', () => {
    if (state === STATE.MENU || state === STATE.INTRO) startGame();
  });
  document.getElementById('btn-restart').addEventListener('click', () => {
    if (state === STATE.PLAY || state === STATE.OVER) {
      setState(STATE.INTRO);
      setTimeout(startGame, 100);
    }
  });

  // ---------- 更新 ----------
  function update(dt) {
    if (state === STATE.PLAY) {
      elapsed += dt;
      spawnTimer -= dt;
      comboTimer -= dt;
      if (comboTimer <= 0) combo = 0;
      if (spawnTimer <= 0) {
        spawnWave();
        spawnTimer = rand(0.8, 1.6);
      }
    }

    // 水果
    for (let i = fruits.length - 1; i >= 0; i--) {
      const f = fruits[i];
      f.vy += f.g * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.spin * dt;
      if (f.y > H() / devicePixelRatio + 80) {
        // 漏切
        if (state === STATE.PLAY && f.kind === 'fruit') {
          // 原版漏 3 个 game over
          lives--;
          if (lives <= 0) gameOver();
        }
        fruits.splice(i, 1);
      }
    }
    // 切半水果
    for (let i = slicedFruits.length - 1; i >= 0; i--) {
      const f = slicedFruits[i];
      f.vy += f.g * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += f.spin * dt;
      f.life -= dt;
      if (f.life <= 0 || f.y > H() / devicePixelRatio + 80) slicedFruits.splice(i, 1);
    }
    // 粒子
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    // 浮动文字
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const t = floatingTexts[i];
      t.y += t.vy * dt;
      t.life -= dt;
      if (t.life <= 0) floatingTexts.splice(i, 1);
    }
    // 刀光
    for (let i = bladeTrail.length - 1; i >= 0; i--) {
      bladeTrail[i].life -= dt;
      if (bladeTrail[i].life <= 0) bladeTrail.splice(i, 1);
    }
    if (shake > 0) shake -= dt;
    if (splashAlpha > 0) splashAlpha = Math.max(0, splashAlpha - dt * 2);
  }

  // ---------- 渲染 ----------
  function drawFruit(f) {
    const def = f.def;
    const col = def.col, row = def.row;
    const sx = col * CELL, sy = row * CELL;
    const size = f.r * 2.4;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    // 阴影
    if (shadow.complete && shadow.naturalWidth) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(shadow, -size * 0.45, size * 0.35, size * 0.9, size * 0.3);
      ctx.globalAlpha = 1;
    }
    // 水果本体（atlas cell）
    if (atlas.complete && atlas.naturalWidth) {
      ctx.drawImage(atlas, sx, sy, CELL, CELL, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(0, 0, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSlicedHalf(f) {
    const def = f.def;
    // 用 slice 图格
    const col = def.sliceCol, row = def.sliceRow;
    const sx = col * CELL, sy = row * CELL;
    const size = f.r * 2.4;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.globalAlpha = Math.max(0, Math.min(1, f.life / 1.0));
    if (atlas.complete && atlas.naturalWidth) {
      ctx.drawImage(atlas, sx, sy, CELL, CELL, -size / 2, -size / 2, size, size);
    }
    ctx.restore();
  }

  function drawBomb(f) {
    const size = f.r * 2.4;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot * 0.5);
    if (shadow.complete && shadow.naturalWidth) {
      ctx.globalAlpha = 0.35;
      ctx.drawImage(shadow, -size * 0.45, size * 0.4, size * 0.9, size * 0.3);
      ctx.globalAlpha = 1;
    }
    if (bombImg.complete && bombImg.naturalWidth) {
      ctx.drawImage(bombImg, -size / 2, -size / 2, size, size);
    } else {
      ctx.fillStyle = '#222';
      ctx.beginPath();
      ctx.arc(0, 0, f.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawBackground(w, h) {
    // 木栏 + 道场
    if (dojo.complete && dojo.naturalWidth) {
      ctx.drawImage(dojo, 0, 0, w, h);
    } else {
      // 渐变
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#6a4a2a');
      g.addColorStop(1, '#3a2410');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    // 顶部木栏
    if (wood.complete && wood.naturalWidth) {
      const hh = 56;
      ctx.drawImage(wood, 0, 0, w, hh);
    }
    // 污渍（叠加在背景上）
    for (const s of screenSplats) {
      const img = s.img;
      if (!img.complete || !img.naturalWidth) continue;
      const size = 180 * s.scale;
      ctx.save();
      ctx.globalAlpha = s.alpha * 0.55;
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.drawImage(img, -size / 2, -size / 2, size, size);
      ctx.restore();
    }
  }

  function drawBlade(w, h) {
    if (bladeTrail.length < 2) return;
    for (let i = 1; i < bladeTrail.length; i++) {
      const a = bladeTrail[i - 1], b = bladeTrail[i];
      const t = b.life / 0.4;
      ctx.strokeStyle = `rgba(255,255,255,${0.4 * t})`;
      ctx.lineWidth = 4 * t + 1;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }
  }

  function drawHUD(w, h) {
    // 分数
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const padX = 14, padY = 8;
    ctx.font = 'bold 30px sans-serif';
    const txt = String(score);
    const m = ctx.measureText(txt);
    ctx.fillRect(16, 16, m.width + padX * 2, 36 + padY);
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, 16 + padX, 36 + padY / 2);
    // 最高分
    ctx.font = '14px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`最高 ${high}`, 16 + padX, 70);
    // Combo
    if (combo >= 2) {
      ctx.font = 'bold 40px sans-serif';
      ctx.fillStyle = combo >= 3 ? '#ffd84a' : '#fff';
      ctx.textAlign = 'right';
      ctx.fillText(`x ${combo}`, w - 24, 50);
      ctx.textAlign = 'left';
    }
    // 命数（漏切）
    if (state === STATE.PLAY) {
      for (let i = 0; i < lives; i++) {
        ctx.fillStyle = '#ff5252';
        ctx.beginPath();
        ctx.arc(w - 24 - i * 22, 90, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 2));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawFloatingTexts() {
    ctx.textAlign = 'center';
    for (const t of floatingTexts) {
      ctx.globalAlpha = Math.max(0, t.life / 0.9);
      ctx.font = 'bold 22px sans-serif';
      ctx.fillStyle = t.color;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3;
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  function drawSplash(w, h) {
    if (splashAlpha <= 0) return;
    const img = splashes[Math.floor(elapsed * 4) % 2];
    if (!img.complete || !img.naturalWidth) return;
    const size = 220;
    ctx.save();
    ctx.globalAlpha = splashAlpha;
    ctx.translate(w / 2, h * 0.3);
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawMenu(w, h) {
    // 半透黑
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    // Logo FRUIT NINJA
    ctx.textAlign = 'center';
    const cx = w / 2, cy = h * 0.32;
    if (logoFruit.complete && logoFruit.naturalWidth) {
      const fw = w * 0.7;
      ctx.drawImage(logoFruit, cx - fw / 2, cy - 60, fw, 120);
    }
    if (logoNinja.complete && logoNinja.naturalWidth) {
      const nw = w * 0.5;
      ctx.drawImage(logoNinja, cx - nw / 2, cy + 50, nw, 80);
    }
    // 按钮
    const bw = 200, bh = 56, bx = cx - bw / 2, by = h * 0.65;
    ctx.fillStyle = '#ff5722';
    roundRect(ctx, bx, by, bw, bh, 28);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('开 始 游 戏', cx, by + bh / 2);
    ctx.textAlign = 'left';

    // 高分
    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'center';
    ctx.fillText(`最高分 ${high}`, cx, h * 0.85);
    ctx.textAlign = 'left';
  }

  function drawGameOver(w, h) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 56px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', w / 2, h * 0.32);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`分数 ${score}`, w / 2, h * 0.45);
    ctx.font = '20px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`最高分 ${high}`, w / 2, h * 0.52);
    // 按钮
    const bw = 200, bh = 56, bx = w / 2 - bw / 2, by = h * 0.62;
    ctx.fillStyle = '#ff5722';
    roundRect(ctx, bx, by, bw, bh, 28);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('再来一局', w / 2, by + bh / 2);
    ctx.textAlign = 'left';
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
  }

  function render() {
    const w = W() / devicePixelRatio, h = H() / devicePixelRatio;
    ctx.clearRect(0, 0, w, h);
    ctx.save();
    if (shake > 0) {
      const m = shake * 12;
      ctx.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m);
    }
    drawBackground(w, h);
    // 水果
    for (const f of fruits) {
      if (f.kind === 'bomb') drawBomb(f);
      else drawFruit(f);
    }
    for (const f of slicedFruits) drawSlicedHalf(f);
    drawSplash(w, h);
    drawParticles();
    drawBlade(w, h);
    drawFloatingTexts();
    drawHUD(w, h);
    if (state === STATE.MENU || state === STATE.INTRO) drawMenu(w, h);
    if (state === STATE.OVER) drawGameOver(w, h);
    ctx.restore();
  }

  // ---------- 主循环 ----------
  function loop(t) {
    if (!lastTime) lastTime = t;
    const dt = Math.min(0.05, (t - lastTime) / 1000);
    lastTime = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  // 资源加载完成 → 进入菜单
  function onAllLoaded() {
    // 计算实际 atlas 单元格大小
    if (atlas.naturalWidth > 0) {
      CELL = Math.floor(atlas.naturalWidth / ATLAS_COLS);
    }
    setState(STATE.MENU);
  }

  // 即使部分资源未加载完成也给个超时启动菜单
  setTimeout(() => {
    if (state === STATE.LOAD) {
      if (atlas.naturalWidth > 0) {
        CELL = Math.floor(atlas.naturalWidth / ATLAS_COLS);
      }
      setState(STATE.MENU);
    }
  }, 3000);

  // ---------- Boot ----------
  resize();
  requestAnimationFrame(loop);

  // 包装页 UI 控件
  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    if (canvas.requestFullscreen) canvas.requestFullscreen();
  });
})();
