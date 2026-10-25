/* ============================================================
   AI 资源导航 —— 数据驱动渲染
   数据来源优先级：data.json（fetch）→ data-fallback.js（file:// 兜底）
   增删改站点：只需编辑 data.json 对应分类的 items，刷新即生效
   ============================================================ */
'use strict';

const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

let DATA = { site: {}, categories: [] };
let activeCat = '';

/* ---------- 数据加载 ---------- */
async function loadData() {
  try {
    const res = await fetch('data.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const d = await res.json();
    if (!Array.isArray(d.categories)) throw new Error('bad shape');
    DATA = d;
    return 'json';
  } catch (e) {
    DATA = window.NAV_FALLBACK || DATA;
    return 'fallback';
  }
}

/* ---------- 渲染 ---------- */
function renderTabs() {
  const tabs = $('#cat-tabs');
  tabs.innerHTML = `<button data-cat="" class="${activeCat === '' ? 'active' : ''}">🌐 全部</button>` +
    DATA.categories.map(c =>
      `<button data-cat="${esc(c.id)}" class="${activeCat === c.id ? 'active' : ''}">${esc(c.icon)} ${esc(c.name)}</button>`
    ).join('');
}

function matches(item, q) {
  if (!q) return true;
  const hay = `${item.name} ${item.desc || ''} ${(item.tags || []).join(' ')}`.toLowerCase();
  return q.split(/\s+/).every(w => hay.includes(w));
}

function render() {
  const q = ($('#search').value || '').trim().toLowerCase();
  const content = $('#content');
  const cats = DATA.categories.filter(c => activeCat === '' || c.id === activeCat);
  let shown = 0;
  let html = '';

  for (const c of cats) {
    const items = (c.items || []).filter(it => matches(it, q));
    if (!items.length) continue;
    shown += items.length;
    html += `
      <section class="group">
        <div class="group-head">
          <span class="g-icon">${esc(c.icon || '🔗')}</span>
          <h2>${esc(c.name)}</h2>
          <span class="g-count">${items.length} 个站点</span>
        </div>
        <div class="card-grid">
          ${items.map(it => `
            <a class="card" href="${esc(it.url)}" target="_blank" rel="noopener noreferrer">
              <span class="c-head">
                <span class="c-name">${esc(it.name)}</span>
                <span class="c-out">↗</span>
              </span>
              ${it.desc ? `<span class="c-desc">${esc(it.desc)}</span>` : ''}
              ${(it.tags || []).length ? `<span class="c-tags">${it.tags.map(t => `<i>${esc(t)}</i>`).join('')}</span>` : ''}
              <span class="c-url">${esc(it.url)}</span>
            </a>`).join('')}
        </div>
      </section>`;
  }

  content.innerHTML = html || '<div class="empty">没有匹配的资源，换个关键词试试</div>';
  $('#count-line').textContent = `共 ${shown} 个站点 · ${DATA.categories.length} 个分类`;
}

/* ---------- 页头/页脚 ---------- */
function renderChrome() {
  document.title = `${DATA.site.title || 'AI 资源导航'}`;
  $('#site-title').textContent = DATA.site.title || 'AI 资源导航';
  $('#site-subtitle').textContent = DATA.site.subtitle || '';
  const total = DATA.categories.reduce((s, c) => s + (c.items || []).length, 0);
  $('#footer').innerHTML = `
    数据来源：<a href="https://ai-bot.cn/daily-ai-news/" target="_blank" rel="noopener">ai-bot.cn</a> /
    <a href="https://devs.li/" target="_blank" rel="noopener">devs.li</a> /
    <a href="https://bewild.ai/subscribe" target="_blank" rel="noopener">bewild.ai</a> /
    <a href="https://pixabay.com/sound-effects/" target="_blank" rel="noopener">pixabay</a> 等公开站点 ·
    共收录 ${total} 个站点 ·
    <a href="../index.html">← 返回大厅</a>`;
}

/* ---------- 事件 ---------- */
$('#search').addEventListener('input', e => {
  // 搜索时跨全部分类（有输入则忽略当前分类筛选）
  if (e.target.value.trim()) {
    activeCat = '';
    renderTabs();
  }
  render();
});
$('#cat-tabs').addEventListener('click', e => {
  const btn = e.target.closest('button[data-cat]');
  if (!btn) return;
  activeCat = btn.dataset.cat;
  renderTabs();
  render();
});

/* ---------- 启动 ---------- */
(async () => {
  const src = await loadData();
  renderChrome();
  renderTabs();
  render();
  console.info(`[ai-nav] 数据源: ${src === 'json' ? 'data.json（实时）' : '内置兜底（file:// 打开时）'}`);
})();
