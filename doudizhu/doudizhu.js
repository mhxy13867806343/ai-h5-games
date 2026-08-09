/* 斗地主经典版 — 1:1 复刻版
 * HTML5 Canvas · 395×700
 * 三人对战：1 地主 + 2 农民
 */
(() => {
  'use strict';

  // ====== 常量 ======
  const W = 395, H = 700;
  const CARD_W = 50, CARD_H = 70;          // 单张牌尺寸
  const HAND_GAP_X = 18;                   // 手牌横向间距
  const HAND_GAP_Y = 6;                    // 选中时抬起高度
  const TABLE_PADDING = 14;                // 桌面内边距

  // 牌面：3-10, J, Q, K, A, 2, 小王, 大王
  // value: 3..17
  const SUIT_NAMES = ['♠','♥','♣','♦'];
  const SUIT_COLORS = { 0: '#1a1a1a', 1: '#d12d2d', 2: '#1a1a1a', 3: '#d12d2d' };
  // value → 显示文本（A/2 用字母，其余用数字）
  const RANK_NAMES = {
    3:'3', 4:'4', 5:'5', 6:'6', 7:'7', 8:'8', 9:'9', 10:'10',
    11:'J', 12:'Q', 13:'K', 14:'A', 15:'2',
  };
  function rankName(v) {
    if (v === 16) return '小王';
    if (v === 17) return '大王';
    return RANK_NAMES[v] || String(v);
  }

  // 牌型常量
  const TYPE = {
    INVALID: 0,
    SINGLE: 1, PAIR: 2, TRIPLE: 3,
    TRIPLE_SINGLE: 4, TRIPLE_PAIR: 5,
    STRAIGHT: 6, CONSEC_PAIR: 7,
    AIRPLANE: 8, AIRPLANE_SINGLE: 9, AIRPLANE_PAIR: 10,
    FOUR_TWO_SINGLE: 11, FOUR_TWO_PAIR: 12,
    BOMB: 13, ROCKET: 14,
  };

  // ====== 工具 ======
  const rnd = (a, b) => a + Math.random() * (b - a);
  const choice = arr => arr[Math.floor(Math.random() * arr.length)];
  const TAU = Math.PI * 2;

  // ====== 牌组 ======
  function buildDeck() {
    const deck = [];
    let id = 0;
    // 52 张普通牌：value 3-15, suit 0-3
    for (let v = 3; v <= 15; v++) {
      for (let s = 0; s < 4; s++) {
        deck.push({ value: v, suit: s, id: id++ });
      }
    }
    // 大小王：value 16, 17, suit -1
    deck.push({ value: 16, suit: -1, id: id++ });
    deck.push({ value: 17, suit: -1, id: id++ });
    return deck;
  }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ====== 牌型解析 ======
  // 输入: 一组牌（至少 1 张）
  // 返回: { type, main, length, extra } 或 null
  // main: 主要比较值（顺子/连对/飞机是首张值，炸弹/三张/对子/单张是该值）
  function parseCards(cards) {
    if (!cards || !cards.length) return null;
    // 按 value 分组
    const groups = new Map();
    let hasJoker = false;
    for (const c of cards) {
      if (c.value >= 16) hasJoker = true;
      const k = c.value;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(c);
    }
    const values = Array.from(groups.keys()).sort((a, b) => a - b);
    const counts = values.map(v => groups.get(v).length);
    const n = cards.length;

    // 王炸
    if (n === 2 && hasJoker && groups.size === 2 && values[0] === 16 && values[1] === 17) {
      return { type: TYPE.ROCKET, main: 17, length: 2, extra: 0 };
    }

    // 炸弹
    if (n === 4 && groups.size === 1) {
      return { type: TYPE.BOMB, main: values[0], length: 4, extra: 0 };
    }

    // 简化：只处理常见牌型
    // 1 张
    if (n === 1) return { type: TYPE.SINGLE, main: values[0], length: 1, extra: 0 };
    // 2 张：对子
    if (n === 2 && groups.size === 1) return { type: TYPE.PAIR, main: values[0], length: 2, extra: 0 };
    // 3 张
    if (n === 3 && groups.size === 1) return { type: TYPE.TRIPLE, main: values[0], length: 3, extra: 0 };
    // 3+1
    if (n === 4 && counts.filter(c => c === 3).length === 1 && counts.filter(c => c === 1).length === 1) {
      const main = values[counts.indexOf(3)];
      return { type: TYPE.TRIPLE_SINGLE, main, length: 4, extra: 1 };
    }
    // 3+2
    if (n === 5 && counts.filter(c => c === 3).length === 1 && counts.filter(c => c === 2).length === 1) {
      const main = values[counts.indexOf(3)];
      return { type: TYPE.TRIPLE_PAIR, main, length: 5, extra: 2 };
    }
    // 顺子：5+ 张连续单牌（不含 2 和王）
    if (n >= 5 && groups.size === n && !hasJoker && values[values.length - 1] < 15) {
      let ok = true;
      for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i - 1] + 1) { ok = false; break; }
      }
      if (ok) return { type: TYPE.STRAIGHT, main: values[0], length: n, extra: 0 };
    }
    // 连对：3+ 连续对子（不含 2 和王）
    if (n >= 6 && n % 2 === 0 && groups.size === n / 2 && counts.every(c => c === 2) && !hasJoker && values[values.length - 1] < 15) {
      let ok = true;
      for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i - 1] + 1) { ok = false; break; }
      }
      if (ok) return { type: TYPE.CONSEC_PAIR, main: values[0], length: n, extra: 0 };
    }
    // 飞机：2+ 连续三张
    if (n >= 6 && groups.size === n / 3 && counts.every(c => c === 3) && !hasJoker && values[values.length - 1] < 15) {
      let ok = true;
      for (let i = 1; i < values.length; i++) {
        if (values[i] !== values[i - 1] + 1) { ok = false; break; }
      }
      if (ok) return { type: TYPE.AIRPLANE, main: values[0], length: n, extra: 0 };
    }
    // 飞机带单：2 连续三张 + 2 单牌
    if (n === 8 && counts.filter(c => c === 3).length === 2 && counts.filter(c => c === 1).length === 2) {
      const tripleValues = values.filter((_, i) => counts[i] === 3);
      if (tripleValues[1] === tripleValues[0] + 1 && tripleValues[0] < 15) {
        return { type: TYPE.AIRPLANE_SINGLE, main: tripleValues[0], length: 8, extra: 2 };
      }
    }
    // 飞机带对：2 连续三张 + 2 对子
    if (n === 10 && counts.filter(c => c === 3).length === 2 && counts.filter(c => c === 2).length === 2) {
      const tripleValues = values.filter((_, i) => counts[i] === 3);
      if (tripleValues[1] === tripleValues[0] + 1 && tripleValues[0] < 15) {
        return { type: TYPE.AIRPLANE_PAIR, main: tripleValues[0], length: 10, extra: 4 };
      }
    }
    // 四带二单：4+2
    if (n === 6 && counts.filter(c => c === 4).length === 1 && counts.filter(c => c === 1).length === 2) {
      const main = values[counts.indexOf(4)];
      return { type: TYPE.FOUR_TWO_SINGLE, main, length: 6, extra: 2 };
    }
    // 四带二对：4+2+2
    if (n === 8 && counts.filter(c => c === 4).length === 1 && counts.filter(c => c === 2).length === 2) {
      const main = values[counts.indexOf(4)];
      return { type: TYPE.FOUR_TWO_PAIR, main, length: 8, extra: 4 };
    }
    return null;
  }

  // 比较两组牌：是否 new 能压过 cur
  function canBeat(cur, next) {
    if (!cur && next) return next.type !== TYPE.INVALID;
    if (!next) return false;
    if (next.type === TYPE.ROCKET) return true;
    if (cur.type === TYPE.ROCKET) return false;
    if (next.type === TYPE.BOMB) {
      if (cur.type === TYPE.BOMB) return next.main > cur.main;
      return true; // 炸弹压非炸弹
    }
    if (cur.type === TYPE.BOMB) return false;
    // 同类型比较
    if (cur.type !== next.type) return false;
    if (cur.length !== next.length) return false;
    return next.main > cur.main;
  }

  // ====== AI：选择最小可压制的牌 ======
  function aiPickHand(hand, current) {
    // 按 value 升序遍历，找最小可压
    const sorted = [...hand].sort((a, b) => a.value - b.value);
    if (!current) {
      // 出最小单张
      return [sorted[0]];
    }
    // 枚举所有可能的出牌组合（简化为同 size）
    const n = current.length;
    const candidates = [];
    // 单张
    if (n === 1) {
      for (const c of sorted) {
        if (canBeat(current, parseCards([c]))) candidates.push([c]);
      }
    }
    // 对子
    if (n === 2 && current.type === TYPE.PAIR) {
      const groups = groupBy(sorted);
      for (const v of Object.keys(groups).map(Number).sort((a, b) => a - b)) {
        if (groups[v].length >= 2 && canBeat(current, parseCards([groups[v][0], groups[v][1]]))) {
          candidates.push([groups[v][0], groups[v][1]]);
        }
      }
    }
    // 三张 / 三带一 / 三带二
    if ((current.type === TYPE.TRIPLE || current.type === TYPE.TRIPLE_SINGLE || current.type === TYPE.TRIPLE_PAIR) && n <= 5) {
      const groups = groupBy(sorted);
      for (const v of Object.keys(groups).map(Number).sort((a, b) => a - b)) {
        if (groups[v].length < 3) continue;
        const t = [groups[v][0], groups[v][1], groups[v][2]];
        if (n === 3) {
          if (canBeat(current, parseCards(t))) candidates.push(t);
        } else if (n === 4) {
          // 三带一：需 1 个额外
          const extras = sorted.filter(c => c.value !== v);
          if (extras.length) candidates.push([...t, extras[0]]);
        } else if (n === 5) {
          // 三带二：需 1 对额外
          const ex = sorted.filter(c => c.value !== v);
          const exg = groupBy(ex);
          for (const v2 of Object.keys(exg).map(Number).sort((a, b) => a - b)) {
            if (exg[v2].length >= 2) candidates.push([...t, exg[v2][0], exg[v2][1]]);
          }
        }
      }
    }
    // 顺子
    if (current.type === TYPE.STRAIGHT) {
      const need = n;
      const seq = findStraight(sorted, need);
      if (seq && canBeat(current, parseCards(seq))) candidates.push(seq);
    }
    // 连对
    if (current.type === TYPE.CONSEC_PAIR) {
      const need = n / 2;
      const seq = findConsecPair(sorted, need);
      if (seq && canBeat(current, parseCards(seq))) candidates.push(seq);
    }
    // 炸弹
    const groups = groupBy(sorted);
    for (const v of Object.keys(groups).map(Number).sort((a, b) => a - b)) {
      if (groups[v].length === 4 && canBeat(current, parseCards(groups[v].slice(0, 4)))) {
        candidates.push(groups[v].slice(0, 4));
      }
    }
    // 王炸
    const hasJoker = sorted.filter(c => c.value >= 16);
    if (hasJoker.length === 2 && canBeat(current, parseCards(hasJoker))) {
      candidates.push(hasJoker);
    }
    if (candidates.length === 0) return null; // 要不起
    // 选 main 最小的（保守出牌）
    candidates.sort((a, b) => {
      const pa = parseCards(a), pb = parseCards(b);
      if (pa.main !== pb.main) return pa.main - pb.main;
      return a.length - b.length;
    });
    return candidates[0];
  }

  // AI 开局出牌：出最小的牌型
  function aiLeadHand(hand) {
    const sorted = [...hand].sort((a, b) => a.value - b.value);
    return [sorted[0]];
  }

  function groupBy(cards) {
    const g = {};
    for (const c of cards) {
      if (!g[c.value]) g[c.value] = [];
      g[c.value].push(c);
    }
    return g;
  }
  // 找最小可用的 n 张顺子
  function findStraight(cards, n) {
    const g = groupBy(cards);
    const values = Object.keys(g).map(Number).filter(v => v < 15).sort((a, b) => a - b);
    for (let i = 0; i <= values.length - n; i++) {
      let ok = true;
      for (let j = 1; j < n; j++) {
        if (values[i + j] !== values[i + j - 1] + 1) { ok = false; break; }
      }
      if (ok) {
        const out = [];
        for (let j = 0; j < n; j++) out.push(g[values[i + j]][0]);
        return out;
      }
    }
    return null;
  }
  function findConsecPair(cards, n) {
    const g = groupBy(cards);
    const values = Object.keys(g).map(Number).filter(v => v < 15 && g[v].length >= 2).sort((a, b) => a - b);
    for (let i = 0; i <= values.length - n; i++) {
      let ok = true;
      for (let j = 1; j < n; j++) {
        if (values[i + j] !== values[i + j - 1] + 1) { ok = false; break; }
      }
      if (ok) {
        const out = [];
        for (let j = 0; j < n; j++) {
          out.push(g[values[i + j]][0], g[values[i + j]][1]);
        }
        return out;
      }
    }
    return null;
  }

  // ====== 玩家 ======
  function Player(idx, name, isAI) {
    this.idx = idx;
    this.name = name;
    this.isAI = isAI;
    this.hand = [];
    this.selected = new Set();
    this.isLandlord = false;
    this.role = ''; // '' / 'landlord' / 'farmer'
    this.bid = 0;   // 0=不叫, 1/2/3=叫分
  }

  // ====== 游戏状态 ======
  const STATE = { MENU: 0, BIDDING: 1, PLAYING: 2, ENDED: 3 };
  const game = {
    state: STATE.MENU,
    players: [],
    deck: [],
    bottom: [],       // 底牌
    landlordIdx: 0,
    currentPlayer: 0,
    lastPlay: null,   // 上家出的牌 {player, cards, info}
    lastPlayPlayer: -1,
    passCount: 0,
    multi: 1,         // 倍数
    baseScore: 1,
    turnLog: [],
    time: 0,
    lastTime: 0,
    animQueue: [],
    hintCards: [],
    biddingStep: 0,   // 0/1/2 第几个叫分
    biddingIdx: 0,
    topBid: 0,
    topBidder: -1,
  };

  // ====== 渲染：牌面 ======
  function drawCard(ctx, x, y, card, opts = {}) {
    const { selected = false, faceUp = true, dim = false, scale = 1, highlight = false } = opts;
    const w = CARD_W * scale, h = CARD_H * scale;
    ctx.save();
    // 阴影
    if (faceUp) {
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
    }
    // 牌底
    const grd = ctx.createLinearGradient(x, y, x, y + h);
    grd.addColorStop(0, '#ffffff');
    grd.addColorStop(1, '#f0f0f0');
    ctx.fillStyle = grd;
    roundRect(ctx, x, y, w, h, 5 * scale);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    // 边框
    ctx.strokeStyle = selected ? '#ffcc00' : '#8a6a4a';
    ctx.lineWidth = selected ? 2.5 : 1;
    roundRect(ctx, x, y, w, h, 5 * scale);
    ctx.stroke();
    if (highlight) {
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 3;
      roundRect(ctx, x - 1, y - 1, w + 2, h + 2, 6 * scale);
      ctx.stroke();
    }
    if (!faceUp) {
      // 牌背
      ctx.fillStyle = '#3a5a8a';
      roundRect(ctx, x + 3 * scale, y + 3 * scale, w - 6 * scale, h - 6 * scale, 4 * scale);
      ctx.fill();
      // 装饰
      ctx.fillStyle = '#1a3a6a';
      ctx.fillRect(x + 5 * scale, y + 8 * scale, w - 10 * scale, 2 * scale);
      ctx.fillRect(x + 5 * scale, y + h - 10 * scale, w - 10 * scale, 2 * scale);
      ctx.restore();
      return;
    }
    if (dim) ctx.globalAlpha = 0.4;
    // 牌内容
    const v = card.value, s = card.suit;
    let txt, color;
    if (v >= 16) {
      // 王
      const isBig = v === 17;
      const color = isBig ? '#d12d2d' : '#1a1a1a';
      // 中心大字
      ctx.fillStyle = color;
      ctx.font = `bold ${22 * scale}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isBig ? '大' : '小', x + w / 2, y + h / 2);
      // 左上角小花纹
      ctx.fillStyle = color;
      ctx.font = `bold ${10 * scale}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(isBig ? '大' : '小', x + 4 * scale, y + 3 * scale);
      // 中心装饰圆环
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 16 * scale, 0, TAU);
      ctx.stroke();
      // 王字装饰（外圈）
      ctx.beginPath();
      ctx.arc(x + w / 2, y + h / 2, 12 * scale, 0, TAU);
      ctx.stroke();
    } else {
      color = SUIT_COLORS[s];
      txt = rankName(v);
      // 左上
      ctx.fillStyle = color;
      ctx.font = `bold ${v === 15 || v === 14 ? 12 * scale : 14 * scale}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(txt, x + 4 * scale, y + 3 * scale);
      // 花色
      const suitTxt = SUIT_NAMES[s];
      ctx.font = `${14 * scale}px serif`;
      ctx.fillText(suitTxt, x + 4 * scale, y + 18 * scale);
      // 中心大花色
      ctx.font = `${28 * scale}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(suitTxt, x + w / 2, y + h / 2 + 4 * scale);
    }
    ctx.restore();
  }
  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ====== 渲染：玩家手牌 ======
  function drawPlayerHand(ctx, p, x, y, opts = {}) {
    const { dir = 'down', faceUp = true, dim = false } = opts;
    const hand = p.hand;
    if (!hand.length) return;
    if (dir === 'down') {
      // 玩家手牌：底部，水平排列，可选中
      const n = hand.length;
      const totalW = W - TABLE_PADDING * 2;
      const gap = Math.min(HAND_GAP_X, (totalW - CARD_W) / Math.max(1, n - 1));
      const startX = (W - (gap * (n - 1) + CARD_W)) / 2;
      const cardY = y;
      for (let i = 0; i < n; i++) {
        const cx = startX + i * gap;
        const sel = p.selected.has(hand[i].id);
        const isHint = game.hintCards.find(c => c.id === hand[i].id);
        drawCard(ctx, cx, sel ? cardY - HAND_GAP_Y : cardY, hand[i], {
          selected: sel, faceUp, dim, highlight: isHint,
        });
      }
    } else if (dir === 'left') {
      // 左侧 AI：竖直
      const n = hand.length;
      const scale = 0.55;
      const gap = 4;
      const cardW = CARD_W * scale;
      const cardH = CARD_H * scale;
      const totalH = (n - 1) * gap + cardH;
      const startY = Math.max(230, (H - totalH) / 2);
      for (let i = 0; i < n; i++) {
        const cy = startY + i * gap;
        ctx.save();
        ctx.translate(12, cy);
        ctx.rotate(-Math.PI / 2);
        drawCard(ctx, 0, 0, hand[i], { faceUp: false, scale });
        ctx.restore();
      }
    } else if (dir === 'right') {
      // 右侧 AI：竖直
      const n = hand.length;
      const scale = 0.55;
      const gap = 4;
      const cardW = CARD_W * scale;
      const cardH = CARD_H * scale;
      const totalH = (n - 1) * gap + cardH;
      const startY = Math.max(230, (H - totalH) / 2);
      for (let i = 0; i < n; i++) {
        const cy = startY + i * gap;
        ctx.save();
        ctx.translate(W - 12, cy + cardW);
        ctx.rotate(Math.PI / 2);
        drawCard(ctx, 0, 0, hand[i], { faceUp: false, scale });
        ctx.restore();
      }
    } else if (dir === 'top') {
      // 顶部 AI：水平（名字由 statusBar 统一管理）
      const n = hand.length;
      const gap = 5;
      const totalW = n * gap + CARD_W * 0.5;
      const startX = (W - totalW) / 2;
      for (let i = 0; i < n; i++) {
        drawCard(ctx, startX + i * gap, 44, hand[i], { faceUp: false, scale: 0.5 });
      }
    }
  }

  // ====== 渲染：桌面上出的牌 ======
  function drawCenterCards(ctx, cards, x, y) {
    if (!cards || !cards.length) return;
    const n = cards.length;
    let layout = [];
    if (n === 1) layout = [{ x, y }];
    else if (n === 2) layout = [{ x: x - CARD_W * 0.3, y }, { x: x + CARD_W * 0.3, y }];
    else {
      const totalW = CARD_W + (n - 1) * 18;
      const sx = x - totalW / 2;
      for (let i = 0; i < n; i++) layout.push({ x: sx + i * 18, y });
    }
    for (let i = 0; i < n; i++) {
      drawCard(ctx, layout[i].x, layout[i].y, cards[i], {});
    }
  }

  // ====== 渲染：底部按钮 ======
  function drawActionButtons(ctx) {
    const btnY = H - 130;
    const btnH = 38;
    // 出牌
    ctx.save();
    ctx.fillStyle = 'rgba(255, 220, 90, 0.95)';
    roundRect(ctx, 20, btnY, 100, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#7a4400';
    ctx.lineWidth = 2;
    roundRect(ctx, 20, btnY, 100, btnH, 8);
    ctx.stroke();
    ctx.fillStyle = '#5a2200';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('出牌', 70, btnY + btnH / 2);
    // 不出
    ctx.fillStyle = 'rgba(220, 220, 220, 0.85)';
    roundRect(ctx, 130, btnY, 100, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#5a5a5a';
    roundRect(ctx, 130, btnY, 100, btnH, 8);
    ctx.stroke();
    ctx.fillStyle = '#222';
    ctx.fillText('不要', 180, btnY + btnH / 2);
    // 提示
    ctx.fillStyle = 'rgba(120, 200, 255, 0.85)';
    roundRect(ctx, 240, btnY, 100, btnH, 8);
    ctx.fill();
    ctx.strokeStyle = '#1a4a6a';
    roundRect(ctx, 240, btnY, 100, btnH, 8);
    ctx.stroke();
    ctx.fillStyle = '#0a2a4a';
    ctx.fillText('提示', 290, btnY + btnH / 2);
    ctx.restore();
  }
  function drawBidButtons(ctx) {
    const btnY = H - 130;
    const btnH = 38;
    const labels = ['1 分', '2 分', '3 分', '不叫'];
    const colors = ['#a0d0ff', '#a0ffb0', '#ff9090', '#cccccc'];
    for (let i = 0; i < 4; i++) {
      const x = 25 + i * 90;
      ctx.save();
      ctx.fillStyle = colors[i];
      roundRect(ctx, x, btnY, 80, btnH, 8);
      ctx.fill();
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      roundRect(ctx, x, btnY, 80, btnH, 8);
      ctx.stroke();
      ctx.fillStyle = '#222';
      ctx.font = 'bold 15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labels[i], x + 40, btnY + btnH / 2);
      ctx.restore();
    }
  }

  // ====== 渲染：整体 ======
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  function drawBackground() {
    // 绿色牌桌
    const g = ctx.createRadialGradient(W / 2, H / 2, 30, W / 2, H / 2, W);
    g.addColorStop(0, '#3a8a3a');
    g.addColorStop(1, '#1a4a1a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // 装饰纹理
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, 50 + i * 30, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawStatusBar() {
    // 玩家名字 + 角色（避免与 HTML 顶栏、底牌区重叠）
    const positions = [
      { p: 1, x: W / 2, y: 195, align: 'center' },   // 顶部（底牌下方）
      { p: 0, x: W / 2, y: H - 30, align: 'center' }, // 底部（我）
      { p: 2, x: W - 50, y: 195, align: 'right' },    // 右侧（顶部牌下方）
    ];
    for (const pos of positions) {
      const p = game.players[pos.p];
      if (!p) continue;
      let roleTxt = '';
      let roleColor = '#888';
      if (game.landlordIdx >= 0 && p === game.players[game.landlordIdx]) {
        roleTxt = '【地主】';
        roleColor = '#ffd700';
      } else if (game.landlordIdx >= 0 && p !== game.players[game.landlordIdx]) {
        roleTxt = '【农民】';
        roleColor = '#a0d0ff';
      }
      ctx.save();
      // 名字底
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      const boxW = pos.align === 'right' ? 80 : 150;
      roundRect(ctx, pos.x - boxW / 2, pos.y - 11, boxW, 22, 6);
      ctx.fill();
      // 名字
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const nameTxt = p.name + (game.currentPlayer === p.idx ? ' ◀' : '') + ' · ' + p.hand.length + ' 张';
      ctx.fillText(nameTxt, pos.x, pos.y - 1);
      // 角色
      if (roleTxt) {
        ctx.fillStyle = roleColor;
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(roleTxt, pos.x, pos.y + 10);
      }
      ctx.restore();
    }
  }

  function drawGame() {
    drawBackground();
    // 顶部 AI（idx 1）
    drawPlayerHand(ctx, game.players[1], 0, 0, { dir: 'top' });
    // 右侧 AI（idx 2）
    drawPlayerHand(ctx, game.players[2], 0, 0, { dir: 'right' });
    // 中间：上一手牌
    if (game.lastPlay && game.lastPlay.cards) {
      const n = game.lastPlay.cards.length;
      const w = n === 1 ? CARD_W : n <= 2 ? CARD_W * 0.6 * 2 : CARD_W + (n - 1) * 18;
      const cx = W / 2;
      const cy = H * 0.4;
      drawCenterCards(ctx, game.lastPlay.cards, cx, cy);
      // 牌型标签
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(cx - 60, cy + CARD_H + 8, 120, 24);
      ctx.fillStyle = '#ffe28a';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = typeLabel(game.lastPlay.info);
      ctx.fillText('【' + game.players[game.lastPlay.player].name + '】 ' + label, cx, cy + CARD_H + 20);
      ctx.restore();
    }
    // 底牌（仅在叫分阶段显示）
    if (game.state === STATE.BIDDING && game.bottom.length) {
      for (let i = 0; i < game.bottom.length; i++) {
        drawCard(ctx, W / 2 - 90 + i * 22, 100, game.bottom[i], {});
      }
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('底牌（地主获得）', W / 2, 95);
    }
    drawStatusBar();
    // 玩家手牌
    drawPlayerHand(ctx, game.players[0], 0, H - 220, { dir: 'down' });
    // 按钮（仅在轮到自己时显示）
    if (game.state === STATE.PLAYING && game.currentPlayer === 0) {
      drawActionButtons(ctx);
    } else if (game.state === STATE.BIDDING && game.biddingIdx === 0) {
      drawBidButtons(ctx);
    }
  }

  function typeLabel(info) {
    if (!info) return '';
    switch (info.type) {
      case TYPE.SINGLE: return '单张';
      case TYPE.PAIR: return '对子';
      case TYPE.TRIPLE: return '三张';
      case TYPE.TRIPLE_SINGLE: return '三带一';
      case TYPE.TRIPLE_PAIR: return '三带二';
      case TYPE.STRAIGHT: return '顺子';
      case TYPE.CONSEC_PAIR: return '连对';
      case TYPE.AIRPLANE: return '飞机';
      case TYPE.AIRPLANE_SINGLE: return '飞机带单';
      case TYPE.AIRPLANE_PAIR: return '飞机带对';
      case TYPE.FOUR_TWO_SINGLE: return '四带二';
      case TYPE.FOUR_TWO_PAIR: return '四带二对';
      case TYPE.BOMB: return '炸弹';
      case TYPE.ROCKET: return '王炸';
      default: return '无效';
    }
  }

  // ====== 游戏控制 ======
  function newGame() {
    const deck = shuffle(buildDeck());
    game.players = [
      new Player(0, '我', false),
      new Player(1, '电脑A', true),
      new Player(2, '电脑B', true),
    ];
    game.bottom = deck.slice(51);
    for (let i = 0; i < 51; i++) {
      game.players[i % 3].hand.push(deck[i]);
    }
    // 排序
    for (const p of game.players) p.hand.sort((a, b) => a.value - b.value);
    game.landlordIdx = -1;
    game.currentPlayer = Math.floor(Math.random() * 3); // 随机先叫分
    game.lastPlay = null;
    game.lastPlayPlayer = -1;
    game.passCount = 0;
    game.multi = 1;
    game.baseScore = 1;
    game.biddingStep = 0;
    game.biddingIdx = game.currentPlayer;
    game.topBid = 0;
    game.topBidder = -1;
    game.turnLog = [];
    game.state = STATE.BIDDING;
    // 触发首个叫分（AI 直接叫，玩家等点击）
    if (game.biddingIdx !== 0) {
      setTimeout(aiBid, 500);
    }
  }

  function bidLandlord(score) {
    if (game.state !== STATE.BIDDING) return;
    if (game.biddingIdx !== 0) return; // 只接受玩家操作
    const p = game.players[0];
    p.bid = score;
    if (score > game.topBid) {
      game.topBid = score;
      game.topBidder = 0;
    }
    // 转到下家
    advanceBidding();
  }

  function advanceBidding() {
    game.biddingIdx = (game.biddingIdx + 1) % 3;
    game.biddingStep++;
    game.currentPlayer = game.biddingIdx; // 同步 currentPlayer 以便显示 ◀
    // 一轮叫完：若所有人都叫过（或叫分不变）则定庄
    if (game.biddingStep >= 3) {
      // 选最高分者
      if (game.topBidder === -1) {
        // 都没叫：重新开始，全部强制 1 分随机发
        game.landlordIdx = Math.floor(Math.random() * 3);
        game.topBid = 1;
      } else {
        game.landlordIdx = game.topBidder;
      }
      const p = game.players[game.landlordIdx];
      p.isLandlord = true;
      p.role = 'landlord';
      // 加底牌
      p.hand = p.hand.concat(game.bottom).sort((a, b) => a.value - b.value);
      game.bottom = [];
      // 其他两人农民
      for (let i = 0; i < 3; i++) {
        if (i !== game.landlordIdx) game.players[i].role = 'farmer';
      }
      game.currentPlayer = game.landlordIdx;
      game.state = STATE.PLAYING;
      game.multi = game.topBid;
      // 若地主是 AI，自动先出牌
      if (game.currentPlayer !== 0) {
        setTimeout(aiTurn, 800);
      }
    } else {
      // AI 自动叫分（简化：60% 概率跟叫或抢叫）
      if (game.biddingIdx !== 0) {
        setTimeout(aiBid, 700);
      }
    }
  }

  function aiBid() {
    if (game.state !== STATE.BIDDING) return;
    const p = game.players[game.biddingIdx];
    // 简单策略：手牌大就抢，否则 pass
    const highCount = p.hand.filter(c => c.value >= 14).length;  // A/2/王
    const r = Math.random();
    let score = 0;
    if (game.topBid < 3) {
      if (highCount >= 4 || (highCount >= 2 && r < 0.6)) {
        score = Math.min(3, game.topBid + 1);
      }
    }
    p.bid = score;
    if (score > game.topBid) {
      game.topBid = score;
      game.topBidder = game.biddingIdx;
    }
    advanceBidding();
  }

  // 玩家出牌
  function playerPlay() {
    if (game.state !== STATE.PLAYING) return;
    if (game.currentPlayer !== 0) return;
    const p = game.players[0];
    const cards = p.hand.filter(c => p.selected.has(c.id));
    if (cards.length === 0) return;
    const info = parseCards(cards);
    if (!info) {
      // 非法牌型
      return;
    }
    // 检查是否能压
    const cur = game.lastPlay && game.lastPlay.player !== 0 ? game.lastPlay.info : null;
    if (!canBeat(cur, info)) {
      // 不合法
      return;
    }
    doPlay(0, cards, info);
  }
  function playerPass() {
    if (game.state !== STATE.PLAYING) return;
    if (game.currentPlayer !== 0) return;
    if (game.lastPlayPlayer === 0) return; // 自己的回合不能 pass
    doPass(0);
  }
  function playerHint() {
    if (game.state !== STATE.PLAYING) return;
    if (game.currentPlayer !== 0) return;
    const p = game.players[0];
    const cur = game.lastPlay && game.lastPlay.player !== 0 ? game.lastPlay.info : null;
    const pick = aiPickHand(p.hand, cur);
    if (!pick) {
      // 提示：没有可出的
      return;
    }
    p.selected = new Set(pick.map(c => c.id));
  }

  function doPlay(idx, cards, info) {
    const p = game.players[idx];
    // 从手牌移除
    const ids = new Set(cards.map(c => c.id));
    p.hand = p.hand.filter(c => !ids.has(c.id));
    p.selected = new Set();
    game.lastPlay = { player: idx, cards, info };
    game.lastPlayPlayer = idx;
    game.passCount = 0;
    if (p.hand.length === 0) {
      endGame(idx);
      return;
    }
    advanceTurn();
  }
  function doPass(idx) {
    game.passCount++;
    if (game.passCount >= 2) {
      // 重新开始一轮
      game.lastPlay = null;
      game.lastPlayPlayer = -1;
      game.passCount = 0;
    }
    advanceTurn();
  }
  function advanceTurn() {
    game.currentPlayer = (game.currentPlayer + 1) % 3;
    // AI 自动出牌
    if (game.currentPlayer !== 0 && game.state === STATE.PLAYING) {
      setTimeout(aiTurn, 800);
    }
  }
  function aiTurn() {
    if (game.state !== STATE.PLAYING) return;
    const p = game.players[game.currentPlayer];
    const cur = game.lastPlay && game.lastPlay.player !== game.currentPlayer ? game.lastPlay.info : null;
    let pick;
    if (!cur || game.lastPlayPlayer === game.currentPlayer) {
      pick = aiLeadHand(p.hand);
    } else {
      pick = aiPickHand(p.hand, cur);
    }
    if (!pick) {
      doPass(game.currentPlayer);
    } else {
      const info = parseCards(pick);
      doPlay(game.currentPlayer, pick, info);
    }
  }

  function endGame(winnerIdx) {
    game.state = STATE.ENDED;
    const isLandlord = winnerIdx === game.landlordIdx;
    const winner = game.players[winnerIdx];
    const score = (isLandlord ? 1 : -1) * game.multi * game.baseScore;
    showOverlay('game-over');
    document.getElementById('over-result').textContent = isLandlord ? '地主胜利！' : '农民胜利！';
    document.getElementById('over-title').textContent = winner.name + ' 获胜';
    document.getElementById('over-score').textContent = (score > 0 ? '+' : '') + score + ' 分';
  }

  // ====== UI ======
  function showOverlay(which) {
    const ov = document.getElementById('overlay');
    ov.classList.remove('fadeout');
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    const p = document.getElementById(which);
    if (p) p.classList.remove('hidden');
  }
  function hideOverlay() {
    document.getElementById('overlay').classList.add('fadeout');
  }
  function isOverlayVisible() {
    return !document.getElementById('overlay').classList.contains('fadeout');
  }

  // ====== 输入 ======
  function pointInRect(x, y, rx, ry, rw, rh) {
    return x >= rx && x <= rx + rw && y >= ry && y <= ry + rh;
  }
  canvas.addEventListener('click', e => {
    if (isOverlayVisible()) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * sx;
    const y = (e.clientY - rect.top) * sy;
    handleClick(x, y);
  });
  canvas.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    canvas.style.cursor = 'default';
  });

  function handleClick(x, y) {
    // 玩家手牌区选择
    if (game.state === STATE.PLAYING) {
      const p = game.players[0];
      const n = p.hand.length;
      const totalW = W - TABLE_PADDING * 2;
      const gap = Math.min(HAND_GAP_X, (totalW - CARD_W) / Math.max(1, n - 1));
      const startX = (W - (gap * (n - 1) + CARD_W)) / 2;
      const cardY = H - 220;
      for (let i = 0; i < n; i++) {
        const cx = startX + i * gap;
        if (pointInRect(x, y, cx, cardY - HAND_GAP_Y, CARD_W, CARD_H + HAND_GAP_Y)) {
          const card = p.hand[i];
          if (p.selected.has(card.id)) p.selected.delete(card.id);
          else p.selected.add(card.id);
          return;
        }
      }
      // 按钮
      if (pointInRect(x, y, 20, H - 130, 100, 38)) { playerPlay(); return; }
      if (pointInRect(x, y, 130, H - 130, 100, 38)) { playerPass(); return; }
      if (pointInRect(x, y, 240, H - 130, 100, 38)) { playerHint(); return; }
    }
    if (game.state === STATE.BIDDING && game.biddingIdx === 0) {
      const btnY = H - 130;
      const labels = [1, 2, 3, 0];
      for (let i = 0; i < 4; i++) {
        if (pointInRect(x, y, 25 + i * 90, btnY, 80, 38)) {
          bidLandlord(labels[i]);
          return;
        }
      }
    }
  }

  function bindUI() {
    document.getElementById('btn-start').onclick = () => {
      hideOverlay();
      newGame();
    };
    document.getElementById('btn-help').onclick = () => showOverlay('help');
    document.getElementById('btn-help-back').onclick = () => showOverlay('menu');
    document.getElementById('btn-retry').onclick = () => { hideOverlay(); newGame(); };
    document.getElementById('btn-back-menu').onclick = () => { showOverlay('menu'); game.state = STATE.MENU; };
    document.getElementById('btn-menu').onclick = () => {
      showOverlay('menu');
      game.state = STATE.MENU;
    };
    document.getElementById('btn-mute').onclick = () => {
      // 简化：未实现声音
    };
  }

  // ====== 主循环 ======
  function loop(ts) {
    const dt = Math.min(0.05, (ts - (game.lastTime || ts)) / 1000);
    game.lastTime = ts;
    game.time += dt;
    // 更新顶部 UI
    document.getElementById('multi').textContent = game.multi;
    document.getElementById('base-score').textContent = game.baseScore;
    document.getElementById('cui-cards').textContent = game.bottom.length;
    if (game.state !== STATE.MENU && game.state !== STATE.ENDED) {
      drawGame();
    }
    requestAnimationFrame(loop);
  }

  // 启动
  bindUI();
  showOverlay('menu');
  game.state = STATE.MENU;
  game.lastTime = performance.now();
  requestAnimationFrame(loop);

  window.__game = game;
  window.__doudizhu = { newGame, bidLandlord, playerPlay, playerPass, playerHint, showOverlay, hideOverlay, isOverlayVisible };
})();
