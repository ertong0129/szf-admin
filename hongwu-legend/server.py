#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""大明传说本地服务端（无第三方依赖，给没有 Node 的机器用）。"""
from __future__ import print_function

import hashlib
import json
import os
import random
import sys
import tempfile
import threading
import time
import webbrowser

try:
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
except ImportError:
    from BaseHTTPServer import BaseHTTPRequestHandler, HTTPServer as ThreadingHTTPServer

ROOT = os.path.abspath(os.path.dirname(__file__))
PORT = int(os.environ.get("PORT") or "8088")
VERSION = "20260817m"
HOST = os.environ.get("HOST") or "0.0.0.0"
WORLD = {}
CHAT = {}
EVENTS = {}
PARTY_OF = {}
PARTIES = {}

import store_db
store = store_db.open_store()
hash_pass = store_db.hash_pass


def lan_ips():
    ips = []
    try:
        import socket
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ips.append(s.getsockname()[0])
        s.close()
    except Exception:
        pass
    return ips


def _user_of(handler):
    token = handler.headers.get("X-Token") or ""
    return store.user_by_token(token)


def world_upsert(server, user, body):
    WORLD.setdefault(server, {})
    slot = {
        "user": user,
        "name": str(body.get("name") or user)[:8],
        "cls": body.get("cls") or "warrior",
        "level": body.get("level") or 1,
        "mapId": body.get("mapId") or "taiping",
        "x": float(body.get("x") or 0),
        "y": float(body.get("y") or 0),
        "hp": float(body.get("hp") or 0),
        "maxHp": float(body.get("maxHp") or 1),
        "mp": float(body.get("mp") or 0),
        "pkMode": body.get("pkMode") or "peace",
        "pkValue": int(body.get("pkValue") or 0),
        "nation": "yuan" if body.get("nation") == "yuan" else "ming",
        "sit": bool(body.get("sit")),
        "facing": float(body.get("facing") or 0),
        "t": time.time(),
    }
    WORLD[server][user] = slot
    return world_snap(server, user)


def world_snap(server, user):
    now = time.time()
    others = []
    for u, s in list(WORLD.get(server, {}).items()):
        if now - s.get("t", 0) > 4:
            WORLD[server].pop(u, None)
            continue
        if u == user:
            continue
        others.append(dict(s, red=s.get("pkValue", 0) >= 18, stall=s.get("stall")))
    ev = EVENTS.pop(user, [])
    return {
        "me": WORLD.get(server, {}).get(user),
        "players": others,
        "chat": CHAT.get(server, [])[-50:],
        "events": ev,
        "invites": [],
        "friends": [],
        "party": PARTIES.get(PARTY_OF.get(user)),
        "clan": None,
        "trade": None,
        "online": len(WORLD.get(server, {})),
    }


def day_key():
    t = time.localtime()
    return "%d-%d-%d" % (t.tm_year, t.tm_mon, t.tm_mday)


def world_hp(lv=60):
    return int((40 + lv * 28 + (lv ** 1.25) * 6) * 8)


def ensure_bosses():
    b = store.get_kv("bosses") or {"field": {}, "world": None}
    b.setdefault("field", {})
    day = day_key()
    w = b.get("world")
    if not w or w.get("day") != day:
        maps = ["zhedong", "quanzhou"]
        n = int(time.time() // 86400)
        hp = world_hp(60)
        b["world"] = {
            "day": day,
            "map": maps[n % 2],
            "hp": hp,
            "maxHp": hp,
            "dmg": {},
            "first": "",
            "last": "",
            "nation": "",
            "dead": False,
            "name": "异邦武士",
        }
    store.set_kv("bosses", b)
    return b


MIME = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".txt": "text/plain; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".md": "text/plain; charset=utf-8",
}

SERVERS = [
    {"id": "s1", "name": "双线1服 · 大明传说", "status": "火爆"},
    {"id": "s2", "name": "双线2服 · 永乐新章", "status": "畅通"},
    {"id": "s3", "name": "双线3服 · 万历征途", "status": "新服"},
]


def safe_file(pathname):
    rel = (pathname or "/").split("?", 1)[0]
    try:
        if sys.version_info[0] >= 3:
            from urllib.parse import unquote
        else:
            from urllib import unquote
        rel = unquote(rel)
    except Exception:
        return None
    rel = rel.replace("\\", "/").lstrip("/")
    if not rel:
        rel = "index.html"
    parts = [p for p in rel.split("/") if p and p != "."]
    if any(p == ".." for p in parts):
        return None
    file = os.path.abspath(os.path.join(ROOT, *parts))
    root = os.path.abspath(ROOT)
    if os.path.commonprefix([file, root]) != root:
        return None
    return file


