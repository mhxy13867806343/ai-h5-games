/* ============================================================
   数字炸弹 · Number Bomb（2~5 人，任意真人/电脑组合）
   0~N 之间藏着炸弹数字，轮流报数收紧范围：
   直接踩中炸弹、或轮到时只剩炸弹一个数可报 → 输
   ============================================================ */
'use strict';

const $ = s => document.querySelector(s);
const screens = { setup: $('#screen-setup'), game: $('#screen-game'), boom: $('#screen-boom') };
function showScreen(name) {
  Object.values(screens).forEach(el => el.classList.remove('active'));
  screens[name].classList.add('active');
}
// file:// 直接打开时跳线上大厅
function goLobby(link) {
  if (location.protocol === 'file:') {
    location.href = 'https://mhxy13867806343.github.io/ai-h5-games/';
    return false;
  }
  return true;
}

/* ---------- 音效（Web Audio 合成） ---------- */
const Sound = {
  ctx: null,
  enabled: localStorage.getItem('bomb_sound') !== 'off',
  ensure() {
    if (!this.enabled) return false;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx.state === 'running';
  },
  tone({ freq = 440, end = freq, dur = 0.15, type = 'sine', gain = 0.18, when = 0 }) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  },
  noise({ dur = 0.2, gain = 0.2, when = 0, low = 200, high = 3000 }) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime + when;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = (low + high) / 2; bp.Q.value = 0.6;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp); bp.connect(g); g.connect(this.ctx.destination);
    src.start(t0); src.stop(t0 + dur + 0.02);
  },
  play(name) {
    if (!this.enabled) return;
    try { this.presets[name].call(this); } catch (e) { /* 不影响游戏 */ }
  },
  presets: {
    click() { this.tone({ freq: 700, end: 520, dur: .06, type: 'triangle', gain: .12 }); },
    tick() { this.tone({ freq: 880, end: 660, dur: .08, type: 'triangle', gain: .14 }); },
    buzz() { this.tone({ freq: 160, end: 120, dur: .18, type: 'square', gain: .1 }); },
    boom() {
      this.noise({ dur: .6, gain: .3, low: 60, high: 700 });
      this.tone({ freq: 120, end: 35, dur: .7, type: 'sawtooth', gain: .26 });
      this.tone({ freq: 90, end: 28, dur: .9, type: 'sine', gain: .22, when: .08 });
    },
    win() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: .25, type: 'triangle', gain: .15, when: i * .12 })); },
  },
};
document.addEventListener('pointerdown', () => Sound.ensure(), { once: true });

/* ---------- 状态 ---------- */
const state = {
  count: 3,
  N: 1000,
  players: [],           // [{name, isAI}]
  turn: 0,
  low: 0, high: 1000,
  target: 0,
  history: [],
  round: 1,
  over: false,
  aiTimer: 0,
};

/* ---------- 设置屏：座位 ---------- */
function renderPlayerRows() {
  const wrap = $('#player-rows');
  wrap.innerHTML = '';
  for (let i = 0; i < state.count; i++) {
    const row = document.createElement('div');
    row.className = 'prow';
    row.innerHTML = `
      <span class="pnum">P${i + 1}</span>
      <input class="pname" type="text" maxlength="8" placeholder="玩家 ${i + 1}" value="玩家 ${i + 1}">
      <label class="ai-toggle"><input type="checkbox" class="pai" ${i > 0 ? 'checked' : ''}> 🤖 电脑</label>
    `;
    if (i > 0) row.querySelector('.pname').value = `电脑 ${i + 1}`;
    wrap.appendChild(row);
  }
  wrap.querySelectorAll('.pai, .pname').forEach(el =>
    el.addEventListener('change', syncSeatTip));
  // 切换电脑/真人时，未手动改名的座位自动换默认名
  wrap.querySelectorAll('.prow').forEach((row, i) => {
    const cb = row.querySelector('.pai');
    const name = row.querySelector('.pname');
    cb.addEventListener('change', () => {
      if (name.value.trim() === `电脑 ${i + 1}` || name.value.trim() === `玩家 ${i + 1}` || !name.value.trim()) {
        name.value = cb.checked ? `电脑 ${i + 1}` : `玩家 ${i + 1}`;
      }
    });
  });
  syncSeatTip();
}

function readPlayers() {
  return [...document.querySelectorAll('#player-rows .prow')].map((row, i) => {
    const isAI = row.querySelector('.pai').checked;
    let name = row.querySelector('.pname').value.trim();
    if (!name) name = isAI ? `电脑 ${i + 1}` : `玩家 ${i + 1}`;
    return { name, isAI };
  });
}

