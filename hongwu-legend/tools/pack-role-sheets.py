#!/usr/bin/env python3
"""Pack original role fashion/mount bitmaps from the public CDN.

Downloads SWF from mccq.static.mingchao.com, extracts JPEG3+alpha frames,
and writes PNG spritesheets. Never copies SWF into the git repo.
"""
from __future__ import annotations

import io
import struct
import urllib.request
import zlib
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

BASE = "http://mccq.static.mingchao.com/55598"
TMP = Path("/tmp/mccq-role")
OUT = Path(__file__).resolve().parents[1] / "assets" / "ingame" / "role"

FASHIONS = {
    "plain": (10001, 10002),
    "ink": (10011, 10012),
    "gold": (10031, 10032),
    "crimson": (10101, 10102),
}

BODY_CELL = (104, 132)
MOUNT_CELL = (104, 112)
COLS = 6
BODY_ROWS = 26
MOUNT_ROWS = 10

# row bases in the body sheet (dir 0..4 occupy consecutive rows)
BODY_ROW = {
    "stand": 0,
    "walk": 5,
    "attack": 10,
    "arrow": 15,
    "cast": 20,
    "sit": 25,
}
MOUNT_ROW = {"stand": 0, "walk": 5}


def http_get(url: str, timeout: int = 60) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def decompress_swf(data: bytes) -> bytes:
    if data[:3] == b"CWS":
        return b"FWS" + data[3:8] + zlib.decompress(data[8:])
    return data


def parse_rect(data: bytes, i: int) -> int:
    nbits = data[i] >> 3
    bits = nbits * 4 + 5
    return i + (bits + 7) // 8


def iter_tags(data: bytes):
    i = 8
    i = parse_rect(data, i)
    i += 4
    n = len(data)
    while i + 2 <= n:
        code_len = struct.unpack_from("<H", data, i)[0]
        i += 2
        tag = code_len >> 6
        ln = code_len & 0x3F
        if ln == 0x3F:
            if i + 4 > n:
                break
            ln = struct.unpack_from("<I", data, i)[0]
            i += 4
        payload = data[i : i + ln]
        yield tag, payload
        i += ln
        if tag == 0:
            break


def jpeg3_to_png(payload: bytes):
    if len(payload) < 6:
        return None
    _cid, alpha_off = struct.unpack_from("<HI", payload, 0)
    jpeg = payload[6 : 6 + alpha_off]
    alpha_z = payload[6 + alpha_off :]
    a = jpeg.find(b"\xff\xd8")
    b = jpeg.rfind(b"\xff\xd9")
    if a < 0 or b <= a:
        return None
    try:
        im = Image.open(io.BytesIO(jpeg[a : b + 2])).convert("RGBA")
    except Exception:
        return None
    if alpha_z:
        try:
            alpha = zlib.decompress(alpha_z)
            w, h = im.size
            if len(alpha) >= w * h:
                im.putalpha(Image.frombytes("L", (w, h), alpha[: w * h]))
        except Exception:
            pass
    return im


def extract_bitmaps(swf_bytes: bytes):
    raw = decompress_swf(swf_bytes)
    frames = []
    for tag, payload in iter_tags(raw):
        if tag == 35:
            im = jpeg3_to_png(payload)
            if im is not None:
                frames.append(im)
    return frames


def parse_exports(swf_bytes: bytes):
    raw = decompress_swf(swf_bytes)
    out = []
    for tag, payload in iter_tags(raw):
        if tag != 76:
            continue
        n = struct.unpack_from("<H", payload, 0)[0]
        i = 2
        for _ in range(n):
            cid = struct.unpack_from("<H", payload, i)[0]
            i += 2
            end = payload.find(b"\x00", i)
            name = payload[i:end].decode("utf-8", "replace")
            i = end + 1
            if name.startswith("_"):
                continue
            out.append((cid, name))
    return out


