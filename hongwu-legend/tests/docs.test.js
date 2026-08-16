var assert = require('assert');
var D = require('../js/data.js');
var F = require('../js/formulas.js');

assert.strictEqual(D.PK_MODES.map(function (m) { return m.id; }).join(','),
  'peace,all,nation,party,clan,karma');

assert.ok(D.NPCS.xuda.merit);
assert.ok(D.NPCS.shanshan.warehouse);
assert.ok(D.NPCS.yiyi.warehouse);
assert.ok(D.NPCS.shenwansan.bank);
assert.ok(D.NPCS.zhangsanfeng.skills);
assert.ok(D.NPCS.lishizhen.shop);
assert.strictEqual(D.NPCS.chefu.map, 'taiping');
assert.ok(D.NPCS.chefu.travel.indexOf('capital') === 0);

assert.strictEqual(D.BANK.silverPerNote, 500);
assert.strictEqual(D.WAREHOUSE.maxTabs, 4);
assert.strictEqual(D.WAREHOUSE.unlock[0], 0);

var help = D.HELP.join('\n');
['Q 任务', '空格拾取', 'D 打坐', '精力', '坐骑', '建功立业', '91wan'].forEach(function (k) {
  assert.ok(help.indexOf(k) >= 0, 'HELP missing ' + k);
});

assert.ok(D.CONSUMABLES.scroll && D.CONSUMABLES.mount_token && D.CONSUMABLES.yinpiao);

var b = F.meritBand(22);
assert.strictEqual(b.kill.id, 'wolf');
assert.strictEqual(F.meritReward(491, 0), 491);
assert.ok(F.meritReward(491, 9) > 491);
assert.strictEqual(F.meritBand(5), null);

assert.ok(F.mountUpgradeChance('white') > F.mountUpgradeChance('purple'));
assert.strictEqual(F.mountUpgradeChance('orange'), 0);

console.log('docs.test.js ok');