function syncSeatTip() {
  const ps = readPlayers();
  const humans = ps.filter(p => !p.isAI).length;
  $('#seat-tip').textContent = `当前阵容：${ps.length} 人 · ${humans} 真人 + ${ps.length - humans} 电脑` +
    (humans === 0 ? '（全员电脑，观战模式）' : '');
}

$('#count-seg').addEventListener('click', e => {
  const btn = e.target.closest('button[data-count]');
  if (!btn) return;
  Sound.play('click');
  state.count = Number(btn.dataset.count);
  document.querySelectorAll('#count-seg button').forEach(b => b.classList.toggle('active', b === btn));
  renderPlayerRows();
});

$('#range-seg').addEventListener('click', e => {
  const btn = e.target.closest('button[data-n]');
  if (!btn) return;
  Sound.play('click');
  document.querySelectorAll('#range-seg button').forEach(b => b.classList.toggle('active', b === btn));
  const v = btn.dataset.n;
  $('#custom-n').hidden = v !== 'custom';
  if (v !== 'custom') state.N = Number(v);
});
$('#custom-n').addEventListener('input', e => {
  const v = Math.floor(Number(e.target.value));
  state.N = v >= 10 && v <= 999999 ? v : 0;
});

$('#btn-start').addEventListener('click', () => {
  if (!state.N) { Sound.play('buzz'); $('#custom-n').focus(); return; }
  Sound.play('click');
  state.players = readPlayers();
  startGame();
});

/* ---------- 游戏流程 ---------- */
function startGame() {
  state.low = 0;
  state.high = state.N;
  state.target = 1 + Math.floor(Math.random() * (state.N - 1)); // (0, N) 开区间内
  state.turn = 0;
  state.round = 1;
  state.history = [];
  state.over = false;
  clearTimeout(state.aiTimer);
  $('#history-list').innerHTML = '';
  $('#history-empty').hidden = false;
  $('#announce').textContent = '';
  $('#input-hint').textContent = '';
  showScreen('game');
  document.body.classList.remove('exploded');
  render();
  nextTurn();
}

$('#btn-guess').addEventListener('click', submitGuess);
$('#guess-input').addEventListener('keydown', e => { if (e.key === 'Enter') submitGuess(); });
$('#btn-quit').addEventListener('click', () => {
  Sound.play('click');
  clearTimeout(state.aiTimer);
  showScreen('setup');
});

function submitGuess() {
  if (state.over) return;
  const cur = state.players[state.turn];
  if (cur.isAI) return; // 电脑回合不可代报
  const input = $('#guess-input');
  const g = Math.floor(Number(input.value));
  const hint = $('#input-hint');
  const bad = msg => {
    Sound.play('buzz');
    hint.textContent = msg;
    input.classList.remove('shake');
    void input.offsetWidth;
    input.classList.add('shake');
  };
  input.value = '';
  if (!Number.isFinite(g)) return bad('请输入一个整数');
  if (g <= state.low) return bad(`必须大于下界 ${state.low}`);
  if (g >= state.high) return bad(`必须小于上界 ${state.high}`);
  hint.textContent = '';
  handleGuess(g);
}

function handleGuess(g) {
  const cur = state.players[state.turn];
  const before = { low: state.low, high: state.high };
  let dir;
  if (g === state.target) {
    state.history.push({ name: cur.name, g, before, after: { low: state.low, high: state.high }, dir: 'bomb' });
    announce(`${cur.name} 输入了 ${g.toLocaleString()} —— 正是炸弹数字！`);
    return endGame(cur, '直接踩中炸弹！');
  }
  if (g < state.target) { state.low = g; dir = 'lo'; }
  else { state.high = g; dir = 'hi'; }
  state.history.push({ name: cur.name, g, before, after: { low: state.low, high: state.high }, dir });
  Sound.play('tick');
  // 报数播报：输入了 23 → 23 到 100
  announce(`${cur.name} 输入了 ${g.toLocaleString()} → 范围变为 ${state.low.toLocaleString()} 到 ${state.high.toLocaleString()}`);

  // 只剩炸弹一个数可报：下一个轮到的人被迫踩雷，直接结束
  if (state.high - state.low - 1 === 1) {
    render();
    const forced = state.players[(state.turn + 1) % state.players.length];
    setTimeout(() => endGame(forced, '只剩炸弹可报，被迫引爆'), 550);
    return;
  }
  state.turn = (state.turn + 1) % state.players.length;
  if (state.turn === 0) state.round++;
  render();
  nextTurn();
}

