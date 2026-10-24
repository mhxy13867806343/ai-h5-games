/* ============================================================
   峡谷对决 · Rift Duel —— LoL 对局流程复刻
   选择 → 加载 → 战斗 → 胜负结算
   英雄数据实时来自 lol.qq.com / game.gtimg.cn 公开接口
   ============================================================ */
'use strict';

/* ---------- 接口与常量 ---------- */
const API = {
  list: 'https://game.gtimg.cn/images/lol/act/img/js/heroList/hero_list.js',
  hero: id => `https://game.gtimg.cn/images/lol/act/img/js/hero/${id}.js`,
  icon: alias => `https://game.gtimg.cn/images/lol/act/img/champion/${alias}.png`,
  spell: (alias, key) => `https://game.gtimg.cn/images/lol/act/img/spell/${alias}${key.toUpperCase()}.png`,
};
const ROLE_ZH = { fighter: '战士', tank: '坦克', mage: '法师', assassin: '刺客', marksman: '射手', support: '辅助' };
const WORLD = { w: 1280, h: 720 };
const LANE_Y = 400;
const TOWERS = {
  blue: { x: 150, y: LANE_Y },
  red: { x: 1130, y: LANE_Y },
};
const TOWER_REGEN_R = 175;   // 己方塔回血范围
const TOWER_THREAT_R = 215;  // 敌方塔攻击范围
const TOWER_DMG = 88;

const SKILL_DEF = {
  q: { name: '技能 · Q', cost: 45, cd: 5, dmg: m => 55 + m * 9 },
  w: { name: '技能 · W', cost: 55, cd: 10, heal: m => 45 + m * 8 },
  e: { name: '技能 · E', cost: 40, cd: 9, dash: 205 },
  r: { name: '终极技能 · R', cost: 100, cd: 26, dmg: m => 150 + m * 16 },
};
const TIPS = [
  '敌方防御塔会攻击进入范围的英雄——越塔前想清楚退路。',
  '站在己方防御塔附近可以快速回复生命与法力。',
  '补到小兵的最后一击可获得金币，积少成多。',
  '生命值过低时，回撤到己方防御塔下再交战。',
  '终极技能 R 伤害很高但冷却很长，留到决胜时刻。',
  '法师英雄的技能伤害随魔法属性成长，多放技能消耗对手。',
];

const $ = s => document.querySelector(s);
const screens = { select: $('#screen-select'), loading: $('#screen-loading'), battle: $('#screen-battle'), result: $('#screen-result') };
function showScreen(name) {
  Object.values(screens).forEach(el => el.classList.remove('active'));
  screens[name].classList.add('active');
}

/* ---------- 状态 ---------- */
const state = {
  roster: [],            // 全部英雄（精简）
  filterRole: '',
  query: '',
  picked: null,          // 玩家选择的英雄（roster 条目）
  enemy: null,
  detailP: null,         // 玩家英雄详情（属性/技能/原画）
  detailE: null,
  battle: null,          // 战斗引擎实例
};

/* ---------- 数据获取 ---------- */
function normalizeListEntry(h) {
  return {
    id: h.heroId || h.id,
    alias: h.alias,
    name: h.title || h.name,     // 本名，如 安妮
    title: h.name || h.title,    // 称号，如 黑暗之女
    roles: h.roles || [],
    atk: +(h.attack ?? h.atk ?? 5),
    def: +(h.defense ?? h.def ?? 5),
    mag: +(h.magic ?? h.mag ?? 5),
    dif: +(h.difficulty ?? h.dif ?? 5),
  };
}

async function loadRoster() {
  const tag = $('#datasource');
  try {
    const r = await fetch(API.list);
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    state.roster = d.hero.map(normalizeListEntry);
    tag.textContent = `✔ 数据来自 lol.qq.com 官方接口 · ${state.roster.length} 位英雄`;
    tag.className = 'datasource ok';
  } catch (e) {
    state.roster = (window.LOL_HERO_FALLBACK || []).map(normalizeListEntry);
    tag.textContent = `⚠ 接口暂不可达，使用内置英雄数据 · ${state.roster.length} 位英雄`;
    tag.className = 'datasource err';
  }
  $('#roster-count').textContent = state.roster.length;
  renderGrid();
}

function derivedDetail(entry) {
  // 详情接口失败时，用 1-10 评分推导一套可用属性
  const isRanged = entry.roles.includes('marksman') || entry.roles.includes('mage');
  return {
    splash: API.icon(entry.alias),
    stats: {
      hp: 500 + entry.def * 30,
      mp: 300 + entry.mag * 28,
      armor: 24 + entry.def * 3.4,
      spellblock: 30,
      movespeed: 340,
      attackrange: isRanged ? 525 : 125,
      attackdamage: 55 + entry.atk * 4.6,
      hpregen: 6,
      mpregen: 7,
    },
    spells: {
      q: { name: '脉冲打击', icon: API.spell(entry.alias, 'q') },
      w: { name: '战斗专注', icon: API.spell(entry.alias, 'w') },
      e: { name: '迅捷突进', icon: API.spell(entry.alias, 'e') },
      r: { name: '终极一击', icon: API.spell(entry.alias, 'r') },
    },
    live: false,
  };
}

