#!/usr/bin/env python3
"""
Scraper for indienova.com GameDB GBA platform list.

The list page provides Chinese name + cover + rating.
The English name is fetched from each game's detail page.
"""
import os
import re
import json
import time
import urllib.request
import urllib.error
from html import unescape

OUT_DIR = os.path.dirname(os.path.abspath(__file__))
COVERS_DIR = os.path.join(OUT_DIR, "covers")
DETAILS_DIR = os.path.join(OUT_DIR, "details")
os.makedirs(COVERS_DIR, exist_ok=True)
os.makedirs(DETAILS_DIR, exist_ok=True)

BASE = "https://indienova.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://indienova.com/",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


def fetch(url, retries=3):
    last_err = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=30) as r:
                return r.read().decode("utf-8", errors="ignore")
        except (urllib.error.URLError, TimeoutError) as e:
            last_err = e
            time.sleep(1.5 + i)
    raise last_err


def download(url, out_path):
    if os.path.exists(out_path) and os.path.getsize(out_path) > 0:
        return out_path
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        with urllib.request.urlopen(req, timeout=30) as r:
            data = r.read()
        with open(out_path, "wb") as f:
            f.write(data)
        return out_path
    except Exception as e:
        print(f"  ! fail {url}: {e}")
        return None


# Match each related-game block. Use re.S to allow newlines.
GAME_BLOCK = re.compile(
    r'<div class="related-game">\s*'
    r'<a\s+href="(/game/[a-z0-9\-]+)"[^>]*>\s*'
    r'<img\s+src="([^"]+)"[^>]*title="([^"]+)"[^>]*>\s*'
    r'<span>\s*(.+?)\s*</span>\s*</a>\s*</div>',
    re.S
)

# rating in span after title
RATING_INNER = re.compile(r'<div class="mc-score\s*mc-\w+">\s*(\d+)\s*</div>')


def parse_list_page(html):
    games = []
    for m in GAME_BLOCK.finditer(html):
        slug, cover, title, inner = m.group(1), m.group(2), m.group(3), m.group(4)
        slug = slug.rsplit("/", 1)[-1]
        # extract rating if any
        rm = RATING_INNER.search(inner)
        rating = int(rm.group(1)) if rm else None
        games.append({
            "slug": slug,
            "name": unescape(title).strip(),
            "cover": cover,
            "rating": rating,
        })
    return games


# Game detail page parsing
def parse_detail(html):
    info = {"name_en": None, "description": None, "developer": None,
            "publisher": None, "release_date": None, "genres": []}
    # title block, e.g. <h1>...  <small>Pokémon FireRed Version</small>
    m = re.search(r'<h1[^>]*>(?:[^<]|<(?!small))*?<small>([^<]+)</small>', html, re.S)
    if m:
        info["name_en"] = unescape(m.group(1)).strip()
    # developer / publisher / release
    m = re.search(r'<strong>开发商</strong>\s*<a[^>]*>([^<]+)</a>', html)
    if m:
        info["developer"] = unescape(m.group(1)).strip()
    m = re.search(r'<strong>发行商</strong>\s*<a[^>]*>([^<]+)</a>', html)
    if m:
        info["publisher"] = unescape(m.group(1)).strip()
    m = re.search(r'<strong>发行时间</strong>\s*<span[^>]*>([^<]+)</span>', html)
    if m:
        info["release_date"] = unescape(m.group(1)).strip()
    # genres
    info["genres"] = re.findall(r'<strong>类型</strong>\s*([\s\S]+?)(?:</li>|</ul>)', html)
    if info["genres"]:
        text = info["genres"][0]
        info["genres"] = re.findall(r'>([^<]+)<', text)
        info["genres"] = [unescape(g).strip() for g in info["genres"] if g.strip()]
    # description (first .game-intro / .description)
    m = re.search(r'<div class="game-intro[^\"]*">([\s\S]+?)</div>', html)
    if m:
        info["description"] = re.sub(r'<[^>]+>', ' ', m.group(1))
        info["description"] = re.sub(r'\s+', ' ', unescape(info["description"])).strip()[:1200]
    return info


def main():
    all_games = []
    for p in range(1, 6):
        url = f"{BASE}/gamedb/platform/gba/p/{p}"
        print(f"==> Page {p}: {url}")
        html = fetch(url)
        games = parse_list_page(html)
        print(f"   got {len(games)} games")
        all_games.extend(games)
        time.sleep(0.8)
    print(f"Total: {len(all_games)} games")

    # Download covers
    print("--- downloading covers ---")
    for i, g in enumerate(all_games):
        if i % 20 == 0:
            print(f"  {i+1}/{len(all_games)}")
        out = os.path.join(COVERS_DIR, g["slug"] + ".jpg")
        download(g["cover"], out)
        time.sleep(0.04)

    # Fetch details in batches
    print("--- fetching details (en-name) ---")
    for i, g in enumerate(all_games):
        if i % 20 == 0:
            print(f"  {i+1}/{len(all_games)}")
        if g.get("name_en"):
            continue
        url = BASE + "/game/" + g["slug"]
        try:
            html = fetch(url, retries=2)
            info = parse_detail(html)
            if info.get("name_en"):
                g["name_en"] = info["name_en"]
            # save detail page locally
            out_html = os.path.join(DETAILS_DIR, g["slug"] + ".html")
            with open(out_html, "w", encoding="utf-8") as f:
                f.write(html)
        except Exception as e:
            print(f"  ! detail fail {g['slug']}: {e}")
        time.sleep(0.4)

    with open(os.path.join(OUT_DIR, "gba_games.json"), "w", encoding="utf-8") as f:
        json.dump(all_games, f, ensure_ascii=False, indent=2)
    print(f"Saved {len(all_games)} games to gba_games.json")


if __name__ == "__main__":
    main()
