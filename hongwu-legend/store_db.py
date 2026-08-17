# -*- coding: utf-8 -*-
"""本机 SQLite 存档（与 js/store.js 同一文件 hongwu.db）。以后可改接 MySQL。"""
from __future__ import print_function

import hashlib
import json
import os
import sqlite3
import tempfile
import time

ROOT = os.path.abspath(os.path.dirname(__file__))


def hash_pass(s):
    return hashlib.sha256(str(s).encode("utf-8")).hexdigest()


def data_dir():
    return os.environ.get("HONGWU_DATA") or os.path.join(ROOT, "data")


def db_path(dirpath):
    return os.environ.get("DB_PATH") or os.path.join(dirpath, "hongwu.db")


def _connect(file):
    conn = sqlite3.connect(file, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


class Store(object):
    def __init__(self, conn, dirpath, file):
        self.conn = conn
        self.dir = dirpath
        self.file = file
        self.driver = "sqlite"

    def get_user(self, name):
        row = self.conn.execute("SELECT name, pass, created FROM users WHERE name = ?", (name,)).fetchone()
        return dict(row) if row else None

    def create_user(self, name, pass_hash):
        self.conn.execute(
            "INSERT INTO users(name, pass, created) VALUES (?, ?, ?)",
            (name, pass_hash, int(time.time() * 1000)),
        )
        self.conn.commit()

    def issue_token(self, name):
        import random
        token = "%032x" % random.getrandbits(128)
        self.conn.execute("DELETE FROM tokens WHERE user_name = ?", (name,))
        self.conn.execute(
            "INSERT INTO tokens(token, user_name, created) VALUES (?, ?, ?)",
            (token, name, int(time.time() * 1000)),
        )
        self.conn.commit()
        return token

    def user_by_token(self, token):
        if not token:
            return None
        row = self.conn.execute("SELECT user_name FROM tokens WHERE token = ?", (token,)).fetchone()
        if not row:
            return None
        name = row["user_name"]
        return name if self.get_user(name) else None

    def get_role(self, name, server_id):
        row = self.conn.execute(
            "SELECT payload FROM roles WHERE user_name = ? AND server_id = ?",
            (name, server_id),
        ).fetchone()
        if not row or row["payload"] is None:
            return None
        try:
            return json.loads(row["payload"])
        except Exception:
            return None

    def set_role(self, name, server_id, payload):
        self.conn.execute(
            "INSERT OR REPLACE INTO roles(user_name, server_id, payload, updated) VALUES (?, ?, ?, ?)",
            (name, server_id, json.dumps(payload, ensure_ascii=False), int(time.time() * 1000)),
        )
        self.conn.commit()

    def add_chat(self, who, text):
        self.conn.execute(
            "INSERT INTO chat(who, text, t) VALUES (?, ?, ?)",
            (who, text, int(time.time() * 1000)),
        )
        n = self.conn.execute("SELECT COUNT(*) AS n FROM chat").fetchone()["n"]
        if n > 80:
            self.conn.execute(
                "DELETE FROM chat WHERE id IN (SELECT id FROM chat ORDER BY id ASC LIMIT ?)",
                (n - 80,),
            )
        self.conn.commit()

    def list_chat(self, limit=40):
        rows = self.conn.execute(
            "SELECT who, text, t FROM chat ORDER BY id DESC LIMIT ?",
            (limit,),
        ).fetchall()
        rows = list(rows)
        rows.reverse()
        return [{"who": r["who"], "text": r["text"], "t": r["t"]} for r in rows]

    def get_kv(self, key):
        row = self.conn.execute("SELECT v FROM kv WHERE k = ?", (key,)).fetchone()
        if not row:
            return None
        try:
            return json.loads(row["v"])
        except Exception:
            return None

    def set_kv(self, key, value):
        self.conn.execute(
            "INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)",
            (key, json.dumps(value, ensure_ascii=False)),
        )
        self.conn.commit()

    def seed_demo(self):
        if self.get_user("demo"):
            return
        self.create_user("demo", hash_pass("123456"))


def _init_schema(conn):
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
          name VARCHAR(32) PRIMARY KEY,
          pass VARCHAR(64) NOT NULL,
          created BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS roles (
          user_name VARCHAR(32) NOT NULL,
          server_id VARCHAR(16) NOT NULL,
          payload TEXT,
          updated BIGINT NOT NULL,
          PRIMARY KEY (user_name, server_id)
        );
        CREATE TABLE IF NOT EXISTS tokens (
          token VARCHAR(64) PRIMARY KEY,
          user_name VARCHAR(32) NOT NULL,
          created BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS chat (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          who VARCHAR(32) NOT NULL,
          text VARCHAR(160) NOT NULL,
          t BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS kv (
          k VARCHAR(64) PRIMARY KEY,
          v TEXT NOT NULL
        );
        """
    )
    conn.commit()


def _migrate_json(conn, json_path):
    if not os.path.isfile(json_path):
        return
    try:
        with open(json_path, "r", encoding="utf-8") as f:
            raw = json.load(f)
    except Exception:
        return
    users = raw.get("users") or {}
    now = int(time.time() * 1000)
    for name, u in users.items():
        conn.execute(
            "INSERT OR IGNORE INTO users(name, pass, created) VALUES (?, ?, ?)",
            (name, (u or {}).get("pass") or hash_pass("123456"), (u or {}).get("created") or now),
        )
        for sid, payload in ((u or {}).get("roles") or {}).items():
            conn.execute(
                "INSERT OR REPLACE INTO roles(user_name, server_id, payload, updated) VALUES (?, ?, ?, ?)",
                (name, sid, json.dumps(payload, ensure_ascii=False), now),
            )
    for tok, name in (raw.get("tokens") or {}).items():
        conn.execute(
            "INSERT OR REPLACE INTO tokens(token, user_name, created) VALUES (?, ?, ?)",
            (tok, name, now),
        )
    for line in raw.get("chat") or []:
        conn.execute(
            "INSERT INTO chat(who, text, t) VALUES (?, ?, ?)",
            (str(line.get("who") or "系统")[:32], str(line.get("text") or "")[:160], line.get("t") or now),
        )
    if raw.get("social") is not None:
        conn.execute(
            "INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)",
            ("social", json.dumps(raw.get("social"), ensure_ascii=False)),
        )
    if raw.get("bosses") is not None:
        conn.execute(
            "INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)",
            ("bosses", json.dumps(raw.get("bosses"), ensure_ascii=False)),
        )
    conn.commit()
    try:
        os.rename(json_path, json_path + ".migrated")
        print("已把旧 JSON 存档迁入本机数据库")
    except OSError:
        pass


def open_store():
    driver = (os.environ.get("DB_DRIVER") or "sqlite").lower()
    if driver == "mysql":
        raise RuntimeError("尚未接入 MySQL。请实现 store_db 的 MySQL 分支，并设置 DB_DRIVER=mysql")
    dirpath = data_dir()
    try:
        if not os.path.isdir(dirpath):
            os.makedirs(dirpath)
    except OSError:
        dirpath = os.path.join(tempfile.gettempdir(), "hongwu-legend-data")
        if not os.path.isdir(dirpath):
            os.makedirs(dirpath)
        print("存档改写到临时目录 " + dirpath)
    file = db_path(dirpath)
    conn = _connect(file)
    _init_schema(conn)
    _migrate_json(conn, os.path.join(dirpath, "store.json"))
    store = Store(conn, dirpath, file)
    store.seed_demo()
    return store
