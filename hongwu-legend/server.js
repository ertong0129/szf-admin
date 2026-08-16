/**
 * 洪武风云录本地服务端（无需 npm 依赖）
 * 提供静态资源、账号、选服存档、附近聊天。
 */
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var os = require('os');
var crypto = require('crypto');
var { exec } = require('child_process');

var ROOT = path.resolve(__dirname);
var DATA = path.join(ROOT, 'data');
var PORT = parseInt(process.env.PORT || '8088', 10);
var STORE = path.join(DATA, 'store.json');
var VERSION = '20260816d';

function hash(s) {
  return crypto.createHash('sha256').update(String(s)).digest('hex');
}

function defaultStore() {
  return {
    users: {
      demo: { pass: hash('123456'), roles: {}, created: Date.now() }
    },
    tokens: {},
    chat: [{ who: '系统', text: '欢迎来到洪武风云录。测试号 demo / 123456', t: Date.now() }]
  };
}

function ensure() {
  try {
    if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
    if (!fs.existsSync(STORE)) fs.writeFileSync(STORE, JSON.stringify(defaultStore(), null, 2));
  } catch (e) {
    DATA = path.join(os.tmpdir(), 'hongwu-legend-data');
    STORE = path.join(DATA, 'store.json');
    if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });
    if (!fs.existsSync(STORE)) fs.writeFileSync(STORE, JSON.stringify(defaultStore(), null, 2));
    console.log('存档改写到临时目录 ' + DATA);
  }
}

function load() {
  ensure();
  try {
    return JSON.parse(fs.readFileSync(STORE, 'utf8'));
  } catch (e) {
    var db = defaultStore();
    save(db);
    return db;
  }
}

function save(db) {
  try {
    fs.writeFileSync(STORE, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('存档失败：', e && e.message ? e.message : e);
  }
}

function isPipeErr(err) {
  var code = err && err.code;
  return code === 'EPIPE' || code === 'ECONNRESET' || code === 'ECONNABORTED' ||
    code === 'ERR_STREAM_DESTROYED' || code === 'ERR_HTTP_HEADERS_SENT' ||
    code === 'ERR_STREAM_WRITE_AFTER_END';
}

function quiet(err) {
  if (!err || isPipeErr(err)) return;
  console.error('连接错误：', err.code || err.message || err);
}

function canWrite(res) {
  return res && !res.headersSent && !res.writableEnded && !res.destroyed;
}

function json(res, code, obj) {
  if (!canWrite(res)) return;
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
  '.md': 'text/plain; charset=utf-8',
  '.command': 'text/plain; charset=utf-8',
  '.py': 'text/plain; charset=utf-8'
};

function safeFile(pathname) {
  var rel = String(pathname || '/').split('?')[0];
  try { rel = decodeURIComponent(rel); } catch (e) { return null; }
  rel = rel.replace(/\\/g, '/').replace(/^\/+/, '');
  if (!rel) rel = 'index.html';
  if (rel.indexOf('\0') >= 0) return null;
  var parts = rel.split('/').filter(function (p) { return p && p !== '.'; });
  if (parts.some(function (p) { return p === '..'; })) return null;
  var file = path.resolve(ROOT, parts.join(path.sep));
  var root = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;
  var check = process.platform === 'win32' ? file.toLowerCase() : file;
  var rootCheck = process.platform === 'win32' ? root.toLowerCase() : root;
  if (check !== (process.platform === 'win32' ? ROOT.toLowerCase() : ROOT) && check.indexOf(rootCheck) !== 0) {
    return null;
  }
  return file;
}

function sendText(res, code, text, type) {
  if (!canWrite(res)) return;
  res.writeHead(code, { 'Content-Type': type || 'text/plain; charset=utf-8' });
  res.end(text);
}

function serveStatic(req, res, pathname) {
  if (pathname === '/' || pathname === '') pathname = '/index.html';
  if (pathname === '/favicon.ico') {
    sendText(res, 204, '');
    return;
  }
  var file = safeFile(pathname);
  if (!file) return json(res, 403, { error: '禁止' });
  fs.stat(file, function (err, st) {
    if (!canWrite(res)) return;
    if (err || !st || !st.isFile()) {
      sendText(res, 404, 'Not found: ' + pathname);
      return;
    }
    var ext = path.extname(file).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache'
    });
    var stream = fs.createReadStream(file);
    stream.on('error', function (e) {
      try {
        stream.destroy();
        if (canWrite(res)) sendText(res, 500, 'read error');
        else if (!res.writableEnded) res.end();
      } catch (err) { /* ignore */ }
      quiet(e);
    });
    req.on('close', function () { stream.destroy(); });
    res.on('error', quiet);
    stream.pipe(res);
  });
}

var SERVERS = [
  { id: 's1', name: '双线1服 · 洪武风云', status: '火爆' },
  { id: 's2', name: '双线2服 · 永乐新章', status: '畅通' },
  { id: 's3', name: '双线3服 · 万历征途', status: '新服' }
];

