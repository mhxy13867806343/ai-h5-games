/* ============================================================
   21 点 · Blackjack（2~5 人，任意真人/电脑组合）
   掷骰定庄 → 逐张发牌 → 要牌/停牌 → 庄家行动 → 比点结算
   特殊牌型：两张 21 = Blackjack；5 张且 ≤18 点 = 小老虎
   ============================================================ */
'use strict';

const $ = s => document.querySelector(s);
const screens = { setup: $('#screen-setup'), dice: $('#screen-dice'), bet: $('#screen-bet'), table: $('#screen-table'), result: $('#screen-result') };
function showScreen(name) {
  Object.values(screens).forEach(el => el.classList.remove('active'));
  screens[name].classList.add('active');
}
function goLobby(link) {
  if (location.protocol === 'file:') {
    location.href = 'https://mhxy13867806343.github.io/ai-h5-games/';
    return false;
  }
  return true;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- 音效 ---------- */
const Sound = {
  ctx: null,
  enabled: localStorage.getItem('bj_sound') !== 'off',
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
  tone({ freq = 440, end = freq, dur = .15, type = 'sine', gain = .18, when = 0 }) {
    if (!this.ensure()) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator(), g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, end), t0 + dur);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t0); osc.stop(t0 + dur + .02);
  },
  play(name) { if (!this.enabled) return; try { this.presets[name].call(this); } catch (e) {} },
  presets: {
    click() { this.tone({ freq: 700, end: 520, dur: .06, type: 'triangle', gain: .12 }); },
    dice() { for (let i = 0; i < 5; i++) this.tone({ freq: 300 + Math.random() * 500, dur: .05, type: 'square', gain: .06, when: i * .09 }); },
    card() { this.tone({ freq: 950, end: 600, dur: .05, type: 'triangle', gain: .1 }); },
    bust() { this.tone({ freq: 220, end: 70, dur: .3, type: 'sawtooth', gain: .18 }); },
    tiger() { [660, 880, 1100].forEach((f, i) => this.tone({ freq: f, dur: .14, type: 'triangle', gain: .14, when: i * .09 })); },
    win() { [523, 659, 784, 1047].forEach((f, i) => this.tone({ freq: f, dur: .22, type: 'triangle', gain: .15, when: i * .11 })); },
    lose() { [330, 262, 196].forEach((f, i) => this.tone({ freq: f, dur: .3, type: 'triangle', gain: .13, when: i * .16 })); },
  },
};
document.addEventListener('pointerdown', () => Sound.ensure(), { once: true });

/* ---------- 状态 ---------- */
const state = {
  count: 4,
  players: [],        // [{name, isAI, cards, status, result}] status: playing|stand|bust|bj|tiger
  dealerIdx: 0,
  deck: [],
  turn: -1,           // 当前行动座位（-1 庄家未开始）
  phase: 'setup',
  reveal: null,       // 亮牌座位：null=全场暗牌；数字=该座位亮牌；'all'=摊牌
  humanCount: 1,      // 真人数量（≥2 时启用“传递设备”确认层）
  session: 0,         // 会话号，退出时 +1 使异步链失效
  scores: [],         // 每人累计赢局
  chips: [],          // 每人筹码（初始 1000）
  bets: [],           // 本局底注
  finalWinner: null,  // 最终获胜者座位（只剩一人有筹码时）
  resolveHuman: null,
};

/* ---------- 牌与点数 ---------- */
const SUITS = [
  { s: '♠', red: false }, { s: '♥', red: true },
  { s: '♣', red: false }, { s: '♦', red: true },
];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
function newDeck() {
  const d = [];
  for (const su of SUITS) for (const r of RANKS) d.push({ rank: r, suit: su.s, red: su.red });
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}
function cardPoints(c) { if (c.rank === 'A') return 11; if (['J', 'Q', 'K'].includes(c.rank)) return 10; return Number(c.rank); }
function handValue(cards) {
  let total = 0, aces = 0;
  for (const c of cards) { total += cardPoints(c); if (c.rank === 'A') aces++; }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}
function cardText(c) { return `${c.rank}${c.suit}`; }

