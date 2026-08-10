#!/usr/bin/env python3
"""解析列表页，提取游戏链接和缩略图URL。"""
import re
import json
import sys
from pathlib import Path

ROOT = Path("/Users/hooksvue/Desktop/traeWork-game/nes-games")

# 匹配 <a href="...game/nes-...?id=..."><img ... src="..."/>...</a> 模式
# 更宽泛的匹配：抓取所有 game/nes-? 链接
all_games = {}

for p in range(1, 9):
    f = ROOT / f"list-{p}.html"
    if not f.exists():
        continue
    html = f.read_text(encoding="utf-8", errors="ignore")

    # 匹配 <a href="/game/nes-XXX?id=YYY" ...>...</a>
    pattern = re.compile(
        r'<a\s+href="(/game/nes-[^"?]+)\?id=([^"&]+)"[^>]*>(.*?)</a>',
        re.DOTALL,
    )
    for m in pattern.finditer(html):
        url = "https://zh.oldvideo.games" + m.group(1)
        gid = m.group(2)
        inner = m.group(3)
        if gid in all_games:
            continue
        # 缩略图
        img_match = re.search(r'<img[^>]+(?:src|data-src|data-original)="([^"]+)"', inner)
        img = img_match.group(1) if img_match else ""
        # 标题
        title_match = re.search(r'<h3[^>]*>(.*?)</h3>', inner, re.DOTALL)
        if not title_match:
            title_match = re.search(r'alt="([^"]+)"', inner)
        title = title_match.group(1).strip() if title_match else ""
        all_games[gid] = {
            "id": gid,
            "url": url + "?id=" + gid,
            "img": img,
            "title": title,
        }

print(f"Total games: {len(all_games)}")
out = ROOT / "games.json"
out.write_text(json.dumps(list(all_games.values()), ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Saved to {out}")
