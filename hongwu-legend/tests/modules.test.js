var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var play = fs.readFileSync(path.join(root, 'play.html'), 'utf8');
var mods = [
  'core.js', 'player.js', 'world.js', 'combat.js', 'quest.js', 'dungeon.js',
  'sim.js', 'netplay.js', 'render.js', 'ui.js', 'input.js', 'boot.js'
];

mods.forEach(function (f) {
  assert.ok(fs.existsSync(path.join(root, 'js', f)), 'missing js/' + f);
});

var order = mods.map(function (f) {
  var i = play.indexOf('src="js/' + f + '"');
  assert.ok(i >= 0, 'play.html 未加载 js/' + f);
  return i;
});
for (var i = 1; i < order.length; i++) {
  assert.ok(order[i] > order[i - 1], mods[i - 1] + ' 应在 ' + mods[i] + ' 之前加载');
}

assert.ok(play.indexOf('src="js/game.js"') < 0, 'play.html 不应再加载已拆分的 game.js');

var boot = fs.readFileSync(path.join(root, 'js/boot.js'), 'utf8');
assert.ok(boot.indexOf('H.boot()') >= 0, 'boot.js 应启动 H.boot()');

var core = fs.readFileSync(path.join(root, 'js/core.js'), 'utf8');
assert.ok(core.indexOf('window.Hongwu = window.Hongwu || {}') >= 0, 'core.js 应建立 Hongwu 命名空间');
assert.ok(core.indexOf('H.G =') >= 0, 'core.js 应创建 H.G');

console.log('modules.test.js ok');
