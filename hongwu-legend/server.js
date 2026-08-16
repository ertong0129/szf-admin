/**
 * 洪武风云录本地服务端（无需 npm 依赖）
 * 提供静态资源、账号、选服存档、附近聊天。
 */
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var crypto = require('crypto');

var ROOT = __dirname;
var DATA = path.join(ROOT, 'data');
var PORT = process.env.PORT || 8088;
var STORE = path.join(DATA, 'store.json');

function ensure() {
  if (!fs.existsSync(DATA)) fs.mkdirSync(DATA);
  if (!fs.existsSync(STORE)) {
    fs.writeFileSync(STORE, JSON.stringify({
      users: {
        demo: { pass: hash('123456'), roles: {}, created: Date.now() }
      },
      tokens: {},
      chat: [{ who: '系统', text: '欢迎来到洪武风云录。测试号 demo / 123456', t: Date.now() }]
    }, null, 2));
  }
}

function hash(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function load() {
  ensure();
  return JSON.parse(fs.readFileSync(STORE, 'utf8'));
}

function save(db) {
  fs.writeFileSync(STORE, JSON.stringify(db, null, 2));
}

function json(res, code, obj) {
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Token'
  });
  res.end(JSON.stringify(obj));
}

function readBody(req, cb) {
  var buf = '';
  req.on('data', function (c) { buf += c; if (buf.length > 2e6) req.destroy(); });
  req.on('end', function () {
    try { cb(buf ? JSON.parse(buf) : {}); } catch (e) { cb({}); }
  });
}

function userOf(req, db) {
  var token = req.headers['x-token'] || '';
  var name = db.tokens[token];
  if (!name || !db.users[name]) return null;
  return name;
}

var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.txt': 'text/plain; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.bat': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8'
};

function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  var file = path.normalize(path.join(ROOT, pathname));
  if (file.indexOf(ROOT) !== 0) return json(res, 403, { error: '禁止' });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  var ext = path.extname(file).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}

var SERVERS = [
  { id: 's1', name: '双线1服 · 洪武风云', status: '火爆' },
  { id: 's2', name: '双线2服 · 永乐新章', status: '畅通' },
  { id: 's3', name: '双线3服 · 万历征途', status: '新服' }
];

var server = http.createServer(function (req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Token',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    return res.end();
  }
  var u = url.parse(req.url, true);
  var p = u.pathname;

  if (p === '/api/ping') return json(res, 200, { ok: true });

  if (p === '/api/register' && req.method === 'POST') {
    return readBody(req, function (b) {
      var user = String(b.user || '').trim();
      var pass = String(b.pass || '');
      if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{2,16}$/.test(user)) return json(res, 400, { error: '账号需 2-16 位' });
      if (pass.length < 4) return json(res, 400, { error: '密码至少 4 位' });
      var db = load();
      if (db.users[user]) return json(res, 400, { error: '账号已存在' });
      db.users[user] = { pass: hash(pass), roles: {}, created: Date.now() };
      var token = crypto.randomBytes(16).toString('hex');
      db.tokens[token] = user;
      save(db);
      json(res, 200, { token: token, user: user });
    });
  }

  if (p === '/api/login' && req.method === 'POST') {
    return readBody(req, function (b) {
      var db = load();
      var user = String(b.user || '').trim();
      var rec = db.users[user];
      if (!rec || rec.pass !== hash(String(b.pass || ''))) return json(res, 400, { error: '账号或密码错误' });
      var token = crypto.randomBytes(16).toString('hex');
      db.tokens[token] = user;
      save(db);
      json(res, 200, { token: token, user: user });
    });
  }

  if (p === '/api/servers') return json(res, 200, { servers: SERVERS });

  if (p === '/api/role' && req.method === 'GET') {
    var db = load();
    var name = userOf(req, db);
    if (!name) return json(res, 401, { error: '请先登录' });
    var sid = String(u.query.server || 's1');
    json(res, 200, { role: db.users[name].roles[sid] || null });
  }

  if (p === '/api/role' && req.method === 'POST') {
    return readBody(req, function (b) {
      var db = load();
      var name = userOf(req, db);
      if (!name) return json(res, 401, { error: '请先登录' });
      var sid = String(b.server || 's1');
      db.users[name].roles[sid] = b.payload || null;
      save(db);
      json(res, 200, { ok: true });
    });
  }

  if (p === '/api/chat' && req.method === 'GET') {
    var dbc = load();
    json(res, 200, { lines: (dbc.chat || []).slice(-40) });
  }

  if (p === '/api/chat' && req.method === 'POST') {
    return readBody(req, function (b) {
      var db = load();
      var name = userOf(req, db) || '过客';
      var text = String(b.text || '').slice(0, 80);
      if (!text) return json(res, 400, { error: '空消息' });
      db.chat = db.chat || [];
      db.chat.push({ who: name, text: text, t: Date.now() });
      if (db.chat.length > 80) db.chat = db.chat.slice(-80);
      save(db);
      json(res, 200, { ok: true });
    });
  }

  serveStatic(req, res, decodeURIComponent(p));
});

ensure();
server.listen(PORT, '127.0.0.1', function () {
  console.log('洪武风云录服务端 http://127.0.0.1:' + PORT + '/');
  console.log('测试账号 demo / 123456');
});
