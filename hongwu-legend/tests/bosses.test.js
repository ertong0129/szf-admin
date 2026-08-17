var assert = require('assert');
var D = require('../js/data.js');
var F = require('../js/formulas.js');
var B = require('../js/bosses.js');

assert.ok(D.FIELD_BOSSES.length >= 7);
['mammoth20', 'mammoth30', 'mammoth40', 'chenyouliang', 'zhangshicheng', 'wala_chief', 'wangzhen'].forEach(function (id) {
  var def = B.fieldDef(D, id);
  assert.ok(def, id);
  assert.ok(D.MONSTERS[def.monster]);
  assert.ok(D.MAP_META[def.map]);
  assert.ok(!D.MAP_META[def.map].instance, id + ' should sit on overworld');
});
assert.strictEqual(B.fieldDef(D, 'chenyouliang').respawnH, 2);
assert.strictEqual(B.fieldDef(D, 'wangzhen').respawnH, 5);
assert.strictEqual(B.fieldDef(D, 'mammoth20').respawnH, 29.5);

var st = { field: {}, world: null };
assert.ok(B.fieldAlive(st, B.fieldDef(D, 'chenyouliang'), 1000));
B.markFieldDead(st, 'chenyouliang', 1000);
assert.ok(!B.fieldAlive(st, B.fieldDef(D, 'chenyouliang'), 1000 + 3600 * 1000));
assert.ok(B.fieldAlive(st, B.fieldDef(D, 'chenyouliang'), 1000 + 2 * 3600 * 1000));

st = B.ensureWorld(st, D, F, Date.UTC(2026, 7, 16));
assert.ok(st.world);
assert.ok(st.world.hp > 1000);
assert.ok(D.WORLD_BOSS.maps.indexOf(st.world.map) >= 0);
assert.strictEqual(st.world.dead, false);

var hit = B.hitWorld(st, 'demo', 50, 'ming');
assert.ok(hit.ok);
assert.strictEqual(st.world.first, 'demo');
assert.strictEqual(st.world.dmg.demo, 50);
st.world.hp = 40;
hit = B.hitWorld(st, 'demo', Math.max(80, Math.ceil(st.world.maxHp * 0.06)), 'ming');
assert.ok(hit.killed);
assert.strictEqual(st.world.last, 'demo');
assert.strictEqual(st.world.nation, 'ming');
assert.strictEqual(B.rankOf(st.world, 'demo'), 1);
assert.ok(B.rankReward(1, D));
assert.ok(B.luckOk(st.world, 'demo', D));

assert.strictEqual(D.MAP_META.wild.name, '横涧山');
assert.strictEqual(D.MAP_META.shennong.name, '神农架');

console.log('bosses.test.js ok');
