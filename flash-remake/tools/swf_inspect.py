#!/usr/bin/env python3
"""Inspect a SWF without decompiling ActionScript.

Reads the public file header, tag list, exported names, path-like strings,
and JPEG/PNG-capable image tags. Does not decode ABC bytecode or encryption.
"""
from __future__ import annotations

import argparse
import json
import re
import struct
import zlib
from pathlib import Path


TAG_NAMES = {
    0: "End",
    1: "ShowFrame",
    2: "DefineShape",
    6: "DefineBits",
    9: "SetBackgroundColor",
    20: "DefineBitsLossless",
    21: "DefineBitsJPEG2",
    22: "DefineShape2",
    32: "DefineShape3",
    35: "DefineBitsJPEG3",
    36: "DefineBitsLossless2",
    39: "DefineSprite",
    41: "ProductInfo",
    43: "FrameLabel",
    56: "ExportAssets",
    69: "FileAttributes",
    76: "SymbolClass",
    77: "Metadata",
    82: "DoABC",
    87: "DefineBinaryData",
}


def decompress_swf(data: bytes) -> tuple[bytes, dict]:
    if len(data) < 8:
        raise ValueError("file too small to be SWF")
    sig, ver = data[:3], data[3]
    declared = int.from_bytes(data[4:8], "little")
    if sig == b"CWS":
        body = zlib.decompress(data[8:])
        raw = b"FWS" + bytes([ver]) + data[4:8] + body
    elif sig == b"FWS":
        raw = data
    elif sig == b"ZWS":
        raise ValueError("LZMA SWF (ZWS) is not handled")
    else:
        raise ValueError(f"not a SWF: {sig!r}")
    return raw, {
        "signature": sig.decode("latin1"),
        "version": ver,
        "declaredLength": declared,
        "uncompressedLength": len(raw),
    }


def read_rect(buf: bytes, off: int) -> tuple[int, list[float]]:
    nbits = buf[off] >> 3
    total_bits = 5 + nbits * 4
    total_bytes = (total_bits + 7) // 8
    bits = int.from_bytes(buf[off : off + total_bytes], "big")
    bits >>= total_bytes * 8 - total_bits
    vals = []
    for i in range(4):
        shift = nbits * (3 - i)
        vals.append(((bits >> shift) & ((1 << nbits) - 1)) / 20.0)
    return off + total_bytes, vals


def iter_tags(raw: bytes, start: int):
    off = start
    end = len(raw)
    while off + 2 <= end:
        code_len = int.from_bytes(raw[off : off + 2], "little")
        code = code_len >> 6
        length = code_len & 0x3F
        off += 2
        if length == 0x3F:
            if off + 4 > end:
                break
            length = int.from_bytes(raw[off : off + 4], "little")
            off += 4
        payload = raw[off : off + length]
        off += length
        yield code, payload
        if code == 0:
            break


def parse_symbol_class(payload: bytes) -> list[dict]:
    if len(payload) < 2:
        return []
    count = int.from_bytes(payload[:2], "little")
    off = 2
    out = []
    for _ in range(count):
        if off + 2 > len(payload):
            break
        cid = int.from_bytes(payload[off : off + 2], "little")
        off += 2
        end = payload.find(b"\x00", off)
        if end < 0:
            break
        name = payload[off:end].decode("utf-8", "replace")
        off = end + 1
        out.append({"id": cid, "name": name})
    return out


def parse_export_assets(payload: bytes) -> list[dict]:
    return parse_symbol_class(payload)


def collect_paths(raw: bytes) -> list[str]:
    found = set()
    for m in re.finditer(rb"[\w./?=&-]{4,}\.(?:swf|xml|jpg|png|gif|txt|mp3|json)", raw, re.I):
        found.add(m.group().decode("utf-8", "replace"))
    for m in re.finditer(rb"https?://[\w./?=&%+-]+", raw, re.I):
        found.add(m.group().decode("utf-8", "replace"))
    return sorted(found)


def collect_text(raw: bytes, limit: int = 400) -> list[str]:
    texts = []
    seen = set()
    for m in re.finditer(rb"(?:[\x20-\x7e]|[\xc2-\xf4][\x80-\xbf]{1,3}){4,80}", raw):
        try:
            s = m.group().decode("utf-8")
        except UnicodeDecodeError:
            continue
        if s in seen:
            continue
        keep = any("\u4e00" <= c <= "\u9fff" for c in s) or any(
            k in s.lower()
            for k in (".swf", ".xml", "load", "game", "role", "login", "mission", "npc")
        )
        if not keep:
            continue
        seen.add(s)
        texts.append(s)
        if len(texts) >= limit:
            break
    return texts


def inspect_swf(path: Path) -> dict:
    data = path.read_bytes()
    raw, header = decompress_swf(data)
    off, rect = read_rect(raw, 8)
    fps = int.from_bytes(raw[off : off + 2], "little") / 256.0
    frames = int.from_bytes(raw[off + 2 : off + 4], "little")
    tags = []
    images = {"jpeg": 0, "lossless": 0, "binary": 0}
    symbols = []
    abc = 0
    for code, payload in iter_tags(raw, off + 4):
        name = TAG_NAMES.get(code, f"Tag{code}")
        tags.append({"code": code, "name": name, "length": len(payload)})
        if code in (6, 21, 35):
            images["jpeg"] += 1
        elif code in (20, 36):
            images["lossless"] += 1
        elif code == 87:
            images["binary"] += 1
        elif code == 76:
            symbols.extend(parse_symbol_class(payload))
        elif code == 56:
            symbols.extend(parse_export_assets(payload))
        elif code == 82:
            abc += 1
    counts = {}
    for t in tags:
        counts[t["name"]] = counts.get(t["name"], 0) + 1
    return {
        "file": path.name,
        "header": header,
        "stage": {
            "xmin": rect[0],
            "xmax": rect[1],
            "ymin": rect[2],
            "ymax": rect[3],
            "width": rect[1] - rect[0],
            "height": rect[3] - rect[2],
            "fps": fps,
            "frames": frames,
        },
        "tagCounts": counts,
        "imageTags": images,
        "doAbcCount": abc,
        "symbols": symbols[:200],
        "paths": collect_paths(raw),
        "sampleText": collect_text(raw),
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("swf", nargs="+")
    ap.add_argument("-o", "--output", help="write JSON")
    args = ap.parse_args()
    reports = [inspect_swf(Path(p)) for p in args.swf]
    text = json.dumps(reports, ensure_ascii=False, indent=2)
    if args.output:
        Path(args.output).write_text(text, encoding="utf-8")
    print(text)


if __name__ == "__main__":
    main()
