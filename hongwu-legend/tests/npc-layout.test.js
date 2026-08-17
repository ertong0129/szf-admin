var assert = require('assert');
var D = require('../js/data.js');

assert.ok(D.MAP_SIZE.taiping.w >= 80 && D.MAP_SIZE.taiping.h >= 115);
assert.ok(D.MAP_SIZE.wild.w >= 110 && D.MAP_SIZE.shennong.h >= 150);
assert.ok(D.MAP_SIZE.kaifeng.w >= 160 && D.MAP_SIZE.capital.w >= 140);
assert.ok(D.CITY_GROUND.capital && D.CITY_GROUND.kaifeng && D.CITY_GROUND.pingjiang);

assert.deepStrictEqual(D.NPC_TILES.chefu, [72, 54]);
assert.deepStrictEqual(D.NPC_TILES.cunzheng, [50, 68]);
assert.deepStrictEqual(D.NPC_TILES.xuda, [112, 65]);
assert.deepStrictEqual(D.NPC_TILES.jingche, [110, 83]);
assert.deepStrictEqual(D.NPC_TILES.shuibing, [124, 63]);
assert.deepStrictEqual(D.NPC_TILES.lanyu, [2, 71]);
assert.deepStrictEqual(D.NPC_TILES.zhusu, [24, 70]);
assert.deepStrictEqual(D.NPC_TILES.xunshou, [100, 118]);
assert.deepStrictEqual(D.NPC_TILES.zhenghe, [98, 70]);
assert.deepStrictEqual(D.NPC_TILES.qijiguang, [70, 91]);
assert.ok(D.NPCS.zhenghe && D.NPCS.zhenghe.map === 'quanzhou');
assert.ok(D.NPCS.border_muying && D.NPCS.border_muying.map === 'border');
assert.ok(D.NPCS.muying.map === 'capital');
assert.ok(D.NPCS.chefu.travel.indexOf('capital:108:84') === 0);
assert.ok(D.NPCS.jingche.travel.indexOf('taiping:70:54') === 0);

assert.ok(D.NPC_ART && D.NPC_ART.xuda && D.NPC_ART.xuda.icon === 'xu_da');
assert.ok(D.NPC_ART.chefu.icon === 'che_fu' && D.NPC_ART.chefu.job === 71);
assert.ok(D.NPC_ART.cunzheng.icon === 'xs_tai_ping_cun_zhi_shi');
assert.ok(D.ITEM_ART && D.ITEM_ART.hp1 === 'hongyao2');
assert.ok(D.ITEM_ART.scroll === 'huichengjuan');

Object.keys(D.NPCS).forEach(function (id) {
  var n = D.NPCS[id];
  var t = D.NPC_TILES[id];
  if (!t) return;
  var sz = (D.MAP_SIZE && D.MAP_SIZE[n.map]) || { w: 50, h: 36 };
  assert.ok(t[0] >= 1 && t[0] < sz.w - 1, id + ' x in ' + n.map);
  assert.ok(t[1] >= 1 && t[1] < sz.h - 1, id + ' y in ' + n.map);
});

D.WORLD_NODES.forEach(function (n) {
  var sz = (D.MAP_SIZE && D.MAP_SIZE[n.id]) || { w: 50, h: 36 };
  assert.ok(n.tx >= 1 && n.tx < sz.w - 1, n.id + ' world pin x');
  assert.ok(n.ty >= 1 && n.ty < sz.h - 1, n.id + ' world pin y');
});

Object.keys(D.PORTALS).forEach(function (from) {
  var sz = (D.MAP_SIZE && D.MAP_SIZE[from]) || { w: 50, h: 36 };
  if (from === 'tower') { sz = { w: 26, h: 26 }; }
  else if (from === 'road') { sz = { w: 56, h: 22 }; }
  else if (from === 'treasure') { sz = { w: 36, h: 26 }; }
  else if (from === 'arena' || from === 'mentor') { sz = { w: 24, h: 24 }; }
  else if (from === 'jingxin' || from === 'palace') { sz = { w: 32, h: 22 }; }
  else if (from === 'pagoda') { sz = { w: 24, h: 28 }; }
  (D.PORTALS[from] || []).forEach(function (p) {
    assert.ok(p.x >= 1 && p.x < sz.w - 1, from + ' portal x ' + p.x);
    assert.ok(p.y >= 1 && p.y < sz.h - 1, from + ' portal y ' + p.y);
  });
});

console.log('npc-layout.test.js ok');