async function loadHeroDetail(entry) {
  try {
    const r = await fetch(API.hero(entry.id));
    if (!r.ok) throw new Error(r.status);
    const d = await r.json();
    const h = d.hero || {};
    const st = k => parseFloat(h[k]) || 0;
    const spellMap = {};
    (d.spells || []).forEach(s => {
      const key = (s.spellKey || '').toLowerCase();
      if ('qwer'.includes(key) && key && !spellMap[key]) {
        spellMap[key] = { name: s.name, icon: s.abilityIconPath || API.spell(entry.alias, key) };
      }
    });
    const baseSkin = (d.skins || []).find(s => String(s.isBase) === '1') || (d.skins || [])[0];
    return {
      splash: (baseSkin && baseSkin.mainImg) || API.icon(entry.alias),
      stats: {
        hp: st('hp') || 550, mp: st('mp') || 320,
        armor: st('armor') || 30, spellblock: st('spellblock') || 30,
        movespeed: st('movespeed') || 340,
        attackrange: st('attackrange') || 125,
        attackdamage: st('attackdamage') || 60,
        hpregen: st('hpregen') || 6, mpregen: st('mpregen') || 7,
      },
      spells: {
        q: spellMap.q || { name: '脉冲打击', icon: API.spell(entry.alias, 'q') },
        w: spellMap.w || { name: '战斗专注', icon: API.spell(entry.alias, 'w') },
        e: spellMap.e || { name: '迅捷突进', icon: API.spell(entry.alias, 'e') },
        r: spellMap.r || { name: '终极一击', icon: API.spell(entry.alias, 'r') },
      },
      live: true,
    };
  } catch (e) {
    return derivedDetail(entry);
  }
}

/* ---------- 屏1 · 英雄选择 ---------- */
function renderGrid() {
  const grid = $('#champ-grid');
  grid.innerHTML = '';
  const q = state.query.trim().toLowerCase();
  const list = state.roster.filter(h => {
    if (state.filterRole && !h.roles.includes(state.filterRole)) return false;
    if (!q) return true;
    return `${h.name}${h.title}${h.alias}`.toLowerCase().includes(q);
  });
  if (!list.length) {
    grid.innerHTML = '<div class="champ-empty">没有匹配的英雄，换个关键词试试</div>';
    return;
  }
  const frag = document.createDocumentFragment();
  list.forEach(h => {
    const cell = document.createElement('div');
    cell.className = 'champ-cell' + (state.picked && state.picked.id === h.id ? ' selected' : '');
    cell.dataset.id = h.id;
    const img = new Image();
    img.src = API.icon(h.alias);
    img.alt = h.name;
    img.loading = 'lazy';
    img.onerror = () => {
      const ph = document.createElement('div');
      ph.className = 'ph';
      ph.textContent = h.name.slice(0, 1);
      img.replaceWith(ph);
    };
    const label = document.createElement('div');
    label.className = 'cname';
    label.textContent = h.name;
    cell.append(img, label);
    cell.addEventListener('click', () => selectChampion(h));
    cell.addEventListener('dblclick', () => { selectChampion(h); startLoading(); });
    frag.appendChild(cell);
  });
  grid.appendChild(frag);
}

function selectChampion(h) {
  state.picked = h;
  document.querySelectorAll('.champ-cell').forEach(c =>
    c.classList.toggle('selected', c.dataset.id === h.id));
  const pv = $('#champ-preview');
  const bars = [
    ['攻击', h.atk], ['防御', h.def], ['魔法', h.mag], ['难度', h.dif],
  ];
  pv.innerHTML = `
    <div class="pv-head">
      <img src="${API.icon(h.alias)}" alt="${h.name}" onerror="this.style.visibility='hidden'">
      <div>
        <div class="pv-name">${h.name}</div>
        <div class="pv-title">${h.title}</div>
        <div class="pv-roles">${h.roles.map(r => `<span>${ROLE_ZH[r] || r}</span>`).join('')}</div>
      </div>
    </div>
    ${bars.map(([label, v]) => `
      <div class="stat-row"><label>${label}</label>
        <div class="stat-track"><div class="stat-fill" style="width:${v * 10}%"></div></div>
        <b>${v}</b>
      </div>`).join('')}
    <button class="btn-lock" id="btn-confirm">确认选择</button>
    <p class="pv-note">双击英雄可直接开局 · 对手将随机选择另一位英雄</p>
  `;
  $('#btn-confirm').addEventListener('click', () => {
    if (!state.picked) return;
    startLoading();
  });
}

$('#champ-search').addEventListener('input', e => {
  state.query = e.target.value;
  renderGrid();
});
$('#role-filter').addEventListener('click', e => {
  const btn = e.target.closest('button[data-role]');
  if (!btn) return;
  state.filterRole = btn.dataset.role;
  document.querySelectorAll('#role-filter button').forEach(b =>
    b.classList.toggle('active', b === btn));
  renderGrid();
});

