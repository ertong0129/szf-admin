#!/usr/bin/env python3
"""From a game page URL, find the main SWF and print the remake pipeline."""
from __future__ import annotations

import argparse
import re
import urllib.request


def fetch(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "flash-remake/1.0"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def find_swfs(html: str) -> list[str]:
    hits = re.findall(r"https?://[^\"'\s>]+\.swf[^\"'\s>]*", html, re.I)
    hits += re.findall(r"[\"']([^\"']+\.swf[^\"']*)[\"']", html, re.I)
    out = []
    for h in hits:
        if h not in out:
            out.append(h)
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    args = ap.parse_args()
    html = fetch(args.url).decode("utf-8", "replace")
    swfs = find_swfs(html)
    print("page:", args.url)
    print("swf candidates:")
    for s in swfs or ["(none in HTML — loader often injected after login)"]:
        print(" ", s)
    print("\nNext:")
    print("  1. python3 swf_inspect.py Main.swf -o inspect.json")
    print("  2. Follow paths inside the loader (MingGame.swf, viewUI.swf, com/data/*)")
    print("  3. python3 extract_images.py viewUI.swf world.swf -o img")
    print("  4. python3 parse_amf.py npc_data.txt missions.txt -o amf.json")
    print("  5. python3 parse_pos.py pos.txt -o pos.json")
    print("  6. python3 build_catalog.py --src dump --out catalog")
    print("Do not decompile ABC / encryption. Rewrite game logic in HTML5.")


if __name__ == "__main__":
    main()
