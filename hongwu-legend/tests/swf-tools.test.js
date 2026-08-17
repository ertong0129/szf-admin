var assert = require('assert');
var fs = require('fs');
var path = require('path');
var { spawnSync } = require('child_process');

var root = path.join(__dirname, '..');

function fsRead(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function runPy(script, args) {
  var r = spawnSync('python3', [path.join(root, 'tools', script)].concat(args || []), {
    encoding: 'utf8',
    timeout: 30000
  });
  assert.strictEqual(r.status, 0, script + ' ' + (args || []).join(' ') + '\n' + r.stdout + r.stderr);
  return r.stdout;
}

var abc = fsRead('tools/swf-abc.py');
assert.ok(abc.indexOf('不是 protobuf zigzag') >= 0, 'swf-abc 应写明 s32 不是 zigzag');
assert.ok(abc.indexOf('10000000') >= 0, 'swf-abc 应记录 CORRECT_VALUE=10000000');

var mcm = fsRead('tools/parse-mcm.py');
assert.ok(mcm.indexOf('CORRECT_VALUE = 10_000_000') >= 0);
assert.ok(mcm.indexOf('encodeByteArray') >= 0);

assert.ok(runPy('swf-abc.py', ['--self-test']).indexOf('ok') >= 0);
assert.ok(runPy('parse-mcm.py', ['--self-test']).indexOf('ok') >= 0);

console.log('swf-tools.test.js ok');