/* ---------- 屏2 · 加载 ---------- */
function startLoading() {
  // 随机选一个不同英雄当对手
  const others = state.roster.filter(h => h.id !== state.picked.id);
  state.enemy = others[Math.floor(Math.random() * others.length)] || state.picked;

  const fillCard = (side, entry) => {
    $('#load-name-' + side).textContent = `${entry.name} · 玩家`;
    if (side === 'red') $('#load-name-' + side).textContent = `${entry.name} · 对手`;
    $('#load-title-' + side).textContent = entry.title;
  };
  fillCard('blue', state.picked);
  fillCard('red', state.enemy);
  $('#load-art-blue').src = API.icon(state.picked.alias);
  $('#load-art-red').src = API.icon(state.enemy.alias);
  $('#load-fb-blue').textContent = state.picked.name.slice(0, 1);
  $('#load-fb-red').textContent = state.enemy.name.slice(0, 1);
  $('#load-spells-blue').innerHTML = '';
  $('#load-spells-red').innerHTML = '';
  $('#loading-tip').innerHTML = `<b>小提示</b>：${TIPS[Math.floor(Math.random() * TIPS.length)]}`;
  $('#loading-fill').style.width = '0%';
  showScreen('loading');

  const started = performance.now();
  const minMs = 2600;
  let detailP = null, detailE = null;
  const tasks = Promise.allSettled([
    loadHeroDetail(state.picked).then(d => { detailP = d; }),
    loadHeroDetail(state.enemy).then(d => { detailE = d; }),
  ]);

  function tick() {
    if (!screens.loading.classList.contains('active')) return; // 已离开
    const elapsed = performance.now() - started;
    const timePart = Math.min(1, elapsed / minMs) * 0.7;
    const taskPart = (detailP ? 0.15 : 0) + (detailE ? 0.15 : 0);
    $('#loading-fill').style.width = Math.min(100, (timePart + taskPart) * 100) + '%';
    if (elapsed >= minMs && (detailP || elapsed > minMs + 4000)) {
      state.detailP = detailP || derivedDetail(state.picked);
      state.detailE = detailE || derivedDetail(state.enemy);
      // 原画替换头像 + 技能栏
      applySplash('blue', state.detailP, state.picked);
      applySplash('red', state.detailE, state.enemy);
      setTimeout(() => startBattle(), 350);
      return;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function applySplash(side, detail, entry) {
  const art = $('#load-art-' + side);
  art.src = detail.splash;
  art.onerror = () => { art.style.display = 'none'; };
  const spells = $('#load-spells-' + side);
  spells.innerHTML = '';
  ['q', 'w', 'e', 'r'].forEach(k => {
    const img = new Image();
    img.src = detail.spells[k].icon;
    img.alt = detail.spells[k].name;
    img.title = detail.spells[k].name;
    img.onerror = () => img.remove();
    spells.appendChild(img);
  });
}

/* ---------- 屏3 · 战斗引擎 ---------- */
function startBattle() {
  if (state.battle) state.battle.destroy();
  const engine = new BattleEngine($('#rift'), {
    player: { entry: state.picked, detail: state.detailP, side: 'blue' },
    enemy: { entry: state.enemy, detail: state.detailE, side: 'red' },
    onEnd: result => showResult(result),
  });
  state.battle = engine;
  showScreen('battle');
  engine.start();

  // HUD 基础信息
  $('#hud-name-blue').textContent = state.picked.name;
  $('#hud-name-red').textContent = state.enemy.name;
  $('#hud-icon-blue').src = API.icon(state.picked.alias);
  $('#hud-icon-red').src = API.icon(state.enemy.alias);
  ['q', 'w', 'e', 'r'].forEach(k => {
    const btn = document.querySelector(`.skill[data-key="${k}"]`);
    btn.querySelector('img').src = state.detailP.spells[k].icon;
    btn.title = `${state.detailP.spells[k].name}（${SKILL_DEF[k].cost} 法力）`;
    btn.querySelector('.cost').textContent = SKILL_DEF[k].cost;
  });
}

class BattleEngine {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.opts = opts;
    this.mouse = { x: WORLD.w / 2, y: WORLD.h / 2 };
    this.keys = new Set();
    this.projectiles = [];
    this.particles = [];
    this.floats = [];       // 飘字
    this.zaps = [];
    this.time = 0;
    this.paused = false;
    this.over = false;
    this.raf = 0;
    this.last = 0;
    this.shake = 0;
    this.nextWave = 5;
    this.result = null;

    const mk = (cfg, x) => {
      const s = cfg.detail.stats;
      return {
        side: cfg.side,
        entry: cfg.entry,
        detail: cfg.detail,
        x, y: LANE_Y,
        hp: s.hp, maxHp: s.hp,
        mp: s.mp, maxMp: s.mp,
        ad: s.attackdamage,
        armor: s.armor,
        ms: s.movespeed * 0.42,          // 速度 → px/s
        range: s.attackrange * 0.42 + 40, // 射程 → px
        ranged: s.attackrange > 300,
        hpregen: s.hpregen / 5, mpgregen: s.mpregen / 5,
        mag: +cfg.entry.mag,
        aaTimer: 0, aaInterval: 0.9,
        cds: { q: 0, w: 0, e: 0, r: 0 },
        speedBoost: 0,
        moveTarget: null,
        kills: 0, cs: 0, gold: 0, heroDmg: 0,
        towerZapTimer: 0,
        alive: true,
        ai: cfg.side === 'red' ? { state: 'push' } : null,
        flash: 0,
      };
    };
    this.player = mk(opts.player, TOWERS.blue.x + 120);
    this.enemy = mk(opts.enemy, TOWERS.red.x - 120);
    this.minions = [];

    this.onResize = () => this.fit();
    this.onMouseMove = e => this.trackMouse(e);
    this.onClick = e => this.setMove(e);
    this.onKey = e => this.onKeyChange(e, true);
    this.onKeyUp = e => this.onKeyChange(e, false);
    this.onVisibility = () => { if (document.hidden) this.paused = true; };
    this.onSkillClick = e => {
      const btn = e.target.closest('.skill');
      if (btn) this.tryCast(btn.dataset.key);
    };
  }

  start() {
    window.addEventListener('resize', this.onResize);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKeyUp);
    document.addEventListener('visibilitychange', this.onVisibility);
    $('#skill-bar').addEventListener('click', this.onSkillClick);
    this.fit();
    this.last = performance.now();
    const loop = now => {
      const dt = Math.min(0.05, (now - this.last) / 1000);
      this.last = now;
      if (!this.over) {
        if (!this.paused) this.update(dt);
        this.draw();
        this.syncHud();
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    window.removeEventListener('resize', this.onResize);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('click', this.onClick);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKeyUp);
    document.removeEventListener('visibilitychange', this.onVisibility);
    $('#skill-bar').removeEventListener('click', this.onSkillClick);
  }

  fit() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    const sw = Math.round(w * dpr), sh = Math.round(h * dpr);
    if (this.canvas.width !== sw || this.canvas.height !== sh) {
      this.canvas.width = sw; this.canvas.height = sh;
    }
    this.scale = Math.min(w / WORLD.w, h / WORLD.h);
    this.offX = (w - WORLD.w * this.scale) / 2;
    this.offY = (h - WORLD.h * this.scale) / 2;
  }

  toWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - this.offX) / this.scale,
      y: (e.clientY - rect.top - this.offY) / this.scale,
    };
  }
  trackMouse(e) { const p = this.toWorld(e); this.mouse.x = p.x; this.mouse.y = p.y; }
  setMove(e) {
    if (this.over) return;
    const p = this.toWorld(e);
    this.player.moveTarget = { x: Math.max(30, Math.min(WORLD.w - 30, p.x)), y: Math.max(40, Math.min(WORLD.h - 40, p.y)) };
  }
  onKeyChange(e, down) {
    const k = e.key.toLowerCase();
    if (down) {
      if (k === 'p' || k === 'escape') { this.paused = !this.paused; return; }
      if ('qwer'.includes(k) && k.length === 1) { this.tryCast(k); return; }
    }
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      e.preventDefault();
      down ? this.keys.add(k) : this.keys.delete(k);
      if (down) this.player.moveTarget = null; // 键盘移动优先
    }
  }

  /* ----- 释放技能 ----- */
  tryCast(key) {
    const u = this.player;
    if (this.over || this.paused || !u.alive) return;
    const def = SKILL_DEF[key];
    if (u.cds[key] > 0) return;
    if (u.mp < def.cost) return;
    u.mp -= def.cost;
    u.cds[key] = def.cd;
    const name = u.detail.spells[key].name;
    if (key === 'q' || key === 'r') {
      const ang = Math.atan2(this.mouse.y - u.y, this.mouse.x - u.x);
      const isUlt = key === 'r';
      this.projectiles.push({
        from: u, x: u.x, y: u.y,
        vx: Math.cos(ang) * 620, vy: Math.sin(ang) * 620,
        dmg: def.dmg(u.mag), owner: u,
        radius: isUlt ? 14 : 9, life: 1.4, ult: isUlt,
        color: isUlt ? '#f4c86a' : '#63d6e8',
      });
      if (isUlt) this.shake = Math.max(this.shake, 6);
    } else if (key === 'w') {
      const heal = Math.min(def.heal(u.mag), u.maxHp - u.hp);
      u.hp += heal;
      u.speedBoost = 2;
      this.float(u.x, u.y - 30, `+${Math.round(heal)}`, '#5fe08a');
      this.burst(u.x, u.y, '#5fe08a', 10);
    } else if (key === 'e') {
      const ang = Math.atan2(this.mouse.y - u.y, this.mouse.x - u.x);
      const nx = Math.max(30, Math.min(WORLD.w - 30, u.x + Math.cos(ang) * def.dash));
      const ny = Math.max(40, Math.min(WORLD.h - 40, u.y + Math.sin(ang) * def.dash));
      this.burst(u.x, u.y, '#9fd8ff', 8);
      u.x = nx; u.y = ny;
      u.moveTarget = null;
      this.burst(u.x, u.y, '#9fd8ff', 8);
    }
    void name;
  }

  /* ----- 更新 ----- */
  update(dt) {
    this.time += dt;
    const P = this.player, E = this.enemy;

    // 小兵波次
    if (this.time >= this.nextWave) {
      this.nextWave += 18;
      for (let i = 0; i < 3; i++) {
        this.minions.push(this.mkMinion('blue', i));
        this.minions.push(this.mkMinion('red', i));
      }
    }

    [P, E].forEach(u => {
      if (!u.alive) return;
      // 冷却/回复
      for (const k of 'qwer') u.cds[k] = Math.max(0, u.cds[k] - dt);
      u.speedBoost = Math.max(0, u.speedBoost - dt);
      u.aaTimer = Math.max(0, u.aaTimer - dt);
      u.flash = Math.max(0, u.flash - dt);
      const ownTower = TOWERS[u.side];
      const nearOwn = Math.hypot(u.x - ownTower.x, u.y - ownTower.y) < TOWER_REGEN_R;
      const mult = nearOwn ? 3 : 1;
      u.hp = Math.min(u.maxHp, u.hp + u.hpregen * mult * dt);
      u.mp = Math.min(u.maxMp, u.mp + u.mpgregen * mult * dt);

      // 敌方防御塔威胁
      const foeTower = TOWERS[u.side === 'blue' ? 'red' : 'blue'];
      const inFoe = Math.hypot(u.x - foeTower.x, u.y - foeTower.y) < TOWER_THREAT_R;
      if (inFoe) {
        u.towerZapTimer += dt;
        if (u.towerZapTimer >= 1.1) {
          u.towerZapTimer = 0;
          this.damage(u, TOWER_DMG, null, 'tower');
          this.zaps.push({ from: foeTower, to: { x: u.x, y: u.y }, life: 0.25 });
          this.shake = Math.max(this.shake, 5);
        }
      } else u.towerZapTimer = 0;
    });

    // 移动
    this.movePlayer(P, dt);
    if (E.alive) this.aiEnemy(E, dt);

    // 普攻
    [P, E].forEach(u => {
      if (!u.alive || u.aaTimer > 0) return;
      const foe = u === P ? E : P;
      const target = this.pickAATarget(u, foe);
      if (!target) return;
      const dist = Math.hypot(target.x - u.x, target.y - u.y);
      if (dist > u.range + (target.r || 20)) return;
      u.aaTimer = u.aaInterval;
      const dmg = u.ad;
      if (u.ranged) {
        this.projectiles.push({
          x: u.x, y: u.y, vx: (target.x - u.x) / dist * 520, vy: (target.y - u.y) / dist * 520,
          dmg, owner: u, radius: 5, life: 1.2, homing: target, aa: true, color: u === P ? '#8adfff' : '#ff9c9c',
        });
      } else {
        this.damage(target, dmg, u, 'aa');
        this.burst(target.x, target.y - 10, '#ffd58a', 5);
      }
    });

    // 小兵
    this.updateMinions(dt);

    // 弹道
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      if (p.homing && (p.homing.hp > 0)) {
        const d = Math.hypot(p.homing.x - p.x, p.homing.y - p.y) || 1;
        p.vx = (p.homing.x - p.x) / d * 560;
        p.vy = (p.homing.y - p.y) / d * 560;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      // 命中判定
      let hit = false;
      const foeOf = p.owner.side === 'blue' ? E : P;
      const units = [foeOf, ...this.minions.filter(m => m.side !== p.owner.side)];
      for (const t of units) {
        if (t.hp <= 0) continue;
        const r = t.r || 20;
        if (Math.hypot(t.x - p.x, t.y - p.y) < r + p.radius) {
          this.damage(t, p.dmg, p.owner, p.ult ? 'ult' : (p.aa ? 'aa' : 'skill'));
          this.burst(p.x, p.y, p.color, p.ult ? 16 : 6);
          if (p.ult) this.shake = Math.max(this.shake, 8);
          hit = true; break;
        }
      }
      if (hit || p.life <= 0 || p.x < -40 || p.x > WORLD.w + 40 || p.y < -40 || p.y > WORLD.h + 40) {
        this.projectiles.splice(i, 1);
      }
    }

    // 粒子 / 飘字 / 电弧
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pt = this.particles[i];
      pt.life -= dt; pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.vy += 160 * dt;
      if (pt.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i];
      f.life -= dt; f.y -= 34 * dt;
      if (f.life <= 0) this.floats.splice(i, 1);
    }
    for (let i = this.zaps.length - 1; i >= 0; i--) {
      this.zaps[i].life -= dt;
      if (this.zaps[i].life <= 0) this.zaps.splice(i, 1);
    }
    this.shake = Math.max(0, this.shake - dt * 22);

    // 死亡判定
    if (P.hp <= 0 && P.alive) this.kill(P, E);
    if (E.hp <= 0 && E.alive) this.kill(E, P);
  }

  mkMinion(side, i) {
    const t = TOWERS[side];
    return {
      side, r: 10,
      x: t.x + (side === 'blue' ? 40 : -40),
      y: LANE_Y + (i - 1) * 26,
      hp: 290, maxHp: 290, ad: 14, range: 46, ms: 62,
      aaTimer: Math.random() * 0.5,
      gold: 21,
    };
  }

  updateMinions(dt) {
    const P = this.player, E = this.enemy;
    for (let i = this.minions.length - 1; i >= 0; i--) {
      const m = this.minions[i];
      if (m.hp <= 0) { this.minions.splice(i, 1); continue; }
      m.aaTimer = Math.max(0, m.aaTimer - dt);
      // 目标：最近的敌人（小兵优先，其次英雄）
      const foes = this.minions.filter(o => o.side !== m.side && o.hp > 0);
      const foeChamp = m.side === 'blue' ? E : P;
      let target = null, best = 1e9;
      const consider = t => {
        if (!t || t.hp <= 0) return;
        const d = Math.hypot(t.x - m.x, t.y - m.y);
        const prio = (t.r ? 0 : 60); // 英雄加分母，倾向先打小兵
        if (d + prio < best) { best = d + prio; target = t; }
      };
      foes.forEach(consider); consider(foeChamp);
      const goal = TOWERS[m.side === 'blue' ? 'red' : 'blue'];
      if (target && best < 240 + 60) {
        const d = Math.hypot(target.x - m.x, target.y - m.y);
        if (d > m.range) {
          m.x += (target.x - m.x) / d * m.ms * dt;
          m.y += (target.y - m.y) / d * m.ms * dt;
        } else if (m.aaTimer === 0) {
          m.aaTimer = 1.1;
          this.damage(target, m.ad, m, 'minion');
        }
      } else {
        const d = Math.hypot(goal.x - m.x, goal.y - m.y) || 1;
        m.x += (goal.x - m.x) / d * m.ms * dt;
        m.y += (goal.y - m.y) / d * m.ms * dt;
      }
    }
  }

  pickAATarget(u, foeChamp) {
    // 普攻目标：射程内最近的敌人（英雄优先小幅）
    let target = null, best = 1e9;
    const pool = [];
    if (foeChamp.alive && foeChamp.hp > 0) pool.push({ t: foeChamp, prio: -40 });
    this.minions.filter(m => m.side !== u.side && m.hp > 0)
      .forEach(m => pool.push({ t: m, prio: 0 }));
    for (const { t, prio } of pool) {
      const d = Math.hypot(t.x - u.x, t.y - u.y) + prio;
      if (d < best) { best = d; target = t; }
    }
    return target;
  }

  movePlayer(P, dt) {
    let dx = 0, dy = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1;
    const sp = P.ms * (P.speedBoost > 0 ? 1.3 : 1);
    if (dx || dy) {
      const n = Math.hypot(dx, dy);
      P.x += dx / n * sp * dt; P.y += dy / n * sp * dt;
    } else if (P.moveTarget) {
      const d = Math.hypot(P.moveTarget.x - P.x, P.moveTarget.y - P.y);
      if (d < 6) P.moveTarget = null;
      else { P.x += (P.moveTarget.x - P.x) / d * sp * dt; P.y += (P.moveTarget.y - P.y) / d * sp * dt; }
    }
    P.x = Math.max(28, Math.min(WORLD.w - 28, P.x));
    P.y = Math.max(44, Math.min(WORLD.h - 44, P.y));
  }

  aiEnemy(E, dt) {
    const P = this.player;
    const own = TOWERS.red, foe = TOWERS.blue;
    const distP = Math.hypot(P.x - E.x, P.y - E.y);
    const hpRatio = E.hp / E.maxHp;

    if (E.ai.state === 'retreat') {
      const d = Math.hypot(own.x - E.x, own.y - E.y);
      if (d > 40) { E.x += (own.x - E.x) / d * E.ms * dt; E.y += (own.y - E.y) / d * E.ms * dt; }
      if (hpRatio > 0.65) E.ai.state = 'push';
      return;
    }
    if (hpRatio < 0.26) { E.ai.state = 'retreat'; return; }

    // 大招时机
    if (E.cds.r === 0 && E.mp >= SKILL_DEF.r.cost && distP < 520 && P.hp / P.maxHp < 0.5) {
      E.mp -= SKILL_DEF.r.cost; E.cds.r = SKILL_DEF.r.cd;
      const ang = Math.atan2(P.y - E.y, P.x - E.x);
      this.projectiles.push({
        x: E.x, y: E.y, vx: Math.cos(ang) * 560, vy: Math.sin(ang) * 560,
        dmg: SKILL_DEF.r.dmg(E.mag), owner: E, radius: 14, life: 1.5, ult: true, color: '#ff9c5e',
      });
      this.shake = Math.max(this.shake, 6);
    }
    // Q 消耗
    if (E.cds.q === 0 && E.mp >= SKILL_DEF.q.cost && distP < 560) {
      E.mp -= SKILL_DEF.q.cost; E.cds.q = SKILL_DEF.q.cd;
      const ang = Math.atan2(P.y - E.y + (Math.random() - .5) * 40, P.x - E.x);
      this.projectiles.push({
        x: E.x, y: E.y, vx: Math.cos(ang) * 560, vy: Math.sin(ang) * 560,
        dmg: SKILL_DEF.q.dmg(E.mag), owner: E, radius: 9, life: 1.4, color: '#ff8f8f',
      });
    }
    // W 自保
    if (E.cds.w === 0 && E.mp >= SKILL_DEF.w.cost && hpRatio < 0.6) {
      E.mp -= SKILL_DEF.w.cost; E.cds.w = SKILL_DEF.w.cd;
      const heal = Math.min(SKILL_DEF.w.heal(E.mag), E.maxHp - E.hp);
      E.hp += heal; E.speedBoost = 2;
      this.float(E.x, E.y - 30, `+${Math.round(heal)}`, '#5fe08a');
    }
    // E 拉近/拉开
    if (E.cds.e === 0 && E.mp >= SKILL_DEF.e.cost && distP > E.range + 160 && distP < E.range + 400) {
      E.mp -= SKILL_DEF.e.cost; E.cds.e = SKILL_DEF.e.cd;
      const ang = Math.atan2(P.y - E.y, P.x - E.x);
      E.x += Math.cos(ang) * SKILL_DEF.e.dash; E.y += Math.sin(ang) * SKILL_DEF.e.dash;
      this.burst(E.x, E.y, '#ffb0b0', 8);
    }

    // 走位：与玩家保持自身射程，追击/后撤；否则随兵线推进
    const desired = E.range * 0.85;
    let tx, ty;
    const avoidFoeTower = Math.hypot(E.x - foe.x, E.y - foe.y) < TOWER_THREAT_R + 40 && P.hp / P.maxHp > 0.25;
    if (P.alive && distP < 460 && !avoidFoeTower) {
      const ang = Math.atan2(E.y - P.y, E.x - P.x);
      tx = P.x + Math.cos(ang) * desired;
      ty = P.y + Math.sin(ang) * desired;
    } else {
      tx = foe.x + 240; ty = LANE_Y + Math.sin(this.time * 0.7) * 60;
    }
    const d = Math.hypot(tx - E.x, ty - E.y);
    if (d > 14) {
      const sp = E.ms * (E.speedBoost > 0 ? 1.3 : 1);
      E.x += (tx - E.x) / d * sp * dt;
      E.y += (ty - E.y) / d * sp * dt;
    }
    E.x = Math.max(28, Math.min(WORLD.w - 28, E.x));
    E.y = Math.max(44, Math.min(WORLD.h - 44, E.y));
  }

  damage(target, raw, source, kind) {
    if (target.hp <= 0) return;
    let dmg = raw;
    if (kind === 'aa' || kind === 'skill' || kind === 'ult') {
      const armor = target.armor || 0;         // 小兵无甲
      dmg = raw * 100 / (100 + armor);
    }
    target.hp = Math.max(0, target.hp - dmg);
    if (target.flash !== undefined) target.flash = 0.12;
    const isChamp = !target.r;
    if (source === this.player && isChamp) this.player.heroDmg += dmg;
    if (source === this.player && !isChamp && target.hp <= 0) {
      this.player.cs += 1;
      this.player.gold += target.gold || 0;
    }
    if (isChamp) {
      const color = target.side === 'blue' ? '#ff6a7a' : '#ffd76a';
      this.float(target.x + (Math.random() - .5) * 20, target.y - 36, Math.round(dmg), color);
    }
  }

  kill(u, killer) {
    u.alive = false;
    u.hp = 0;
    killer.kills += 1;
    killer.gold += 300;
    this.burst(u.x, u.y, u.side === 'blue' ? '#5ec8ff' : '#ff8f6a', 26);
    this.shake = 10;
    this.over = true;
    const won = u.side === 'red';
    setTimeout(() => {
      this.result = {
        won,
        time: this.time,
        kills: this.player.kills, deaths: this.player.kills === 1 ? 0 : 1,
        cs: this.player.cs, gold: this.player.gold,
        heroDmg: Math.round(this.player.heroDmg),
      };
      this.opts.onEnd(this.result);
    }, 1300);
  }

  burst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 140;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 0.4 + Math.random() * 0.3, color });
    }
  }
  float(x, y, text, color) {
    this.floats.push({ x, y, text: String(text), color, life: 0.9 });
  }

  /* ----- 渲染 ----- */
  draw() {
    const ctx = this.ctx;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    const sx = this.shake ? (Math.random() - .5) * this.shake : 0;
    const sy = this.shake ? (Math.random() - .5) * this.shake : 0;
    ctx.translate(this.offX + sx, this.offY + sy);
    ctx.scale(this.scale, this.scale);

    // 地面
    ctx.fillStyle = '#07220f';
    ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    // 河流
    const river = ctx.createLinearGradient(WORLD.w / 2 - 70, 0, WORLD.w / 2 + 70, 0);
    river.addColorStop(0, '#0a2d3f'); river.addColorStop(0.5, '#0e3a52'); river.addColorStop(1, '#0a2d3f');
    ctx.fillStyle = river;
    ctx.fillRect(WORLD.w / 2 - 70, 0, 140, WORLD.h);
    // 中路
    ctx.fillStyle = '#1b3a24';
    ctx.fillRect(0, LANE_Y - 78, WORLD.w, 156);
    ctx.fillStyle = '#24482d';
    ctx.fillRect(0, LANE_Y - 66, WORLD.w, 132);
    // 路缘
    ctx.strokeStyle = '#33583c'; ctx.lineWidth = 2; ctx.setLineDash([14, 12]);
    ctx.beginPath(); ctx.moveTo(0, LANE_Y - 66); ctx.lineTo(WORLD.w, LANE_Y - 66);
    ctx.moveTo(0, LANE_Y + 66); ctx.lineTo(WORLD.w, LANE_Y + 66); ctx.stroke();
    ctx.setLineDash([]);
    // 草丛
    ctx.fillStyle = 'rgba(46,94,52,.85)';
    [[140, LANE_Y - 180], [1040, LANE_Y - 180], [140, LANE_Y + 110], [1040, LANE_Y + 110]].forEach(([x, y]) => {
      ctx.beginPath(); ctx.ellipse(x + 60, y + 40, 62, 30, 0, 0, Math.PI * 2); ctx.fill();
    });

    // 防御塔
    this.drawTower(ctx, TOWERS.blue, '#0ac8b9');
    this.drawTower(ctx, TOWERS.red, '#e84057');

    // 塔范围（淡）
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(10,200,185,.25)';
    ctx.beginPath(); ctx.arc(TOWERS.blue.x, TOWERS.blue.y, TOWER_REGEN_R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(232,64,87,.25)';
    ctx.beginPath(); ctx.arc(TOWERS.red.x, TOWERS.red.y, TOWER_THREAT_R, 0, Math.PI * 2); ctx.stroke();

    // 电弧
    this.zaps.forEach(z => {
      ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 3; ctx.globalAlpha = z.life * 4;
      ctx.beginPath(); ctx.moveTo(z.from.x, z.from.y - 92);
      const steps = 6;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        ctx.lineTo(z.from.x + (z.to.x - z.from.x) * t + (Math.random() - .5) * 18,
                   z.from.y - 92 + (z.to.y - (z.from.y - 92)) * t + (Math.random() - .5) * 18);
      }
      ctx.stroke(); ctx.globalAlpha = 1;
    });

    // 小兵
    this.minions.forEach(m => {
      const c = m.side === 'blue' ? '#4fa8ff' : '#ff7a6a';
      ctx.fillStyle = c;
      ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 1.5; ctx.stroke();
      this.bar(ctx, m.x, m.y - 18, 22, 4, m.hp / m.maxHp, '#2fbf71');
    });

    // 英雄
    if (this.player.alive) this.drawChamp(ctx, this.player);
    if (this.enemy.alive) this.drawChamp(ctx, this.enemy);

    // 弹道
    this.projectiles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color; ctx.shadowBlur = p.ult ? 22 : 10;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    });

    // 粒子
    this.particles.forEach(pt => {
      ctx.globalAlpha = Math.max(0, pt.life * 2);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
      ctx.globalAlpha = 1;
    });

    // 飘字
    ctx.textAlign = 'center'; ctx.font = '700 17px sans-serif';
    this.floats.forEach(f => {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      ctx.fillStyle = f.color;
      ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 3;
      ctx.strokeText(f.text, f.x, f.y); ctx.fillText(f.text, f.x, f.y);
      ctx.globalAlpha = 1;
    });

    // 玩家移动标记
    if (this.player.moveTarget && !this.over) {
      const t = this.player.moveTarget;
      ctx.strokeStyle = 'rgba(240,230,210,.7)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(t.x, t.y, 8 + Math.sin(this.time * 8) * 2, 0, Math.PI * 2); ctx.stroke();
    }

    // 暂停遮罩
    if (this.paused) {
      ctx.fillStyle = 'rgba(1,10,19,.66)';
      ctx.fillRect(0, 0, WORLD.w, WORLD.h);
      ctx.fillStyle = '#f0e6d2'; ctx.font = '800 44px serif'; ctx.textAlign = 'center';
      ctx.fillText('已暂停', WORLD.w / 2, WORLD.h / 2 - 8);
      ctx.font = '16px sans-serif'; ctx.fillStyle = '#a09b8c';
      ctx.fillText('按 P / Esc 继续', WORLD.w / 2, WORLD.h / 2 + 30);
    }
  }

  drawTower(ctx, t, color) {
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.fillStyle = '#22323f';
    ctx.fillRect(-26, -30, 52, 46);
    ctx.fillStyle = '#2d4453';
    ctx.beginPath();
    ctx.moveTo(-32, -30); ctx.lineTo(0, -96); ctx.lineTo(32, -30); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -96, 7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(this.time * 3);
    ctx.beginPath(); ctx.arc(0, -96, 13, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawChamp(ctx, u) {
    const foe = u.side === 'blue' ? this.enemy : this.player;
    ctx.save();
    ctx.translate(u.x, u.y);
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(0, 20, 22, 7, 0, 0, Math.PI * 2); ctx.fill();
    // 阵营圈
    const col = u.side === 'blue' ? '#0ac8b9' : '#e84057';
    ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 4, 24, 0, Math.PI * 2); ctx.stroke();
    // 朝向指示
    const ang = Math.atan2(foe.y - u.y, foe.x - u.x);
    ctx.strokeStyle = col; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(Math.cos(ang) * 16, 4 + Math.sin(ang) * 16);
    ctx.lineTo(Math.cos(ang) * 26, 4 + Math.sin(ang) * 26); ctx.stroke();
    // 身体
    ctx.fillStyle = u.flash > 0 ? '#ffffff' : (u.side === 'blue' ? '#1d5f6e' : '#6e2a33');
    ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(240,230,210,.8)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
    // 血条
    const w = 64;
    this.bar(ctx, u.x, u.y - 40, w, 7, u.hp / u.maxHp, u.side === 'blue' ? '#2fbf71' : '#e05a5a');
    this.bar(ctx, u.x, u.y - 31, w * 0.7, 3.5, u.mp / u.maxMp, '#2f7fbf', true);
  }

  bar(ctx, x, y, w, h, ratio, color, thin) {
    ctx.fillStyle = 'rgba(2,8,16,.8)';
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = color;
    ctx.fillRect(x - w / 2, y, Math.max(0, w * Math.max(0, Math.min(1, ratio))), h);
    void thin;
  }

  syncHud() {
    const P = this.player, E = this.enemy;
    $('#bar-hp').style.width = (P.hp / P.maxHp * 100) + '%';
    $('#bar-mp').style.width = (P.mp / P.maxMp * 100) + '%';
    $('#text-hp').textContent = `${Math.ceil(P.hp)} / ${Math.round(P.maxHp)}`;
    $('#text-mp').textContent = `${Math.floor(P.mp)} / ${Math.round(P.maxMp)}`;
    $('#ebar-hp').style.width = (E.hp / E.maxHp * 100) + '%';
    $('#enemy-hp-text').textContent = `对手 ${Math.ceil(Math.max(0, E.hp))} HP`;
    const m = Math.floor(this.time / 60), s = Math.floor(this.time % 60);
    $('#hud-timer').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    $('#hud-kda-blue').textContent = `${P.kills} / ${P.kills === 1 && this.over ? 0 : (this.over && P.kills === 0 ? 1 : 0)}`;
    $('#hud-kda-red').textContent = `${E.kills} / ${E.kills === 1 && this.over ? 0 : (this.over && E.kills === 0 ? 1 : 0)}`;
    $('#hud-cs').textContent = P.cs;
    $('#hud-gold').textContent = P.gold;
    document.querySelectorAll('.skill').forEach(btn => {
      const k = btn.dataset.key;
      const cd = P.cds[k];
      btn.classList.toggle('on-cd', cd > 0);
      btn.querySelector('.cd').textContent = cd > 0 ? Math.ceil(cd) : '';
      btn.classList.toggle('no-mana', P.mp < SKILL_DEF[k].cost);
    });
  }
}

