#!/usr/bin/env python3
"""解析明朝传奇 MapEncode .mcm（zlib + 大端 int，不入库 MCM）。

对照 MingGame.swf 里 MapEncode.encode / encodeByteArray：

  uncompress
  map_id, isSub          : int32 BE
  name, imageLink        : 各 32 字节 cn-gb（GBK）
  tileRow, tileCol       : int32
  nElem, nTrans          : int32
  offsetX, offsetY       : int32 − MapDataVo.CORRECT_VALUE（10000000）
  width, height          : 有效像素
  tiles[tileRow][tileCol]: unsigned byte（0 阻挡 / 1 可行走等）
  elements[nElem]        : id, tx, ty, itemType, avatarId(len+GBK)
  transfers[nTrans]      : id, tx, ty, tar_Map, tar_tx, tar_ty,
                           hw, yl, wl, minLevel, maxLevel, avatarId

用法：
  python3 tools/parse-mcm.py /tmp/har-data/13100.mcm
  python3 tools/parse-mcm.py 13100.mcm --json
  python3 tools/parse-mcm.py --self-test

京城 13100.mcm 核过：tile 175×172，offset (3520, -1232)，像素 7515×4640。
先前把 nElem=51 当成 originX 格是错的。
"""
from __future__ import annotations

import argparse
import json
import struct
import sys
import zlib

CORRECT_VALUE = 10_000_000
NAME_BYTES = 32


def _read_i32(buf: bytes, i: int) -> tuple[int, int]:
    return struct.unpack_from(">i", buf, i)[0], i + 4


def _write_i32(n: int) -> bytes:
    return struct.pack(">i", n)


def _read_gbk_fixed(buf: bytes, i: int, n: int) -> tuple[str, int]:
    raw = buf[i : i + n]
    s = raw.split(b"\x00", 1)[0]
    try:
        text = s.decode("gbk")
    except UnicodeDecodeError:
        text = s.decode("latin1", "replace")
    return text, i + n


def _read_gbk_len(buf: bytes, i: int) -> tuple[str, int]:
    ln, i = _read_i32(buf, i)
    if ln < 0 or i + ln > len(buf):
        raise ValueError("avatarId 长度异常 %s at %d" % (ln, i - 4))
    raw = buf[i : i + ln]
    i += ln
    try:
        return raw.decode("gbk"), i
    except UnicodeDecodeError:
        return raw.decode("latin1", "replace"), i


def decompress_mcm(data: bytes) -> bytes:
    if data[:2] == b"\x78\xda" or data[:2] == b"\x78\x9c" or data[:2] == b"\x78\x01":
        return zlib.decompress(data)
    try:
        return zlib.decompress(data)
    except zlib.error:
        return data


def parse_mcm(data: bytes) -> dict:
    buf = decompress_mcm(data)
    i = 0
    map_id, i = _read_i32(buf, i)
    is_sub, i = _read_i32(buf, i)
    name, i = _read_gbk_fixed(buf, i, NAME_BYTES)
    image_link, i = _read_gbk_fixed(buf, i, NAME_BYTES)
    tile_row, i = _read_i32(buf, i)
    tile_col, i = _read_i32(buf, i)
    n_elem, i = _read_i32(buf, i)
    n_trans, i = _read_i32(buf, i)
    ox_raw, i = _read_i32(buf, i)
    oy_raw, i = _read_i32(buf, i)
    width, i = _read_i32(buf, i)
    height, i = _read_i32(buf, i)
    n_tiles = tile_row * tile_col
    if n_tiles < 0 or i + n_tiles > len(buf):
        raise ValueError("tiles 尺寸异常 %dx%d" % (tile_row, tile_col))
    tiles_flat = list(buf[i : i + n_tiles])
    i += n_tiles
    tiles = [tiles_flat[r * tile_col : (r + 1) * tile_col] for r in range(tile_row)]
    elements = []
    for _ in range(n_elem):
        eid, i = _read_i32(buf, i)
        tx, i = _read_i32(buf, i)
        ty, i = _read_i32(buf, i)
        item_type, i = _read_i32(buf, i)
        avatar, i = _read_gbk_len(buf, i)
        elements.append({
            "id": eid, "tx": tx, "ty": ty, "itemType": item_type, "avatarId": avatar,
        })
    transfers = []
    for _ in range(n_trans):
        rec = {}
        for key in ("id", "tx", "ty", "tar_Map", "tar_tx", "tar_ty", "hw", "yl", "wl", "minLevel", "maxLevel"):
            rec[key], i = _read_i32(buf, i)
        rec["avatarId"], i = _read_gbk_len(buf, i)
        transfers.append(rec)
    nonzero = sum(1 for b in tiles_flat if b)
    return {
        "map_id": map_id,
        "isSub": is_sub,
        "name": name,
        "imageLink": image_link,
        "tileRow": tile_row,
        "tileCol": tile_col,
        "nElem": n_elem,
        "nTrans": n_trans,
        "offsetX": ox_raw - CORRECT_VALUE,
        "offsetY": oy_raw - CORRECT_VALUE,
        "offsetX_raw": ox_raw,
        "offsetY_raw": oy_raw,
        "width": width,
        "height": height,
        "nonzeroTiles": nonzero,
        "tileBytes": n_tiles,
        "elements": elements,
        "transfers": transfers,
        "tiles": tiles,
        "remain": len(buf) - i,
        "correctValue": CORRECT_VALUE,
    }


