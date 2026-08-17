#!/usr/bin/env python3
"""SWF DoABC 解析 / AVM2 反汇编（不入库 SWF）。

从公开 CDN 的 MingGame.swf 等 CWS/FWS 里抽出 ABC，列出类、反汇编方法。
SWF 请放本机临时目录，不要提交进 git。

用法：
  python3 tools/swf-abc.py /tmp/mccq-swf/MingGame.swf --list-classes
  python3 tools/swf-abc.py MingGame.swf --class TileUitls
  python3 tools/swf-abc.py MingGame.swf --class CurrentCityView --method ptToSmallmap
  python3 tools/swf-abc.py MingGame.swf --search TILE_SIZE
  python3 tools/swf-abc.py --self-test

AVM2 s32 是 u30 位型再按 32 位有符号解释，不是 protobuf zigzag。
误用 zigzag 会把 MapDataVo.CORRECT_VALUE=10000000 读成 5000000。
"""
from __future__ import annotations

import argparse
import struct
import sys
import zlib

# Tag 72 DoABC, 82 DoABC2
TAG_DOABC = 72
TAG_DOABC2 = 82

KIND_UTF8 = 0x01
KIND_INT = 0x03
KIND_UINT = 0x04
KIND_DOUBLE = 0x06
KIND_TRUE = 0x0B
KIND_FALSE = 0x0A
KIND_NULL = 0x0C

