#!/usr/bin/env python3
"""为 nes-games 创建索引页（列表 + 分页）。"""
import json
import math
from pathlib import Path

ROOT = Path("/Users/hooksvue/Desktop/traeWork-game/nes-games")

games = json.loads((ROOT / "games-final.json").read_text(encoding="utf-8"))

# 每页 30 个
PER_PAGE = 30
total_pages = math.ceil(len(games) / PER_PAGE)

# 写入所有页面的索引
PAGE_SIZE = 30

INDEX_TPL_HEAD = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>红白机（FC / NES）游戏大全 - {total}款免费在线玩 - 复古游戏中文网</title>
<meta name="description" content="免费在线游玩经典红白机（FC / NES）游戏，无下载，浏览器直接畅玩，支持PC和手机，重温童年回忆。">
<link rel="stylesheet" href="style.css">
<style>
.list-page {{ max-width: 1280px; margin: 0 auto; padding: 20px; }}
.header {{ background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 22px; margin-bottom: 20px; }}
.header h1 {{ font-size: 24px; margin-bottom: 8px; }}
.header .stats {{ color: var(--muted); font-size: 14px; display: flex; gap: 16px; flex-wrap: wrap; }}
.search-bar {{ background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 14px 20px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }}
.search-bar input {{ flex: 1; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 10px 14px; border-radius: 8px; font-size: 14px; outline: none; }}
.search-bar input:focus {{ border-color: var(--brand); }}
.game-grid {{ display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 18px; margin-bottom: 24px; }}
.game-card {{ background: var(--panel); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; text-decoration: none; color: var(--text); transition: all 0.2s; display: flex; flex-direction: column; }}
.game-card:hover {{ transform: translateY(-4px); border-color: var(--brand); box-shadow: 0 8px 24px rgba(59,130,246,0.2); }}
.game-card .cover {{ aspect-ratio: 1; background: var(--bg); display: flex; align-items: center; justify-content: center; overflow: hidden; }}
.game-card .cover img {{ width: 100%; height: 100%; object-fit: cover; }}
.game-card .title {{ padding: 10px 12px; font-size: 13px; font-weight: 500; line-height: 1.4; min-height: 56px; display: flex; align-items: center; }}
.game-card .tag {{ font-size: 11px; background: var(--brand); color: #fff; padding: 2px 8px; border-radius: 10px; display: inline-block; margin: 0 12px 10px; }}
.pagination {{ display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; padding: 20px 0; }}
.pagination a {{ background: var(--panel); color: var(--text); border: 1px solid var(--border); padding: 8px 14px; border-radius: 6px; text-decoration: none; font-size: 13px; min-width: 40px; text-align: center; transition: all 0.2s; }}
.pagination a:hover {{ background: var(--panel-2); border-color: var(--brand); }}
.pagination a.active {{ background: linear-gradient(135deg, var(--brand), var(--brand-2)); border-color: transparent; color: #fff; font-weight: 600; }}
.pagination a.disabled {{ opacity: 0.5; cursor: not-allowed; }}
</style>
</head>
<body>
<nav class="nav">
  <div class="nav-inner">
    <a href="../index.html" class="logo">🎮 复古游戏中文网</a>
    <a href="index.html">首页</a>
    <a href="index.html">游戏列表</a>
    <a href="../index.html">所有游戏</a>
    <span class="spacer"></span>
    <span class="platform-tag">FC / NES</span>
  </div>
</nav>
"""

INDEX_TPL_BODY = """<div class="list-page">
  <div class="header">
    <h1>🎮 红白机（FC / NES）游戏大全</h1>
    <div class="stats">
      <span>📚 共 <b style="color:var(--brand)">{total}</b> 款游戏</span>
      <span>🆓 完全免费</span>
      <span>💻 浏览器即玩</span>
      <span>📱 支持手机</span>
    </div>
  </div>

  <div class="search-bar">
    <span style="color:var(--muted)">🔍</span>
    <input type="text" id="search" placeholder="搜索游戏名称...">
  </div>

  <div class="game-grid" id="grid">
{game_cards}
  </div>

  <div class="pagination">
    <a href="index{prev}.html" class="{prev_class}">‹ 上一页</a>
{pages_links}
    <a href="index{next}.html" class="{next_class}">下一页 ›</a>
  </div>
</div>

<footer style="background:#0b1020;border-top:1px solid var(--border);color:var(--muted);text-align:center;padding:24px 20px;font-size:13px">
  <div>© 2026 复古游戏中文网 · 致力于为您提供经典的怀旧游戏体验</div>
</footer>

<script>
document.getElementById("search").addEventListener("input", (e) => {{
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll(".game-card").forEach(card => {{
    const t = card.dataset.title.toLowerCase();
    card.style.display = t.includes(q) ? "" : "none";
  }});
}});
</script>
</body>
</html>
"""

def escape_html(s):
    return (s.replace('&', '&amp;')
             .replace('<', '&lt;')
             .replace('>', '&gt;')
             .replace('"', '&quot;'))

# 写每页
for p in range(1, total_pages + 1):
    start = (p - 1) * PER_PAGE
    end = min(start + PER_PAGE, len(games))
    page_games = games[start:end]

    cards = []
    for g in page_games:
        title = g.get("title", "未命名")
        slug = g.get("slug", "")
        cover_local = g.get("cover_local", "")
        if cover_local:
            cover = f"covers/{cover_local.split('/')[-1]}" if "/" in cover_local else cover_local
            cover_html = f'<img src="{cover}" alt="{escape_html(title)}" loading="lazy" onerror="this.style.display=\'none\';this.parentElement.innerHTML=\'<div style=\\"color:var(--muted);font-size:40px\\">🎮</div>\'">'
        else:
            cover_html = '<div style="color:var(--muted);font-size:40px">🎮</div>'

        cards.append(
            f'    <a href="games/{escape_html(slug)}.html" class="game-card" data-title="{escape_html(title)}">\n'
            f'      <div class="cover">{cover_html}</div>\n'
            f'      <div class="title">{escape_html(title)}</div>\n'
            f'      <div><span class="tag">FC</span></div>\n'
            f'    </a>'
        )

    # 分页
    pages_links = []
    for pn in range(1, total_pages + 1):
        cls = "active" if pn == p else ""
        href = f"index{pn}.html" if pn != 1 else "index.html"
        pages_links.append(f'    <a href="{href}" class="{cls}">{pn}</a>')

    prev = p - 1 if p > 1 else 1
    next_ = p + 1 if p < total_pages else total_pages
    prev_class = "" if p > 1 else "disabled"
    next_class = "" if p < total_pages else "disabled"

    body = INDEX_TPL_BODY.format(
        total=len(games),
        game_cards="\n".join(cards),
        prev=prev,
        next=next_,
        prev_class=prev_class,
        next_class=next_class,
        pages_links="\n".join(pages_links),
    )
    html = INDEX_TPL_HEAD.format(total=len(games)) + body
    if p == 1:
        fp = ROOT / "index.html"
    else:
        fp = ROOT / f"index{p}.html"
    fp.write_text(html, encoding="utf-8")

print(f"Generated {total_pages} index pages")
