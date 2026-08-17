/**
 * 本机持久化：默认 SQLite 文件库（嵌入式，角色与 Java 项目里的 H2 相同）。
 * 表结构按 MySQL 来，以后设 DB_DRIVER=mysql 并实现 store-mysql.js 即可换库。
 * 浏览器不存档。
 */
var fs = require('fs');
var path = require('path');
var os = require('os');
var crypto = require('crypto');

function hash(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function dataDir() {
  var dir = process.env.HONGWU_DATA;
  if (!dir) dir = path.join(__dirname, '..', 'data');
  return dir;
}

function dbFile(dir) {
  return process.env.DB_PATH || path.join(dir, 'hongwu.db');
}

function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  } catch (e) {
    var fallback = path.join(os.tmpdir(), 'hongwu-legend-data');
    fs.mkdirSync(fallback, { recursive: true });
    console.log('存档改写到临时目录 ' + fallback);
    return fallback;
  }
}

function parseJson(s, fallback) {
  if (!s) return fallback;
  try { return JSON.parse(s); } catch (e) { return fallback; }
}

function sqliteDb(file) {
  var sqlite;
  try {
    sqlite = require('node:sqlite');
  } catch (e) {
    throw new Error('本机 SQLite 需要 Node.js 22+（内置 node:sqlite）。请升级 Node，或改用 python server.py');
  }
  if (!sqlite.DatabaseSync) {
    throw new Error('当前 Node 的 sqlite 不可用，请升级到 22.5+ 或改用 python server.py');
  }
  return new sqlite.DatabaseSync(file);
}

function migrateJson(db, jsonPath) {
  if (!fs.existsSync(jsonPath)) return;
  var raw;
  try { raw = JSON.parse(fs.readFileSync(jsonPath, 'utf8')); } catch (e) { return; }
  if (!raw || !raw.users) return;
  var insertUser = db.prepare('INSERT OR IGNORE INTO users(name, pass, created) VALUES (?, ?, ?)');
  var insertRole = db.prepare('INSERT OR REPLACE INTO roles(user_name, server_id, payload, updated) VALUES (?, ?, ?, ?)');
  var insertTok = db.prepare('INSERT OR REPLACE INTO tokens(token, user_name, created) VALUES (?, ?, ?)');
  var now = Date.now();
  Object.keys(raw.users).forEach(function (name) {
    var u = raw.users[name] || {};
    insertUser.run(name, u.pass || hash('123456'), u.created || now);
    var roles = u.roles || {};
    Object.keys(roles).forEach(function (sid) {
      insertRole.run(name, sid, JSON.stringify(roles[sid] || null), now);
    });
  });
  Object.keys(raw.tokens || {}).forEach(function (tok) {
    insertTok.run(tok, raw.tokens[tok], now);
  });
  (raw.chat || []).forEach(function (line) {
    db.prepare('INSERT INTO chat(who, text, t) VALUES (?, ?, ?)').run(
      String(line.who || '系统').slice(0, 32),
      String(line.text || '').slice(0, 160),
      line.t || now
    );
  });
  if (raw.social) {
    db.prepare('INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)').run('social', JSON.stringify(raw.social));
  }
  if (raw.bosses) {
    db.prepare('INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)').run('bosses', JSON.stringify(raw.bosses));
  }
  try {
    fs.renameSync(jsonPath, jsonPath + '.migrated');
    console.log('已把旧 JSON 存档迁入本机数据库');
  } catch (e) { /* ignore */ }
}

