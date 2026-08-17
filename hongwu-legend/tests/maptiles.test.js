var assert = require('assert');
var T = require('../js/maptiles.js');

assert.strictEqual(T.folderOf('capital'), 'jing_cheng');
assert.strictEqual(T.folderOf('taiping'), 'xin_shou_cun');
assert.strictEqual(T.folderOf('kaifeng'), 'kai_feng');
assert.strictEqual(T.TILE_ISO, 44);
assert.strictEqual(T.CAMERA_OFFSET, 40);

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
      mapW: 7515,
      mapH: 4640,
      imgW: 2048,
      imgH: 1260,
      walkW: 175,
      walkH: 172,
      isoTile: 44,
      offsetX: 3520,
      offsetY: -1232,
      originY: 0,
      file: 'jing_cheng.jpg'
    }
  }
};

assert.ok(T.has('capital'));
assert.ok(!T.has('tower'));
assert.strictEqual(T.metaFor('capital').cols, 26);
assert.strictEqual(T.metaFor('capital').walkW, 175);
assert.strictEqual(T.metaFor('capital').offsetX, 3520);
assert.strictEqual(T.metaFor('capital').isoTile, 44);

var meta = T.metaFor('capital');
var a = T.walkToImg(0, 0, meta, 'capital');
var back = T.imgToWalk(a.x, a.y, meta, 'capital');
assert.ok(Math.abs(back.tx) < 1e-6 && Math.abs(back.ty) < 1e-6, 'walkToImg 与 imgToWalk 应互逆');

var shi = T.walkToImg(115, 36, meta, 'capital');
assert.ok(Math.abs(shi.x - 6996) < 0.5, '史可法 mosaic X 应为 (115-36)*44+3520');
assert.ok(Math.abs(shi.y - 2112) < 0.5, '史可法 mosaic Y 应为 (115+36)*22+22-1232');
assert.ok(Math.abs(shi.x / 300 - 23.32) < 0.05, '史可法应落在 HAR 切片列 23');
assert.ok(Math.abs(shi.y / 300 - 7.04) < 0.05, '史可法应落在 HAR 切片行 7');
var shiBack = T.imgToWalk(shi.x, shi.y, meta, 'capital');
assert.ok(Math.abs(shiBack.tx - 115) < 1e-6);
assert.ok(Math.abs(shiBack.ty - 36) < 1e-6);

var che = T.walkToImg(110, 83, meta, 'capital');
assert.ok(Math.abs(che.x - 4708) < 0.5, '京城车夫 mosaic X');
assert.ok(Math.abs(che.y - 3036) < 0.5, '京城车夫 mosaic Y');

var radar = T.walkToRadar(115, 36, 446, 315, meta, 'capital');
var fromRadar = T.radarToWalk(radar.x, radar.y, 446, 315, meta, 'capital');
assert.ok(Math.abs(fromRadar.tx - 115) < 1e-6 && Math.abs(fromRadar.ty - 36) < 1e-6, '小地图与大地图格子应互逆');

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
assert.ok(Math.abs(T.displayScale(1800) - 1) < 1e-9, '窗口变宽不应放大 mosaic');
T.cam.scale = T.displayScale(1000);
assert.ok(Math.abs(T.spriteZoom() - 1) < 1e-9, '角色应与 1:1 地砖同一套屏幕像素');
var tileOnScreen = 44 * T.displayScale(1000);
var heroH = 132 * T.spriteZoom();
assert.ok(heroH / tileOnScreen < 3.3, '人物相对 44px 地砖应约三格高');
assert.ok(heroH / tileOnScreen > 2.4, '人物不应再缩到地砖里看不见');

console.log('maptiles.test.js ok');
