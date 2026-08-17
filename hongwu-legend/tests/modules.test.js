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
assert.ok(play.indexOf('src="js/npc-layout.js"') >= 0, 'play.html 应加载 NPC 公开坐标');
assert.ok(play.indexOf('src="js/data.js"') < play.indexOf('src="js/npc-layout.js"'), 'npc-layout.js 应在 data.js 之后');
assert.ok(play.indexOf('src="js/npc-art.js"') >= 0, 'play.html 应加载原作 NPC/物品贴图对照');
assert.ok(play.indexOf('src="js/npc-layout.js"') < play.indexOf('src="js/npc-art.js"'), 'npc-art.js 应在 npc-layout.js 之后');
assert.ok(play.indexOf('src="js/npc-art.js"') < play.indexOf('src="js/art.js"'), 'npc-art.js 应在 art.js 之前');
assert.ok(play.indexOf('src="js/ground.js"') >= 0, 'play.html 应加载程序地面');
assert.ok(play.indexOf('src="js/ground.js"') < play.indexOf('src="js/world3d.js"'), 'ground.js 应在 world3d.js 之前');
assert.ok(play.indexOf('src="js/art.js"') < play.indexOf('src="js/world3d.js"'), 'art.js 应在 world3d.js 之前');
assert.ok(play.indexOf('src="js/maptiles.js"') >= 0, 'play.html 应加载场景切片拼图');
assert.ok(play.indexOf('src="js/art.js"') < play.indexOf('src="js/maptiles.js"'), 'maptiles.js 应在 art.js 之后');
assert.ok(play.indexOf('src="js/maptiles.js"') < play.indexOf('src="js/world3d.js"'), 'maptiles.js 应在 world3d.js 之前');
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
assert.ok(play.indexOf('assets/ingame/title/letter.png') >= 0, '底栏信件应使用原作金标');
assert.ok(play.indexOf('assets/ingame/title/skill.png') >= 0, '底栏技能应使用原作金标');
assert.ok(play.indexOf('class="minimap-ring"') >= 0, '小地图应有原作圆框层');
assert.ok(play.indexOf('当前地图') >= 0, '地图窗应有当前地图页');
assert.ok(play.indexOf('国家地图') >= 0, '地图窗应有国家地图页');
assert.ok(play.indexOf('立即前往') >= 0, '当前地图应有立即前往');
assert.ok(play.indexOf('assets/ingame/map/country.jpg') >= 0, '国家地图应使用原作 country 切图');
assert.ok(play.indexOf('id="world-list"') >= 0, '世界地图应列出全部场景');
assert.ok(play.indexOf('id="btn-gm"') >= 0, '小地图旁应有原作 GM 钮');
assert.ok(css.indexOf('border-radius: 50%') >= 0, '小地图应为圆形');

var art = fs.readFileSync(path.join(root, 'js/art.js'), 'utf8');
assert.ok(art.indexOf("taiPing: 'assets/ingame/map/xin_shou_cun.png'") >= 0, '太平村应铺原作新手村俯视图');
assert.ok(art.indexOf('WEAPON_STEM') >= 0 || art.indexOf("warrior: 'dao'") >= 0, '武器图标应按职业用原作掉落图');
assert.ok(art.indexOf('A.radarFor') >= 0, '小地图应按场景换原作俯视图');
assert.ok(art.indexOf('A.cityRadar') >= 0, '城镇地面应能叠公开小地图');
assert.ok(art.indexOf('A.drawDamage') >= 0, '伤害飘字应使用原作数字切图');
assert.ok(art.indexOf('A.itemIcon') >= 0, '物品应使用原作 32×32 图标');
assert.ok(art.indexOf('npc-stand') >= 0, 'NPC 世界立绘应加载原作 job 站立帧');
assert.ok(art.indexOf('A.heroFrame') >= 0, '角色应使用原作时装精灵表切帧');
assert.ok(art.indexOf('A.heroSheetKey') >= 0, '角色外观应按性别和时装换表');
assert.ok(art.indexOf("assets/ingame/role/body_") >= 0, '应加载原作时装精灵表');

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
  'assets/ingame/map/xin_shou_cun.png',
  'assets/ingame/map/heng_jian_shan.png',
  'assets/ingame/map/po_yang_hu.png',
  'assets/ingame/map/country.jpg',
  'assets/ingame/ui/jiaosebg.png',
  'assets/ingame/npc-stand/job_21.png',
  'assets/ingame/npc-stand/job_71.png',
  'assets/ingame/portrait/xu_da.png',
  'assets/ingame/portrait/che_fu.png',
  'assets/ingame/items/hongyao2.png',
  'assets/ingame/items/huichengjuan.png',
  'assets/ingame/items/dao.png',
  'assets/ingame/items/lingzhi.png',
  'assets/ingame/title/letter.png',
  'assets/ingame/role/body_m_plain.png',
  'assets/ingame/role/body_f_plain.png',
  'assets/ingame/role/body_m_ink.png',
  'assets/ingame/role/body_f_crimson.png',
  'assets/ingame/role/mount_m.png',
  'assets/ingame/role/mount_f.png',
  'js/npc-art.js',
  'js/maptiles.js',
  'js/store.js',
  'js/store-mysql.js',
  'store_db.py',
  'tools/fetch-map-tiles.py',
  'assets/ingame/maptiles/manifest.json',
  'assets/ingame/maptiles/jing_cheng.jpg'
].forEach(function (f) {
  assert.ok(fs.existsSync(path.join(root, f)), 'missing ' + f);
});

