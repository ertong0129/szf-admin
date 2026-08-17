#!/usr/bin/env python3
"""Fetch original 300×300 map slices from the public CDN and stitch them.

URL rule (verified against jing_cheng/12_15.jpg):
  http://mccq.static.mingchao.com/55598/com/maps/{folder}/{col}_{row}.jpg

Each slice is a 300×300 JPEG of the already-projected isometric scene.
The filename is {row}_{col}.jpg (row grows downward, col grows right).
Place the piece at pixel (col * 300, row * 300). Example: jing_cheng/12_15.jpg
sits 15 tiles from the left and 12 tiles from the top.

.mcm slice tables are 403 on this CDN, so bounds are probed with HEAD.
Raw 300×300 files stay in a local cache and are not copied into git.
This script writes one downscaled JPEG per map plus manifest.json.
"""
from __future__ import annotations

import argparse
import io
import json
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image

BASE = "http://mccq.static.mingchao.com/55598/com/maps"
TILE = 300
MAX_EDGE = 2048
JPEG_QUALITY = 82
UA = "Mozilla/5.0"

# folder -> in-game mapId / walk grid (js/npc-layout.js MAP_SIZE, plus buildMap overrides)
MAPS = {
    "jing_cheng": {"mapId": "capital", "walkW": 175, "walkH": 172, "originX": 51, "name": "京城"},
    "kai_feng": {"mapId": "kaifeng", "walkW": 160, "walkH": 120, "name": "开封"},
    "ping_jiang": {"mapId": "pingjiang", "walkW": 120, "walkH": 110, "name": "平江"},
    "quan_zhou": {"mapId": "quanzhou", "walkW": 135, "walkH": 135, "name": "泉州"},
    "zhe_dong": {"mapId": "zhedong", "walkW": 120, "walkH": 130, "name": "浙东"},
    "xi_liang": {"mapId": "xiliang", "walkW": 100, "walkH": 50, "name": "西凉"},
    "xin_shou_cun": {"mapId": "taiping", "walkW": 80, "walkH": 115, "name": "太平村"},
    "heng_jian_shan": {"mapId": "wild", "walkW": 110, "walkH": 80, "name": "横涧山"},
    "shen_nong_jia": {"mapId": "shennong", "walkW": 115, "walkH": 150, "name": "神农架"},
    "xing_hua_ling": {"mapId": "xinghua", "walkW": 115, "walkH": 115, "name": "杏花岭"},
    "an_nan": {"mapId": "annan", "walkW": 110, "walkH": 105, "name": "安南"},
    "da_mo": {"mapId": "desert", "walkW": 90, "walkH": 100, "name": "大漠"},
    "tu_mu_bao": {"mapId": "tumu", "walkW": 50, "walkH": 36, "name": "土木堡"},
    "jian_zhou": {"mapId": "jianzhou", "walkW": 50, "walkH": 36, "name": "建州"},
    "bian_cheng_1": {"mapId": "border", "walkW": 90, "walkH": 85, "name": "边城"},
    "jing_ji_chang": {"mapId": "arena", "walkW": 24, "walkH": 24, "name": "竞技场"},
    "bu_yu_er_hai": {"mapId": "fish", "walkW": 50, "walkH": 36, "name": "捕鱼儿海"},
    "shen_gong_die_ying": {"mapId": "palace", "walkW": 32, "walkH": 22, "name": "深宫谍影"},
    "bu_bu_jing_xin": {"mapId": "jingxin", "walkW": 32, "walkH": 22, "name": "步步惊心"},
}

