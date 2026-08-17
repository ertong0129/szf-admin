#!/usr/bin/env python3
"""Build a compact remake catalog from analyzed SWF/AMF/pos files."""
from __future__ import annotations

import json
import shutil
import struct
from pathlib import Path

from parse_amf import AMF3, maybe_zlib
from parse_pos import parse_pos

MAP_META = {
    11000: {"id": "taiping", "name": "太平村", "file": "xin_shou_cun.jpg", "w": 80, "h": 115},
    11001: {"id": "hengjian", "name": "横涧山", "file": "heng_jian_shan.jpg", "w": 110, "h": 80},
    10210: {"id": "shennong", "name": "神农架", "file": "shen_nong_jia.jpg", "w": 115, "h": 150},
    11100: {"id": "capital", "name": "应天京城", "file": "jing_cheng.jpg", "w": 140, "h": 130},
    10200: {"id": "kaifeng", "name": "开封", "file": "kai_feng.jpg", "w": 160, "h": 120},
    11101: {"id": "boyang", "name": "鄱阳湖", "file": "po_yang_hu.jpg", "w": 100, "h": 90},
}

MONSTER_NAMES = {
    50051107: "野狗",
    10051201: "山匪",
    10091103: "恶霸",
    10111101: "元兵",
    10191102: "山贼",
    10131101: "狼",
    10131201: "野猪",
    10151101: "刀兵",
}


def read_all_missions(path: Path) -> list:
    raw = maybe_zlib(path.read_bytes())
    p = AMF3(raw)
    rows = []
    while p.i < len(raw) - 1:
        try:
            rows.append(p.read())
        except Exception:
            break
    return rows


def read_npcs(path: Path) -> list:
    raw = maybe_zlib(path.read_bytes())
    return AMF3(raw).read()


def clean_say(text: str) -> str:
    return (
        text.replace("#N#", "\n")
        .replace("#S#", "")
        .replace("<br>", "\n")
        .strip()
    )


def build(src: Path, out: Path) -> None:
    npc_rows = read_npcs(src / "npc_data.txt")
    missions = read_all_missions(src / "missions.txt")
    pos_rows = parse_pos((src / "pos.txt").read_bytes())

    npcs_by_map = {}
    npc_by_id = {}
    for row in npc_rows:
        if not isinstance(row, list) or len(row) < 9:
            continue
        nid, name, _kind, _funcs, icon, job, say, _flag, map_id = row[:9]
        if not isinstance(nid, int) or nid <= 0:
            continue
        rec = {
            "id": nid,
            "name": name,
            "icon": Path(str(icon)).stem if icon else job,
            "job": job,
            "say": clean_say(str(say or "")),
            "mapId": int(map_id) if map_id else 0,
        }
        npc_by_id[nid] = rec
        npcs_by_map.setdefault(rec["mapId"], []).append(rec)

    maps = []
    for map_id, meta in MAP_META.items():
        listed = sorted(npcs_by_map.get(map_id, []), key=lambda n: n["id"])
        spots = [r for r in pos_rows if r["mapId"] == map_id and r["type"] == 4]
        placed = []
        for spot in spots:
            idx = spot["ref"] - map_id * 1000 - 100
            if 0 <= idx < len(listed):
                npc = dict(listed[idx])
                if not npc.get("icon") or "元素" in npc["name"] or "雕像" in npc["name"]:
                    continue
                npc["x"] = spot["x"]
                npc["y"] = spot["y"]
                placed.append(npc)
        monsters = []
        for r in pos_rows:
            if r["mapId"] == map_id and r["type"] == 5:
                monsters.append(
                    {
                        "kind": r["ref"],
                        "name": MONSTER_NAMES.get(r["ref"], "野兽"),
                        "x": r["x"],
                        "y": r["y"],
                    }
                )
        maps.append({**meta, "mapId": map_id, "npcs": placed, "spawns": monsters})

    quests = []
    for row in missions:
        if not isinstance(row, list) or len(row) < 3:
            continue
        qid, title, desc = str(row[0]), str(row[1]), str(row[2])
        if not title or not any("\u4e00" <= c <= "\u9fff" for c in title):
            continue
        try:
            if int(qid) >= 19:
                continue
        except ValueError:
            continue
        talks = []
        blob = row[20] if len(row) > 20 else []
        def walk(node):
            if isinstance(node, list):
                if len(node) == 2 and isinstance(node[0], int) and isinstance(node[1], list):
                    talks.append({"npcId": node[0], "lines": [clean_say(str(x)) for x in node[1]]})
                else:
                    for c in node:
                        walk(c)
        walk(blob)
        reward = row[21] if len(row) > 21 and isinstance(row[21], list) else []
        nxt = row[22][0] if len(row) > 22 and isinstance(row[22], list) and row[22] else None
        quests.append(
            {
                "id": qid,
                "name": title,
                "desc": desc,
                "talks": talks[:4],
                "exp": int(reward[3]) if len(reward) > 3 and isinstance(reward[3], (int, float)) else 20,
                "next": str(nxt) if nxt else None,
            }
        )
        if len(quests) >= 16:
            break

    catalog = {
        "game": "大明传说",
        "source": "明朝传奇 Flash 页游公开资源分析",
        "stage": {"width": 1000, "height": 600, "loader": [500, 375]},
        "classes": [
            {"id": "warrior", "name": "战士", "weapon": "刀剑", "desc": "血厚防高，近身砍杀"},
            {"id": "archer", "name": "射手", "weapon": "弓矢", "desc": "远程点射，风筝敌人"},
            {"id": "wanderer", "name": "侠客", "weapon": "扇", "desc": "内功爆发，身法灵动"},
            {"id": "healer", "name": "医仙", "weapon": "杖", "desc": "治疗辅助，持续作战"},
        ],
        "maps": maps,
        "quests": quests,
        "npcCount": len(npc_by_id),
        "missionCount": len(missions),
    }
    out.mkdir(parents=True, exist_ok=True)
    (out / "catalog.json").write_text(
        json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(
        f"maps={len(maps)} quests={len(quests)} npcs={len(npc_by_id)} missions={len(missions)}"
    )


if __name__ == "__main__":
    import argparse

    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="/tmp/flash-analyze")
    ap.add_argument("--out", default="/workspace/flash-remake/catalog")
    args = ap.parse_args()
    build(Path(args.src), Path(args.out))
