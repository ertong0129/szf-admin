#!/usr/bin/env python3
"""Fetch original 32×32 skill icons from the public CDN.

URL rule (verified against the two sample links):
  http://mccq.static.mingchao.com/55598/com/assets/skills/{id}.png

{id} is an 8-digit number. MingGame concatenates:
  "com/assets/skills/" + path + ".png"
skillTree.xml is 403, so IDs were recovered with HEAD probes.

ID shape:
  {kind}{job}{family:03d}{level:03d}
  kind 1/2/3/4 = skill tree art set, 6 = stone-suit skill
  job  1 = warrior-side, 2 = archer-side
  family = skill number inside that tree (101, 103, 201, 209, …)
  level 001–008 = rank variants of the same icon family

Known public examples:
  21209001  jagged spikes (offensive)
  21103002  gold-lit armor (protective buff)

Suit skills from public com/data/skillsuit.xml:
  61201010 炽焰斩 / 61201020 爆焰箭 / 61201030 降龙诀 / 61201040 役灵印

Only the 24 icons wired into D.SKILLS are downloaded into git.
Re-run this script to refresh them from the CDN.
"""
from __future__ import annotations

import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = "http://mccq.static.mingchao.com/55598/com/assets/skills"
UA = "Mozilla/5.0"
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "ingame" / "skills"

# class skill id -> CDN icon id (see js/data.js D.SKILLS)
USED = {
    "w1": "11101001",
    "w2": "12104001",
    "w3": "12204001",
    "w4": "61201010",
    "w5": "12203001",
    "w6": "21103002",
    "a1": "21201001",
    "a2": "21104001",
    "a3": "61201020",
    "a4": "21101001",
    "a5": "21209001",
    "a6": "31107001",
    "x1": "61201030",
    "x2": "41102001",
    "x3": "31204001",
    "x4": "41204001",
    "x5": "41108001",
    "x6": "31201001",
    "h1": "41205001",
    "h2": "31104001",
    "h3": "41101001",
    "h4": "41103001",
    "h5": "63127001",
    "h6": "41201001",
}


def fetch(cid: str) -> bytes:
    url = f"{BASE}/{cid}.png"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = r.read()
    if len(data) < 200 or data[:8] != b"\x89PNG\r\n\x1a\n":
        raise RuntimeError(f"{cid} is not a PNG ({len(data)} bytes)")
    return data


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    ids = sorted(set(USED.values()))
    ok = 0
    for cid in ids:
        try:
            data = fetch(cid)
        except urllib.error.HTTPError as e:
            print(f"FAIL {cid} HTTP {e.code}", file=sys.stderr)
            return 1
        dest = OUT / f"{cid}.png"
        dest.write_bytes(data)
        print(f"ok {cid} {len(data)}")
        ok += 1
    print(f"wrote {ok} icons -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
