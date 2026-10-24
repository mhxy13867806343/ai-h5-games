/* ============================================================
   Codex Resets 复刻 —— 额度重置追踪与历史记录
   数据快照：codex-resets.com（2026-10-24 抓取，66 次公告 / 406 天网格）
   ============================================================ */
'use strict';

const D = window.CODEX_RESETS_DATA;
const $ = s => document.querySelector(s);

/* ---------- 多语言（界面文案） ---------- */
const I18N = {
  'zh-CN': {
    online: '人在线', lobby: '返回大厅',
    intro: '我们帮你关注 <b>@thsottiaux</b> 发布的 Codex 重置消息，省得你反复刷推。',
    subBrowser: '浏览器', subEmail: '邮件', timezone: '时区', localTime: '本地时间',
    latest: '最近一次 Codex 额度重置', thanks: '感谢',
    challengeTitle: 'Tibo 的 28 天挑战', challengeDesc: '每天一次改进，或者一次完整重置。', challengeCta: '查看每日进展 →',
    statCount: '重置次数', statAvg: '平均重置间隔 / 平均等待', statLongest: '最长等待',
    gridTitle: 'Codex 重置历史', legendNone: '未重置', legendReset: '已重置',
    legendRegular: '常规', legendBanked: '备用',
    typeRegular: '已重置 · 常规', typeBanked: '已重置 · 备用', typeNone: '未重置',
    logTitle: 'Codex 重置公告', logSub: '每次公告，都留有记录',
    reachTitle: '触达 Codex 用户', reachDesc: '本页面是学习交流复刻，广告位仅为样式展示。',
    showAll: n => `查看全部 ${n} 次重置 ↓`, hideAll: '收起 ↑',
    subBrowserTitle: '浏览器推送订阅', subEmailTitle: '邮件订阅',
    resetOn: '已重置', noReset: '未重置',
  },
  'en': {
    online: 'online', lobby: 'Lobby',
    intro: 'We watch <b>@thsottiaux</b> so you don\'t have to refresh the timeline for Codex resets.',
    subBrowser: 'Browser', subEmail: 'Email', timezone: 'Timezone', localTime: 'Local time',
    latest: 'Last Codex usage reset', thanks: 'Thanks',
    challengeTitle: "Tibo's 28-day challenge", challengeDesc: 'One improvement a day, or a full reset.', challengeCta: 'See daily progress →',
    statCount: 'Resets', statAvg: 'Avg interval / avg wait', statLongest: 'Longest wait',
    gridTitle: 'Codex reset history', legendNone: 'No reset', legendReset: 'Reset',
    legendRegular: 'Regular', legendBanked: 'Banked',
    typeRegular: 'Reset · regular', typeBanked: 'Reset · banked', typeNone: 'No reset',
    logTitle: 'Codex reset announcements', logSub: 'Every announcement, on record',
    reachTitle: 'Reach Codex users', reachDesc: 'Educational recreation; ad slots are decorative.',
    showAll: n => `View all ${n} resets ↓`, hideAll: 'Collapse ↑',
    subBrowserTitle: 'Browser push', subEmailTitle: 'Email subscription',
    resetOn: 'Reset', noReset: 'No reset',
  },
  'zh-TW': {
    online: '人在線', lobby: '返回大廳',
    intro: '我們幫你關注 <b>@thsottiaux</b> 發佈的 Codex 重置消息，省得你反覆刷推。',
    subBrowser: '瀏覽器', subEmail: '郵件', timezone: '時區', localTime: '本地時間',
    latest: '最近一次 Codex 額度重置', thanks: '感謝',
    challengeTitle: 'Tibo 的 28 天挑戰', challengeDesc: '每天一次改進，或者一次完整重置。', challengeCta: '查看每日進展 →',
    statCount: '重置次數', statAvg: '平均重置間隔 / 平均等待', statLongest: '最長等待',
    gridTitle: 'Codex 重置歷史', legendNone: '未重置', legendReset: '已重置',
    legendRegular: '常規', legendBanked: '備用',
    typeRegular: '已重置 · 常規', typeBanked: '已重置 · 備用', typeNone: '未重置',
    logTitle: 'Codex 重置公告', logSub: '每次公告，都留有記錄',
    reachTitle: '觸達 Codex 用戶', reachDesc: '本頁面為學習交流復刻，廣告位僅為樣式展示。',
    showAll: n => `查看全部 ${n} 次重置 ↓`, hideAll: '收起 ↑',
    subBrowserTitle: '瀏覽器推送訂閱', subEmailTitle: '郵件訂閱',
    resetOn: '已重置', noReset: '未重置',
  },
  'ja': {
    online: '人オンライン', lobby: 'ロビーへ',
    intro: '<b>@thsottiaux</b> の Codex リセット投稿を私たちが監視します。',
    subBrowser: 'ブラウザ', subEmail: 'メール', timezone: 'タイムゾーン', localTime: '現地時間',
    latest: '直近の Codex リセット', thanks: '感謝',
    challengeTitle: 'Tibo の 28 日間チャレンジ', challengeDesc: '毎日ひとつの改善、または完全リセット。', challengeCta: '日々の進捗 →',
    statCount: 'リセット回数', statAvg: '平均間隔 / 平均待機', statLongest: '最長待機',
    gridTitle: 'Codex リセット履歴', legendNone: '未リセット', legendReset: 'リセット',
    legendRegular: '通常', legendBanked: '繰越',
    typeRegular: 'リセット · 通常', typeBanked: 'リセット · 繰越', typeNone: '未リセット',
    logTitle: 'Codex リセット告知', logSub: 'すべての告知を記録',
    reachTitle: 'Codex ユーザーにリーチ', reachDesc: '学習用の復刻です。広告枠は装飾です。',
    showAll: n => `全 ${n} 回を見る ↓`, hideAll: '折りたたむ ↑',
    subBrowserTitle: 'ブラウザ通知', subEmailTitle: 'メール購読',
    resetOn: 'リセット', noReset: '未リセット',
  },
  'ko': {
    online: '명 온라인', lobby: '로비로',
    intro: '<b>@thsottiaux</b>의 Codex 리셋 소식을 대신 지켜봅니다.',
    subBrowser: '브라우저', subEmail: '이메일', timezone: '시간대', localTime: '현지 시간',
    latest: '최근 Codex 리셋', thanks: '감사',
    challengeTitle: 'Tibo의 28일 챌린지', challengeDesc: '하루 한 번의 개선, 또는 완전한 리셋.', challengeCta: '일일 진행 보기 →',
    statCount: '리셋 횟수', statAvg: '평균 간격 / 평균 대기', statLongest: '최장 대기',
    gridTitle: 'Codex 리셋 히스토리', legendNone: '리셋 없음', legendReset: '리셋',
    legendRegular: '정기', legendBanked: '적립',
    typeRegular: '리셋 · 정기', typeBanked: '리셋 · 적립', typeNone: '리셋 없음',
    logTitle: 'Codex 리셋 공지', logSub: '모든 공지가 기록됩니다',
    reachTitle: 'Codex 사용자에게 도달', reachDesc: '학습용 복제 페이지입니다.',
    showAll: n => `전체 ${n}회 보기 ↓`, hideAll: '접기 ↑',
    subBrowserTitle: '브라우저 알림', subEmailTitle: '이메일 구독',
    resetOn: '리셋됨', noReset: '리셋 없음',
  },
};
let lang = localStorage.getItem('cr_lang') || 'zh-CN';
function t(key) {
  const v = (I18N[lang] || I18N['zh-CN'])[key];
  return typeof v === 'function' ? v : v;
}
function applyI18n() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = t(el.dataset.i18n);
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  const n = D.announcements.length;
  $('#toggle-log').textContent = logExpanded ? t('hideAll') : t('showAll')(n);
}

