var http = require('http');
var assert = require('assert');
var path = require('path');
var { spawn } = require('child_process');

var PORT = 18091;
var dataDir = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'hongwu-http-'));
var child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env: Object.assign({}, process.env, {
    PORT: String(PORT),
    OPEN_BROWSER: '0',
    HONGWU_DATA: dataDir,
    DB_DRIVER: 'sqlite'
  }),
  stdio: ['ignore', 'pipe', 'pipe']
});

var out = '';
child.stdout.on('data', function (c) { out += c; });
child.stderr.on('data', function (c) { out += c; });

function get(p, headers, cb) {
  var req = http.get({ hostname: '127.0.0.1', port: PORT, path: p, headers: headers || {} }, function (res) {
    var buf = '';
    res.on('data', function (c) { buf += c; });
    res.on('end', function () { cb(null, res.statusCode, buf); });
  });
  req.on('error', cb);
}

function post(p, body, headers, cb) {
  var data = JSON.stringify(body || {});
  var req = http.request({
    hostname: '127.0.0.1',
    port: PORT,
    path: p,
    method: 'POST',
    headers: Object.assign({
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }, headers || {})
  }, function (res) {
    var buf = '';
    res.on('data', function (c) { buf += c; });
    res.on('end', function () { cb(null, res.statusCode, buf); });
  });
  req.on('error', cb);
  req.write(data);
  req.end();
}

function abortGet(p, cb) {
  var done = false;
  function once() {
    if (done) return;
    done = true;
    setTimeout(cb, 40);
  }
  var req = http.get({ hostname: '127.0.0.1', port: PORT, path: p }, function (res) {
    res.once('data', function () { req.destroy(); });
  });
  req.on('error', once);
  req.on('close', once);
}

function waitUp(n, cb) {
  if (n <= 0) return cb(new Error('server did not start: ' + out));
  get('/api/ping', {}, function (err, code, body) {
    if (!err && code === 200 && body.indexOf('"ok"') >= 0) return cb(null);
    setTimeout(function () { waitUp(n - 1, cb); }, 50);
  });
}

waitUp(40, function (err) {
  if (err) {
    child.kill();
    throw err;
  }
  get('/api/ping', {}, function (err, code, body) {
    assert.ifError(err);
    assert.strictEqual(code, 200);
    var ping = JSON.parse(body);
    assert.strictEqual(ping.ok, true);
    assert.ok(ping.v, 'ping should include version');
    assert.strictEqual(ping.store, 'sqlite', 'ping should report sqlite store');
    get('/api/chat', {}, function (errC, codeC, bodyC) {
      assert.ifError(errC);
      assert.strictEqual(codeC, 200, 'chat should be 200 not 404 after headers');
      var j = JSON.parse(bodyC);
      assert.ok(Array.isArray(j.lines));
      post('/api/login', { user: 'demo', pass: '123456' }, {}, function (errL, codeL, bodyL) {
        assert.ifError(errL);
        assert.strictEqual(codeL, 200, 'login should succeed');
        var login = JSON.parse(bodyL);
        assert.ok(login.token);
        get('/play.html', {}, function (errP, codeP) {
          assert.ifError(errP);
          assert.strictEqual(codeP, 200);
          abortGet('/js/vendor/three.min.js', function () {
            get('/api/role?server=s1', { 'X-Token': login.token }, function (err2, code2) {
              assert.ifError(err2);
              assert.ok(code2 === 401 || code2 === 200);
              get('/api/ping', {}, function (err3, code3) {
                assert.ifError(err3);
                assert.strictEqual(code3, 200, 'server should still be alive after abort');
                assert.strictEqual(child.exitCode, null, 'server process must not exit');
                child.kill();
                console.log('server-http.test.js ok');
                process.exit(0);
              });
            });
          });
        });
      });
    });
  });
});

setTimeout(function () {
  child.kill();
  throw new Error('timeout: ' + out);
}, 8000);
