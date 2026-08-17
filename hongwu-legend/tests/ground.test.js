var assert = require('assert');
var Gnd = require('../js/ground.js');

function grid() {
  return [
    ['grass', 'grass', 'dirt'],
    ['grass', 'stone', 'dirt'],
    ['water', 'water', 'dock']
  ];
}

assert.strictEqual(Gnd.surface('tree', 'taiping'), 'grass');
assert.strictEqual(Gnd.surface('tree', 'shennong'), 'moss');
assert.strictEqual(Gnd.surface('house', 'capital'), 'stone');
assert.strictEqual(Gnd.surface('house', 'poyang'), 'dock');
assert.strictEqual(Gnd.surface('house', 'taiping'), 'dirt');

var g = grid();
var cGrass = Gnd.sample(g, 0.5, 0.5, 'taiping');
var cStone = Gnd.sample(g, 1.5, 1.5, 'capital');
var cDock = Gnd.sample(g, 2.5, 2.5, 'poyang');
var cWater = Gnd.sample(g, 0.5, 2.5, 'taiping');

assert.ok(cGrass[1] > cGrass[0], '草地应偏绿');
assert.ok(cStone[0] > 110 && cStone[1] > 110, '石砖应偏浅灰');
assert.ok(cDock[0] > cDock[2], '木板应偏暖褐');
assert.ok(cWater[2] > cWater[0], '水面应偏青');

var pair = [['grass', 'dirt'], ['grass', 'dirt']];
var left = Gnd.sample(pair, 0.5, 0.5, 'taiping');
var right = Gnd.sample(pair, 1.5, 0.5, 'taiping');
var edge = Gnd.sample(pair, 0.98, 0.5, 'taiping');
assert.ok(Math.abs(edge[0] - left[0]) < Math.abs(right[0] - left[0]), '邻格交界应羽化，不应硬切');
assert.ok(Math.abs(edge[0] - right[0]) < Math.abs(right[0] - left[0]), '羽化色应落在两侧之间');

var brickA = Gnd.sample([['stone', 'stone'], ['stone', 'stone']], 0.2, 0.19, 'capital');
var grout = Gnd.sample([['stone', 'stone'], ['stone', 'stone']], 0.02, 0.02, 'capital');
assert.ok(grout[0] + grout[1] + grout[2] < brickA[0] + brickA[1] + brickA[2], '菱形石砖勾缝应更深');

var mask = Gnd.waterAlpha(g, 0.5, 2.5, 'taiping');
var land = Gnd.waterAlpha(g, 0.5, 0.5, 'taiping');
assert.ok(mask > 0.8);
assert.ok(land < 0.2);

var data = new Uint8ClampedArray(8 * 8 * 4);
Gnd.fillRgba(data, 8, 8, [['grass', 'stone'], ['dirt', 'water']], 'taiping', 4, false);
assert.strictEqual(data[3], 255);
assert.ok(data[0] + data[1] + data[2] > 0);

var wdata = new Uint8ClampedArray(8 * 8 * 4);
Gnd.fillRgba(wdata, 8, 8, [['grass', 'water'], ['grass', 'water']], 'taiping', 4, true);
var waterPx = 0, landPx = 0;
for (var i = 0; i < wdata.length; i += 4) {
  if (wdata[i + 3] > 20) waterPx++;
  else landPx++;
}
assert.ok(waterPx > 0 && landPx > 0, '水面遮罩应只盖住水域');

var ops = 0;
var mock = {
  fillStyle: '', strokeStyle: '', lineWidth: 1, globalAlpha: 1,
  fillRect: function () { ops += 1; },
  clearRect: function () { ops += 1; },
  beginPath: function () {},
  moveTo: function () {},
  lineTo: function () {},
  stroke: function () { ops += 1; }
};
Gnd.paintCanvas(mock, [['grass', 'dirt'], ['water', 'dock']], 'taiping', 8);
assert.ok(typeof Gnd.paintCityOverlay === 'function', '城镇地面应能叠公开俯视图');
ops = 0;
Gnd.paintWaterMask(mock, [['grass', 'water'], ['grass', 'water']], 'taiping', 8);
assert.ok(ops > 0);

console.log('ground.test.js ok');