function handleRequest(req, res) {
  if (req.method === 'OPTIONS') {
    if (!canWrite(res)) return;
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Token',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS'
    });
    return res.end();
  }
  var u;
  try {
    u = url.parse(req.url, true);
  } catch (e) {
    return sendText(res, 400, 'bad url');
  }
  var p = u.pathname || '/';

  if (p === '/api/ping') return json(res, 200, { ok: true, v: VERSION });

  if (p === '/api/register' && req.method === 'POST') {
    return readBody(req, function (b) {
      try {
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
      } catch (e) {
        console.error('注册失败：', e && e.stack ? e.stack : e);
        json(res, 500, { error: '服务器内部错误' });
      }
    });
  }

  if (p === '/api/login' && req.method === 'POST') {
    return readBody(req, function (b) {
      try {
        var db = load();
        var user = String(b.user || '').trim();
        var rec = db.users[user];
        if (!rec || rec.pass !== hash(String(b.pass || ''))) return json(res, 400, { error: '账号或密码错误' });
        var token = crypto.randomBytes(16).toString('hex');
        db.tokens[token] = user;
        save(db);
        json(res, 200, { token: token, user: user });
      } catch (e) {
        console.error('登录失败：', e && e.stack ? e.stack : e);
        json(res, 500, { error: '服务器内部错误' });
      }
    });
  }

  if (p === '/api/servers') return json(res, 200, { servers: SERVERS });

  if (p === '/api/role' && req.method === 'GET') {
    var db = load();
    var name = userOf(req, db);
    if (!name) return json(res, 401, { error: '请先登录' });
    var sid = String(u.query.server || 's1');
    return json(res, 200, { role: db.users[name].roles[sid] || null });
  }

  if (p === '/api/role' && req.method === 'POST') {
    return readBody(req, function (b) {
      try {
        var db = load();
        var name = userOf(req, db);
        if (!name) return json(res, 401, { error: '请先登录' });
        var sid = String(b.server || 's1');
        if (!db.users[name].roles) db.users[name].roles = {};
        db.users[name].roles[sid] = b.payload || null;
        save(db);
        json(res, 200, { ok: true });
      } catch (e) {
        console.error('存档失败：', e && e.stack ? e.stack : e);
        json(res, 500, { error: '服务器内部错误' });
      }
    });
  }

  if (p === '/api/chat' && req.method === 'GET') {
    var dbc = load();
    return json(res, 200, { lines: (dbc.chat || []).slice(-40) });
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

  if (p.indexOf('/api/') === 0) return json(res, 404, { error: '未知接口' });

  serveStatic(req, res, p);
}

var server = http.createServer(function (req, res) {
  req.on('error', quiet);
  res.on('error', quiet);
  try {
    handleRequest(req, res);
  } catch (e) {
    console.error('请求处理失败：', e && e.stack ? e.stack : e);
    try { json(res, 500, { error: '服务器内部错误' }); } catch (e2) { /* ignore */ }
  }
});
server.on('connection', function (socket) {
  socket.on('error', quiet);
});
server.on('clientError', function (err, socket) {
  try { socket.end('HTTP/1.1 400 Bad Request\r\n\r\n'); } catch (e) { /* ignore */ }
});

function openBrowser(href) {
  if (process.env.OPEN_BROWSER === '0') return;
  var cmd;
  if (process.platform === 'win32') cmd = 'cmd /c start "" "' + href + '"';
  else if (process.platform === 'darwin') cmd = 'open "' + href + '"';
  else cmd = 'xdg-open "' + href + '"';
  exec(cmd, function () {});
}

function tryListen(port, last) {
  var max = last || port + 12;
  function onError(e) {
    server.removeListener('listening', onListen);
    if (e.code === 'EADDRINUSE' && port < max) {
      console.log('端口 ' + port + ' 占用，改试 ' + (port + 1));
      tryListen(port + 1, max);
    } else {
      console.error('无法启动：' + e.message);
      process.exit(1);
    }
  }
  function onListen() {
    server.removeListener('error', onError);
    var href = 'http://127.0.0.1:' + port + '/';
    console.log('洪武风云录服务端 ' + href);
    console.log('版本 ' + VERSION);
    console.log('测试账号 demo / 123456');
    console.log('关闭本窗口即停止服务。');
    setTimeout(function () { openBrowser(href); }, 200);
  }
  server.once('error', onError);
  server.once('listening', onListen);
  server.listen(port, '127.0.0.1');
}

if (typeof module !== 'undefined') {
  module.exports = { safeFile: safeFile, ROOT: ROOT, VERSION: VERSION };
}

if (require.main === module) {
  try { process.stdout.on('error', quiet); process.stderr.on('error', quiet); } catch (e) { /* ignore */ }
  process.on('uncaughtException', function (err) {
    if (isPipeErr(err)) return;
    console.error('未捕获错误（服务继续运行）：', err && err.stack ? err.stack : err);
  });
  process.on('unhandledRejection', function (err) {
    if (isPipeErr(err)) return;
    console.error('未处理 Promise（服务继续运行）：', err && err.stack ? err.stack : err);
  });
  ensure();
  tryListen(PORT);
}