function announce(text) {
  const el = $('#announce');
  el.textContent = text;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

/* ---------- 回合调度：电脑自动报数，真人等待输入 ---------- */
function nextTurn() {
  const cur = state.players[state.turn];
  if (state.over || !cur) return;
  const banner = $('#turn-banner');
  const input = $('#guess-input');
  const btn = $('#btn-guess');
  if (cur.isAI) {
    banner.classList.add('thinking');
    banner.textContent = `🤖 ${cur.name} 思考中…`;
    btn.disabled = true;
    input.disabled = true;
    state.aiTimer = setTimeout(() => {
      if (state.over) return;
      const c = state.high - state.low - 1; // 剩余可报数量
      let g;
      if (c === 2) {
        g = Math.random() < .5 ? state.low + 1 : state.high - 1; // 二选一赌一把
      } else {
        // 取中位并加扰动，把区间拆平
        const mid = state.low + Math.ceil(c / 2);
        const jitter = Math.min(2, Math.max(-2, Math.round((Math.random() - .5) * 4)));
        g = Math.min(state.high - 1, Math.max(state.low + 1, mid + jitter));
      }
      handleGuess(g);
    }, 620 + Math.random() * 450);
  } else {
    banner.classList.remove('thinking');
    banner.textContent = `轮到 ${cur.name}（真人）报数`;
    btn.disabled = false;
    input.disabled = false;
    input.placeholder = `报一个 ${state.low + 1} ~ ${state.high - 1} 之间的数`;
    input.focus();
  }
}

/* ---------- 渲染 ---------- */
function render() {
  const range = $('#range-num');
  range.textContent = `( ${state.low.toLocaleString()} , ${state.high.toLocaleString()} )`;
  range.classList.remove('pulse');
  void range.offsetWidth;
  range.classList.add('pulse');
  $('#rest-count').textContent = (state.high - state.low - 1).toLocaleString();
  $('#round-num').textContent = state.round;

  // 座位条
  const strip = $('#players-strip');
  strip.innerHTML = state.players.map((p, i) => `
    <span class="pchip ${i === state.turn ? 'active' : ''} ${p.isAI ? 'ai' : 'human'}">
      ${p.isAI ? '🤖' : '🧑'} ${p.name}
    </span>`).join('');

  // 记录（最新在前）
  const list = $('#history-list');
  list.innerHTML = state.history.slice().reverse().map(h => `
    <li class="${h.dir === 'bomb' ? 'hi' : ''}">
      <span class="who">${h.name}</span>
      <span class="num">${h.g.toLocaleString()}</span>
      <span class="dir ${h.dir === 'lo' ? 'lo' : 'hi'}">${
        h.dir === 'bomb' ? '💥 炸弹！' :
        h.dir === 'lo' ? `偏小 → ${h.after.low} 到 ${h.after.high}` :
                         `偏大 → ${h.after.low} 到 ${h.after.high}`
      }</span>
    </li>`).join('');
  $('#history-empty').hidden = state.history.length > 0;
}

/* ---------- 结束 ---------- */
function endGame(loser, reason) {
  state.over = true;
  clearTimeout(state.aiTimer);
  $('#btn-guess').disabled = true;
  $('#guess-input').disabled = true;
  Sound.play('boom');
  document.body.classList.add('exploded');
  const survivors = state.players.filter(p => p !== loser);
  if (survivors.some(p => !p.isAI) && loser.isAI) setTimeout(() => Sound.play('win'), 650);

  $('#boom-title').textContent = reason;
  $('#boom-title').classList.toggle('safe-forced', reason.includes('被迫'));
  $('#boom-loser').textContent = `${loser.name} 输了`;
  $('#boom-target').textContent = state.target.toLocaleString();
  $('#boom-stats').innerHTML = `
    共报数 ${state.history.length} 次 · 范围从 0~${state.N.toLocaleString()} 收紧到 ${state.low.toLocaleString()}~${state.high.toLocaleString()}<br>
    幸存者：${survivors.map(p => p.name).join('、')} · 阵容：${state.players.filter(p => !p.isAI).length} 真人 + ${state.players.filter(p => p.isAI).length} 电脑
  `;
  render();
  setTimeout(() => showScreen('boom'), 300);
}

$('#btn-again').addEventListener('click', () => { Sound.play('click'); startGame(); });
$('#btn-setup2').addEventListener('click', () => { Sound.play('click'); showScreen('setup'); });

/* ---------- 音效开关 ---------- */
const soundBtn = $('#sound-toggle');
function syncSoundBtn() {
  soundBtn.textContent = Sound.enabled ? '🔊 音效' : '🔇 静音';
  soundBtn.setAttribute('aria-pressed', String(Sound.enabled));
}
soundBtn.addEventListener('click', () => {
  Sound.enabled = !Sound.enabled;
  localStorage.setItem('bomb_sound', Sound.enabled ? 'on' : 'off');
  if (Sound.enabled) { Sound.ensure(); Sound.play('click'); }
  syncSoundBtn();
});
syncSoundBtn();
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'm' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) soundBtn.click();
});

/* ---------- 初始化 ---------- */
renderPlayerRows();