OP = {
    0x01: ("bkpt", 0),
    0x02: ("nop", 0),
    0x03: ("throw", 0),
    0x04: ("getsuper", "u30"),
    0x05: ("setsuper", "u30"),
    0x08: ("kill", "u30"),
    0x09: ("label", 0),
    0x0c: ("ifnlt", "s24"),
    0x0d: ("ifnle", "s24"),
    0x0e: ("ifngt", "s24"),
    0x0f: ("ifnge", "s24"),
    0x10: ("jump", "s24"),
    0x11: ("iftrue", "s24"),
    0x12: ("iffalse", "s24"),
    0x13: ("ifeq", "s24"),
    0x14: ("ifne", "s24"),
    0x15: ("iflt", "s24"),
    0x16: ("ifle", "s24"),
    0x17: ("ifgt", "s24"),
    0x18: ("ifge", "s24"),
    0x19: ("ifstricteq", "s24"),
    0x1a: ("ifstrictne", "s24"),
    0x1b: ("lookupswitch", "switch"),
    0x1c: ("pushwith", 0),
    0x1d: ("popscope", 0),
    0x1e: ("nextname", 0),
    0x1f: ("hasnext", 0),
    0x20: ("pushnull", 0),
    0x21: ("pushundefined", 0),
    0x23: ("nextvalue", 0),
    0x24: ("pushbyte", "s8"),
    0x25: ("pushshort", "u30"),
    0x26: ("pushtrue", 0),
    0x27: ("pushfalse", 0),
    0x28: ("pushnan", 0),
    0x29: ("pop", 0),
    0x2a: ("dup", 0),
    0x2b: ("swap", 0),
    0x2c: ("pushstring", "str"),
    0x2d: ("pushint", "int"),
    0x2e: ("pushuint", "uint"),
    0x2f: ("pushdouble", "dbl"),
    0x30: ("pushscope", 0),
    0x31: ("pushnamespace", "u30"),
    0x32: ("hasnext2", "u30u30"),
    0x35: ("li8", 0),
    0x36: ("li16", 0),
    0x37: ("li32", 0),
    0x38: ("lf32", 0),
    0x39: ("lf64", 0),
    0x40: ("newfunction", "u30"),
    0x41: ("call", "u30"),
    0x42: ("construct", "u30"),
    0x43: ("callmethod", "u30u30"),
    0x44: ("callstatic", "u30u30"),
    0x45: ("callsuper", "u30u30"),
    0x46: ("callproperty", "u30u30"),
    0x47: ("returnvoid", 0),
    0x48: ("returnvalue", 0),
    0x49: ("constructsuper", "u30"),
    0x4a: ("constructprop", "u30u30"),
    0x4c: ("callproplex", "u30u30"),
    0x4e: ("callsupervoid", "u30u30"),
    0x4f: ("callpropvoid", "u30u30"),
    0x53: ("applytype", "u30"),
    0x55: ("newobject", "u30"),
    0x56: ("newarray", "u30"),
    0x57: ("newactivation", 0),
    0x58: ("newclass", "u30"),
    0x59: ("getdescendants", "u30"),
    0x5a: ("newcatch", "u30"),
    0x5d: ("findpropstrict", "u30"),
    0x5e: ("findproperty", "u30"),
    0x5f: ("finddef", "u30"),
    0x60: ("getlex", "u30"),
    0x61: ("setproperty", "u30"),
    0x62: ("getlocal", "u30"),
    0x63: ("setlocal", "u30"),
    0x64: ("getglobalscope", 0),
    0x65: ("getscopeobject", "u8"),
    0x66: ("getproperty", "u30"),
    0x68: ("initproperty", "u30"),
    0x6a: ("deleteproperty", "u30"),
    0x6c: ("getslot", "u30"),
    0x6d: ("setslot", "u30"),
    0x6e: ("getglobalslot", "u30"),
    0x6f: ("setglobalslot", "u30"),
    0x70: ("convert_s", 0),
    0x71: ("esc_xelem", 0),
    0x72: ("esc_xattr", 0),
    0x73: ("convert_i", 0),
    0x74: ("convert_u", 0),
    0x75: ("convert_d", 0),
    0x76: ("convert_b", 0),
    0x77: ("convert_o", 0),
    0x80: ("coerce", "u30"),
    0x82: ("coerce_a", 0),
    0x85: ("coerce_s", 0),
    0x86: ("astype", "u30"),
    0x87: ("astypelate", 0),
    0x90: ("negate", 0),
    0x91: ("increment", 0),
    0x92: ("inclocal", "u30"),
    0x93: ("decrement", 0),
    0x94: ("declocal", "u30"),
    0x95: ("typeof", 0),
    0x96: ("not", 0),
    0x97: ("bitnot", 0),
    0xa0: ("add", 0),
    0xa1: ("subtract", 0),
    0xa2: ("multiply", 0),
    0xa3: ("divide", 0),
    0xa4: ("modulo", 0),
    0xa5: ("lshift", 0),
    0xa6: ("rshift", 0),
    0xa7: ("urshift", 0),
    0xa8: ("bitand", 0),
    0xa9: ("bitor", 0),
    0xaa: ("bitxor", 0),
    0xab: ("equals", 0),
    0xac: ("strictequals", 0),
    0xad: ("lessthan", 0),
    0xae: ("lessequals", 0),
    0xaf: ("greaterthan", 0),
    0xb0: ("greaterequals", 0),
    0xb1: ("instanceof", 0),
    0xb2: ("istype", "u30"),
    0xb3: ("istypelate", 0),
    0xb4: ("in", 0),
    0xc0: ("increment_i", 0),
    0xc1: ("decrement_i", 0),
    0xc2: ("inclocal_i", "u30"),
    0xc3: ("declocal_i", "u30"),
    0xc4: ("negate_i", 0),
    0xc5: ("add_i", 0),
    0xc6: ("subtract_i", 0),
    0xc7: ("multiply_i", 0),
    0xd0: ("getlocal_0", 0),
    0xd1: ("getlocal_1", 0),
    0xd2: ("getlocal_2", 0),
    0xd3: ("getlocal_3", 0),
    0xd4: ("setlocal_0", 0),
    0xd5: ("setlocal_1", 0),
    0xd6: ("setlocal_2", 0),
    0xd7: ("setlocal_3", 0),
    0xef: ("debug", "debug"),
    0xf0: ("debugline", "u30"),
    0xf1: ("debugfile", "str"),
    0xf2: ("bkptline", "u30"),
}