/* ---------- 主题 ---------- */
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

/* ---------- 时区 ---------- */
let tz = localStorage.getItem('cr_tz') || 'utc';
function fmtAbs(iso) {
  const d = new Date(iso);
  if (tz === 'utc') {
    const p = n => String(n).padStart(2, '0');
    return `${d.getUTCFullYear()}年${p(d.getUTCMonth() + 1)}月${p(d.getUTCDate())}日 ${p(d.getUTCHours())}:${p(d.getUTCMinutes())} UTC`;
  }
  return d.toLocaleString('zh-CN', { hour12: false });
}
function fmtRel(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const abs = Math.abs(diff), past = diff >= 0;
  const h = Math.floor(abs / 3600000), m = Math.floor(abs % 3600000 / 60000);
  const s = past ? '前' : '后';
  if (h >= 24) return `${Math.floor(h / 24)} 天 ${h % 24} 小时${s}`;
  if (h >= 1) return `${h} 小时 ${m} 分钟${s}`;
  return `${m} 分钟${s}`;
}
function syncTzSeg() {
  document.querySelectorAll('#tz-seg button').forEach(b =>
    b.classList.toggle('active', b.dataset.tz === tz));
}
document.querySelectorAll('#tz-seg button').forEach(b =>
  b.addEventListener('click', () => {
    tz = b.dataset.tz;
    localStorage.setItem('cr_tz', tz);
    syncTzSeg();
    renderLatest();
    renderLog();
  }));

/* ---------- 最近一次重置 + 感谢 ---------- */
const latest = D.announcements[0];
const THANKS_BASE = 25821; // 快照当日感谢数
function renderLatest() {
  $('#latest-abs').textContent = fmtAbs(latest.dt);
  tickRel();
}
function tickRel() { $('#latest-rel').textContent = fmtRel(latest.dt); }
setInterval(tickRel, 30000);

let thanked = localStorage.getItem('cr_thanked') === '1';
function renderThanks() {
  const extra = thanked ? 1 : 0;
  $('#thanks-count').textContent = (THANKS_BASE + extra).toLocaleString();
  $('#thanks-btn').classList.toggle('done', thanked);
}
$('#thanks-btn').addEventListener('click', () => {
  thanked = !thanked;
  localStorage.setItem('cr_thanked', thanked ? '1' : '0');
  renderThanks();
});

