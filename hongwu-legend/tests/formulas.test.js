var assert = require('assert');
var F = require('../js/formulas.js');

function approx(a, b, eps) {
  assert.ok(Math.abs(a - b) < (eps || 1e-6), a + ' !~ ' + b);
}

assert.strictEqual(F.xpToNext(1) > 0, true);
assert.ok(F.xpToNext(10) > F.xpToNext(1));
assert.strictEqual(F.totalXpToLevel(1), 0);
assert.strictEqual(F.totalXpToLevel(3), F.xpToNext(1) + F.xpToNext(2));

var d = F.attrDerive({ str: 10, int: 0, agi: 0, spi: 0, con: 0 });
approx(d.patk, 20);
approx(d.hp, 20);

d = F.attrDerive({ str: 0, int: 0, agi: 0, spi: 0, con: 4 });
approx(d.hp, 100);
approx(d.crit, 0.04);

d = F.attrDerive({ str: 0, int: 10, agi: 0, spi: 0, con: 0 });
approx(d.matk, 13);
approx(d.mp, 30);

d = F.attrDerive({ str: 0, int: 0, agi: 10, spi: 0, con: 0 });
approx(d.pdef, 10);
approx(d.mdef, 15);

assert.strictEqual(F.ENERGY_MAX, 4000);
assert.ok(F.mountSpeedMul('orange') > F.mountSpeedMul('white'));
assert.ok(F.meritBand(25) && F.meritBand(25).exp === 491);
assert.ok(F.meritReward(100, 0) < F.meritReward(100, 9));

assert.strictEqual(F.calcDamage(20, 0, 1, false, 0), 20);
assert.strictEqual(F.calcDamage(20, 20, 1, false, 0), 11);
assert.strictEqual(F.calcDamage(10, 100, 1, false, 0), 1);
assert.strictEqual(F.calcDamage(20, 0, 1, true, 0), 32);

assert.strictEqual(F.critRoll(1, function () { return 0.5; }), true);
assert.strictEqual(F.critRoll(0, function () { return 0.5; }), false);

assert.strictEqual(F.enhanceChance(0), 1);
assert.ok(F.enhanceChance(9) < F.enhanceChance(1));
assert.ok(F.enhanceCost(3, 10) > F.enhanceCost(0, 1));
assert.ok(F.socketCost(2) > F.socketCost(0));

assert.strictEqual(F.gemStat('patk', 2), 8);
assert.strictEqual(F.gemStat('crit', 1), 0.008);

var seen = {};
for (var i = 0; i < 200; i++) seen[F.rollRarity(Math.random, 0)] = true;
assert.ok(seen.white && seen.green);

assert.ok(F.scaleEquipStat(8, 10, 'orange', 3) > F.scaleEquipStat(8, 1, 'white', 0));
assert.ok(F.monsterHp(10, true) > F.monsterHp(10, false) * 5);
assert.ok(F.killXp(10, 20, false) > F.killXp(10, 2, false));
assert.ok(F.potionHeal(2, 200) > F.potionHeal(1, 200));

assert.strictEqual(F.bagExpandCost(0), 80);
assert.ok(F.reviveHereCost(10) > F.reviveHereCost(1));
assert.ok(F.petWashRange().max > F.petWashRange().min);
assert.ok(F.sitFireXp(10, true) > F.sitFireXp(10, false));
assert.ok(F.recolorChance('white') > F.recolorChance('purple'));
assert.strictEqual(F.vipLevel(0), 0);
assert.strictEqual(F.vipLevel(10), 1);
assert.ok(F.vipLevel(20000) >= 10);
assert.strictEqual(F.yuanbaoBuyCost(2), 200);
assert.strictEqual(F.yuanbaoSellGain(2), 160);
assert.strictEqual(F.lootByLevelGap(40, 40), 1);
assert.strictEqual(F.lootByLevelGap(70, 40), 0.55);
assert.strictEqual(F.lootByLevelGap(100, 40), 0.12);

console.log('formulas.test.js ok');