MN_OPS = {
    "getlex", "findpropstrict", "findproperty", "getproperty", "setproperty",
    "initproperty", "callproperty", "callpropvoid", "constructprop", "callsuper",
    "callsupervoid", "getsuper", "setsuper", "coerce", "getdescendants",
    "deleteproperty", "callproplex", "astype", "istype",
}


def u30(data: bytes, i: int) -> tuple[int, int]:
    n = 0
    shift = 0
    while True:
        b = data[i]
        i += 1
        n |= (b & 0x7F) << shift
        shift += 7
        if not (b & 0x80) or shift >= 35:
            return n, i


def s32(data: bytes, i: int) -> tuple[int, int]:
    """AVM2 s32: variable-length bits interpreted as signed 32-bit (not zigzag)."""
    n, i = u30(data, i)
    n &= 0xFFFFFFFF
    if n >= 0x80000000:
        n -= 0x100000000
    return n, i


def encode_u30(n: int) -> bytes:
    n &= 0xFFFFFFFF
    out = bytearray()
    while True:
        b = n & 0x7F
        n >>= 7
        if n:
            out.append(b | 0x80)
        else:
            out.append(b)
            return bytes(out)


def encode_s32(n: int) -> bytes:
    return encode_u30(n & 0xFFFFFFFF)


def s24(data: bytes, i: int) -> tuple[int, int]:
    n = data[i] | (data[i + 1] << 8) | (data[i + 2] << 16)
    if n & 0x800000:
        n -= 0x1000000
    return n, i + 3


def read_string(data: bytes, i: int) -> tuple[str, int]:
    ln, i = u30(data, i)
    s = data[i : i + ln]
    i += ln
    try:
        return s.decode("utf-8"), i
    except UnicodeDecodeError:
        return s.decode("latin1", "replace"), i


def parse_swf_tags(path: str) -> list[tuple[int, bytes]]:
    raw = open(path, "rb").read()
    sig = raw[:3]
    if sig == b"CWS":
        body = zlib.decompress(raw[8:])
    elif sig == b"FWS":
        body = raw[8:]
    elif sig == b"ZWS":
        raise SystemExit("ZWS (LZMA) 未支持，请先用其它工具解成 FWS/CWS")
    else:
        raise SystemExit("不是 SWF：签名 %r" % (sig,))
    nbits = body[0] >> 3
    i = (5 + nbits * 4 + 7) // 8 + 4
    tags = []
    while i + 2 <= len(body):
        code_len = body[i] | (body[i + 1] << 8)
        i += 2
        code = code_len >> 6
        length = code_len & 0x3F
        if length == 0x3F:
            length = struct.unpack_from("<I", body, i)[0]
            i += 4
        tags.append((code, body[i : i + length]))
        i += length
        if code == 0:
            break
    return tags


def abc_blobs(tags: list[tuple[int, bytes]]) -> list[tuple[str, bytes]]:
    blobs = []
    for code, raw in tags:
        if code == TAG_DOABC:
            blobs.append(("", raw))
        elif code == TAG_DOABC2:
            k = 4
            while k < len(raw) and raw[k] != 0:
                k += 1
            name = raw[4:k].decode("utf-8", "replace")
            abcdata = raw[k + 1 :]
            if abcdata[:4] in (b"\x10\x00\x2e\x00", b"\x10\x00\x2f\x00", b"\x11\x00\x2e\x00"):
                blobs.append((name, abcdata))
            else:
                blobs.append((name or "<raw>", raw))
    return blobs