var tileMan = JSON.parse(fs.readFileSync(path.join(root, 'assets/ingame/maptiles/manifest.json'), 'utf8'));
assert.strictEqual(tileMan.tileSize, 300);
assert.strictEqual(tileMan.maps.jing_cheng.cols, 26);
assert.strictEqual(tileMan.maps.jing_cheng.rows, 16);
assert.ok(tileMan.maps.jing_cheng.nativeW > tileMan.maps.jing_cheng.nativeH, '京城拼图应为横向（行_列）');
assert.ok(fs.statSync(path.join(root, 'assets/ingame/maptiles/jing_cheng.jpg')).size > 200000);
var fetchPy = fs.readFileSync(path.join(root, 'tools/fetch-map-tiles.py'), 'utf8');
assert.ok(fetchPy.indexOf('{row}_{col}.jpg') >= 0, '拉取脚本应写明切片文件名规则');
assert.ok(fetchPy.indexOf('mccq.static.mingchao.com') >= 0);

var serverJs = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
assert.ok(serverJs.indexOf("VERSION = '20260817h'") >= 0, 'server.js 版本应为 20260817h');
assert.ok(serverJs.indexOf("require('./js/store.js')") >= 0, 'server.js 应使用本机数据库');
assert.ok(core.indexOf('localStorage.setItem(SAVE_KEY') < 0, '角色存档不应再写入 localStorage');
assert.ok(fs.readFileSync(path.join(root, 'js/api.js'), 'utf8').indexOf('localStorage.setItem(TOKEN_KEY') < 0, '登录令牌不应再写入 localStorage');

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
assert.ok(fs.readFileSync(path.join(root, 'pack-windows.sh'), 'utf8').indexOf('store_db.py') >= 0, 'Windows 包应带上 Python 数据库模块');

