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
      walkW: 140,
      walkH: 130,
      originY: 0,
      file: 'jing_cheng.jpg'
    }
  }
};

assert.ok(T.has('capital'));
assert.ok(!T.has('tower'));
assert.strictEqual(T.metaFor('capital').cols, 26);

var a = T.walkToImg(0, 0, T.metaFor('capital'), 'capital');
var b = T.walkToImg(140, 0, T.metaFor('capital'), 'capital');
var c = T.walkToImg(0, 130, T.metaFor('capital'), 'capital');
var d = T.walkToImg(140, 130, T.metaFor('capital'), 'capital');
assert.ok(Math.abs(a.x - 3755.55) < 1, '北角应在拼图上沿中央附近');
assert.ok(a.y < 2, '格子 0,0 应落在拼图顶部');
assert.ok(b.x > 7700, '东角应靠右');
assert.ok(c.x < 20, '西角应靠左');
assert.ok(d.y > 4700, '南角应靠底');

var back = T.imgToWalk(a.x, a.y, T.metaFor('capital'), 'capital');
assert.ok(Math.abs(back.tx) < 1e-6 && Math.abs(back.ty) < 1e-6, 'walkToImg 与 imgToWalk 应互逆');
var mid = T.walkToImg(110, 83, T.metaFor('capital'), 'capital');
var midBack = T.imgToWalk(mid.x, mid.y, T.metaFor('capital'), 'capital');
assert.ok(Math.abs(midBack.tx - 110) < 1e-6);
assert.ok(Math.abs(midBack.ty - 83) < 1e-6);

T.cam.mapId = 'capital';
T.cam.x = mid.x;
T.cam.y = mid.y;
T.cam.scale = 1;
T.cam.cx = 500;
T.cam.cy = 300;
T._active = true;
var scr = T.worldToScreen(110 * 40, 83 * 40);
assert.ok(Math.abs(scr.x - 500) < 0.01);
assert.ok(Math.abs(scr.y - 300) < 0.01);
var world = T.screenToWorld(500, 300);
assert.ok(Math.abs(world.x - 110 * 40) < 0.01);
assert.ok(Math.abs(world.y - 83 * 40) < 0.01);

console.log('maptiles.test.js ok');