/* ---------- 统计 ---------- */
function renderStats() {
  $('#stat-total').textContent = D.stats.total;
  $('#stat-avg').textContent = `${D.stats.avgInterval}天`;
  $('#stat-longest').textContent = `${D.stats.longest}天`;
}

/* ---------- 重置历史网格（GitHub 贡献图风格，周一/三/五标注） ---------- */
function renderGrid() {
  const grid = $('#grid');
  grid.innerHTML = '';
  const cells = D.grid; // [{d, l}] 按日期升序
  // 按周分列（周一为列首）
  const byCol = [];
  let col = null;
  cells.forEach(c => {
    const day = (new Date(c.d + 'T12:00:00Z').getUTCDay() + 6) % 7; // 0=周一
    if (day === 0 || !col) { col = []; byCol.push(col); }
    col.push(c);
  });
  // 月份标签：每列首格若在上旬则标月份
  const months = document.createElement('div');
  months.className = 'grid-months';
  months.innerHTML = byCol.map(col => {
    const d = col[0].d;
    const showM = parseInt(d.slice(8, 10)) <= 7;
    return `<span style="min-width:17px">${showM ? parseInt(d.slice(5, 7)) + '月' : ''}</span>`;
  }).join('');
  grid.appendChild(months);

  const tip = $('#grid-tip');
  byCol.forEach(col => {
    const colEl = document.createElement('div');
    colEl.className = 'grid-col';
    col.forEach(c => {
      const cell = document.createElement('i');
      cell.className = `cell ${c.l ? (c.t === 'banked' ? 'l1b' : 'l1') : 'l0'}`;
      cell.dataset.date = c.d;
      cell.addEventListener('mouseenter', e => {
        const r = cell.getBoundingClientRect();
        tip.hidden = false;
        tip.textContent = `${c.d} · ${c.l ? (c.t === 'banked' ? t('typeBanked') : t('typeRegular')) : t('typeNone')}`;
        tip.style.left = (r.left + r.width / 2) + 'px';
        tip.style.top = r.top + 'px';
      });
      cell.addEventListener('mouseleave', () => { tip.hidden = true; });
      colEl.appendChild(cell);
    });
    grid.appendChild(colEl);
  });
}

/* ---------- 公告日志 ---------- */
const PREVIEW = 20;
let logExpanded = false;
function renderLog() {
  const list = $('#log-list');
  list.innerHTML = D.announcements.map((a, i) => `
    <li class="log-item ${i >= PREVIEW ? 'collapsed' : ''}">
      <span class="log-avatar">T</span>
      <div class="log-bubble">
        <div class="log-item-meta">
          <span class="log-item-rel">${fmtRel(a.dt)}</span>
          <span class="log-item-abs">${fmtAbs(a.dt)}</span>
        </div>
        <p class="log-item-text">${escapeHtml(a.text)}</p>
        ${a.link ? `<a class="log-item-link" href="${escapeHtml(a.link)}" target="_blank" rel="noopener">在 X 查看 →</a>` : ''}
      </div>
    </li>`).join('');
  updateToggle();
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function updateToggle() {
  const btn = $('#toggle-log');
  btn.textContent = logExpanded ? t('hideAll') : t('showAll')(D.announcements.length);
}
$('#toggle-log').addEventListener('click', () => {
  logExpanded = !logExpanded;
  document.querySelectorAll('.log-item').forEach((el, i) =>
    el.classList.toggle('collapsed', !logExpanded && i >= PREVIEW));
  updateToggle();
});

/* ---------- 语言切换 ---------- */
$('#lang-select').value = lang;
$('#lang-select').addEventListener('change', e => {
  lang = e.target.value;
  localStorage.setItem('cr_lang', lang);
  applyI18n();
  renderGrid();
  renderLog();
});

/* ---------- 在线人数（模拟波动） ---------- */
let online = 1800 + Math.floor(Math.random() * 600);
function tickOnline() {
  online = Math.max(900, online + Math.floor((Math.random() - 0.5) * 80));
  $('#online-count').textContent = online.toLocaleString();
}
tickOnline();
setInterval(tickOnline, 5000);

/* ---------- 订阅弹窗（复刻样式，后端指向原站） ---------- */
const modal = $('#sub-modal');
document.querySelectorAll('[data-sub]').forEach(btn => {
  btn.addEventListener('click', () => {
    $('#sub-title').textContent = btn.dataset.sub === 'email' ? t('subEmailTitle') : t('subBrowserTitle');
    modal.hidden = false;
  });
});
$('#sub-close').addEventListener('click', () => { modal.hidden = true; });
modal.addEventListener('click', e => { if (e.target === modal) modal.hidden = true; });

/* ---------- 启动 ---------- */
applyI18n();
syncTzSeg();
renderLatest();
renderThanks();
renderStats();
renderGrid();
renderLog();
