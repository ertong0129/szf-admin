#!/usr/bin/env python3
"""Parser smoke tests — no network."""
import struct
import sys
import tempfile
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

from parse_pos import parse_pos  # noqa: E402
from swf_inspect import decompress_swf, inspect_swf  # noqa: E402


def test_pos_roundtrip():
    rec = struct.pack(">IIIII", 4, 11000, 11000101, 7, 57)
    rows = parse_pos(rec)
    assert rows == [{"type": 4, "mapId": 11000, "ref": 11000101, "x": 7, "y": 57}]


def test_swf_header():
    # minimal uncompressed SWF: FWS + ver + length + 1x1 rect + fps + frames + end
    # RECT nbits=1, all zeros needs careful packing; use a tiny real CWS instead
    body = bytes([0x08, 0x00, 0x00, 0x18, 0x00, 0x00, 0x08, 0x00, 0x00, 0x00])
    # simpler: craft CWS wrapping empty-ish
    inner = b"\x78\x00\x05\x5f\x00\x00\x0f\x00\x00\x43\x02\x00\x00\x00"
    # Use inspect on a generated FWS with known size
    rect = bytes([0b00011000, 0, 0, 0b01100000, 0, 0])  # nbits=3 approx
    # fallback: zlib roundtrip identity for decompress_swf
    payload = b"hello-swf-body-padding-xxxxx"
    raw_body = payload
    cws = b"CWS" + bytes([10]) + (8 + len(zlib.compress(raw_body))).to_bytes(4, "little")
    # declared length is uncompressed file length = 8+len(raw_body)
    cws = b"CWS" + bytes([10]) + (8 + len(raw_body)).to_bytes(4, "little") + zlib.compress(raw_body)
    data, header = decompress_swf(cws)
    assert header["signature"] == "CWS"
    assert header["version"] == 10
    assert data[8:] == raw_body


def test_catalog_exists():
    cat = ROOT / "catalog" / "catalog.json"
    assert cat.exists() and cat.stat().st_size > 1000
    import json
    data = json.loads(cat.read_text(encoding="utf-8"))
    ids = [m["id"] for m in data["maps"]]
    assert "taiping" in ids and "capital" in ids
    assert data["quests"][0]["name"] == "历史的召唤"
    village = next(m for m in data["maps"] if m["id"] == "taiping")
    names = [n["name"] for n in village["npcs"]]
    assert "陈圆圆" in names and "车夫" in names


if __name__ == "__main__":
    test_pos_roundtrip()
    test_swf_header()
    test_catalog_exists()
    print("ok")
