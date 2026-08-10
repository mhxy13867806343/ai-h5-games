#!/usr/bin/env python3
"""使用 urllib 批量下载所有游戏的详情页(curl 不在 PATH 中时的备用方案)。"""
import json
import time
import urllib.request
import urllib.error
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = Path("/Users/hooksvue/Desktop/traeWork-game/nes-games")
DETAIL_DIR = ROOT / "details"
DETAIL_DIR.mkdir(exist_ok=True)

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"

games = json.loads((ROOT / "games.json").read_text(encoding="utf-8"))
print(f"Processing {len(games)} games")


def fetch(idx_game):
    idx, g = idx_game
    fp = DETAIL_DIR / f"{g['id']}.html"
    if fp.exists() and fp.stat().st_size > 1000:
        return idx, g, "cached"
    try:
        req = urllib.request.Request(g["url"], headers={"User-Agent": UA, "Accept": "text/html,*/*"})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        if data and len(data) > 500:
            fp.write_bytes(data)
            return idx, g, None
        return idx, g, "empty"
    except Exception as e:
        return idx, g, str(e)


with ThreadPoolExecutor(max_workers=10) as pool:
    futures = [pool.submit(fetch, (i, g)) for i, g in enumerate(games)]
    done = 0
    cached = 0
    fetched = 0
    errors = 0
    for f in as_completed(futures):
        done += 1
        idx, g, err = f.result()
        if err == "cached":
            cached += 1
        elif err is None:
            fetched += 1
        else:
            errors += 1
        if done % 20 == 0:
            print(f"Progress: {done}/{len(games)} fetched={fetched} cached={cached} errors={errors}")
        if err and err not in ("cached", "empty"):
            print(f"  Error {g.get('id','?')}: {err}")
print(f"Done. fetched={fetched} cached={cached} errors={errors}")
