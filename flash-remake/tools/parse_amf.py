#!/usr/bin/env python3
"""Parse zlib+AMF3 game tables (npc_data / missions). No protocol reverse."""
from __future__ import annotations

import argparse
import json
import struct
import zlib
from pathlib import Path


class AMF3:
    def __init__(self, data: bytes):
        self.data = data
        self.i = 0
        self.str_refs: list[str] = []
        self.obj_refs: list = []
        self.trait_refs: list = []

    def u8(self) -> int:
        b = self.data[self.i]
        self.i += 1
        return b

    def u29(self) -> int:
        b = self.u8()
        if b < 128:
            return b
        val = (b & 0x7F) << 7
        b = self.u8()
        if b < 128:
            return val | b
        val = (val | (b & 0x7F)) << 7
        b = self.u8()
        if b < 128:
            return val | b
        b = self.u8()
        return ((val | (b & 0x7F)) << 8) | b

    def read(self):
        marker = self.u8()
        if marker == 0x00:
            return None
        if marker == 0x01:
            return None
        if marker == 0x02:
            return False
        if marker == 0x03:
            return True
        if marker == 0x04:
            n = self.u29()
            return n - (1 << 29) if n >= (1 << 28) else n
        if marker == 0x05:
            v = struct.unpack_from(">d", self.data, self.i)[0]
            self.i += 8
            return v
        if marker == 0x06:
            return self.read_string()
        if marker == 0x07:
            return self.read_string()  # xml doc as string
        if marker == 0x08:
            return self.read_date()
        if marker == 0x09:
            return self.read_array()
        if marker == 0x0A:
            return self.read_object()
        if marker == 0x0B:
            return self.read_string()
        if marker == 0x0C:
            return self.read_bytearray()
        if marker in (0x0D, 0x0E, 0x0F, 0x10, 0x11):
            # vector / dict — skip conservatively
            return f"<amf:{marker}>"
        return f"<unk:{marker}>"

    def read_string(self) -> str:
        ref = self.u29()
        if (ref & 1) == 0:
            return self.str_refs[ref >> 1]
        length = ref >> 1
        s = self.data[self.i : self.i + length].decode("utf-8", "replace")
        self.i += length
        if length:
            self.str_refs.append(s)
        return s

    def read_date(self):
        ref = self.u29()
        if (ref & 1) == 0:
            return self.obj_refs[ref >> 1]
        ms = struct.unpack_from(">d", self.data, self.i)[0]
        self.i += 8
        self.obj_refs.append(ms)
        return ms

    def read_bytearray(self):
        ref = self.u29()
        if (ref & 1) == 0:
            return self.obj_refs[ref >> 1]
        length = ref >> 1
        b = self.data[self.i : self.i + length]
        self.i += length
        self.obj_refs.append(b)
        return list(b[:32]) + (["..."] if length > 32 else [])

    def read_array(self):
        ref = self.u29()
        if (ref & 1) == 0:
            return self.obj_refs[ref >> 1]
        dense = ref >> 1
        obj = {}
        self.obj_refs.append(obj)
        while True:
            key = self.read_string()
            if key == "":
                break
            obj[key] = self.read()
        items = [self.read() for _ in range(dense)]
        if obj:
            return {"assoc": obj, "dense": items}
        return items

    def read_object(self):
        ref = self.u29()
        if (ref & 1) == 0:
            return self.obj_refs[ref >> 1]
        obj = {}
        self.obj_refs.append(obj)
        if (ref & 2) == 0:
            traits = self.trait_refs[ref >> 2]
        else:
            ext = ref & 4
            dynamic = ref & 8
            count = ref >> 4
            class_name = self.read_string()
            keys = [self.read_string() for _ in range(count)]
            traits = {
                "name": class_name,
                "keys": keys,
                "dynamic": bool(dynamic),
                "external": bool(ext),
            }
            self.trait_refs.append(traits)
        if traits.get("external"):
            obj["_class"] = traits["name"]
            obj["_external"] = True
            return obj
        for key in traits["keys"]:
            obj[key] = self.read()
        if traits.get("name"):
            obj["_class"] = traits["name"]
        if traits.get("dynamic"):
            while True:
                key = self.read_string()
                if key == "":
                    break
                obj[key] = self.read()
        return obj


def maybe_zlib(data: bytes) -> bytes:
    if data[:2] == b"\x78\x9c" or data[:2] == b"\x78\xda" or data[:2] == b"\x78\x01":
        return zlib.decompress(data)
    return data


def parse_file(path: Path):
    raw = maybe_zlib(path.read_bytes())
    parser = AMF3(raw)
    try:
        value = parser.read()
    except Exception as exc:
        return {"error": str(exc), "consumed": parser.i, "total": len(raw)}
    return {"value": value, "consumed": parser.i, "total": len(raw)}


def simplify_npc(rows):
    out = []
    if not isinstance(rows, list):
        return rows
    for row in rows:
        if not isinstance(row, list):
            continue
        item = {"raw": row[:12]}
        for cell in row:
            if isinstance(cell, str) and cell.endswith(".png"):
                item["icon"] = cell
            elif isinstance(cell, str) and any("\u4e00" <= c <= "\u9fff" for c in cell):
                item.setdefault("texts", []).append(cell)
            elif isinstance(cell, str) and cell.startswith("xs_"):
                item["job"] = cell
            elif isinstance(cell, (int, float)) and cell > 1000:
                item.setdefault("ids", []).append(int(cell))
        out.append(item)
    return out


def simplify_missions(rows):
    out = []
    if not isinstance(rows, list):
        return rows
    for row in rows:
        if not isinstance(row, list):
            continue
        texts = [c for c in row if isinstance(c, str) and any("\u4e00" <= c <= "\u9fff" for c in c)]
        ids = [int(c) for c in row if isinstance(c, (int, float)) and c > 0]
        out.append({"id": ids[0] if ids else None, "texts": texts[:8], "nums": ids[:12]})
    return out


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("files", nargs="+")
    ap.add_argument("-o", "--out")
    args = ap.parse_args()
    result = {}
    for f in args.files:
        path = Path(f)
        parsed = parse_file(path)
        if path.name.startswith("npc"):
            parsed["simplified"] = simplify_npc(parsed.get("value"))
        if path.name.startswith("mission"):
            parsed["simplified"] = simplify_missions(parsed.get("value"))
        result[path.name] = parsed
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if args.out:
        Path(args.out).write_text(text, encoding="utf-8")
        print("wrote", args.out)
    else:
        print(text[:4000])


if __name__ == "__main__":
    main()
