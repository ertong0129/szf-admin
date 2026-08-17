var assert = require('assert');
var fs = require('fs');
var path = require('path');

var root = path.join(__dirname, '..');
var play = fs.readFileSync(path.join(root, 'play.html'), 'utf8');
var mods = [
  'core.js', 'player.js', 'world.js', 'combat.js', 'quest.js', 'dungeon.js',
  'sim.js', 'netplay.js', 'life.js', 'render.js', 'ui.js', 'input.js', 'boot.js'
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
assert.ok(play.indexOf('src="js/ground.js"') >= 0, 'play.html 应加载程序地面');
assert.ok(play.indexOf('src="js/ground.js"') < play.indexOf('src="js/world3d.js"'), 'ground.js 应在 world3d.js 之前');
assert.ok(play.indexOf('src="js/art.js"') < play.indexOf('src="js/world3d.js"'), 'art.js 应在 world3d.js 之前');
assert.ok(play.indexOf('src="js/world3d.js"') >= 0);
var world3d = fs.readFileSync(path.join(root, 'js/world3d.js'), 'utf8');
assert.ok(world3d.indexOf('ShaderMaterial') < 0, '3D 水面不应再用自定义 shader，以免卡住 Mac');
assert.ok(play.indexOf('大明传说') >= 0, 'play.html 标题应为大明传说');
assert.ok(play.indexOf('明朝传奇') < 0, 'play.html 玩家可见文案不应再写明朝传奇');
assert.ok(play.indexOf('洪武风云') < 0, 'play.html 不应再写洪武风云');

var index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.ok(index.indexOf('大明传说') >= 0, 'index.html 标题应为大明传说');
assert.ok(index.indexOf('明朝传奇') < 0, 'index.html 玩家可见文案不应再写明朝传奇');
assert.ok(index.indexOf('洪武风云') < 0, 'index.html 不应再写洪武风云');

var boot = fs.readFileSync(path.join(root, 'js/boot.js'), 'utf8');
assert.ok(boot.indexOf('H.boot()') >= 0, 'boot.js 应启动 H.boot()');

var core = fs.readFileSync(path.join(root, 'js/core.js'), 'utf8');
assert.ok(core.indexOf('window.Hongwu = window.Hongwu || {}') >= 0, 'core.js 应建立 Hongwu 命名空间');
var netplay = fs.readFileSync(path.join(root, 'js/netplay.js'), 'utf8');
assert.ok(netplay.indexOf('.then(applyNet)') < 0, 'netTick 应调用 H.applyNet，不能用未定义的 applyNet');

var css = fs.readFileSync(path.join(root, 'css/game.css'), 'utf8');
assert.ok(css.indexOf('assets/ingame/viewui/hud-frame.png') >= 0, 'HUD 应使用原作人物框切图');
assert.ok(css.indexOf('assets/ingame/viewui/panel.png') >= 0, '面板应使用青玉窗框');
assert.ok(css.indexOf('assets/ingame/viewui/skillbar.jpg') >= 0, '底栏应铺原作 skillbar 切图');
assert.ok(css.indexOf('assets/ingame/viewui/minimap-ring.png') >= 0, '小地图应套原作青玉圆框');
assert.ok(play.indexOf('class="hud-frame"') >= 0, 'play.html 应有原作人物框容器');
assert.ok(play.indexOf('id="hud-lv"') >= 0, '人物框应显示等级');
assert.ok(play.indexOf('id="hud-pet"') >= 0, '左上应有宠物条');
assert.ok(play.indexOf('class="hud-acts"') >= 0, '顶栏应有活动图标');
assert.ok(play.indexOf('class="dock-menu') >= 0, '底栏应有系统菜单');
assert.ok(play.indexOf('class="minimap-ring"') >= 0, '小地图应有原作圆框层');
assert.ok(css.indexOf('border-radius: 50%') >= 0, '小地图应为圆形');

var art = fs.readFileSync(path.join(root, 'js/art.js'), 'utf8');
assert.ok(art.indexOf("jingCheng: 'assets/ingame/map/jing_cheng.jpg'") >= 0);
assert.ok(art.indexOf('A.radarFor') >= 0, '小地图应按场景换原作俯视图');
assert.ok(art.indexOf('A.cityRadar') >= 0, '城镇地面应能叠公开小地图');
assert.ok(art.indexOf('A.drawDamage') >= 0, '伤害飘字应使用原作数字切图');

[
  'assets/ingame/viewui/hud-frame.png',
  'assets/ingame/viewui/panel.png',
  'assets/ingame/viewui/dialog-bar.png',
  'assets/ingame/viewui/shop.png',
  'assets/ingame/viewui/skillbar.jpg',
  'assets/ingame/viewui/minimap-ring.png',
  'assets/ingame/viewui/menu-role.png',
  'assets/ingame/viewui/shop-lady.png',
  'assets/ingame/map/jing_cheng.jpg',
  'assets/ingame/map/kai_feng.jpg',
  'assets/ingame/ui/jiaosebg.png'
].forEach(function (f) {
  assert.ok(fs.existsSync(path.join(root, f)), 'missing ' + f);
});

var serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
assert.ok(serverJs.indexOf("VERSION = '20260816r'") >= 0, 'server.js 版本应为 20260816r');

function assertWinBat(rel) {
  var buf = fs.readFileSync(path.join(root, rel));
  assert.ok(buf.includes(Buffer.from('\r\n')), rel + ' 必须用 CRLF，否则 Windows cmd 会拆行');
  for (var i = 0; i < buf.length; i++) {
    assert.ok(buf[i] <= 127, rel + ' 必须是纯 ASCII，UTF-8 中文会被 cmd 咬断命令');
  }
  assert.ok(buf.indexOf(Buffer.from('%%')) < 0, rel + ' 不要用 for %%i，编码一乱会变成 %i 命令');
}
assertWinBat('start.bat');
assertWinBat('启动游戏.bat');
assert.ok(fs.readFileSync(path.join(root, 'start.bat'), 'utf8').indexOf('node server.js') >= 0);

console.log('modules.test.js ok');