def parse_abc(data: bytes) -> dict:
    """Parse one ABC block. Returns pools, instances, method bodies, mn_str()."""
    d = data
    i = 4
    ints = [0]
    n, i = u30(d, i)
    for _ in range(max(0, n - 1)):
        v, i = s32(d, i)
        ints.append(v)
    uints = [0]
    n, i = u30(d, i)
    for _ in range(max(0, n - 1)):
        v, i = u30(d, i)
        uints.append(v)
    dbls = [float("nan")]
    n, i = u30(d, i)
    for _ in range(max(0, n - 1)):
        dbls.append(struct.unpack_from("<d", d, i)[0])
        i += 8
    strs = [""]
    n, i = u30(d, i)
    for _ in range(max(0, n - 1)):
        s, i = read_string(d, i)
        strs.append(s)
    nss = [None]
    n, i = u30(d, i)
    for _ in range(max(0, n - 1)):
        kind = d[i]
        i += 1
        name, i = u30(d, i)
        nss.append((kind, name))
    nssets = [None]
    n, i = u30(d, i)
    for _ in range(max(0, n - 1)):
        c, i = u30(d, i)
        arr = []
        for _2 in range(c):
            x, i = u30(d, i)
            arr.append(x)
        nssets.append(arr)

    def parse_mn(pos: int):
        kind = d[pos]
        pos += 1
        if kind in (0x07, 0x0D):
            ns, pos = u30(d, pos)
            name, pos = u30(d, pos)
            return (kind, ns, name, None), pos
        if kind in (0x0F, 0x10):
            name, pos = u30(d, pos)
            return (kind, 0, name, None), pos
        if kind in (0x11, 0x12):
            return (kind, 0, 0, None), pos
        if kind in (0x09, 0x0E):
            name, pos = u30(d, pos)
            nsset, pos = u30(d, pos)
            return (kind, nsset, name, None), pos
        if kind in (0x1B, 0x1C):
            nsset, pos = u30(d, pos)
            return (kind, nsset, 0, None), pos
        if kind == 0x1D:
            name, pos = u30(d, pos)
            cnt, pos = u30(d, pos)
            params = []
            for _ in range(cnt):
                p, pos = u30(d, pos)
                params.append(p)
            return (kind, 0, name, params), pos
        raise RuntimeError("unknown multiname kind 0x%02x at %d" % (kind, pos - 1))

    mnames = [None]
    n, i = u30(d, i)
    for _ in range(max(0, n - 1)):
        mn, i = parse_mn(i)
        mnames.append(mn)

    def mn_str(idx: int) -> str:
        if idx <= 0 or idx >= len(mnames) or mnames[idx] is None:
            return "*"
        kind, a, name, extra = mnames[idx]
        nm = strs[name] if name and name < len(strs) else "?"
        if kind == 0x1D and extra:
            inner = ",".join(mn_str(p) for p in extra)
            return "%s.<%s>" % (nm, inner)
        return nm

    methods = []
    n, i = u30(d, i)
    for _mi in range(n):
        pcount, i = u30(d, i)
        ret, i = u30(d, i)
        params = []
        for _ in range(pcount):
            p, i = u30(d, i)
            params.append(p)
        name, i = u30(d, i)
        flags = d[i]
        i += 1
        if flags & 0x08:
            oc, i = u30(d, i)
            for _ in range(oc):
                _val, i = u30(d, i)
                i += 1
        if flags & 0x80:
            for _ in range(pcount):
                _pn, i = u30(d, i)
        methods.append({
            "name_idx": name,
            "name": strs[name] if name < len(strs) else "",
            "pcount": pcount,
            "ret": ret,
            "flags": flags,
        })

    n, i = u30(d, i)
    for _ in range(n):
        _md, i = u30(d, i)
        ic, i = u30(d, i)
        for _2 in range(ic):
            _, i = u30(d, i)
            _, i = u30(d, i)

    def parse_traits(pos: int):
        count, pos = u30(d, pos)
        traits = []
        for _ in range(count):
            name, pos = u30(d, pos)
            kind = d[pos]
            pos += 1
            tkind = kind & 0x0F
            attr = kind >> 4
            slot_id = 0
            type_name = 0
            vindex = 0
            vkind = 0
            disp = 0
            method = 0
            if tkind in (0, 6):
                slot_id, pos = u30(d, pos)
                type_name, pos = u30(d, pos)
                vindex, pos = u30(d, pos)
                if vindex:
                    vkind = d[pos]
                    pos += 1
            elif tkind in (1, 2, 3):
                disp, pos = u30(d, pos)
                method, pos = u30(d, pos)
            elif tkind == 4:
                slot_id, pos = u30(d, pos)
                classi, pos = u30(d, pos)
                method = classi
            elif tkind == 5:
                slot_id, pos = u30(d, pos)
                method, pos = u30(d, pos)
            else:
                raise RuntimeError("trait kind %d" % tkind)
            if attr & 0x4:
                mc, pos = u30(d, pos)
                for _2 in range(mc):
                    _m, pos = u30(d, pos)
            traits.append({
                "name": mn_str(name),
                "tkind": tkind,
                "method": method,
                "slot": slot_id,
                "type": mn_str(type_name) if type_name else "",
                "vindex": vindex,
                "vkind": vkind,
            })
        return traits, pos

    nclass, i = u30(d, i)
    instances = []
    for _ in range(nclass):
        name, i = u30(d, i)
        super_idx, i = u30(d, i)
        flags = d[i]
        i += 1
        if flags & 0x08:
            _protected, i = u30(d, i)
        ic, i = u30(d, i)
        for _2 in range(ic):
            _x, i = u30(d, i)
        iinit, i = u30(d, i)
        traits, i = parse_traits(i)
        instances.append({
            "name": mn_str(name),
            "super": mn_str(super_idx),
            "iinit": iinit,
            "traits": traits,
        })
    classes = []
    for _ in range(nclass):
        cinit, i = u30(d, i)
        traits, i = parse_traits(i)
        classes.append({"cinit": cinit, "traits": traits})

    nscript, i = u30(d, i)
    for _ in range(nscript):
        _init, i = u30(d, i)
        _traits, i = parse_traits(i)

    nbodies, i = u30(d, i)
    bodies = {}
    for _ in range(nbodies):
        method, i = u30(d, i)
        maxstack, i = u30(d, i)
        local_count, i = u30(d, i)
        _init_scope, i = u30(d, i)
        _max_scope, i = u30(d, i)
        code_len, i = u30(d, i)
        code = d[i : i + code_len]
        i += code_len
        ex_count, i = u30(d, i)
        for _2 in range(ex_count):
            for _3 in range(5):
                _, i = u30(d, i)
        _traits, i = parse_traits(i)
        bodies[method] = {
            "code": code,
            "maxstack": maxstack,
            "locals": local_count,
        }
    return {
        "ints": ints,
        "uints": uints,
        "dbls": dbls,
        "strs": strs,
        "nss": nss,
        "mnames": mnames,
        "methods": methods,
        "instances": instances,
        "classes": classes,
        "bodies": bodies,
        "mn_str": mn_str,
    }


