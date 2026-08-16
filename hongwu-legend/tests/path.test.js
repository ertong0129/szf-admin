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

var portals = {
  a: [{ to: 'b', x: 1, y: 1 }],
  b: [{ to: 'a', x: 0, y: 0 }, { to: 'c', x: 2, y: 2 }],
  c: [{ to: 'b', x: 0, y: 0 }]
};
assert.deepStrictEqual(PathFind.mapRoute(portals, 'a', 'a'), []);
var route = PathFind.mapRoute(portals, 'a', 'c');
assert.strictEqual(route.length, 2);
assert.strictEqual(route[0].from, 'a');
assert.strictEqual(route[0].portal.to, 'b');
assert.strictEqual(route[1].portal.to, 'c');
assert.strictEqual(PathFind.mapRoute(portals, 'a', 'z'), null);

var D = require('../js/data.js');
var toPoyang = PathFind.mapRoute(D.PORTALS, 'taiping', 'poyang');
assert.ok(toPoyang && toPoyang.length >= 2, 'taiping should reach poyang');
assert.strictEqual(toPoyang[0].from, 'taiping');
assert.strictEqual(toPoyang[toPoyang.length - 1].portal.to, 'poyang');
var toSelf = PathFind.mapRoute(D.PORTALS, 'capital', 'capital');
assert.deepStrictEqual(toSelf, []);

console.log('path.test.js ok');