/* ---------- 设置屏 ---------- */
function renderPlayerRows() {
  const wrap = $('#player-rows');
  wrap.innerHTML = '';
  for (let i = 0; i < state.count; i++) {
    const row = document.createElement('div');
    row.className = 'prow';
    row.innerHTML = `
      <span class="pnum">P${i + 1}</span>
      <input class="pname" type="text" maxlength="8" placeholder="玩家 ${i + 1}" value="玩家 ${i + 1}">
      <label class="ai-toggle"><input type="checkbox" class="pai" ${i > 0 ? 'checked' : ''}> 🤖 电脑</label>`;
    if (i > 0) row.querySelector('.pname').value = `电脑 ${i + 1}`;
    wrap.appendChild(row);
  }
  wrap.querySelectorAll('.prow').forEach((row, i) => {
    const cb = row.querySelector('.pai'), name = row.querySelector('.pname');
    cb.addEventListener('change', () => {
      if ([`电脑 ${i + 1}`, `玩家 ${i + 1}`, ''].includes(name.value.trim())) {
        name.value = cb.checked ? `电脑 ${i + 1}` : `玩家 ${i + 1}`;
      }
      syncSeatTip();
    });
    name.addEventListener('change', syncSeatTip);
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
$('#btn-start').addEventListener('click', () => {
  Sound.play('click');
  const ps = readPlayers();
  state.players = ps.map(p => ({ ...p, cards: [], status: 'waiting', result: null }));
  state.scores = ps.map(() => 0);
  state.chips = ps.map(() => 1000); // 每人 1000 筹码
  state.bets = ps.map(() => 0);
  state.finalWinner = null;
  state.session++;
  rollDice();
});

/* ---------- 下注阶段 ---------- */
function betPhase() {
  // 只剩一位玩家有筹码 → 直接最终获胜，不再下注
  const aliveIdx = state.players.map((p, i) => state.chips[i] >= 10 ? i : -1).filter(i => i >= 0);
  if (aliveIdx.length <= 1 && state.players.length > 1) {
    showFinalWin(aliveIdx[0] ?? -1);
    return;
  }
  // 保留真人已填的注额（重渲染时不丢失）
  document.querySelectorAll('#bet-rows input[data-bet-input]').forEach(input => {
    const i = Number(input.dataset.betInput);
    state.bets[i] = Math.max(10, Math.min(state.chips[i], Math.floor(Number(input.value) || 10)));
  });
  state.players.forEach((p, i) => {
    p.cards = [];
    p.status = state.chips[i] < 10 ? 'out' : 'waiting';
    p.result = null;
    if (!state.bets[i]) state.bets[i] = 0;
  });
  // 庄家破产则顺延给下一位有筹码的玩家
  if (state.players[state.dealerIdx].status === 'out') {
    for (let k = 1; k <= state.players.length; k++) {
      const j = (state.dealerIdx + k) % state.players.length;
      if (state.players[j].status !== 'out') { state.dealerIdx = j; break; }
    }
  }
  const dealer = state.players[state.dealerIdx];
  $('#bet-round-info').innerHTML = `本局庄家：<b>${dealer.name}</b> · 庄家不下注，闲家下注后开局`;
  const rows = $('#bet-rows');
  rows.innerHTML = '';
  state.players.forEach((p, i) => {
    const row = document.createElement('div');
    row.className = 'bet-row' + (i === state.dealerIdx ? ' dealer-row' : '') + (p.status === 'out' ? ' broke' : '');
    const isDealer = i === state.dealerIdx;
    if (p.status === 'out') {
      row.innerHTML = `<span class="bname">${p.name}</span><span class="bchips">筹码 <b>${state.chips[i]}</b></span><span class="bet-broke-tag">筹码不足，本局旁观</span>`;
    } else if (isDealer) {
      row.innerHTML = `<span class="bname">${p.name}</span><span class="bchips">筹码 <b>${state.chips[i]}</b></span><span class="bet-auto">🎲 庄家（不下注）</span>`;
    } else if (p.isAI) {
      if (!state.bets[i]) state.bets[i] = Math.min(100, state.chips[i]);
      row.innerHTML = `<span class="bname">${p.name}</span><span class="bchips">筹码 <b>${state.chips[i]}</b></span><span class="bet-auto">🤖 自动下注 <b>${state.bets[i]}</b></span>`;
    } else {
      const def = Math.max(10, Math.min(state.chips[i], state.bets[i] || Math.min(100, state.chips[i])));
      state.bets[i] = def;
      row.innerHTML = `
        <span class="bname">${p.name}</span>
        <span class="bchips">筹码 <b>${state.chips[i]}</b></span>
        <span class="bet-quick">
          ${[50, 100, 200].filter(v => v <= state.chips[i]).map(v => `<button data-bet="${v}" class="${v === def ? 'active' : ''}">${v}</button>`).join('')}
          ${state.chips[i] > 200 ? `<button data-bet="${state.chips[i]}" class="${def === state.chips[i] ? 'active' : ''}">梭哈 ${state.chips[i]}</button>` : ''}
        </span>
        <input type="number" min="10" max="${state.chips[i]}" value="${def}" data-bet-input="${i}" aria-label="${p.name} 下注额">`;
    }
    rows.appendChild(row);
  });
  // 快捷按钮与输入联动
  rows.querySelectorAll('.bet-quick button').forEach(btn => {
    btn.addEventListener('click', () => {
      Sound.play('click');
      const v = Number(btn.dataset.bet);
      const input = btn.closest('.bet-row').querySelector('input[data-bet-input]');
      if (input) input.value = v;
      btn.closest('.bet-quick').querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
    });
  });
  rows.querySelectorAll('input[data-bet-input]').forEach(input => {
    input.addEventListener('change', () => {
      const i = Number(input.dataset.betInput);
      const v = Math.floor(Number(input.value) || 0);
      input.value = Math.max(10, Math.min(state.chips[i], v));
    });
  });
  // 加入区状态（最多 5 座）
  const full = state.players.length >= 5;
  $('#btn-join').disabled = full;
  $('#join-name').disabled = full;
  $('#join-ai').disabled = full;
  $('#join-name').placeholder = full ? '座位已满（5/5）' : '新玩家名字';
  showScreen('bet');
}

/* 中途加入新玩家（开牌前的报名） */
$('#btn-join').addEventListener('click', () => {
  if (state.players.length >= 5) return;
  Sound.play('click');
  const isAI = $('#join-ai').checked;
  let name = $('#join-name').value.trim();
  if (!name) name = isAI ? `电脑 ${state.players.length + 1}` : `玩家 ${state.players.length + 1}`;
  // 与现有名字去重
  if (state.players.some(p => p.name === name)) name += '·新';
  state.players.push({ name, isAI, cards: [], status: 'waiting', result: null });
  state.scores.push(0);
  state.chips.push(1000);   // 新玩家自带 1000 筹码
  state.bets.push(0);
  $('#join-name').value = '';
  $('#join-ai').checked = false;
  betPhase(); // 重渲染（真人注额已保留）
});

$('#btn-deal').addEventListener('click', () => {
  // 收集真人下注
  document.querySelectorAll('#bet-rows input[data-bet-input]').forEach(input => {
    const i = Number(input.dataset.betInput);
    state.bets[i] = Math.max(10, Math.min(state.chips[i], Math.floor(Number(input.value) || 10)));
  });
  // 只剩一人有筹码 → 直接最终获胜
  const alive = state.players.map((p, i) => state.chips[i] >= 10 ? i : -1).filter(i => i >= 0);
  if (alive.length <= 1 && state.players.length > 1) {
    showFinalWin(alive[0] ?? -1);
    return;
  }
  const activeCount = state.players.filter((p, i) => p.status !== 'out' && i !== state.dealerIdx).length;
  const warn = $('#bet-warn');
  if (activeCount < 1) {
    warn.hidden = false;
    warn.textContent = '庄家以外已无人有筹码，请点击下方“重置筹码”后再战';
    Sound.play('bust');
    return;
  }
  warn.hidden = true;
  Sound.play('click');
  startRound();
});

function resetChips() {
  state.chips = state.players.map(() => 1000);
  state.finalWinner = null;
  Sound.play('click');
  $('#bet-warn').hidden = true;
  if (screens.result.classList.contains('active')) {
    renderScoreboard();
  }
}
function renderScoreboard() {
  $('#scoreboard').innerHTML = '筹码：' + state.players
    .map((p, i) => `${p.name} <b>${state.chips[i]}</b>`).join(' · ')
    + '<br>胜场：' + state.players.map((p, i) => `${p.name} ${state.scores[i]}`).join(' · ');
}
$('#btn-reset-chips').addEventListener('click', resetChips);
$('#btn-reset-chips2').addEventListener('click', () => {
  resetChips();
  betPhase();
});

/* 最终胜利：只剩一人有筹码 */
function showFinalWin(idx) {
  state.finalWinner = idx;
  const w = idx >= 0 ? state.players[idx] : null;
  Sound.play('win');
  $('#final-banner').hidden = false;
  $('#result-title').textContent = w ? `${w.name} 赢得了全部筹码！` : '筹码耗尽';
  $('#result-table').innerHTML = `<p class="final-winner">${w ? `其他玩家的筹码都已输光，本桌牌局由 <b style="color:var(--gold-bright)">${w.name}</b> 独揽 🏆` : '所有人都没筹码了'}</p>`;
  renderScoreboard();
  $('#btn-next').textContent = '💰 再战一场（重置筹码）';
  setActions(false);
  showScreen('result');
}

/* ---------- 掷骰定庄 ---------- */
async function rollDice() {
  const mySession = state.session;
  showScreen('dice');
  const die = $('#die'), face = $('#die-face');
  $('#dice-result').textContent = '骰子转动中…';
  $('#dice-sub').innerHTML = `从 <b>P1</b> 开始数`;
  die.classList.add('rolling');
  Sound.play('dice');
  const value = 1 + Math.floor(Math.random() * 6);
  for (let i = 0; i < 16; i++) {
    face.dataset.v = 1 + Math.floor(Math.random() * 6);
    await sleep(85);
    if (state.session !== mySession) return;
  }
  die.classList.remove('rolling');
  face.dataset.v = value;
  state.dealerIdx = (value - 1) % state.players.length;
  const dealer = state.players[state.dealerIdx];
  $('#dice-result').textContent = `🎲 ${value} 点`;
  $('#dice-sub').innerHTML = `从 P1 数起第 ${value} 位 → 本局庄家：<b>${dealer.name}</b>`;
  log(`骰子 ${value} 点 → 庄家：${dealer.name}`);
  await sleep(1500);
  if (state.session !== mySession) return;
  betPhase();
}

/* ---------- 牌局 ---------- */
function startRound() {
  state.deck = newDeck();
  state.players.forEach(p => { if (p.status !== 'out') { p.cards = []; p.status = 'waiting'; p.result = null; } });
  state.turn = -1;
  state.reveal = null;
  state.humanCount = state.players.filter(p => !p.isAI && p.status !== 'out').length;
  state.phase = 'deal';
  $('#log-list').innerHTML = '';
  $('#dealer-cards').innerHTML = '';
  $('#dealer-total').textContent = '—';
  $('#table-msg').textContent = '';
  $('#privacy-gate').hidden = true;
  showScreen('table');
  renderSeats();
  $('#dealer-name').textContent = state.players[state.dealerIdx].name;
  log(`底注：` + state.players.map((p, i) => i === state.dealerIdx || p.status === 'out' ? null : `${p.name} ${state.bets[i]}`).filter(Boolean).join(' · '));
  dealPhase();
}

async function dealPhase() {
  const mySession = state.session;
  msg(`逐张发牌…（所有手牌背面朝上，只有自己能看自己的牌）`);
  // 两轮，每轮从庄家座位开始一人一张（旁观者除外）
  for (let round = 0; round < 2; round++) {
    for (let i = 0; i < state.players.length; i++) {
      const idx = (state.dealerIdx + i) % state.players.length;
      const p = state.players[idx];
      if (p.status === 'out') continue;
      p.cards.push(state.deck.pop());
      Sound.play('card');
      renderSeats();
      await sleep(320);
      if (state.session !== mySession) return;
    }
  }
  // Blackjack 检查（本人自行宣布，牌面仍保密）
  for (const p of state.players) {
    if (handValue(p.cards) === 21) {
      p.status = 'bj';
      log(`${p.name} 宣布 <b>Blackjack！</b>`, 'good');
    }
  }
  renderSeats();
  state.phase = 'play';
  await sleep(500);
  if (state.session !== mySession) return;
  // 从庄家下家开始行动（庄家最后）
  state.turn = state.dealerIdx;
  advanceTurn();
}

function advanceTurn() {
  // 找下一个需要行动的座位：庄家以外的玩家全部行动完 → 庄家
  let idx = (state.turn + 1) % state.players.length;
  let guard = 0;
  while (guard++ <= state.players.length * 2) {
    const p = state.players[idx];
    const isDealer = idx === state.dealerIdx;
    const needAction = !isDealer && p.status === 'waiting';
    if (needAction) { state.turn = idx; playTurn(); return; }
    if (isDealer && state.players.filter((q, j) => j !== state.dealerIdx && q.status === 'waiting').length === 0) {
      state.turn = idx; dealerTurn(); return;
    }
    idx = (idx + 1) % state.players.length;
  }
  settle();
}

/* 传递设备确认层：多个真人时防止别人偷看 */
function showGate(name, mySession) {
  return new Promise(resolve => {
    const gate = $('#privacy-gate');
    $('#gate-name').textContent = name;
    gate.hidden = false;
    setActions(false);
    const btn = $('#gate-btn');
    const onGo = () => {
      gate.hidden = true;
      btn.removeEventListener('click', onGo);
      resolve(state.session === mySession);
    };
    btn.addEventListener('click', onGo);
    btn.focus();
  });
}

async function playTurn() {
  const mySession = state.session;
  const p = state.players[state.turn];
  if (p.status !== 'waiting') { advanceTurn(); return; }
  renderSeats();
  if (p.isAI) {
    msg(`🤖 ${p.name} 拿着暗牌思考中…`);
    await sleep(750 + Math.random() * 500);
    if (state.session !== mySession) return;
    // 策略：17 点起停；第四张 ≤14 时可追小老虎
    const v = handValue(p.cards);
    const want = v < 17 || (p.cards.length === 4 && v <= 14);
    decide(want ? 'hit' : 'stand');
  } else {
    if (state.humanCount > 1) {
      const go = await showGate(p.name, mySession);
      if (!go) return;
    }
    state.reveal = state.turn; // 只有轮到的本人能看到自己的牌
    renderSeats();
    msg(`轮到 ${p.name}：要牌还是停牌？（只有你能看到自己的牌）`);
    setActions(true);
    $('#btn-hit').focus();
  }
}

function setActions(enabled) {
  $('#btn-hit').disabled = !enabled;
  $('#btn-stand').disabled = !enabled;
}

function endTurnOf(p, delay) {
  // 回合结束：真人的牌重新扣回背面，再轮转
  setTimeout(() => {
    if (!p.isAI && state.turn !== state.dealerIdx) state.reveal = null;
    advanceTurn();
  }, delay);
}

function decide(action) {
  const p = state.players[state.turn];
  if (!p || p.status !== 'waiting') return;
  const isDealer = state.turn === state.dealerIdx;
  setActions(false);
  if (action === 'hit') {
    const c = state.deck.pop();
    p.cards.push(c);
    Sound.play('card');
    const v = handValue(p.cards);
    renderSeats();
    if (v > 21) {
      p.status = 'bust';
      Sound.play('bust');
      msg(`${p.name} 要牌后爆牌出局！`);
      log(`${p.name} 要牌后<b>爆牌出局</b>`, 'warn');
      renderSeats();
      isDealer ? setTimeout(settle, 1000) : endTurnOf(p, 900);
      return;
    }
    if (v === 21) {
      p.status = 'stand';
      msg(`${p.name} 正好 21 点，自动停牌！`);
      log(`${p.name} 正好 21 点停牌`, 'good');
      renderSeats();
      isDealer ? setTimeout(settle, 900) : endTurnOf(p, 800);
      return;
    }
    if (p.cards.length >= 5) {
      // 五张封顶：≤18 为小老虎
      if (v <= 18) {
        p.status = 'tiger';
        Sound.play('tiger');
        msg(`${p.name} 凑满五张 · 小老虎🐯！`);
        log(`${p.name} 凑满五张 → <b>小老虎！</b>`, 'tiger');
      } else {
        p.status = 'stand';
        msg(`${p.name} 五张封顶停牌`);
        log(`${p.name} 五张封顶停牌`);
      }
      renderSeats();
      isDealer ? setTimeout(settle, 1100) : endTurnOf(p, 1000);
      return;
    }
    msg(`${p.name} 要了一张牌…`);
    log(`${p.name} 要牌`);
    playTurn(); // 继续本座位（真人仍是亮牌状态）
  } else {
    p.status = 'stand';
    msg(`${p.name} 选择停牌`);
    log(`${p.name} 停牌`);
    renderSeats();
    isDealer ? setTimeout(settle, 700) : endTurnOf(p, 500);
  }
}

$('#btn-hit').addEventListener('click', () => decide('hit'));
$('#btn-stand').addEventListener('click', () => decide('stand'));

/* ---------- 庄家行动 ---------- */
async function dealerTurn() {
  const mySession = state.session;
  const d = state.players[state.dealerIdx];
  // 庄家亮牌行动（公开摊牌环节）
  state.reveal = state.dealerIdx;
  renderSeats();
  Sound.play('card');
  msg(`庄家 ${d.name} 亮牌：${d.cards.map(cardText).join(' ')}（${handValue(d.cards)} 点）`);
  log(`庄家 ${d.name} 亮牌：${d.cards.map(cardText).join(' ')}（${handValue(d.cards)} 点）`);
  await sleep(1000);
  if (state.session !== mySession) return;

  if (d.status === 'bj') {
    msg(`庄家 Blackjack！其余玩家按牌型结算。`);
    setTimeout(settle, 900);
    return;
  }

  // 真人庄家：手动决定要牌/停牌
  if (!d.isAI) {
    if (state.humanCount > 1) {
      const go = await showGate(`${d.name}（庄家）`, mySession);
      if (!go) return;
      state.reveal = state.dealerIdx;
      renderSeats();
    }
    msg(`你是庄家 ${d.name}：手动决定要牌还是停牌！`);
    setActions(true);
    $('#btn-hit').focus();
    return;
  }

  // 电脑庄家策略：17 点起停，五张封顶
  while (true) {
    const v = handValue(d.cards);
    if (v > 21) {
      d.status = 'bust';
      Sound.play('bust');
      msg(`庄家爆牌（${v} 点）！`);
      log(`庄家 <b>爆牌（${v} 点）</b>`, 'warn');
      break;
    }
    if (d.cards.length >= 5) {
      if (v <= 18) {
        d.status = 'tiger';
        Sound.play('tiger');
        msg(`庄家五张 ${v} 点 · 小老虎🐯！`);
        log(`庄家五张 ${v} 点 → <b>小老虎</b>`, 'tiger');
      } else {
        d.status = 'stand';
        msg(`庄家五张封顶（${v} 点）`);
        log(`庄家五张封顶（${v} 点）`);
      }
      break;
    }
    if (v >= 17) {
      d.status = 'stand';
      msg(`庄家停牌（${v} 点）`);
      log(`庄家停牌（${v} 点）`);
      break;
    }
    const c = state.deck.pop();
    d.cards.push(c);
    Sound.play('card');
    msg(`庄家要牌 → ${cardText(c)}（${handValue(d.cards)} 点）`);
    log(`庄家要牌 ${cardText(c)} → ${handValue(d.cards)} 点`);
    renderSeats();
    await sleep(850);
    if (state.session !== mySession) return;
  }
  renderSeats();
  await sleep(700);
  if (state.session !== mySession) return;
  settle();
}

/* ---------- 结算 ---------- */
function rankOf(p) {
  const v = handValue(p.cards);
  if (p.status === 'bust') return { tier: 0, v };
  if (p.status === 'tiger') return { tier: 3, v: 18 }; // 小老虎统一档
  if (p.status === 'bj') return { tier: 2, v: 21 };
  return { tier: 1, v };
}
function settle() {
  state.reveal = 'all'; // 结算摊牌：所有手牌翻开
  renderSeats();
  const d = state.players[state.dealerIdx];
  const dr = rankOf(d);
  const rows = [];
  let dealerDelta = 0;
  state.players.forEach((p, i) => {
    if (i === state.dealerIdx || p.status === 'out') return;
    const pr = rankOf(p);
    let verdict, label;
    if (p.status === 'bust') { verdict = 'lose'; label = '爆牌'; }
    else if (d.status === 'bust') { verdict = 'win'; label = '庄家爆牌'; }
    else if (pr.tier > dr.tier) { verdict = 'win'; label = p.status === 'tiger' ? '小老虎' : (p.status === 'bj' ? 'Blackjack' : '点数获胜'); }
    else if (pr.tier < dr.tier) { verdict = 'lose'; label = d.status === 'tiger' ? '庄家小老虎' : (d.status === 'bj' ? '庄家 Blackjack' : '牌型不敌'); }
    else if (pr.v > dr.v) { verdict = 'win'; label = '点数获胜'; }
    else if (pr.v < dr.v) { verdict = 'lose'; label = '点数不敌'; }
    else if (p.status === 'tiger' && d.status === 'tiger') { verdict = 'lose'; label = '同为小老虎，庄家胜'; }
    else { verdict = 'push'; label = '平局'; }
    // 筹码结算：普通胜 ×1，Blackjack ×1.5，小老虎 ×2，输 -底注
    const bet = state.bets[i] || 0;
    let delta = 0;
    if (verdict === 'lose') delta = -bet;
    else if (verdict === 'win') {
      const mult = p.status === 'tiger' ? 2 : p.status === 'bj' ? 1.5 : 1;
      delta = Math.round(bet * mult);
    }
    state.chips[i] += delta;
    dealerDelta -= delta;
    p.result = { verdict, label, delta, bet };
    if (verdict === 'win') state.scores[i]++;
    rows.push({ p, verdict, label, delta, bet });
  });
  state.chips[state.dealerIdx] += dealerDelta;
  d.result = { delta: dealerDelta };

  $('#result-table').innerHTML = rows.map(({ p, verdict, label, delta, bet }) => {
    const dcls = delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat';
    const dtxt = delta > 0 ? `+${delta}` : String(delta);
    return `
    <div class="rrow">
      <span class="who">${p.name}</span>
      <span class="detail">${p.cards.map(cardText).join(' ')} · ${handValue(p.cards)} 点${p.status === 'bj' ? ' · Blackjack' : ''}${p.status === 'tiger' ? ' · 小老虎' : ''}${p.status === 'bust' ? ' · 爆牌' : ''} · 底注 ${bet}</span>
      <span class="verdict ${verdict}">${verdict === 'win' ? '赢' : verdict === 'lose' ? '输' : '平'}<span class="delta ${dcls}">${dtxt}</span></span>
    </div>`;
  }).join('') + `
    <div class="rrow dealer-row">
      <span class="who">${d.name}（庄）</span>
      <span class="detail">${d.cards.map(cardText).join(' ')} · ${handValue(d.cards)} 点${d.status === 'bj' ? ' · Blackjack' : ''}${d.status === 'tiger' ? ' · 小老虎' : ''}${d.status === 'bust' ? ' · 爆牌' : ''}</span>
      <span class="verdict push">庄<span class="delta ${dealerDelta > 0 ? 'up' : dealerDelta < 0 ? 'down' : 'flat'}">${dealerDelta > 0 ? '+' + dealerDelta : dealerDelta}</span></span>
    </div>`;
  renderScoreboard();
  // 最终胜利判定：只剩一人有筹码 → 直接夺冠
  const aliveAfter = state.players.map((p, i) => state.chips[i] >= 10 ? i : -1).filter(i => i >= 0);
  if (aliveAfter.length <= 1) {
    state.finalWinner = aliveAfter[0] ?? -1;
    $('#final-banner').hidden = false;
    $('#result-title').textContent = aliveAfter.length === 1
      ? `${state.players[aliveAfter[0]].name} 赢得了全部筹码！` : '筹码耗尽';
    $('#btn-next').textContent = '💰 再战一场（重置筹码）';
    Sound.play('win');
  } else {
    $('#final-banner').hidden = true;
    $('#result-title').textContent = '本局结算';
    $('#btn-next').textContent = '🎲 下一局（重新掷骰）';
  }
  const humanWon = rows.some(r => r.verdict === 'win' && !r.p.isAI);
  const humanLost = rows.some(r => r.p.isAI === false && r.verdict === 'lose');
  if (aliveAfter.length > 1) {
    if (humanWon) Sound.play('win');
    else if (humanLost) Sound.play('lose');
  }
  log(`本局结算完成`);
  setActions(false);
  showScreen('result');
}

$('#btn-next').addEventListener('click', () => {
  Sound.play('click');
  state.session++;
  $('#privacy-gate').hidden = true;
  if (state.finalWinner !== null) resetChips(); // 有人独揽筹码：重置后开新一场
  rollDice();
});
$('#btn-setup2').addEventListener('click', () => {
  Sound.play('click');
  state.session++;
  state.scores = [];
  $('#privacy-gate').hidden = true;
  showScreen('setup');
});
$('#btn-quit').addEventListener('click', () => {
  Sound.play('click');
  state.session++;
  state.scores = [];
  $('#privacy-gate').hidden = true;
  showScreen('setup');
});

/* ---------- 渲染 ---------- */
function cardEl(c, hidden) {
  const el = document.createElement('div');
  if (hidden) {
    el.className = 'card back';
    el.innerHTML = `<span class="rank"></span><span class="suit-big"></span>`;
    return el;
  }
  el.className = 'card ' + (c.red ? 'red' : 'black');
  el.innerHTML = `<span class="rank">${c.rank}<span class="suit-sm">${c.suit}</span></span><span class="suit-big">${c.suit}</span>`;
  return el;
}
function statusBadge(p) {
  if (p.status === 'bust') return `<span class="badge bust">爆牌</span>`;
  if (p.status === 'bj') return `<span class="badge bj">Blackjack!</span>`;
  if (p.status === 'tiger') return `<span class="badge tiger">🐯 小老虎</span>`;
  if (p.status === 'stand') return `<span class="badge stand">停牌</span>`;
  return '';
}
function renderSeats(highlight = true) {
  const isRevealed = i => state.reveal === 'all' || state.reveal === i;
  // 庄家
  const d = state.players[state.dealerIdx];
  const dWrap = $('#dealer-cards');
  dWrap.innerHTML = '';
  d.cards.forEach(c => dWrap.appendChild(cardEl(c, !isRevealed(state.dealerIdx))));
  $('#dealer-total').textContent = d.cards.length
    ? (isRevealed(state.dealerIdx)
        ? `${handValue(d.cards)} 点${d.status === 'bj' ? ' · Blackjack' : ''}${d.status === 'tiger' ? ' · 小老虎' : ''}${d.status === 'bust' ? ' · 爆牌' : ''}`
        : `${d.cards.length} 张暗牌`)
    : '—';
  // 座位
  const zone = $('#players-zone');
  zone.innerHTML = '';
  state.players.forEach((p, i) => {
    const seat = document.createElement('div');
    seat.className = 'seat'
      + (i === state.dealerIdx ? ' dealer-seat' : '')
      + (highlight && state.turn === i && p.status === 'waiting' ? ' active' : '');
    seat.innerHTML = `<div class="seat-name">${p.name} <span class="tag">${p.isAI ? '🤖' : '🧑'}${i === state.dealerIdx ? ' · 庄' : ''}</span></div>`;
    const cardsHtml = document.createElement('div');
    cardsHtml.className = 'cards';
    p.cards.forEach(c => cardsHtml.appendChild(cardEl(c, !isRevealed(i))));
    seat.appendChild(cardsHtml);
    const total = document.createElement('div');
    total.className = 'seat-total';
    total.textContent = isRevealed(i) && p.cards.length ? `${handValue(p.cards)} 点` : (p.cards.length ? '🔒' : '');
    seat.appendChild(total);
    seat.insertAdjacentHTML('beforeend', statusBadge(p));
    // 筹码行
    if (p.status === 'out') {
      seat.insertAdjacentHTML('beforeend', `<div class="chip-line" style="color:#ff9c8a">筹码不足</div>`);
    } else {
      seat.insertAdjacentHTML('beforeend', `<div class="chip-line">💰<b>${state.chips[i]}</b>${i !== state.dealerIdx && state.bets[i] ? ` · 注 ${state.bets[i]}` : ''}</div>`);
    }
    zone.appendChild(seat);
  });
  const cur = state.players[state.turn];
  $('#turn-chip').innerHTML = cur
    ? `当前行动：<b>${cur.name}</b>${cur.isAI ? '（电脑）' : '（真人）'}`
    : '发牌中…';
}
function msg(text) {
  const el = $('#table-msg');
  el.textContent = text;
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}
function log(html, cls = '') {
  const li = document.createElement('li');
  li.className = cls;
  li.innerHTML = html;
  $('#log-list').prepend(li);
}

/* ---------- 音效开关 ---------- */
const soundBtn = $('#sound-toggle');
function syncSoundBtn() {
  soundBtn.textContent = Sound.enabled ? '🔊 音效' : '🔇 静音';
  soundBtn.setAttribute('aria-pressed', String(Sound.enabled));
}
soundBtn.addEventListener('click', () => {
  Sound.enabled = !Sound.enabled;
  localStorage.setItem('bj_sound', Sound.enabled ? 'on' : 'off');
  if (Sound.enabled) { Sound.ensure(); Sound.play('click'); }
  syncSoundBtn();
});
syncSoundBtn();
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'm' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) soundBtn.click();
  if (e.key === 'h' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !$('#btn-hit').disabled) decide('hit');
  if (e.key === 's' && !['INPUT', 'TEXTAREA'].includes(e.target.tagName) && !$('#btn-stand').disabled) decide('stand');
});

/* ---------- 初始化 ---------- */
renderPlayerRows();
