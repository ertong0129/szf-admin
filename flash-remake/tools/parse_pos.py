#!/usr/bin/env python3
"""Parse public com/data/pos.txt: 20-byte big-endian records."""
from __future__ import annotations

import argparse
import json
import struct
from collections import Counter
from pathlib import Path


def parse_pos(data: bytes) -> list[dict]:
    if len(data) % 20 != 0:
        raise ValueError(f"unexpected length {len(data)}")
    rows = []
    for i in range(0, len(data), 20):
        kind, map_id, ref, x, y = struct.unpack_from(">IIIII", data, i)
        rows.append(
            {
                "type": kind,
                "mapId": map_id,
                "ref": ref,
                "x": x,
                "y": y,
            }
        )
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pos")
    ap.add_argument("-o", "--out")
    args = ap.parse_args()
    rows = parse_pos(Path(args.pos).read_bytes())
    types = Counter(r["type"] for r in rows)
    maps = Counter(r["mapId"] for r in rows)
    summary = {
        "count": len(rows),
        "types": dict(types),
        "maps": {str(k): v for k, v in sorted(maps.items())},
        "npc": [r for r in rows if r["type"] == 4][:400],
        "allNpc": [r for r in rows if r["type"] == 4],
    }
    text = json.dumps(summary, ensure_ascii=False, indent=2)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print(
            f"{summary['count']} records, types={dict(types)}, maps={len(maps)} -> {args.out}"
        )
    else:
        print(text[:3000])


if __name__ == "__main__":
    main()
