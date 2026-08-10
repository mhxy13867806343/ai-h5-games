#!/usr/bin/env python3
"""使用 urllib 下载所有游戏的缩略图(curl 不在 PATH 中时的备用方案)。"""
import json
import re
import hashlib
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path("/Users/hooksvue/Desktop/traeWork-game/nes-games")
COVER_DIR = ROOT / "covers"
COVER_DIR.mkdir(exist_ok=True)

games = json.loads((ROOT / "games-final.json").read_text(encoding="utf-8"))


def safe_filename(s, ext):
    h = hashlib.md5(s.encode()).hexdigest()[:10]
    return f"{h}.{ext}"


UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def fetch(idx_game):
    idx, g = idx_game
    cover = g.get("cover", "")
    if not cover:
        return idx, g, "no cover"
    ext = "webp"
    mm = re.search(r'\.([a-z]+)(?:\?|$)', cover)
    if mm:
        ext = mm.group(1)
    fname = safe_filename(cover, ext)
    fp = COVER_DIR / fname
    if fp.exists() and fp.stat().st_size > 100:
        g["cover_local"] = f"covers/{fname}"
        return idx, g, "cached"
    try:
        req = urllib.request.Request(cover, headers={"User-Agent": UA, "Referer": "https://zh.oldvideo.games/"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        if data and len(data) > 100:
            fp.write_bytes(data)
            g["cover_local"] = f"covers/{fname}"
            return idx, g, None
        return idx, g, "empty"
    except Exception as e:
        return idx, g, str(e)


with ThreadPoolExecutor(max_workers=10) as pool:
    futures = [pool.submit(fetch, (i, g)) for i, g in enumerate(games)]
    for f in as_completed(futures):
        idx, g, err = f.result()
        if err and err not in ("cached", "no cover", "empty"):
            print(f"  Error: {g.get('title', '?')}: {err}")

(ROOT / "games-final.json").write_text(json.dumps(games, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Covers downloaded: {sum(1 for g in games if g.get('cover_local'))}/{len(games)}")