class Handler(BaseHTTPRequestHandler):
    server_version = "Hongwu/1"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _json(self, code, obj):
        try:
            raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
            self.send_response(code)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Token")
            self.send_header("Content-Length", str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, IOError, OSError):
            return

    def _body(self):
        n = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(n) if n else b""
        if not raw:
            return {}
        try:
            return json.loads(raw.decode("utf-8"))
        except Exception:
            return {}

    def _user(self):
        token = self.headers.get("X-Token") or ""
        return store.user_by_token(token)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Token")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.end_headers()

    def do_GET(self):
        self._handle("GET")

    def do_POST(self):
        self._handle("POST")

    def _handle(self, method):
        try:
            self._dispatch(method)
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            return
        except Exception:
            import traceback
            traceback.print_exc()
            try:
                self._json(500, {"error": "服务器内部错误"})
            except Exception:
                pass

    def _dispatch(self, method):
        if sys.version_info[0] >= 3:
            from urllib.parse import urlparse, parse_qs
        else:
            from urlparse import urlparse, parse_qs
        u = urlparse(self.path)
        p = u.path or "/"
        q = parse_qs(u.query)

        if p == "/api/ping":
            return self._json(200, {"ok": True, "v": VERSION, "lan": True, "ips": lan_ips(), "store": store.driver})
        if p == "/api/servers":
            return self._json(200, {"servers": SERVERS})
        if p == "/api/register" and method == "POST":
            b = self._body()
            user = str(b.get("user") or "").strip()
            pw = str(b.get("pass") or "")
            if len(user) < 2 or len(user) > 16:
                return self._json(400, {"error": "账号需 2-16 位"})
            if len(pw) < 4:
                return self._json(400, {"error": "密码至少 4 位"})
            if store.get_user(user):
                return self._json(400, {"error": "账号已存在"})
            store.create_user(user, hash_pass(pw))
            return self._json(200, {"token": store.issue_token(user), "user": user})
        if p == "/api/login" and method == "POST":
            b = self._body()
            user = str(b.get("user") or "").strip()
            rec = store.get_user(user)
            if not rec or rec.get("pass") != hash_pass(b.get("pass") or ""):
                return self._json(400, {"error": "账号或密码错误"})
            return self._json(200, {"token": store.issue_token(user), "user": user})
        if p == "/api/role" and method == "GET":
            name = self._user()
            if not name:
                return self._json(401, {"error": "请先登录"})
            sid = (q.get("server") or ["s1"])[0]
            return self._json(200, {"role": store.get_role(name, sid)})
        if p == "/api/role" and method == "POST":
            b = self._body()
            name = self._user()
            if not name:
                return self._json(401, {"error": "请先登录"})
            sid = str(b.get("server") or "s1")
            store.set_role(name, sid, b.get("payload"))
            return self._json(200, {"ok": True})
        if p == "/api/chat" and method == "GET":
            return self._json(200, {"lines": store.list_chat(40)})
        if p == "/api/chat" and method == "POST":
            b = self._body()
            name = self._user() or "过客"
            text = str(b.get("text") or "")[:80]
            if not text:
                return self._json(400, {"error": "空消息"})
            store.add_chat(name, text)
            return self._json(200, {"ok": True})
        if p == "/api/bosses" and method == "GET":
            bosses = ensure_bosses()
            return self._json(200, {"bosses": bosses})
        if p == "/api/bosses" and method == "POST":
            b = self._body()
            bosses = ensure_bosses()
            op = str(b.get("op") or "")
            if op == "field_kill" and b.get("id"):
                bosses.setdefault("field", {})[str(b.get("id"))] = {"deadAt": int(time.time() * 1000)}
                store.set_kv("bosses", bosses)
                return self._json(200, {"ok": True, "bosses": bosses})
            if op == "world_hit":
                name = self._user() or str(b.get("name") or "过客")
                w = bosses.get("world") or {}
                if w.get("dead"):
                    return self._json(200, {"ok": False, "world": w, "killed": False})
                dmg = max(1, int(b.get("dmg") or 1))
                w.setdefault("dmg", {})
                if not w.get("first"):
                    w["first"] = name
                w["dmg"][name] = int(w["dmg"].get(name) or 0) + dmg
                w["hp"] = max(0, int(w.get("hp") or 0) - dmg)
                killed = False
                if w["hp"] <= 0 and not w.get("dead"):
                    w["dead"] = True
                    w["last"] = name
                    w["nation"] = str(b.get("nation") or "ming")
                    killed = True
                bosses["world"] = w
                store.set_kv("bosses", bosses)
                return self._json(200, {"ok": True, "world": w, "killed": killed})
            return self._json(400, {"error": "未知操作"})

        if p == "/api/world" and method == "POST":
            b = self._body()
            name = self._user()
            if not name:
                return self._json(401, {"error": "请先登录"})
            sid = str(b.get("server") or "s1")
            return self._json(200, world_upsert(sid, name, b or {}))
        if p == "/api/world" and method == "GET":
            name = self._user()
            if not name:
                return self._json(401, {"error": "请先登录"})
            sid = (q.get("server") or ["s1"])[0]
            return self._json(200, world_snap(sid, name))
        if p == "/api/social" and method == "POST":
            b = self._body()
            name = self._user()
            if not name:
                return self._json(401, {"error": "请先登录"})
            sid = str(b.get("server") or "s1")
            op = str(b.get("op") or "")
            if op == "say":
                CHAT.setdefault(sid, []).append({
                    "who": name, "user": name, "text": str(b.get("text") or "")[:80],
                    "chan": b.get("chan") or "near", "t": int(time.time() * 1000),
                    "mapId": (WORLD.get(sid) or {}).get(name, {}).get("mapId") or "",
                    "x": (WORLD.get(sid) or {}).get(name, {}).get("x") or 0,
                    "y": (WORLD.get(sid) or {}).get(name, {}).get("y") or 0,
                })
                CHAT[sid] = CHAT[sid][-80:]
                return self._json(200, {"ok": True})
            if op == "hit":
                tgt = str(b.get("target") or b.get("user") or "")
                shop = (WORLD.get(sid) or {}).get(tgt)
                me = (WORLD.get(sid) or {}).get(name)
                if not shop or not me:
                    return self._json(400, {"error": "目标不在线"})
                if b.get("safe") or me.get("pkMode") == "peace":
                    return self._json(400, {"error": "当前 PK 模式不能攻击"})
                dmg = max(1, int(b.get("dmg") or 1))
                shop["hp"] = max(0, shop.get("hp", 0) - dmg)
                EVENTS.setdefault(tgt, []).append({"kind": "pvp_hurt", "from": name, "name": me.get("name"), "dmg": dmg, "hp": shop["hp"]})
                return self._json(200, {"ok": True, "hp": shop["hp"], "killed": shop["hp"] <= 0})
            if op == "leave":
                if sid in WORLD:
                    WORLD[sid].pop(name, None)
                return self._json(200, {"ok": True})
            return self._json(400, {"error": "请用 Node 服务端以启用组队/交易/摆摊（python 仅同步与 PK）"})

        if p in ("/", ""):
            p = "/index.html"
        if p == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return
        file = safe_file(p)
        if not file or not os.path.isfile(file):
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(("Not found: " + p).encode("utf-8"))
            return
        ext = os.path.splitext(file)[1].lower()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Content-Length", str(os.path.getsize(file)))
        self.end_headers()
        with open(file, "rb") as f:
            while True:
                chunk = f.read(64 * 1024)
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError, IOError, OSError):
                    return


def serve(port):
    last = port + 12
    while port <= last:
        try:
            httpd = ThreadingHTTPServer((HOST, port), Handler)
            return httpd, port
        except OSError as e:
            if port >= last:
                raise
            print("端口 %s 占用，改试 %s" % (port, port + 1))
            port += 1


def main():
    try:
        import signal
        signal.signal(signal.SIGPIPE, signal.SIG_IGN)
    except Exception:
        pass
    httpd, port = serve(PORT)
    href = "http://127.0.0.1:%s/" % port
    print("大明传说服务端 " + href)
    for ip in lan_ips():
        print("局域网请打开 http://%s:%s/" % (ip, port))
    print("朋友用同一局域网地址，各自注册账号后选同一服务器。")
    print("版本 " + VERSION)
    print("本机数据库 %s  %s" % (store.driver, store.file))
    print("测试账号 demo / 123456")
    print("关闭本窗口即停止服务。")
    if os.environ.get("OPEN_BROWSER") != "0":
        threading.Timer(0.3, lambda: webbrowser.open(href)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