def fetch_swf(rel: str) -> bytes:
    TMP.mkdir(parents=True, exist_ok=True)
    dest = TMP / rel.replace("/", "_")
    if dest.exists() and dest.stat().st_size > 1000:
        return dest.read_bytes()
    url = f"{BASE}/{rel}"
    print("GET", url, flush=True)
    blob = http_get(url)
    dest.write_bytes(blob)
    return blob


def paste_cell(sheet: Image.Image, im: Image.Image, col: int, row: int, cell: tuple[int, int]):
    cw, ch = cell
    scale = min(cw / im.width, ch / im.height, 1.0)
    nw = max(1, int(round(im.width * scale)))
    nh = max(1, int(round(im.height * scale)))
    if (nw, nh) != im.size:
        im = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x = col * cw + (cw - nw) // 2
    y = row * ch + (ch - nh)
    sheet.alpha_composite(im, (x, y))


def pack_body(frames, exports) -> Image.Image:
    byname = {name: cid for cid, name in exports}
    sheet = Image.new("RGBA", (COLS * BODY_CELL[0], BODY_ROWS * BODY_CELL[1]), (0, 0, 0, 0))
    groups = {
        "stand": "stand",
        "walk": "walk",
        "attack": "attack",
        "arrow": "attack_arrow",
        "cast": "attack_casting",
    }
    for key, prefix in groups.items():
        base = BODY_ROW[key]
        for d in range(5):
            for fr in range(6):
                name = f"{prefix}_d{d}_{fr}"
                cid = byname.get(name)
                if not cid:
                    continue
                paste_cell(sheet, frames[cid - 1], fr, base + d, BODY_CELL)
    sit = byname.get("sit_d4_0")
    if sit:
        for fr in range(COLS):
            paste_cell(sheet, frames[sit - 1], fr, BODY_ROW["sit"], BODY_CELL)
    return sheet


def pack_mount(frames, exports) -> Image.Image:
    byname = {name: cid for cid, name in exports}
    sheet = Image.new("RGBA", (COLS * MOUNT_CELL[0], MOUNT_ROWS * MOUNT_CELL[1]), (0, 0, 0, 0))
    for d in range(5):
        for fr in range(3):
            name = f"stand_d{d}_{fr}"
            cid = byname.get(name)
            if cid:
                paste_cell(sheet, frames[cid - 1], fr, MOUNT_ROW["stand"] + d, MOUNT_CELL)
        for fr in range(6):
            name = f"walk_d{d}_{fr}"
            cid = byname.get(name)
            if cid:
                paste_cell(sheet, frames[cid - 1], fr, MOUNT_ROW["walk"] + d, MOUNT_CELL)
    return sheet


def save_png(im: Image.Image, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, "PNG", optimize=True, compress_level=9)
    print("wrote", dest, im.size, dest.stat().st_size, flush=True)


def build_one(kind: str, key: str, rel: str):
    blob = fetch_swf(rel)
    frames = extract_bitmaps(blob)
    exports = parse_exports(blob)
    if kind == "body":
        sheet = pack_body(frames, exports)
        dest = OUT / f"body_{key}.png"
    else:
        sheet = pack_mount(frames, exports)
        dest = OUT / f"mount_{key}.png"
    save_png(sheet, dest)


def main():
    jobs = []
    for fid, (man, woman) in FASHIONS.items():
        jobs.append(("body", f"m_{fid}", f"com/ui/role/fashion/{man}.swf"))
        jobs.append(("body", f"f_{fid}", f"com/ui/role/fashion/{woman}.swf"))
    jobs.append(("mount", "m", "com/ui/role/mount/man.swf"))
    jobs.append(("mount", "f", "com/ui/role/mount/woman.swf"))
    with ThreadPoolExecutor(max_workers=4) as pool:
        list(pool.map(lambda j: build_one(*j), jobs))


if __name__ == "__main__":
    main()
