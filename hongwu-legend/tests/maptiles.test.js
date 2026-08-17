var assert = require('assert');
var T = require('../js/maptiles.js');

assert.strictEqual(T.folderOf('capital'), 'jing_cheng');
assert.strictEqual(T.folderOf('taiping'), 'xin_shou_cun');
assert.strictEqual(T.folderOf('kaifeng'), 'kai_feng');

T.manifest = {
  maps: {
    jing_cheng: {
      folder: 'jing_cheng',
      mapId: 'capital',
      cols: 26,
      rows: 16,
      tileSize: 300,
      nativeW: 7800,
      nativeH: 4800,
      imgW: 2048,
      imgH: 1260,
      walkW: 175,
      walkH: 172,
      originX: 51,
      originY: 0,
      file: 'jing_cheng.jpg'
    }
  }
};

assert.ok(T.has('capital'));
assert.ok(!T.has('tower'));
assert.strictEqual(T.metaFor('capital').cols, 26);
assert.strictEqual(T.metaFor('capital').walkW, 175);
assert.strictEqual(T.metaFor('capital').originX, 51);

var meta = T.metaFor('capital');
var a = T.walkToImg(0, 0, meta, 'capital');
var back = T.imgToWalk(a.x, a.y, meta, 'capital');
assert.ok(Math.abs(back.tx) < 1e-6 && Math.abs(back.ty) < 1e-6, 'walkToImg 与 imgToWalk 应互逆');

var shi = T.walkToImg(115, 36, meta, 'capital');
assert.ok(Math.abs(shi.x / 300 - 22.63) < 0.2, '史可法应落在 HAR 起点列 22');
assert.ok(Math.abs(shi.y / 300 - 6.96) < 0.2, '史可法应落在 HAR 起点行 6–7 交界（7_22 / 6_22）');
var shiBack = T.imgToWalk(shi.x, shi.y, meta, 'capital');
assert.ok(Math.abs(shiBack.tx - 115) < 1e-6);
assert.ok(Math.abs(shiBack.ty - 36) < 1e-6);

var che = T.walkToImg(110, 83, meta, 'capital');
assert.ok(che.x > 5200 && che.x < 6100, '京城车夫应在市场南侧街道');
assert.ok(che.y > 2400 && che.y < 3000, '京城车夫不应被拉到图顶或图底');

T.cam.mapId = 'capital';
T.cam.x = shi.x;
T.cam.y = shi.y;
T.cam.scale = 1;
T.cam.cx = 500;
T.cam.cy = 300;
T._active = true;
var scr = T.worldToScreen(115 * 40, 36 * 40);
assert.ok(Math.abs(scr.x - 500) < 0.01);
assert.ok(Math.abs(scr.y - 300) < 0.01);
var world = T.screenToWorld(500, 300);
assert.ok(Math.abs(world.x - 115 * 40) < 0.01);
assert.ok(Math.abs(world.y - 36 * 40) < 0.01);

assert.strictEqual(T.VIEW_NATIVE, 1000);
assert.ok(Math.abs(T.displayScale(1000) - 1) < 1e-9);
T.cam.scale = T.displayScale(1000);
assert.ok(T.spriteZoom() <= T.displayScale(1000), '角色不应比地砖更大');
assert.ok(T.spriteZoom() > 0.85, '1:1 切片上人物应接近原作立绘大小');
var tileOnScreen = 300 * T.displayScale(1000);
var heroH = 82 * T.spriteZoom();
assert.ok(heroH / tileOnScreen < 0.32, '人物相对 300px 地砖应约占四分之一高');
assert.ok(heroH / tileOnScreen > 0.22, '人物不应再缩到地砖里看不见');

console.log('maptiles.test.js ok');