# Extra folder names to probe (鄱阳湖 / 副本). Only kept if 0_0.jpg exists and is a real tile.
EXTRA = {
    "po_yang_hu": {"mapId": "boyang", "walkW": 100, "walkH": 90, "name": "鄱阳湖"},
    "po_yang": {"mapId": "boyang", "walkW": 100, "walkH": 90, "name": "鄱阳湖"},
    "poyang_hu": {"mapId": "boyang", "walkW": 100, "walkH": 90, "name": "鄱阳湖"},
    "boyang": {"mapId": "boyang", "walkW": 100, "walkH": 90, "name": "鄱阳湖"},
    "guan_dao": {"mapId": "road", "walkW": 56, "walkH": 22, "name": "官道押镖"},
    "ya_biao": {"mapId": "road", "walkW": 56, "walkH": 22, "name": "官道押镖"},
    "kai_feng_tie_ta": {"mapId": "pagoda", "walkW": 24, "walkH": 28, "name": "开封铁塔"},
    "tie_ta": {"mapId": "pagoda", "walkW": 24, "walkH": 28, "name": "开封铁塔"},
    "ying_xiong": {"mapId": "tower", "walkW": 26, "walkH": 26, "name": "大明英雄副本"},
    "da_ming_ying_xiong": {"mapId": "tower", "walkW": 26, "walkH": 26, "name": "大明英雄副本"},
}

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path("/tmp/mccq-maptiles")
OUT = ROOT / "assets" / "ingame" / "maptiles"


def http_open(url: str, method: str = "GET", timeout: int = 30):
    req = urllib.request.Request(url, method=method, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=timeout)


def http_status(url: str, timeout: int = 12) -> int:
    try:
        with http_open(url, method="HEAD", timeout=timeout) as r:
            return int(getattr(r, "status", 200) or 200)
    except urllib.error.HTTPError as e:
        return int(e.code)
    except Exception:
        return 0


def http_get(url: str, timeout: int = 40, retries: int = 3) -> bytes | None:
    last = None
    for i in range(retries):
        try:
            with http_open(url, method="GET", timeout=timeout) as r:
                data = r.read()
            if data:
                return data
        except Exception as e:
            last = e
            time.sleep(0.4 * (i + 1))
    if last:
        print("  fail", url, last, file=sys.stderr)
    return None


def tile_url(folder: str, row: int, col: int) -> str:
    return f"{BASE}/{folder}/{row}_{col}.jpg"


def tile_exists(folder: str, row: int, col: int) -> bool:
    return http_status(tile_url(folder, row, col)) == 200


def find_max(folder: str, axis: str) -> int:
    """Largest row (axis='row', col=0) or col (axis='col', row=0) that exists."""
    lo, hi = 0, 1
    while hi <= 64:
        row, col = (hi, 0) if axis == "row" else (0, hi)
        if not tile_exists(folder, row, col):
            break
        lo = hi
        hi *= 2
    else:
        return lo
    while lo + 1 < hi:
        mid = (lo + hi) // 2
        row, col = (mid, 0) if axis == "row" else (0, mid)
        if tile_exists(folder, row, col):
            lo = mid
        else:
            hi = mid
    return lo


def probe_folder(folder: str) -> dict | None:
    if not tile_exists(folder, 0, 0):
        return None
    sample = http_get(tile_url(folder, 0, 0))
    if not sample or len(sample) < 2000:
        return None
    try:
        im = Image.open(io.BytesIO(sample))
        tw, th = im.size
    except Exception:
        return None
    if tw < 64 or th < 64:
        return None
    rows = find_max(folder, "row") + 1
    cols = find_max(folder, "col") + 1
    return {"cols": cols, "rows": rows, "tileW": tw, "tileH": th}


def cache_path(folder: str, row: int, col: int) -> Path:
    d = CACHE / folder
    d.mkdir(parents=True, exist_ok=True)
    return d / f"{row}_{col}.jpg"


def fetch_tile(folder: str, row: int, col: int) -> tuple[int, int, Path | None]:
    dest = cache_path(folder, row, col)
    if dest.exists() and dest.stat().st_size > 800:
        return row, col, dest
    data = http_get(tile_url(folder, row, col))
    if not data or len(data) < 800:
        return row, col, None
    dest.write_bytes(data)
    return row, col, dest


def download_grid(folder: str, cols: int, rows: int, workers: int) -> dict[tuple[int, int], Path]:
    jobs = [(r, c) for r in range(rows) for c in range(cols)]
    got: dict[tuple[int, int], Path] = {}
    done = 0
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futs = [pool.submit(fetch_tile, folder, r, c) for r, c in jobs]
        for fut in as_completed(futs):
            row, col, path = fut.result()
            done += 1
            if path:
                got[(row, col)] = path
            if done % 40 == 0 or done == len(jobs):
                print(f"  {folder}: {done}/{len(jobs)}  got {len(got)}", flush=True)
    return got