def const_value(abc: dict, vindex: int, vkind: int):
    if not vindex:
        return None
    if vkind == KIND_INT:
        return abc["ints"][vindex] if vindex < len(abc["ints"]) else vindex
    if vkind == KIND_UINT:
        return abc["uints"][vindex] if vindex < len(abc["uints"]) else vindex
    if vkind == KIND_DOUBLE:
        return abc["dbls"][vindex] if vindex < len(abc["dbls"]) else vindex
    if vkind == KIND_UTF8:
        return abc["strs"][vindex] if vindex < len(abc["strs"]) else vindex
    if vkind == KIND_TRUE:
        return True
    if vkind == KIND_FALSE:
        return False
    if vkind == KIND_NULL:
        return None
    return "kind=0x%02x idx=%d" % (vkind, vindex)


def disasm(code: bytes, abc: dict) -> list[str]:
    ints, uints, dbls, strs = abc["ints"], abc["uints"], abc["dbls"], abc["strs"]
    mn_str = abc["mn_str"]
    out = []
    i = 0
    n = len(code)
    while i < n:
        pc = i
        op = code[i]
        i += 1
        info = OP.get(op)
        if not info:
            out.append("%4d  ?? 0x%02x" % (pc, op))
            continue
        name, kind = info
        arg = ""
        if kind == 0:
            pass
        elif kind == "u30":
            v, i = u30(code, i)
            if name in MN_OPS:
                arg = " %d (%s)" % (v, mn_str(v))
            else:
                arg = " %d" % v
        elif kind == "u30u30":
            a, i = u30(code, i)
            b, i = u30(code, i)
            if name in MN_OPS:
                arg = " %d (%s) argc=%d" % (a, mn_str(a), b)
            else:
                arg = " %d %d" % (a, b)
        elif kind == "s24":
            v, i = s24(code, i)
            arg = " %+d -> %d" % (v, i + v)
        elif kind == "s8":
            v = code[i]
            if v >= 128:
                v -= 256
            i += 1
            arg = " %d" % v
        elif kind == "u8":
            arg = " %d" % code[i]
            i += 1
        elif kind == "str":
            v, i = u30(code, i)
            arg = " %r" % (strs[v] if v < len(strs) else v)
        elif kind == "int":
            v, i = u30(code, i)
            arg = " %s" % (ints[v] if v < len(ints) else v)
        elif kind == "uint":
            v, i = u30(code, i)
            arg = " %s" % (uints[v] if v < len(uints) else v)
        elif kind == "dbl":
            v, i = u30(code, i)
            arg = " %s" % (dbls[v] if v < len(dbls) else v)
        elif kind == "switch":
            default, i = s24(code, i)
            case_count, i = u30(code, i)
            cases = []
            for _ in range(case_count + 1):
                c, i = s24(code, i)
                cases.append(c)
            arg = " default%+d cases=%s" % (default, cases)
        elif kind == "debug":
            i += 1
            _, i = u30(code, i)
            i += 1
            _, i = u30(code, i)
            arg = " ..."
        out.append("%4d  %s%s" % (pc, name, arg))
    return out


