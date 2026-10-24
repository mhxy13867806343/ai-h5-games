/* ============ Tibo 28 天挑战 ============ */
'use strict';

const $ = s => document.querySelector(s);
const TYPE_ZH = { 1: '产品改进', 2: '重置', 3: '重置 + 产品改进' };
const TYPE_CLS = { 1: 'st-imp', 2: 'st-reset', 3: 'st-mixed' };

/* ---------- 主题（与首页共享偏好） ---------- */
const root = document.documentElement;
function setTheme(mode) {
  root.dataset.theme = mode;
  localStorage.setItem('cr_theme', mode);
  $('#theme-toggle').textContent = mode === 'dark' ? '☀️' : '🌙';
}
setTheme(localStorage.getItem('cr_theme') ||
  (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('#theme-toggle').addEventListener('click', () =>
  setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

/* ---------- 美西时间与挑战日 ---------- */
const ptFmt = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit',
});
const ptDateFmt = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'America/Los_Angeles', month: 'long', day: 'numeric', weekday: 'short',
});
function ptNow() { return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })); }
function currentDay() {
  const diff = (ptNow() - START) / 86400000;
  return Math.max(1, Math.min(TOTAL, Math.floor(diff) + 1));
}
function dayDate(n) { // 第 n 天的日期（美西）
  const d = new Date(START.getTime() + (n - 1) * 86400000);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}
function tickClock() {
  const now = ptNow();
  $('#ch-time').textContent = ptFmt.format(now);
  $('#ch-date').textContent = ptDateFmt.format(now);
  const day = currentDay();
  $('#ch-day').textContent = day;
  $('#ch-progress-label').textContent = `第 ${day} 天 / 共 ${TOTAL} 天 · 10月5日 开始`;
}
tickClock();
setInterval(tickClock, 30000);

/* ---------- 28 格条带 + 悬停 ---------- */
const tip = $('#ch-tip');
function stateOfDay(n) {
  if (CH_DAYS[n]) return { cls: TYPE_CLS[CH_DAYS[n]], label: TYPE_ZH[CH_DAYS[n]], done: true };
  if (n === currentDay()) return { cls: 'st-open', label: '等待 Tibo', done: false };
  return { cls: 'st-up', label: '未开始', done: false };
}
const strip = $('#ch-strip');
for (let n = 1; n <= TOTAL; n++) {
  const st = stateOfDay(n);
  const cell = document.createElement('span');
  cell.className = `ch-cell ${st.cls}`;
  cell.textContent = n;
  cell.addEventListener('mouseenter', () => {
    const r = cell.getBoundingClientRect();
    tip.hidden = false;
    tip.textContent = `第 ${String(n).padStart(2, '0')} 天 · ${dayDate(n)} · ${st.label}`;
    tip.style.left = (r.left + r.width / 2) + 'px';
    tip.style.top = r.top + 'px';
  });
  cell.addEventListener('mouseleave', () => { tip.hidden = true; });
  strip.appendChild(cell);
}

/* ---------- 列表视图 ---------- */
const list = $('#view-list');
list.innerHTML = Array.from({ length: TOTAL }, (_, i) => i + 1).map(n => {
  const st = stateOfDay(n);
  return `<li class="ch-row ${st.cls} ${n === currentDay() ? 'today' : ''}">
    <span class="ch-row-num">${String(n).padStart(2, '0')}</span>
    <span class="ch-row-date">${dayDate(n)}</span>
    <span class="ch-row-type"><i class="cell ${st.cls}"></i>${st.label}</span>
  </li>`;
}).join('');

/* ---------- 日历视图 ---------- */
const cal = $('#cal-grid');
const startDow = (new Date('2026-10-05T12:00:00-07:00').getUTCDay() + 6) % 7; // 周一起
let html = '<span class="cal-blank"></span>'.repeat(startDow);
for (let n = 1; n <= TOTAL; n++) {
  const st = stateOfDay(n);
  html += `<div class="cal-cell ${st.cls} ${n === currentDay() ? 'today' : ''}">
    <span class="cal-date">${dayDate(n).replace('月', '/').replace('日', '')}</span>
    <span class="cal-day">D${n}</span>
  </div>`;
}
cal.innerHTML = html;

/* ---------- 视图切换 ---------- */
$('#view-seg').addEventListener('click', e => {
  const btn = e.target.closest('button[data-view]');
  if (!btn) return;
  document.querySelectorAll('#view-seg button').forEach(b => b.classList.toggle('active', b === btn));
  const calMode = btn.dataset.view === 'calendar';
  $('#view-list').hidden = calMode;
  $('#view-calendar').hidden = !calMode;
});
