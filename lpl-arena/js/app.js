/* ============================================================
   LPL ARENA 页面渲染（按 body[data-page] 分发）
   ============================================================ */
'use strict';

/* ---------- 公共导航 / 页脚 ---------- */
function injectChrome(active) {
  const nav = document.createElement('header');
  nav.className = 'topnav';
  nav.innerHTML = `
    <div class="nav-inner">
      <a class="brand" href="index.html"><b>LPL ARENA</b><em>赛事数据中心</em></a>
      <nav class="nav-tabs">
        <a href="index.html" data-tab="home">首页</a>
        <a href="schedule.html" data-tab="schedule">赛程</a>
        <a href="standings.html" data-tab="standings">积分榜</a>
        <a href="teams.html" data-tab="teams">战队</a>
      </nav>
      <span class="src-chip" id="src-chip">数据加载中…</span>
    </div>`;
  document.body.prepend(nav);
  const tab = nav.querySelector(`[data-tab="${active}"]`);
  if (tab) tab.classList.add('active');

  const foot = document.createElement('footer');
  foot.className = 'footer';
  foot.innerHTML = `
    数据来源：lpl.qq.com 官方数据接口（战队 / 轮播实时加载；赛程为 ${esc(window.LPL_SNAPSHOT && LPLData.snap.snapshotTime)} 本地快照）·
    英雄联盟职业联赛赛事数据版权归 腾讯 / Riot Games 所有，本页面仅作学习交流 ·
    <a href="../index.html">← 返回大厅</a>`;
  document.body.appendChild(foot);
}
function markSource() {
  const chip = document.getElementById('src-chip');
  if (!chip) return;
  if (LPLData.liveTeams) {
    chip.textContent = '● 官方接口实时';
    chip.classList.add('live');
  } else {
    chip.textContent = `● 快照 ${LPLData.snap.snapshotTime}`;
  }
}
function teamLogoImg(team, cls) {
  if (team && team.logo) {
    return `<img src="${esc(team.logo)}" alt="${esc(team.short)}" loading="lazy" onerror="this.outerHTML='<span class=&quot;tlogo-ph&quot;>${esc(team ? team.short : '?')}</span>'">`;
  }
  return `<span class="tlogo-ph">${esc(team ? team.short : '?')}</span>`;
}
function matchRowHtml(m) {
  const A = LPLData.team(m.ta), B = LPLData.team(m.tb);
  const finished = m.st === '3';
  const sa = +m.sa || 0, sb = +m.sb || 0;
  const date = String(m.d || '').replace(/:\d\d$/, '');
  const statusTag = finished
    ? '<span class="tag fin">已结束</span>'
    : (m.st === '2' ? '<span class="tag live">进行中</span>' : '<span class="tag">未开始</span>');
  return `
  <div class="match-row">
    <div class="match-team">${teamLogoImg(A)}<span>${esc(A ? A.short : m.a)}</span>${statusTag}</div>
    <div class="match-mid">
      ${finished
        ? `<div class="score"><span class="${sa >= sb ? 'win' : 'lose'}">${sa}</span> : <span class="${sb >= sa ? 'win' : 'lose'}">${sb}</span></div>`
        : `<div class="vs">VS</div>`}
      <div class="meta">${esc(date)} · BO${esc(m.bo || '?')}${m.round ? ' · ' + esc(m.round) : ''}</div>
    </div>
    <div class="match-team right"><span>${esc(B ? B.short : m.b)}</span>${teamLogoImg(B)}</div>
  </div>`;
}

/* ---------- 首页 ---------- */
async function renderHome() {
  const hero = document.getElementById('hero');
  const dots = document.getElementById('hero-dots');
  if (LPLData.news.length) {
    hero.innerHTML = LPLData.news.map((n, i) => `
      <a class="hero-slide ${i === 0 ? 'on' : ''}" href="${esc(n.url || '#')}" target="_blank" rel="noopener">
        <img src="${esc(n.img)}" alt="${esc(n.title)}" onerror="this.parentNode.style.display='none'">
        <div class="hero-cap">${esc(n.title)}</div>
      </a>`).join('');
    dots.innerHTML = LPLData.news.map((_, i) => `<i class="${i === 0 ? 'on' : ''}" data-i="${i}"></i>`).join('');
    let cur = 0;
    const switchTo = i => {
      cur = (i + LPLData.news.length) % LPLData.news.length;
      hero.querySelectorAll('.hero-slide').forEach((s, j) => s.classList.toggle('on', j === cur));
      dots.querySelectorAll('i').forEach((d, j) => d.classList.toggle('on', j === cur));
    };
    dots.addEventListener('click', e => {
      const d = e.target.closest('i');
      if (d) switchTo(+d.dataset.i);
    });
    setInterval(() => switchTo(cur + 1), 4200);
  } else {
    hero.innerHTML = '<div class="empty" style="padding-top:130px">2026 英雄联盟职业联赛 · 赛事数据中心</div>';
  }

  document.getElementById('recent-list').innerHTML =
    LPLData.recentMatches(8).map(matchRowHtml).join('') || '<div class="empty">暂无赛程数据</div>';

  const lplTeams = LPLData.teams.filter(t => {
    const used = LPLData.snap.matches['237'].some(m => m.ta === t.id || m.tb === t.id);
    return used;
  });
  document.getElementById('team-strip').innerHTML = lplTeams
    .map(t => `<a class="team-chip" href="team-detail.html?tid=${esc(t.id)}">${teamLogoImg(t)}<span>${esc(t.short)}</span></a>`)
    .join('');

  const s237 = LPLData.standings('237', '第三赛段组内赛');
  document.getElementById('mini-rank').innerHTML = s237.slice(0, 6).map((r, i) => `
    <div class="news-item">
      <div class="nt">${i + 1}. ${esc(r.team.short)}　${r.w} 胜 ${r.l} 负（小局 ${r.gw}:${r.gl}）</div>
      <div class="nd">2026 LPL · 第三赛段组内赛</div>
    </div>`).join('') || '<div class="empty">暂无积分数据</div>';
}