var ui = fs.readFileSync(path.join(root, 'js/ui.js'), 'utf8');
assert.ok(ui.indexOf('H.worldJump') >= 0, 'ui.js 应有世界地图传送');
assert.ok(ui.indexOf("takeItem(G.player, 'scroll'") < 0, '地图传送不应再消耗传送卷');
assert.ok(ui.indexOf('H.warpToCoord') >= 0, '当前地图坐标应为瞬移');
assert.ok(ui.indexOf('INSTANCE_WARPS') >= 0, '地图列表应含副本');
var input = fs.readFileSync(path.join(root, 'js/input.js'), 'utf8');
assert.ok(input.indexOf('MapTiles.active') >= 0, '点地在切片地图上应按等距反算');
assert.ok(fs.readFileSync(path.join(root, 'js/render.js'), 'utf8').indexOf('MapTiles.follow') >= 0, '2D 绘制应跟切片镜头');
assert.ok(fs.readFileSync(path.join(root, 'js/maptiles.js'), 'utf8').indexOf('VIEW_NATIVE: 1260') >= 0, '拼图后应按约 4.2 块切片的比例缩放');
assert.ok(art.indexOf('A.worldScale') >= 0, '切片地图上角色应随地图比例缩放');
assert.ok(input.indexOf('H.usePortal(pt)') >= 0, '当前地图跳转点应直接传送');
assert.ok(input.indexOf('寻路至传送点') < 0, '跳转点不应再寻路');
assert.ok(play.indexOf('id="play-fit"') >= 0, '局内应有等比适配舞台');
assert.ok(core.indexOf('H.STAGE_W = 1280') < 0, '不应再用 1280×800 的 transform 缩放');
assert.ok(core.indexOf('H.fitStage') < 0, '不应再用 transform scale 拉舞台');
assert.ok(core.indexOf('H.sizeCanvas') >= 0, '画布宽高应与显示尺寸一致，避免拉伸');
assert.ok(core.indexOf('68 / 1000') >= 0, '底栏高度应按 skillbar 原比例随舞台宽度');
assert.ok(core.indexOf('barH + 36') < 0, '底栏不应再加高第二行');
assert.ok(css.indexOf('calc(100vh * 5 / 3)') >= 0, '舞台应按原作 5:3 真实尺寸适配');
var playFitCss = css.slice(css.indexOf('.play-fit'), css.indexOf('.stage-frame'));
assert.ok(playFitCss.indexOf('transform') < 0, 'play-fit 不应 transform scale');
assert.ok(css.indexOf('left top / 100% 72px') < 0, '底栏切图不应只拉宽度');
assert.ok(css.indexOf('background-size: 100% 100%') >= 0, '底栏切图应铺满 68px 比例条');
assert.ok(css.indexOf('aspect-ratio: 446 / 315') >= 0, '国家/当前地图应按 446×315 原图比例');
assert.ok(css.indexOf('aspect-ratio: 540 / 315') >= 0, '世界地图应按 540×315 原图比例');
var worldBgCss = css.slice(css.indexOf('.world-bg img'), css.indexOf('#nation-bg'));
assert.ok(worldBgCss.indexOf('object-fit: cover') < 0, '地图切图不应 cover 裁切');
assert.ok(ui.indexOf('其它场景') < 0, '国家地图右侧不应堆其它场景');
assert.ok(play.indexOf('hud-wallet') >= 0 && play.indexOf('hidden') >= 0, '主界面不应展示元宝银两栏');
assert.ok(play.indexOf('id="gender-pick"') >= 0, '创角应可选男女');
assert.ok(play.indexOf('id="stage-act"') >= 0, '打坐挂机应围在商城圆旁');
assert.ok(play.indexOf('class="shop-orbit"') >= 0, '打坐骑马竞队应贴在商城圆上');
assert.ok(play.indexOf('<span>角色</span>') < 0, '底栏菜单图标已自带文字，不要再叠一层');
assert.ok(css.indexOf('.dock-menu span { display: none; }') >= 0 || css.indexOf('.dock-menu span {display: none;}') >= 0, '底栏不应再显示重复菜单字');
assert.ok(css.indexOf('left: 54%') >= 0 || css.indexOf('left:54%') >= 0, '猎驯拾拓应浮在菜单上方，不要压商城也不要占技能格');
var miniHtml = play.slice(play.indexOf('class="minimap-wrap"'), play.indexOf('class="quest-box"'));
assert.ok(miniHtml.indexOf('class="map-tools"') >= 0, 'VIP榜图GM应围在小地图圆旁');
assert.ok(miniHtml.indexOf('id="stage-act"') < 0, '打坐骑马不应再围在小地图上');
assert.ok(css.indexOf('rotate(var(--a))') >= 0, '商城圆和小地图圆旁的功能钮应按圆周排列');
var dockCss = css.slice(css.indexOf('.dock {'), css.indexOf('.chat-box'));
assert.ok(dockCss.indexOf('overflow: hidden') < 0, '底栏应允许商城圆周菜单溢出到舞台');
assert.ok(play.indexOf('data-gender="f"') >= 0, '创角应有女侠');

console.log('modules.test.js ok');
