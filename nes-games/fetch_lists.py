#!/usr/bin/env python3
"""使用 urllib 抓取列表页(curl 不在 PATH 中时的备用方案)。"""
import urllib.request
import re
import sys
from pathlib import Path

ROOT = Path("/Users/hooksvue/Desktop/traeWork-game/nes-games")
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"


def fetch(url, timeout=30):
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html,*/*"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read().decode("utf-8", errors="ignore")


for p in range(int(sys.argv[1]) if len(sys.argv) > 1 else 6, int(sys.argv[2]) if len(sys.argv) > 2 else 9):
    out = ROOT / f"list-{p}.html"
    url = f"https://zh.oldvideo.games/platform/nes?page={p}"
    try:
        html = fetch(url)
        out.write_text(html, encoding="utf-8")
        m = re.findall(r'<a\s+href="(/game/nes-[^"?]+)\?id=([^"&]+)"', html)
        print(f"list-{p}: {len(m)} entries, {len(out.stat().st_size)} bytes" if False else f"list-{p}: {len(m)} entries, {out.stat().st_size} bytes")
    except Exception as e:
        print(f"list-{p}: ERROR {e}")