/* ---------- 赛程 ---------- */
async function renderSchedule() {
  const seg = document.getElementById('season-seg');
  const search = document.getElementById('team-search');
  const box = document.getElementById('schedule-list');
  const seasons = LPLData.seasons();
  seg.innerHTML = seasons.map((s, i) =>
    `<button data-id="${s.id}" class="${i === 0 ? 'active' : ''}">${esc(s.name)}</button>`).join('');
  let current = seasons[0].id;

  const draw = () => {
    const q = (search.value || '').trim().toUpperCase();
    const list = LPLData.matches(current).filter(m =>
      !q || `${m.a}${m.b}${m.name}`.toUpperCase().includes(q));
    // 按轮次分组，组内按日期分组
    const byRound = new Map();
    list.forEach(m => {
      const key = m.round || '未分组';
      if (!byRound.has(key)) byRound.set(key, []);
      byRound.get(key).push(m);
    });
    let html = '';
    for (const [round, ms] of byRound) {
      const finished = ms.filter(m => m.st === '3').length;
      html += `<div class="round-block">
        <div class="round-head">⚑ ${esc(round)} <span>${ms.length} 场 · 已结束 ${finished} 场 · ${esc(LPLData.snap.seasons[current])}</span></div>`;
      let lastDate = '';
      ms.forEach(m => {
        const d = String(m.d).slice(0, 10);
        if (d !== lastDate) { html += `<div class="date-group">${esc(d)}</div>`; lastDate = d; }
        html += matchRowHtml(m);
      });
      html += '</div>';
    }
    box.innerHTML = html || '<div class="empty">没有匹配的比赛</div>';
  };
  seg.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    current = b.dataset.id;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    draw();
  });
  search.addEventListener('input', draw);
  draw();
}

/* ---------- 积分榜 ---------- */
async function renderStandings() {
  const seg = document.getElementById('season-seg');
  const stageSeg = document.getElementById('stage-seg');
  const box = document.getElementById('rank-box');
  const seasons = LPLData.seasons();
  seg.innerHTML = seasons.map((s, i) =>
    `<button data-id="${s.id}" class="${i === 0 ? 'active' : ''}">${esc(s.name)}</button>`).join('');
  let current = seasons[0].id;
  let stage = '';

  const drawStages = () => {
    const stages = LPLData.stageNames(current);
    stageSeg.innerHTML = ['全部', ...stages].map((s, i) =>
      `<button data-s="${esc(s)}" class="${i === 0 ? 'active' : ''}">${esc(s === '全部' ? '全部阶段' : s)}</button>`).join('');
    stage = '全部';
  };
  const draw = () => {
    const rows = LPLData.standings(current, stage === '全部' ? '' : stage);
    box.innerHTML = rows.length ? `
      <table class="rank-table">
        <thead><tr><th>排名</th><th>战队</th><th>胜</th><th>负</th><th>小局胜:负</th><th>净胜局</th><th>胜率</th><th></th></tr></thead>
        <tbody>
        ${rows.map((r, i) => `
          <tr>
            <td class="rk">${i + 1}</td>
            <td><a class="team-cell" href="team-detail.html?tid=${esc(r.team.id)}">${teamLogoImg(r.team)}${esc(r.team.short)}</a></td>
            <td><b class="up">${r.w}</b></td><td><b class="down">${r.l}</b></td>
            <td>${r.gw} : ${r.gl}</td>
            <td>${r.diff > 0 ? '+' + r.diff : r.diff}</td>
            <td>${(r.wr * 100).toFixed(1)}%</td>
            <td><div class="winrate-bar"><i style="width:${(r.wr * 100).toFixed(1)}%"></i></div></td>
          </tr>`).join('')}
        </tbody>
      </table>` : '<div class="empty">该阶段暂无已结束的比赛</div>';
  };
  seg.addEventListener('click', e => {
    const b = e.target.closest('button[data-id]');
    if (!b) return;
    current = b.dataset.id;
    seg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    drawStages(); draw();
  });
  stageSeg.addEventListener('click', e => {
    const b = e.target.closest('button[data-s]');
    if (!b) return;
    stage = b.dataset.s;
    stageSeg.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
    draw();
  });
  drawStages(); draw();
}

