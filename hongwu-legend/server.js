/**
 * 大明传说本地服务端（无需 npm 依赖）
 * 提供静态资源、账号、选服存档（本机 SQLite，以后可换 MySQL）、附近聊天。
 */
var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');
var os = require('os');
var { exec } = require('child_process');

var ROOT = path.resolve(__dirname);
var PORT = parseInt(process.env.PORT || '8088', 10);
var VERSION = '20260817l';
var WorldHub = require('./js/worldhub.js');
var GameData = require('./js/data.js');
var Formulas = require('./js/formulas.js');
var BossLogic = require('./js/bosses.js');
var Store = require('./js/store.js');
var HOST = process.env.HOST || '0.0.0.0';
var store = Store.open();

function hash(s) {
  return Store.hash(s);
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

function userOf(req) {
  return store.userByToken(req.headers['x-token'] || '');
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

var hub = WorldHub.create({
  persist: function (social) {
    store.setKv('social', social || {});
  }
});
(function bootSocial() {
  try {
    hub.loadSocial(store.getKv('social') || {});
  } catch (e) { /* ignore */ }
})();

function lanIps() {
  var nets = os.networkInterfaces();
  var out = [];
  Object.keys(nets).forEach(function (name) {
    (nets[name] || []).forEach(function (n) {
      if (n.family === 'IPv4' && !n.internal) out.push(n.address);
    });
  });
  return out;
}

function sidOf(req, u, body) {
  if (body && body.server) return String(body.server);
  if (u && u.query && u.query.server) return String(u.query.server);
  return 's1';
}

var SERVERS = [
  { id: 's1', name: '双线1服 · 大明传说', status: '火爆' },
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

  if (p === '/api/ping') {
    return json(res, 200, { ok: true, v: VERSION, lan: true, ips: lanIps(), store: store.driver });
  }

  if (p === '/api/register' && req.method === 'POST') {
    return readBody(req, function (b) {
      try {
        var user = String(b.user || '').trim();
        var pass = String(b.pass || '');
        if (!/^[A-Za-z0-9_\u4e00-\u9fa5]{2,16}$/.test(user)) return json(res, 400, { error: '账号需 2-16 位' });
        if (pass.length < 4) return json(res, 400, { error: '密码至少 4 位' });
        if (store.getUser(user)) return json(res, 400, { error: '账号已存在' });
        store.createUser(user, hash(pass));
        json(res, 200, { token: store.issueToken(user), user: user });
      } catch (e) {
        console.error('注册失败：', e && e.stack ? e.stack : e);
        json(res, 500, { error: '服务器内部错误' });
      }
    });
  }

  if (p === '/api/login' && req.method === 'POST') {
    return readBody(req, function (b) {
      try {
        var user = String(b.user || '').trim();
        var rec = store.getUser(user);
        if (!rec || rec.pass !== hash(String(b.pass || ''))) return json(res, 400, { error: '账号或密码错误' });
        json(res, 200, { token: store.issueToken(user), user: user });
      } catch (e) {
        console.error('登录失败：', e && e.stack ? e.stack : e);
        json(res, 500, { error: '服务器内部错误' });
      }
    });
  }

  if (p === '/api/servers') return json(res, 200, { servers: SERVERS });

  if (p === '/api/role' && req.method === 'GET') {
    var name = userOf(req);
    if (!name) return json(res, 401, { error: '请先登录' });
    var sid = String(u.query.server || 's1');
    return json(res, 200, { role: store.getRole(name, sid) || null });
  }

  if (p === '/api/role' && req.method === 'POST') {
    return readBody(req, function (b) {
      try {
        var name = userOf(req);
        if (!name) return json(res, 401, { error: '请先登录' });
        var sid = String(b.server || 's1');
        store.setRole(name, sid, b.payload || null);
        json(res, 200, { ok: true });
      } catch (e) {
        console.error('存档失败：', e && e.stack ? e.stack : e);
        json(res, 500, { error: '服务器内部错误' });
      }
    });
  }

  if (p === '/api/chat' && req.method === 'GET') {
    return json(res, 200, { lines: store.listChat(40) });
  }

  if (p === '/api/chat' && req.method === 'POST') {
    return readBody(req, function (b) {
      var name = userOf(req) || '过客';
      var text = String(b.text || '').slice(0, 80);
      if (!text) return json(res, 400, { error: '空消息' });
      store.addChat(name, text);
      json(res, 200, { ok: true });
    });
  }

  if (p === '/api/bosses' && req.method === 'GET') {
    var bosses = BossLogic.ensureWorld(store.getKv('bosses') || { field: {}, world: null }, GameData, Formulas);
    store.setKv('bosses', bosses);
    return json(res, 200, { bosses: bosses });
  }

  if (p === '/api/bosses' && req.method === 'POST') {
    return readBody(req, function (b) {
      var name = userOf(req) || String(b.name || '').trim();
      var bosses = BossLogic.ensureWorld(store.getKv('bosses') || { field: {}, world: null }, GameData, Formulas);
      var op = String(b.op || '');
      if (op === 'field_kill' && b.id) {
        BossLogic.markFieldDead(bosses, String(b.id));
        store.setKv('bosses', bosses);
        return json(res, 200, { ok: true, bosses: bosses });
      }
      if (op === 'world_hit') {
        var hit = BossLogic.hitWorld(bosses, name || '过客', b.dmg, b.nation || 'ming');
        store.setKv('bosses', bosses);
        return json(res, 200, { ok: hit.ok, world: bosses.world, killed: hit.killed });
      }
      return json(res, 400, { error: '未知操作' });
    });
  }

  if (p === '/api/world' && req.method === 'POST') {
    return readBody(req, function (b) {
      var name = userOf(req);
      if (!name) return json(res, 401, { error: '请先登录' });
      var sid = sidOf(req, u, b);
      json(res, 200, hub.upsert(sid, name, b || {}));
    });
  }

  if (p === '/api/world' && req.method === 'GET') {
    var nw = userOf(req);
    if (!nw) return json(res, 401, { error: '请先登录' });
    return json(res, 200, hub.snapshot(sidOf(req, u, null), nw));
  }

  if (p === '/api/social' && req.method === 'POST') {
    return readBody(req, function (b) {
      var name = userOf(req);
      if (!name) return json(res, 401, { error: '请先登录' });
      var sid = sidOf(req, u, b);
      var out = hub.social(sid, name, String(b.op || ''), b);
      if (out && out.error) return json(res, 400, out);
      json(res, 200, out);
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
    console.log('大明传说服务端 ' + href);
    lanIps().forEach(function (ip) {
      console.log('局域网请打开 http://' + ip + ':' + port + '/');
    });
    console.log('朋友用同一局域网地址，各自注册账号后选同一服务器。');
    console.log('版本 ' + VERSION);
    console.log('本机数据库 ' + store.driver + '  ' + store.file);
    console.log('测试账号 demo / 123456');
    console.log('关闭本窗口即停止服务。');
    setTimeout(function () { openBrowser(href); }, 200);
  }
  server.once('error', onError);
  server.once('listening', onListen);
  server.listen(port, HOST);
}

if (typeof module !== 'undefined') {
  module.exports = { safeFile: safeFile, ROOT: ROOT, VERSION: VERSION, hub: hub, store: store };
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
  tryListen(PORT);
}