def load_swf(path: str) -> list[tuple[str, dict]]:
    tags = parse_swf_tags(path)
    out = []
    for name, data in abc_blobs(tags):
        out.append((name, parse_abc(data)))
    return out


def match_class(inst: dict, needle: str) -> bool:
    return needle.lower() in inst["name"].lower()


def dump_class(abc: dict, inst: dict, cls: dict, method_filter: str | None = None) -> None:
    print("\n## class %s extends %s" % (inst["name"], inst["super"]))
    print("  iinit", inst["iinit"], abc["methods"][inst["iinit"]]["name"] if inst["iinit"] < len(abc["methods"]) else "")
    if cls["cinit"] in abc["bodies"] and not method_filter:
        print("  --- cinit ---")
        for line in disasm(abc["bodies"][cls["cinit"]]["code"], abc):
            print("   ", line)
    tkind_name = {0: "slot", 1: "method", 2: "getter", 3: "setter", 4: "class", 5: "function", 6: "const"}
    for t in inst["traits"] + cls["traits"]:
        extra = ""
        if t["tkind"] in (0, 6) and t["vindex"]:
            extra = " = %r" % (const_value(abc, t["vindex"], t["vkind"]),)
        print("  %s %s%s  method=%s slot=%s %s" % (
            tkind_name.get(t["tkind"], t["tkind"]),
            t["name"], extra, t["method"], t["slot"], t.get("type", ""),
        ))
        if t["tkind"] in (1, 2, 3) and t["method"] in abc["bodies"]:
            if method_filter and method_filter.lower() not in t["name"].lower():
                continue
            print("  --- disasm %s ---" % t["name"])
            for line in disasm(abc["bodies"][t["method"]]["code"], abc):
                print("   ", line)


def cmd_list_classes(abcs: list[tuple[str, dict]]) -> None:
    for bname, abc in abcs:
        print("# ABC %s  classes=%d methods=%d strings=%d" % (
            bname or "<unnamed>", len(abc["instances"]), len(abc["methods"]), len(abc["strs"]),
        ))
        for inst in abc["instances"]:
            print(inst["name"])


def cmd_dump_class(abcs: list[tuple[str, dict]], cls_name: str, method: str | None) -> None:
    found = 0
    for _bname, abc in abcs:
        for inst, cls in zip(abc["instances"], abc["classes"]):
            if match_class(inst, cls_name):
                dump_class(abc, inst, cls, method)
                found += 1
    if not found:
        raise SystemExit("未找到类 %r" % cls_name)


