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
var toBoyang = PathFind.mapRoute(D.PORTALS, 'taiping', 'boyang');
assert.ok(toBoyang && toBoyang.length >= 1, 'taiping should reach 鄱阳湖野外');
assert.strictEqual(toBoyang[toBoyang.length - 1].portal.to, 'boyang');
var toKaifeng = PathFind.mapRoute(D.PORTALS, 'taiping', 'kaifeng');
assert.ok(toKaifeng && toKaifeng.length >= 2, 'taiping should reach 开封 via 边城');
var toSelf = PathFind.mapRoute(D.PORTALS, 'capital', 'capital');
assert.deepStrictEqual(toSelf, []);

assert.ok(Array.isArray(D.WORLD_NODES) && D.WORLD_NODES.length >= 16, 'world nodes');
D.WORLD_NODES.forEach(function (n) {
  assert.ok(D.MAP_META[n.id], n.id + ' should exist in MAP_META');
  assert.strictEqual(typeof n.tx, 'number');
  assert.strictEqual(typeof n.ty, 'number');
  assert.ok(n.left && n.top, n.id + ' needs pin position');
  assert.ok(!D.MAP_META[n.id].instance, n.id + ' world pin should be overworld');
});
var ids = D.WORLD_NODES.map(function (n) { return n.id; });
assert.ok(ids.indexOf('taiping') >= 0 && ids.indexOf('capital') >= 0);
assert.ok(ids.indexOf('pingjiang') >= 0 && ids.indexOf('kaifeng') >= 0);
assert.ok(ids.indexOf('shennong') >= 0 && ids.indexOf('boyang') >= 0);

assert.ok(D.INSTANCES && D.INSTANCES.poyang && D.INSTANCES.tower);
assert.ok(D.INSTANCES.jingxin && D.INSTANCES.palace && D.INSTANCES.pagoda);
assert.strictEqual(D.MAP_META.jingxin.instance, true);
assert.strictEqual(D.MAP_META.palace.instance, true);
assert.strictEqual(D.MAP_META.pagoda.instance, true);
assert.ok(D.PORTALS.jingxin && D.PORTALS.jingxin[0].to === 'kaifeng');
assert.strictEqual(D.MOUNT_SLOTS.length, 6);
assert.strictEqual(D.MOUNT_SLOTS[0].name, '马铠');
assert.ok(D.MONSTERS.zhouyingqiu && D.MONSTERS.jinyi_baihu && D.MONSTERS.pagoda_king);
assert.strictEqual(D.MONSTERS.lake_boss.name, '张定边');
assert.strictEqual(D.MONSTERS.chenyouliang.name, '陈友谅');
assert.strictEqual(D.MONSTERS.wangzhen.name, '王振');
assert.strictEqual(D.NPCS.shuibing.map, 'capital');
assert.strictEqual(D.NPCS.xuda.map, 'capital');
assert.strictEqual(D.NPCS.chefu.map, 'taiping');
assert.strictEqual(D.NPCS.shanshan.warehouse, true);
assert.strictEqual(D.NPCS.yiyi.warehouse, true);
assert.ok(D.PK_MODES.length >= 6);
assert.strictEqual(D.ENERGY_MAX, 4000);
assert.strictEqual(D.MOUNT_LEVEL, 18);
assert.ok(D.CONSUMABLES.scroll);
assert.ok(D.HELP.join('').indexOf('空格拾取') >= 0);
assert.ok(D.INSTANCES.poyang.diffs.length >= 3);
assert.strictEqual(D.MAP_META.poyang.instance, true);
assert.strictEqual(D.MAP_META.tower.instance, true);
assert.ok(!D.MAP_META.boyang.instance);
assert.ok(D.MAP_META.kaifeng.safe);
assert.ok(D.FIELD_BOSSES.length >= 7);
assert.strictEqual(D.WORLD_BOSS.monster, 'yibang');
Object.keys(D.INSTANCES).forEach(function (id) {
  if (id === 'road') return;
  assert.ok(D.MAP_META[id], id + ' instance needs MAP_META');
});

console.log('path.test.js ok');
