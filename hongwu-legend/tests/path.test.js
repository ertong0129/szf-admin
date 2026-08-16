var assert = require('assert');
var PathFind = require('../js/path.js').PathFind || global.PathFind;
if (!PathFind) {
  require('../js/path.js');
  PathFind = global.PathFind;
}

var w = 8, h = 8;
var blocked = { '3,3': 1, '3,4': 1, '3,5': 1 };
function walk(x, y) { return !blocked[x + ',' + y]; }

var path = PathFind.astar(walk, w, h, 1, 4, 6, 4);
assert.ok(path.length > 2, 'should path around wall');
assert.strictEqual(path[0].x, 1);
assert.strictEqual(path[path.length - 1].x, 6);
path.forEach(function (p) { assert.ok(walk(p.x, p.y)); });

var empty = PathFind.astar(function () { return false; }, 4, 4, 0, 0, 3, 3);
assert.ok(Array.isArray(empty));

console.log('path.test.js ok');
