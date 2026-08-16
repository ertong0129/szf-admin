var http = require('http');
var assert = require('assert');
var path = require('path');
var { spawn } = require('child_process');

var PORT = 18091;
var child = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
  env: Object.assign({}, process.env, { PORT: String(PORT), OPEN_BROWSER: '0' }),
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
  get('/api/chat', {}, function (err, code, body) {
    assert.ifError(err);
    assert.strictEqual(code, 200, 'chat should be 200 not 404 after headers');
    var j = JSON.parse(body);
    assert.ok(Array.isArray(j.lines));
    get('/api/role?server=s1', {}, function (err2, code2) {
      assert.ifError(err2);
      assert.ok(code2 === 401 || code2 === 200);
      get('/api/ping', {}, function (err3, code3) {
        assert.ifError(err3);
        assert.strictEqual(code3, 200);
        child.kill();
        console.log('server-http.test.js ok');
        process.exit(0);
      });
    });
  });
});

setTimeout(function () {
  child.kill();
  throw new Error('timeout: ' + out);
}, 8000);