def encode_mcm(vo: dict) -> bytes:
    """构造一份最小 MCM，供 --self-test 往返。"""
    tiles = vo.get("tiles") or []
    tile_row = vo.get("tileRow", len(tiles))
    tile_col = vo.get("tileCol", len(tiles[0]) if tiles else 0)
    buf = bytearray()
    buf += _write_i32(vo["map_id"])
    buf += _write_i32(vo.get("isSub", 0))

    def pad32(s: str) -> bytes:
        raw = s.encode("gbk")[:NAME_BYTES]
        return raw + b"\x00" * (NAME_BYTES - len(raw))

    buf += pad32(vo.get("name", ""))
    buf += pad32(vo.get("imageLink", ""))
    buf += _write_i32(tile_row)
    buf += _write_i32(tile_col)
    elems = vo.get("elements") or []
    trans = vo.get("transfers") or []
    buf += _write_i32(len(elems))
    buf += _write_i32(len(trans))
    buf += _write_i32(vo.get("offsetX", 0) + CORRECT_VALUE)
    buf += _write_i32(vo.get("offsetY", 0) + CORRECT_VALUE)
    buf += _write_i32(vo.get("width", 0))
    buf += _write_i32(vo.get("height", 0))
    if tiles:
        for row in tiles:
            buf += bytes(row)
    else:
        buf += b"\x00" * (tile_row * tile_col)

    def write_str(s: str) -> None:
        raw = s.encode("gbk")
        buf.extend(_write_i32(len(raw)))
        buf.extend(raw)

    for e in elems:
        buf += _write_i32(e["id"])
        buf += _write_i32(e["tx"])
        buf += _write_i32(e["ty"])
        buf += _write_i32(e.get("itemType", 0))
        write_str(e.get("avatarId", ""))
    for t in trans:
        for key in ("id", "tx", "ty", "tar_Map", "tar_tx", "tar_ty", "hw", "yl", "wl", "minLevel", "maxLevel"):
            buf += _write_i32(t.get(key, 0))
        write_str(t.get("avatarId", ""))
    return zlib.compress(bytes(buf))


def summary(vo: dict) -> dict:
    out = {k: vo[k] for k in (
        "map_id", "isSub", "name", "imageLink", "tileRow", "tileCol",
        "nElem", "nTrans", "offsetX", "offsetY", "width", "height",
        "nonzeroTiles", "tileBytes", "remain", "correctValue",
    )}
    out["elements"] = vo["elements"]
    out["transfers"] = vo["transfers"]
    return out


def self_test() -> None:
    sample = {
        "map_id": 13100,
        "isSub": 0,
        "name": "万历-京城",
        "imageLink": "-京城.jpg",
        "tileRow": 2,
        "tileCol": 3,
        "offsetX": 3520,
        "offsetY": -1232,
        "width": 7515,
        "height": 4640,
        "tiles": [[1, 0, 1], [0, 1, 0]],
        "elements": [{"id": 13103, "tx": 86, "ty": 10, "itemType": 0, "avatarId": "右上"}],
        "transfers": [{
            "id": 1, "tx": 10, "ty": 20, "tar_Map": 11100, "tar_tx": 1, "tar_ty": 2,
            "hw": 1, "yl": 1, "wl": 1, "minLevel": 0, "maxLevel": 100, "avatarId": "t",
        }],
    }
    parsed = parse_mcm(encode_mcm(sample))
    assert parsed["map_id"] == 13100
    assert parsed["name"] == "万历-京城"
    assert parsed["tileRow"] == 2 and parsed["tileCol"] == 3
    assert parsed["nElem"] == 1 and parsed["nTrans"] == 1
    assert parsed["offsetX"] == 3520, parsed["offsetX"]
    assert parsed["offsetY"] == -1232, parsed["offsetY"]
    assert parsed["width"] == 7515 and parsed["height"] == 4640
    assert parsed["tiles"] == sample["tiles"]
    assert parsed["elements"][0]["avatarId"] == "右上"
    assert parsed["transfers"][0]["tar_Map"] == 11100
    assert CORRECT_VALUE == 10000000
    print("parse-mcm self-test ok")


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="Parse MapEncode .mcm (zlib, big-endian)")
    p.add_argument("mcm", nargs="?", help="本地 .mcm 路径（不要提交进仓库）")
    p.add_argument("--json", action="store_true", help="输出 JSON（不含完整 tiles 矩阵）")
    p.add_argument("--with-tiles", action="store_true", help="JSON 里带上 tiles")
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args(argv)
    if args.self_test:
        self_test()
        return
    if not args.mcm:
        p.error("请给出 .mcm 路径，或使用 --self-test")
    vo = parse_mcm(open(args.mcm, "rb").read())
    if args.json:
        dump = summary(vo)
        if args.with_tiles:
            dump["tiles"] = vo["tiles"]
        json.dump(dump, sys.stdout, ensure_ascii=False, indent=2)
        sys.stdout.write("\n")
        return
    print("map_id     ", vo["map_id"])
    print("name       ", vo["name"])
    print("imageLink  ", vo["imageLink"])
    print("tiles      ", vo["tileRow"], "x", vo["tileCol"], "nonzero", vo["nonzeroTiles"])
    print("offset     ", vo["offsetX"], vo["offsetY"], "(raw", vo["offsetX_raw"], vo["offsetY_raw"], ")")
    print("pixels     ", vo["width"], "x", vo["height"])
    print("elements   ", vo["nElem"])
    for e in vo["elements"][:12]:
        print("  ", e)
    if vo["nElem"] > 12:
        print("  ...")
    print("transfers  ", vo["nTrans"])
    for t in vo["transfers"][:12]:
        print("  ", t)
    if vo["nTrans"] > 12:
        print("  ...")
    if vo["remain"]:
        print("remain     ", vo["remain"], "bytes")


if __name__ == "__main__":
    main()
