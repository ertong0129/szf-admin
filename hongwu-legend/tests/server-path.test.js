var assert = require('assert');
var fs = require('fs');
var os = require('os');
var path = require('path');
process.env.HONGWU_DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'hongwu-path-'));
process.env.OPEN_BROWSER = '0';
var S = require('../server.js');

var index = S.safeFile('/index.html');
assert.ok(index && index.indexOf('index.html') >= 0);

var css = S.safeFile('/css/login.css');
assert.ok(css && css.endsWith(path.join('css', 'login.css')));

var sprite = S.safeFile('/assets/ingame/sprites/dao.png');
assert.ok(sprite && sprite.indexOf('dao.png') >= 0);

assert.strictEqual(S.safeFile('/../package.json'), null);
assert.strictEqual(S.safeFile('/css/../../server.js'), null);
assert.strictEqual(S.safeFile('/%2e%2e/server.js'), null);

console.log('server-path.test.js ok');
