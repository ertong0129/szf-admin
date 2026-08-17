#!/usr/bin/env python3
"""Extract JPEG / lossless bitmaps from SWF tags. No ABC decompile."""
from __future__ import annotations

import argparse
import struct
import zlib
from pathlib import Path

from swf_inspect import decompress_swf, iter_tags, parse_symbol_class, read_rect


def write_png(path: Path, width: int, height: int, rgba: bytes) -> None:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw = b""
    stride = width * 4
    for y in range(height):
        raw += b"\x00" + rgba[y * stride : (y + 1) * stride]
    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def decode_jpeg_tag(payload: bytes, has_alpha: bool) -> tuple[int, bytes, bytes | None]:
    cid = int.from_bytes(payload[:2], "little")
    if has_alpha:
        alpha_off = int.from_bytes(payload[2:6], "little")
        jpeg = payload[6 : 6 + alpha_off]
        alpha = payload[6 + alpha_off :]
        return cid, jpeg, alpha
    return cid, payload[2:], None


def decode_lossless(payload: bytes, with_alpha: bool) -> tuple[int, int, int, bytes]:
    cid, fmt, width, height = struct.unpack_from("<HBHH", payload, 0)
    off = 7
    table_size = 0
    if fmt == 3:
        table_size = payload[off] + 1
        off += 1
    raw = zlib.decompress(payload[off:])
    pixels = bytearray(width * height * 4)
    if fmt == 3:
        bpp = 4 if with_alpha else 3
        table = raw[: table_size * bpp]
        idx = raw[table_size * bpp :]
        row = (width + 3) & ~3
        for y in range(height):
            for x in range(width):
                pal = idx[y * row + x]
                base = pal * bpp
                i = (y * width + x) * 4
                if with_alpha:
                    pixels[i : i + 4] = table[base : base + 4]
                    # Flash stores ARGB
                    a, r, g, b = pixels[i : i + 4]
                    pixels[i : i + 4] = bytes((r, g, b, a))
                else:
                    r, g, b = table[base : base + 3]
                    pixels[i : i + 4] = bytes((r, g, b, 255))
    elif fmt == 5:
        # 32-bit: PIX24 is 0RGB, lossless2 is ARGB, rows aligned to 4 already
        src = raw
        for i in range(width * height):
            a, r, g, b = src[i * 4 : i * 4 + 4]
            if not with_alpha:
                a = 255
            pixels[i * 4 : i * 4 + 4] = bytes((r, g, b, a))
    else:
        raise ValueError(f"unsupported lossless format {fmt}")
    return cid, width, height, bytes(pixels)


def extract(path: Path, out_dir: Path) -> dict:
    data = path.read_bytes()
    raw, header = decompress_swf(data)
    off, _rect = read_rect(raw, 8)
    names = {}
    for code, payload in iter_tags(raw, off + 4):
        if code == 76:
            for item in parse_symbol_class(payload):
                names[item["id"]] = item["name"]
    dest = out_dir / path.stem
    dest.mkdir(parents=True, exist_ok=True)
    saved = []
    n = 0
    for code, payload in iter_tags(raw, off + 4):
        try:
            if code in (6, 21, 35):
                cid, jpeg, _alpha = decode_jpeg_tag(payload, code == 35)
                # strip optional JPEGTables header junk
                soi = jpeg.find(b"\xff\xd8")
                if soi >= 0:
                    jpeg = jpeg[soi:]
                label = names.get(cid, f"id{cid}")
                safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in label)[:80]
                fp = dest / f"{n:03d}_{safe}.jpg"
                fp.write_bytes(jpeg)
                saved.append({"id": cid, "name": label, "file": str(fp.name), "kind": "jpeg"})
                n += 1
            elif code in (20, 36):
                cid, w, h, rgba = decode_lossless(payload, code == 36)
                label = names.get(cid, f"id{cid}")
                safe = "".join(c if c.isalnum() or c in "-_." else "_" for c in label)[:80]
                fp = dest / f"{n:03d}_{safe}.png"
                write_png(fp, w, h, rgba)
                saved.append(
                    {
                        "id": cid,
                        "name": label,
                        "file": str(fp.name),
                        "kind": "png",
                        "width": w,
                        "height": h,
                    }
                )
                n += 1
        except Exception as exc:  # keep going on odd tags
            saved.append({"error": str(exc), "tag": code})
    return {"swf": path.name, "header": header, "count": n, "files": saved}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("swf", nargs="+")
    ap.add_argument("-o", "--out", default="extracted")
    args = ap.parse_args()
    out = Path(args.out)
    for swf in args.swf:
        info = extract(Path(swf), out)
        print(f"{info['swf']}: {info['count']} images -> {out / Path(swf).stem}")


if __name__ == "__main__":
    main()