function createStore(db, dir, file) {
  function getUser(name) {
    return db.prepare('SELECT name, pass, created FROM users WHERE name = ?').get(name) || null;
  }

  function createUser(name, passHash) {
    db.prepare('INSERT INTO users(name, pass, created) VALUES (?, ?, ?)').run(name, passHash, Date.now());
  }

  function issueToken(name) {
    var token = crypto.randomBytes(16).toString('hex');
    db.prepare('DELETE FROM tokens WHERE user_name = ?').run(name);
    db.prepare('INSERT INTO tokens(token, user_name, created) VALUES (?, ?, ?)').run(token, name, Date.now());
    return token;
  }

  function userByToken(token) {
    if (!token) return null;
    var row = db.prepare('SELECT user_name FROM tokens WHERE token = ?').get(token);
    if (!row) return null;
    return getUser(row.user_name) ? row.user_name : null;
  }

  function getRole(name, serverId) {
    var row = db.prepare('SELECT payload FROM roles WHERE user_name = ? AND server_id = ?').get(name, serverId);
    return row ? parseJson(row.payload, null) : null;
  }

  function setRole(name, serverId, payload) {
    db.prepare('INSERT OR REPLACE INTO roles(user_name, server_id, payload, updated) VALUES (?, ?, ?, ?)').run(
      name, serverId, JSON.stringify(payload || null), Date.now()
    );
  }

  function addChat(who, text) {
    db.prepare('INSERT INTO chat(who, text, t) VALUES (?, ?, ?)').run(who, text, Date.now());
    var n = db.prepare('SELECT COUNT(*) AS n FROM chat').get().n;
    if (n > 80) {
      db.prepare('DELETE FROM chat WHERE id IN (SELECT id FROM chat ORDER BY id ASC LIMIT ?)').run(n - 80);
    }
  }

  function listChat(limit) {
    limit = limit || 40;
    var rows = db.prepare('SELECT who, text, t FROM chat ORDER BY id DESC LIMIT ?').all(limit);
    return rows.reverse();
  }

  function getKv(key) {
    var row = db.prepare('SELECT v FROM kv WHERE k = ?').get(key);
    return row ? parseJson(row.v, null) : null;
  }

  function setKv(key, value) {
    db.prepare('INSERT OR REPLACE INTO kv(k, v) VALUES (?, ?)').run(key, JSON.stringify(value == null ? null : value));
  }

  function seedDemo() {
    if (getUser('demo')) return;
    createUser('demo', hash('123456'));
  }

  return {
    driver: 'sqlite',
    dir: dir,
    file: file,
    hash: hash,
    getUser: getUser,
    createUser: createUser,
    issueToken: issueToken,
    userByToken: userByToken,
    getRole: getRole,
    setRole: setRole,
    addChat: addChat,
    listChat: listChat,
    getKv: getKv,
    setKv: setKv,
    seedDemo: seedDemo
  };
}

var singleton = null;

function open() {
  var driver = String(process.env.DB_DRIVER || 'sqlite').toLowerCase();
  if (driver === 'mysql') {
    return require('./store-mysql.js').open();
  }
  var dir = ensureDir(dataDir());
  var file = dbFile(dir);
  if (singleton && singleton.file === file) return singleton;
  var db = sqliteDb(file);
  db.exec('PRAGMA journal_mode = WAL');
  db.exec('CREATE TABLE IF NOT EXISTS users (' +
    'name VARCHAR(32) PRIMARY KEY,' +
    'pass VARCHAR(64) NOT NULL,' +
    'created BIGINT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS roles (' +
    'user_name VARCHAR(32) NOT NULL,' +
    'server_id VARCHAR(16) NOT NULL,' +
    'payload TEXT,' +
    'updated BIGINT NOT NULL,' +
    'PRIMARY KEY (user_name, server_id))');
  db.exec('CREATE TABLE IF NOT EXISTS tokens (' +
    'token VARCHAR(64) PRIMARY KEY,' +
    'user_name VARCHAR(32) NOT NULL,' +
    'created BIGINT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS chat (' +
    'id INTEGER PRIMARY KEY AUTOINCREMENT,' +
    'who VARCHAR(32) NOT NULL,' +
    'text VARCHAR(160) NOT NULL,' +
    't BIGINT NOT NULL)');
  db.exec('CREATE TABLE IF NOT EXISTS kv (' +
    'k VARCHAR(64) PRIMARY KEY,' +
    'v TEXT NOT NULL)');
  migrateJson(db, path.join(dir, 'store.json'));
  var store = createStore(db, dir, file);
  store.seedDemo();
  singleton = store;
  return store;
}

module.exports = { open: open, hash: hash, dataDir: dataDir };