/* ---------- 屏4 · 结算 ---------- */
function showResult(r) {
  const banner = $('#result-banner');
  banner.className = 'banner ' + (r.won ? 'victory' : 'defeat');
  $('#result-en').textContent = r.won ? 'VICTORY' : 'DEFEAT';
  $('#result-zh').textContent = r.won ? '胜 利' : '失 败';
  $('#result-icon-blue').src = API.icon(state.picked.alias);
  $('#result-icon-red').src = API.icon(state.enemy.alias);
  $('#result-name-blue').textContent = state.picked.name;
  $('#result-name-red').textContent = state.enemy.name;
  const m = Math.floor(r.time / 60), s = Math.floor(r.time % 60);
  $('#result-stats').innerHTML = `
    <div class="rs"><label>对局用时</label><b>${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}</b></div>
    <div class="rs"><label>击杀 / 死亡</label><b>${r.won ? '1 / 0' : '0 / 1'}</b></div>
    <div class="rs"><label>补刀</label><b>${r.cs}</b></div>
    <div class="rs"><label>金币</label><b>${r.gold}</b></div>
    <div class="rs"><label>对英雄伤害</label><b>${r.heroDmg}</b></div>
    <div class="rs"><label>数据来源</label><b>lol.qq.com 官方接口</b></div>
  `;
  showScreen('result');
}

$('#btn-rematch').addEventListener('click', () => {
  if (!state.picked) return showScreen('select');
  startLoading();
});
$('#btn-repick').addEventListener('click', () => {
  if (state.battle) { state.battle.destroy(); state.battle = null; }
  showScreen('select');
});

/* ---------- 启动 ---------- */
loadRoster();