def cmd_search(abcs: list[tuple[str, dict]], needle: str) -> None:
    q = needle.lower()
    for bname, abc in abcs:
        print("# ABC", bname or "<unnamed>")
        for i, s in enumerate(abc["strs"]):
            if q in s.lower():
                print("  str[%d] %r" % (i, s))
        for i, v in enumerate(abc["ints"]):
            if needle.lstrip("-").isdigit() and v == int(needle):
                print("  int[%d] %s" % (i, v))
        for inst, cls in zip(abc["instances"], abc["classes"]):
            names = [inst["name"]] + [t["name"] for t in inst["traits"] + cls["traits"]]
            if any(q in n.lower() for n in names):
                print("  class", inst["name"])
                for t in inst["traits"] + cls["traits"]:
                    if q in t["name"].lower() or q in inst["name"].lower():
                        print("    trait", t["tkind"], t["name"])
                        if t["tkind"] in (1, 2, 3) and t["method"] in abc["bodies"] and q in t["name"].lower():
                            for line in disasm(abc["bodies"][t["method"]]["code"], abc):
                                print("     ", line)


def make_minimal_abc() -> bytes:
    """ABC with int pool 10000000 and string TILE_SIZE, no classes."""
    out = bytearray()
    out += struct.pack("<HH", 16, 46)
    out += encode_u30(2) + encode_s32(10000000)  # ints
    out += encode_u30(1)  # uints
    out += encode_u30(1)  # doubles
    s = b"TILE_SIZE"
    out += encode_u30(2) + encode_u30(len(s)) + s
    out += encode_u30(1)  # ns
    out += encode_u30(1)  # nsset
    out += encode_u30(1)  # multinames
    out += encode_u30(0)  # methods
    out += encode_u30(0)  # metadata
    out += encode_u30(0)  # classes
    out += encode_u30(0)  # scripts
    out += encode_u30(0)  # bodies
    return bytes(out)


def self_test() -> None:
    samples = [0, 1, -1, 44, 127, 128, -1232, 3520, 10000000, 0x7FFFFFFF, -2147483648]
    for v in samples:
        buf = encode_s32(v)
        got, i = s32(buf, 0)
        assert i == len(buf), (v, buf, i)
        assert got == v, "s32 %s -> %s bytes=%s" % (v, got, buf.hex())
    # zigzag of 10000000 would be 5000000; our decoder must not do that
    buf = encode_u30(10000000)
    got, _ = s32(buf, 0)
    assert got == 10000000, got
    abc = parse_abc(make_minimal_abc())
    assert abc["ints"][1] == 10000000, abc["ints"]
    assert abc["strs"][1] == "TILE_SIZE", abc["strs"]
    assert abc["instances"] == []
    print("swf-abc self-test ok")


def main(argv: list[str] | None = None) -> None:
    p = argparse.ArgumentParser(description="Parse SWF DoABC and disassemble AVM2 methods")
    p.add_argument("swf", nargs="?", help="本地 .swf 路径（不要提交进仓库）")
    p.add_argument("--list-classes", action="store_true")
    p.add_argument("--class", dest="cls", help="类名子串，例如 TileUitls / MapEncode")
    p.add_argument("--method", help="与 --class 合用，只反汇编匹配的方法")
    p.add_argument("--search", help="在字符串 / 类名 / 方法名中搜索")
    p.add_argument("--self-test", action="store_true")
    args = p.parse_args(argv)
    if args.self_test:
        self_test()
        return
    if not args.swf:
        p.error("请给出 .swf 路径，或使用 --self-test")
    abcs = load_swf(args.swf)
    if args.list_classes:
        cmd_list_classes(abcs)
        return
    if args.cls:
        cmd_dump_class(abcs, args.cls, args.method)
        return
    if args.search:
        cmd_search(abcs, args.search)
        return
    p.error("请指定 --list-classes / --class / --search / --self-test")


if __name__ == "__main__":
    main()
