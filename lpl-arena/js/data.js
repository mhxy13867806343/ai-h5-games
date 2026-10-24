/* ============================================================
   LPL ARENA 数据层
   实时部分：战队列表 / 赛季列表 / 首页轮播 —— lpl.qq.com 官方
   静态 JS 接口（<script> 标签加载，GBK 编码，无跨域限制）
   快照部分：各赛季赛程（接口为纯 JSON，跨域受限，本地爬取快照）
   ============================================================ */
'use strict';

const LPL_API = {
  teamList: 'https://lpl.qq.com/web201612/data/LOL_MATCH2_TEAM_LIST.js',
  gameList: 'https://lpl.qq.com/web201612/data/LOL_MATCH2_GAME_LIST_BRIEF.js',
  news: 'https://lpl.qq.com/web201612/data/LOL_NEWMATCH_FIR_PAGE_RECO_INFO.js',
};

function loadScript(src, charset) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    if (charset) s.charset = charset;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('load fail: ' + src));
    document.head.appendChild(s);
  });
}
const fixUrl = u => (!u ? '' : (u.startsWith('//') ? 'https:' + u : u));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

const LPLData = {
  snap: window.LPL_SNAPSHOT || { seasons: {}, matches: {}, teams: [] },
  teams: [],          // [{id, name, short, en, logo}]
  teamMap: {},
  news: [],
  liveTeams: false,
  liveNews: false,

  async init() {
    // 战队：先快照兜底，再尝试实时刷新（logo/名称以官方为准）
    this.teams = this.snap.teams.slice();
    this.rebuildTeamMap();
    try {
      await loadScript(LPL_API.teamList, 'gbk');
      if (window.TeamList && window.TeamList.msg) {
        const live = [];
        const snapIds = new Set(this.teams.map(t => String(t.id)));
        for (const [tid, t] of Object.entries(window.TeamList.msg)) {
          if (snapIds.has(String(tid))) {
            live.push({
              id: t.TeamId, name: t.TeamName, short: t.TeamShortName,
              en: t.TeamEnName || '', logo: fixUrl(t.TeamLogo),
            });
          }
        }
        if (live.length >= this.teams.length * 0.6) {
          this.teams = live;
          this.rebuildTeamMap();
          this.liveTeams = true;
        }
      }
    } catch (e) { /* 保持快照 */ }

    // 首页轮播（新闻推荐）
    try {
      await loadScript(LPL_API.news, 'gbk');
      const reco = window.FirPageRecoInfo && window.FirPageRecoInfo.msg;
      // 22 = 首页轮播位
      const slides = (reco && reco['22'] && reco['22']['23']) || [];
      this.news = slides.map(s => ({ title: s.sTitle, url: s.sUrl, img: fixUrl(s.sIMG) }));
      this.liveNews = this.news.length > 0;
    } catch (e) { /* 无轮播 */ }
  },

  rebuildTeamMap() {
    this.teamMap = {};
    this.teams.forEach(t => { this.teamMap[String(t.id)] = t; });
  },
  team(id) { return this.teamMap[String(id)] || null; },
  teamByName(short) {
    return this.teams.find(t => t.short === short || t.name === short) || null;
  },

  seasons() {
    return Object.entries(this.snap.seasons).map(([id, name]) => ({ id, name }));
  },
  matches(seasonId) {
    return (this.snap.matches[seasonId] || []).slice()
      .sort((a, b) => String(a.d).localeCompare(String(b.d)));
  },

  /* 最新 / 最近比赛（跨全部快照赛季） */
  recentMatches(n) {
    const all = [];
    for (const sid of Object.keys(this.snap.matches)) {
      this.snap.matches[sid].forEach(m => all.push({ ...m, seasonId: sid, season: this.snap.seasons[sid] }));
    }
    all.sort((a, b) => String(b.d).localeCompare(String(a.d)));
    return all.slice(0, n);
  },

  /* 积分榜：默认取“组内赛”（常规赛）的已结束比赛 */
  standings(seasonId, typeName) {
    const per = {};
    const ensure = tid => {
      const t = this.team(tid) || { id: tid, short: tid, name: tid, logo: '' };
      if (!per[tid]) per[tid] = { team: t, w: 0, l: 0, gw: 0, gl: 0 };
      return per[tid];
    };
    let used = 0;
    (this.snap.matches[seasonId] || []).forEach(m => {
      if (m.st !== '3') return;                       // 仅已结束
      if (typeName && m.type !== typeName) return;    // 按阶段过滤
      used++;
      const A = ensure(m.ta), B = ensure(m.tb);
      const sa = +m.sa || 0, sb = +m.sb || 0;
      A.gw += sa; A.gl += sb; B.gw += sb; B.gl += sa;
      if (sa > sb) { A.w++; B.l++; } else { B.w++; A.l++; }
    });
    return Object.values(per)
      .map(r => ({ ...r, total: r.w + r.l, wr: r.w + r.l ? r.w / (r.w + r.l) : 0, diff: r.gw - r.gl }))
      .sort((a, b) => b.w - a.w || b.diff - a.diff || b.gw - a.gw);
  },
  stageNames(seasonId) {
    const set = new Set();
    (this.snap.matches[seasonId] || []).forEach(m => set.add(m.type));
    return [...set];
  },
};

window.LPLData = LPLData;
window.fixUrl = fixUrl;
window.esc = esc;
