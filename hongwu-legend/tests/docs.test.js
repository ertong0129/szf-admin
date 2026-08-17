var assert = require('assert');
var D = require('../js/data.js');
var F = require('../js/formulas.js');

assert.strictEqual(D.GAME_TITLE, '大明传说');

assert.strictEqual(D.PK_MODES.map(function (m) { return m.id; }).join(','),
  'peace,all,nation,party,clan,karma');

assert.ok(D.NPCS.xuda.merit);
assert.ok(D.NPCS.shanshan.warehouse);
assert.ok(D.NPCS.yiyi.warehouse);
assert.ok(D.NPCS.shenwansan.bank);
assert.ok(D.NPCS.zhangsanfeng.skills);
assert.ok(D.NPCS.lishizhen.shop);
assert.ok(D.NPCS.muying.portal);
assert.ok(D.NPCS.limengyang.mentor);
assert.ok(D.NPCS.shichang.market);
assert.ok(D.INSTANCES.fish && D.INSTANCES.treasure && D.INSTANCES.mentor);
assert.ok(D.INSTANCES.jingxin && D.INSTANCES.palace && D.INSTANCES.pagoda);
assert.ok(D.NPCS.zhangxiaoxiao.jingxin);
assert.ok(D.NPCS.jinyi.palace);
assert.ok(D.NPCS.tieta.pagoda);
assert.strictEqual(D.NPCS.zhangxiaoxiao.map, 'kaifeng');
assert.ok(D.MOUNT_SLOTS && D.MOUNT_SLOTS.length === 6);
assert.ok(D.MOUNT_GEAR.m_armor_1 && D.MOUNT_GEAR.m_hoof_2);
assert.ok(D.CONSUMABLES.mount_gem && D.CONSUMABLES.shenfu);
assert.ok(D.CHAT_FACES.length >= 12);
assert.ok(D.MARKET_CATS.length >= 6);
assert.ok(D.VIP.length === 11);
assert.strictEqual(D.VIP[0].lv, 0);
assert.ok(D.SHOPS.gold.length >= 6);
assert.ok(D.RECHARGE_PACKS.length >= 3);
assert.strictEqual(D.NPCS.chefu.map, 'taiping');
assert.ok(D.NPCS.chefu.travel.indexOf('capital') === 0);

assert.strictEqual(D.BANK.silverPerNote, 500);
assert.strictEqual(D.WAREHOUSE.maxTabs, 4);
assert.strictEqual(D.WAREHOUSE.unlock[0], 0);

var help = D.HELP.join('\n');
['Q 任务', '空格拾取', 'D 打坐', '精力', '坐骑', '建功立业', '91wan', '局域网', '组队',
  '信件', '传奇目标', '除恶令', '捕鱼儿海', '大明宝藏', '洗灵', '篝火', '元宝', '明朝贵族',
  '野外 BOSS', '世界 BOSS', '平江', '神农架', '绑定银两', '步步惊心', '深宫谍影', '马铠',
  '免费瞬移'].forEach(function (k) {
  assert.ok(help.indexOf(k) >= 0, 'HELP missing ' + k);
});

assert.ok(D.CONSUMABLES.scroll && D.CONSUMABLES.mount_token && D.CONSUMABLES.yinpiao);
assert.ok(D.CONSUMABLES.scroll.desc.indexOf('免费') >= 0, '传送卷说明应为免费传送');
assert.ok(D.INSTANCE_WARPS && D.INSTANCE_WARPS.length >= 10, '应列出全部副本地图');
['shennong', 'desert', 'tumu', 'annan', 'quanzhou', 'zhedong', 'jianzhou', 'kaifeng'].forEach(function (id) {
  assert.ok(D.WORLD_NODES.some(function (n) { return n.id === id; }), 'WORLD_NODES missing ' + id);
});
D.INSTANCE_WARPS.forEach(function (n) {
  assert.ok(D.MAP_META[n.id], 'INSTANCE_WARPS 应对应已有地图 ' + n.id);
});
assert.strictEqual(D.ERA, '洪武');
assert.ok(D.NATION_NODES.some(function (n) { return n.id === 'capital' && n.name === '京城'; }));
assert.ok(D.NATION_NODES.some(function (n) { return n.id === 'safe' && n.locked; }));
assert.ok(D.WORLD_REGIONS.some(function (n) { return n.name === '开封'; }));
assert.ok(D.WORLD_REGIONS.some(function (n) { return n.name === '洪武' && n.tab === 'nation'; }));
assert.ok(D.MAP_FUNC.capital.some(function (n) { return n.name === '钱庄老板'; }));
assert.ok(D.MAP_MARK.jingche === '车夫');
assert.ok(D.PORTALS.capital.some(function (p) { return p.to === 'xinghua' && /杏花岭/.test(p.label); }));

var b = F.meritBand(22);
assert.strictEqual(b.kill.id, 'wolf');
assert.strictEqual(F.meritReward(491, 0), 491);
assert.ok(F.meritReward(491, 9) > 491);
assert.strictEqual(F.meritBand(5), null);

assert.ok(F.mountUpgradeChance('white') > F.mountUpgradeChance('purple'));
assert.strictEqual(F.mountUpgradeChance('orange'), 0);

console.log('docs.test.js ok');
