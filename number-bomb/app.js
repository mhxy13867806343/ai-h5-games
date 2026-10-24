/* ============================================================
   数字炸弹 · Number Bomb
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
  mode: 'ai',            // ai | pvp
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

/* ---------- 设置屏 ---------- */
$('#mode-seg').addEventListener('click', e => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  Sound.play('click');
  state.mode = btn.dataset.mode;
  document.querySelectorAll('#mode-seg button').forEach(b => b.classList.toggle('active', b === btn));
  $('#field-names-pvp').hidden = state.mode !== 'pvp';
  $('#field-first').hidden = state.mode !== 'ai';
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
$('#first-seg').addEventListener('click', e => {
  const btn = e.target.closest('button[data-first]');
  if (!btn) return;
  Sound.play('click');
  document.querySelectorAll('#first-seg button').forEach(b => b.classList.toggle('active', b === btn));
  state.firstAi = btn.dataset.first === 'ai';
});

$('#btn-start').addEventListener('click', () => {
  if (!state.N) { Sound.play('buzz'); $('#custom-n').focus(); return; }
  Sound.play('click');
  if (state.mode === 'ai') {
    const me = '你', ai = '电脑';
    state.players = state.firstAi
      ? [{ name: ai, isAI: true }, { name: me, isAI: false }]
      : [{ name: me, isAI: false }, { name: ai, isAI: true }];
  } else {
    const n1 = $('#p1-name').value.trim() || '玩家 1';
    const n2 = $('#p2-name').value.trim() || '玩家 2';
    state.players = [{ name: n1, isAI: false }, { name: n2, isAI: false }];
  }
  startGame();
});

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
  showScreen('game');
  document.body.classList.remove('exploded');
  render();
  maybeAiTurn();
}

/* ---------- 游戏屏 ---------- */
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
    return endGame(cur, '直接踩中炸弹！');
  }
  if (g < state.target) { state.low = g; dir = 'lo'; }
  else { state.high = g; dir = 'hi'; }
  state.history.push({ name: cur.name, g, before, after: { low: state.low, high: state.high }, dir });
  Sound.play('tick');

  // 只剩炸弹一个数可报：下一个轮到的人被迫踩雷，直接结束（如目标 10，前手报 9，另一人报 11）
  if (state.high - state.low - 1 === 1) {
    render();
    const forced = state.players[(state.turn + 1) % state.players.length];
    setTimeout(() => endGame(forced, '只剩炸弹可报，被迫引爆'), 550);
    return;
  }
  state.turn = (state.turn + 1) % state.players.length;
  if (state.turn === 0) state.round++;
  render();
  maybeAiTurn();
}

/* ---------- 电脑策略（不偷看炸弹，只做生存与拆分） ---------- */
function maybeAiTurn() {
  const cur = state.players[state.turn];
  if (!cur || !cur.isAI || state.over) return;
  const banner = $('#turn-banner');
  banner.classList.add('thinking');
  banner.textContent = `电脑思考中…`;
  $('#btn-guess').disabled = true;
  state.aiTimer = setTimeout(() => {
    if (state.over) return;
    $('#btn-guess').disabled = false;
    banner.classList.remove('thinking');
    const c = state.high - state.low - 1; // 剩余可报数量
    let g;
    if (c === 2) {
      // 二选一，赌一把
      g = Math.random() < .5 ? state.low + 1 : state.high - 1;
    } else {
      // 取中位并加扰动，尽量把区间拆平
      const mid = state.low + Math.ceil(c / 2);
      const jitter = Math.min(2, Math.max(-2, Math.round((Math.random() - .5) * 4)));
      g = Math.min(state.high - 1, Math.max(state.low + 1, mid + jitter));
    }
    handleGuess(g);
  }, 650 + Math.random() * 500);
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
  const cur = state.players[state.turn];
  if (!cur) return;
  const banner = $('#turn-banner');
  if (!cur.isAI && !banner.classList.contains('thinking')) {
    banner.textContent = `轮到 ${cur.name} 报数`;
    $('#btn-guess').disabled = false;
  }
  $('#guess-input').placeholder = `报一个 ${state.low + 1} ~ ${state.high - 1} 之间的数`;
  // 记录（最新在前）
  const list = $('#history-list');
  list.innerHTML = state.history.slice().reverse().map(h => `
    <li class="${h.dir === 'bomb' ? 'hi' : ''}">
      <span class="who">${h.name}</span>
      <span class="num">${h.g.toLocaleString()}</span>
      <span class="dir ${h.dir === 'lo' ? 'lo' : 'hi'}">${
        h.dir === 'bomb' ? '💥 炸弹！' :
        h.dir === 'lo' ? `偏小 → 下界变 ${h.after.low}` :
                         `偏大 → 上界变 ${h.after.high}`
      }</span>
    </li>`).join('');
  $('#history-empty').hidden = state.history.length > 0;
}

/* ---------- 结束 ---------- */
function endGame(loser, reason) {
  state.over = true;
  clearTimeout(state.aiTimer);
  $('#btn-guess').disabled = true;
  Sound.play('boom');
  document.body.classList.add('exploded');
  const winner = state.players.find(p => p !== loser);
  if (winner && !winner.isAI && loser.isAI) setTimeout(() => Sound.play('win'), 650);

  $('#boom-title').textContent = reason;
  $('#boom-title').classList.toggle('safe-forced', reason.includes('被迫'));
  $('#boom-loser').textContent = `${loser.name} 输了`;
  $('#boom-target').textContent = state.target.toLocaleString();
  $('#boom-stats').innerHTML = `
    共报数 ${state.history.length} 次 · 范围从 0~${state.N.toLocaleString()} 收紧到 ${state.low.toLocaleString()}~${state.high.toLocaleString()}<br>
    获胜方：${winner ? winner.name : '—'} · 模式：${state.mode === 'ai' ? '人机对战' : '双人同屏'}
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
