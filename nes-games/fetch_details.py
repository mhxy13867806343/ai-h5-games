#!/usr/bin/env python3
"""批量下载所有游戏的详情页，提取 ROM URL。"""
import json
import re
import time
import subprocess
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
    if fp.exists():
        return idx, g, None
    try:
        result = subprocess.run(
            ["curl", "-sL", "-A", UA, "--max-time", "30", g["url"]],
            capture_output=True, timeout=35
        )
        fp.write_bytes(result.stdout)
        return idx, g, None
    except Exception as e:
        return idx, g, str(e)

with ThreadPoolExecutor(max_workers=8) as pool:
    futures = [pool.submit(fetch, (i, g)) for i, g in enumerate(games)]
    done = 0
    for f in as_completed(futures):
        done += 1
        if done % 20 == 0:
            print(f"Progress: {done}/{len(games)}")
        idx, g, err = f.result()
        if err:
            print(f"Error {g['title']}: {err}")
print("All done")
