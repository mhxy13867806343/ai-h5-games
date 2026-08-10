#!/usr/bin/env python3
"""解析详情页，从 NUXT JSON 引用结构中提取游戏信息。"""
import json
import re
import urllib.parse
from pathlib import Path

ROOT = Path("/Users/hooksvue/Desktop/traeWork-game/nes-games")
DETAIL_DIR = ROOT / "details"

games = json.loads((ROOT / "games.json").read_text(encoding="utf-8"))
by_id = {g["id"]: g for g in games}

NUXT_RE = re.compile(r'<script[^>]*id="__NUXT_DATA__"[^>]*>(.*?)</script>', re.DOTALL)
META_RE = re.compile(r'<meta\s+(?:property|name)="og:title"\s+content="([^"]+)"')
TITLE_RE = re.compile(r'<title>([^<]+)</title>')
DESC_RE = re.compile(r'<meta\s+(?:property|name)="(?:og:description|description)"\s+content="([^"]+)"')

def resolve(data, ref):
    """NUXT 引用解析: ref 可以是 int 位置，或 dict 引用对象。"""
    if isinstance(ref, int):
        if 0 <= ref < len(data):
            return data[ref]
    if isinstance(ref, list):
        return [resolve(data, x) for x in ref]
    if isinstance(ref, dict):
        return {k: resolve(data, v) for k, v in ref.items()}
    return ref

def find_game_obj(data):
    """从 NUXT data 中找游戏对象（含 id/title/rom/image 等字段）。"""
    for i, item in enumerate(data):
        if isinstance(item, dict) and 'title' in item and 'rom' in item and 'image' in item:
            return resolve(data, i)
    return None

def find_game_id_key(data, gid):
    """从 NUXT data 中找 game-{uuid} 键。"""
    for item in data:
        if isinstance(item, dict):
            for k, v in item.items():
                if k == f"game-{gid}" and isinstance(v, int):
                    return v
    return None

count = 0
for det in sorted(DETAIL_DIR.glob("*.html")):
    gid = det.stem
    g = by_id.get(gid)
    if not g:
        continue
    html = det.read_text(encoding="utf-8", errors="ignore")

    title = ""
    cover = ""
    rom = ""

    # NUXT data
    m = NUXT_RE.search(html)
    if m:
        try:
            data = json.loads(m.group(1))
            # 1. 通过 game-{uuid} 键查找
            ref = find_game_id_key(data, gid)
            if ref is not None:
                game_obj = resolve(data, ref)
                if isinstance(game_obj, dict):
                    # 再次 resolve 每个字段
                    raw_title = game_obj.get("title", 0)
                    raw_cover = game_obj.get("image", 0)
                    raw_rom = game_obj.get("rom", 0)
                    raw_url = game_obj.get("url", 0)
                    if isinstance(raw_title, int) and raw_title < len(data):
                        title = data[raw_title] or ""
                    if isinstance(raw_cover, int) and raw_cover < len(data):
                        cover = data[raw_cover] or ""
                    if isinstance(raw_rom, int) and raw_rom < len(data):
                        rom = data[raw_rom] or ""
                    if not rom and isinstance(raw_url, int) and raw_url < len(data):
                        url_val = data[raw_url]
                        if isinstance(url_val, str) and "rom=" in url_val:
                            u = urllib.parse.urlparse(url_val)
                            qs = urllib.parse.parse_qs(u.query)
                            if "rom" in qs:
                                rom = qs["rom"][0]
            # 2. 兜底：直接搜
            if not rom:
                for item in data:
                    if isinstance(item, str) and "binary.zaixianwan.app" in item and ".nes.zip" in item:
                        rom = item
                        break
            if not cover:
                for item in data:
                    if isinstance(item, str) and "images.zaixianwan.app" in item and item.endswith(".webp") and "title" not in item.lower():
                        cover = item
                        break
        except Exception as e:
            pass

    # 兜底：HTML 中直接匹配
    if not rom:
        m2 = re.search(r'(https?://binary\.zaixianwan\.app/[a-f0-9]+\.nes\.zip)', html)
        if m2:
            rom = m2.group(1)
    if not cover:
        m2 = re.search(r'(https?://images\.zaixianwan\.app/[a-f0-9]+\.webp)', html)
        if m2:
            cover = m2.group(1)

    # 标题兜底
    if not title:
        m2 = META_RE.search(html)
        if m2:
            mm = re.search(r'《([^》]+)》', m2.group(1))
            if mm:
                inner = mm.group(1)
                inner = re.sub(r'^(FC|NES)\s+', '', inner)
                inner = re.sub(r'\s*-\s*.*?模拟器.*$', '', inner)
                title = inner
    if not title:
        m2 = TITLE_RE.search(html)
        if m2:
            mm = re.search(r'《([^》]+)》', m2.group(1))
            if mm:
                inner = mm.group(1)
                inner = re.sub(r'^(FC|NES)\s+', '', inner)
                inner = re.sub(r'\s*-\s*.*?模拟器.*$', '', inner)
                title = inner

    g["title"] = title
    g["cover"] = cover
    g["rom"] = rom

    # 描述
    m = DESC_RE.search(html)
    g["desc"] = m.group(1) if m else ""

    if g.get("rom"):
        count += 1
    else:
        print(f"  No ROM: {g.get('title', '?')} ({gid})")

# 保存
out = ROOT / "games-final.json"
out.write_text(json.dumps(games, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"With ROM: {count}/{len(games)}")
print(f"Saved: {out}")

# 打印前20个样例
for g in games[:20]:
    t = str(g.get('title', '?'))[:40]
    r = str(g.get('rom', ''))[:60]
    print(f"  {t:40s} | {r}")