def stitch(folder: str, cols: int, rows: int, tile_w: int, tile_h: int, files: dict[tuple[int, int], Path]) -> Image.Image:
    canvas = Image.new("RGB", (cols * tile_w, rows * tile_h), (8, 10, 12))
    for (row, col), path in files.items():
        try:
            im = Image.open(path).convert("RGB")
        except Exception:
            continue
        if im.size != (tile_w, tile_h):
            im = im.resize((tile_w, tile_h), Image.Resampling.BILINEAR)
        canvas.paste(im, (col * tile_w, row * tile_h))
    return canvas


def downscale(im: Image.Image, max_edge: int) -> Image.Image:
    w, h = im.size
    edge = max(w, h)
    if edge <= max_edge:
        return im
    scale = max_edge / edge
    nw = max(1, int(round(w * scale)))
    nh = max(1, int(round(h * scale)))
    return im.resize((nw, nh), Image.Resampling.LANCZOS)


def process_folder(folder: str, info: dict, workers: int, max_edge: int) -> dict | None:
    print(f"probe {folder} ({info['name']})...", flush=True)
    bounds = probe_folder(folder)
    if not bounds:
        print(f"  skip {folder}: no 0_0.jpg", flush=True)
        return None
    cols, rows = bounds["cols"], bounds["rows"]
    tw, th = bounds["tileW"], bounds["tileH"]
    print(f"  grid {cols}×{rows}  tile {tw}×{th}  native {cols * tw}×{rows * th}", flush=True)
    files = download_grid(folder, cols, rows, workers)
    if len(files) < max(1, int(cols * rows * 0.5)):
        print(f"  skip {folder}: only {len(files)}/{cols * rows} tiles", flush=True)
        return None
    print(f"  stitch {folder}...", flush=True)
    big = stitch(folder, cols, rows, tw, th, files)
    small = downscale(big, max_edge)
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{folder}.jpg"
    small.save(dest, "JPEG", quality=JPEG_QUALITY, optimize=True)
    rec = {
        "folder": folder,
        "mapId": info["mapId"],
        "name": info["name"],
        "cols": cols,
        "rows": rows,
        "tileSize": tw,
        "nativeW": cols * tw,
        "nativeH": rows * th,
        "imgW": small.size[0],
        "imgH": small.size[1],
        "walkW": info["walkW"],
        "walkH": info["walkH"],
        "originX": int(info.get("originX") or 0),
        "originY": 0,
        "viewNative": 1000,
        "tiles": len(files),
        "file": f"{folder}.jpg",
        "bytes": dest.stat().st_size,
    }
    print(
        f"  wrote {dest.name} {small.size[0]}×{small.size[1]}  {dest.stat().st_size} bytes",
        flush=True,
    )
    return rec


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--maps", default="", help="comma-separated folder names (default: all known)")
    ap.add_argument("--workers", type=int, default=20)
    ap.add_argument("--max-edge", type=int, default=MAX_EDGE)
    args = ap.parse_args()

    catalog = dict(MAPS)
    wanted = [s.strip() for s in args.maps.split(",") if s.strip()] if args.maps else list(MAPS)
    if not args.maps:
        print("probe extra folders...", flush=True)
        for folder, info in EXTRA.items():
            if tile_exists(folder, 0, 0):
                sample = http_get(tile_url(folder, 0, 0)) or b""
                if len(sample) >= 2000:
                    catalog[folder] = info
                    wanted.append(folder)
                    print(f"  extra hit {folder}", flush=True)

    CACHE.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    maps_out: dict[str, dict] = {}
    for folder in wanted:
        info = catalog.get(folder)
        if not info:
            print(f"unknown folder {folder}", file=sys.stderr)
            continue
        rec = process_folder(folder, info, args.workers, args.max_edge)
        if rec:
            maps_out[folder] = rec

    manifest = {
        "tileSize": TILE,
        "cdn": BASE,
        "rule": "{folder}/{row}_{col}.jpg at pixel (col*tile, row*tile)",
        "maps": maps_out,
    }
    man_path = OUT / "manifest.json"
    man_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {man_path}  maps={len(maps_out)}", flush=True)
    return 0 if maps_out else 1


if __name__ == "__main__":
    raise SystemExit(main())