/* ---------- 战队 ---------- */
async function renderTeams() {
  const grid = document.getElementById('team-grid');
  const search = document.getElementById('team-search');
  const draw = () => {
    const q = (search.value || '').trim().toUpperCase();
    const list = LPLData.teams.filter(t => !q || `${t.short}${t.name}${t.en}`.toUpperCase().includes(q));
    grid.innerHTML = list.map(t => `
      <a class="team-card" href="team-detail.html?tid=${esc(t.id)}">
        ${teamLogoImg(t)}
        <div><div class="tn">${esc(t.short)}</div><div class="te">${esc(t.en || t.name)}</div></div>
      </a>`).join('') || '<div class="empty">没有匹配的战队</div>';
  };
  search.addEventListener('input', draw);
  draw();
}

/* ---------- 战队详情 ---------- */
async function renderTeamDetail() {
  const tid = new URLSearchParams(location.search).get('tid');
  const box = document.getElementById('detail-box');
  const team = LPLData.team(tid);
  if (!team) { box.innerHTML = '<div class="empty">未找到该战队</div>'; return; }

  // 汇总各赛季战绩
  const seasonStats = [];
  for (const [sid, name] of Object.entries(LPLData.snap.seasons)) {
    const ms = LPLData.snap.matches[sid] || [];
    const mine = ms.filter(m => (m.ta === team.id || m.tb === team.id) && m.st === '3');
    if (!mine.length) continue;
    let w = 0, l = 0, gw = 0, gl = 0;
    mine.forEach(m => {
      const isA = m.ta === team.id;
      const sa = isA ? +m.sa : +m.sb, sb = isA ? +m.sb : +m.sa;
      gw += sa; gl += sb;
      if (sa > sb) w++; else l++;
    });
    seasonStats.push({ sid, name, w, l, gw, gl, total: w + l, wr: (w + l) ? w / (w + l) : 0 });
  }
  const lastMatches = LPLData.recentMatches(200).filter(m => m.ta === team.id || m.tb === team.id).slice(0, 6);

  box.innerHTML = `
    <div class="panel detail-head">
      ${teamLogoImg(team)}
      <div style="flex:1">
        <h1>${esc(team.short)}</h1>
        <div class="sub">${esc(team.name)} · ${esc(team.en)}</div>
      </div>
    </div>
    <div class="stat-cells">
      <div class="stat-cell"><b>${seasonStats.reduce((s, x) => s + x.w, 0)}</b><span>总胜场</span></div>
      <div class="stat-cell"><b>${seasonStats.reduce((s, x) => s + x.l, 0)}</b><span>总负场</span></div>
      <div class="stat-cell"><b>${(() => { const w = seasonStats.reduce((s, x) => s + x.w, 0), t = seasonStats.reduce((s, x) => s + x.total, 0); return t ? (w / t * 100).toFixed(1) + '%' : '-'; })()}</b><span>总胜率</span></div>
      <div class="stat-cell"><b>${seasonStats.length}</b><span>参与赛季(快照内)</span></div>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="sec-title">赛季战绩</div>
      <table class="rank-table">
        <thead><tr><th>赛季</th><th>胜</th><th>负</th><th>小局</th><th>胜率</th><th></th></tr></thead>
        <tbody>${seasonStats.map(s => `
          <tr>
            <td style="color:var(--text-bright);font-weight:700">${esc(s.name)}</td>
            <td><b class="up">${s.w}</b></td><td><b class="down">${s.l}</b></td>
            <td>${s.gw}:${s.gl}</td><td>${(s.wr * 100).toFixed(1)}%</td>
            <td><div class="winrate-bar"><i style="width:${(s.wr * 100).toFixed(1)}%"></i></div></td>
          </tr>`).join('') || '<tr><td colspan="6" class="empty">快照内无比赛记录</td></tr>'}</tbody>
      </table>
    </div>
    <div class="panel" style="margin-top:14px">
      <div class="sec-title">最近比赛</div>
      ${lastMatches.map(matchRowHtml).join('') || '<div class="empty">暂无</div>'}
    </div>`;
}

/* ---------- 启动 ---------- */
(async () => {
  const page = document.body.dataset.page || 'home';
  injectChrome(page);
  await LPLData.init();
  markSource();
  const fn = { home: renderHome, schedule: renderSchedule, standings: renderStandings, teams: renderTeams, team: renderTeamDetail }[page];
  if (fn) await fn();
})();
