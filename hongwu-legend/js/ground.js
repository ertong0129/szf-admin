/**
 * 程序地面：对照资料图里的等距石砖、木板码头、柔边草地。
 * 不把世界地图切图当 32px 地砖来盖，避免明显拼贴。
 */
(function (root) {
  var Gnd = {};

  Gnd.PAL = {
    grass: { base: [92, 126, 68], v: 16, style: 'grass' },
    moss: { base: [68, 112, 82], v: 14, style: 'grass' },
    dirt: { base: [142, 112, 74], v: 14, style: 'dirt' },
    stone: { base: [156, 152, 146], v: 9, style: 'brick' },
    arena: { base: [164, 154, 146], v: 8, style: 'brick' },
    dock: { base: [138, 104, 68], v: 11, style: 'plank' },
    water: { base: [42, 102, 128], v: 12, style: 'water' },
    wall: { base: [96, 90, 84], v: 7, style: 'rock' },
    rock: { base: [112, 108, 102], v: 9, style: 'rock' },
    house: { base: [132, 104, 78], v: 8, style: 'dirt' },
    roof: { base: [132, 104, 78], v: 8, style: 'dirt' },
    tree: { base: [86, 122, 66], v: 12, style: 'grass' }
  };

  Gnd.hash = function (x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };

  Gnd.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  Gnd.lerp3 = function (a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  };

  Gnd.smooth = function (t) {
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
  };

  Gnd.surface = function (type, mapId) {
    if (type === 'tree') return mapId === 'shennong' ? 'moss' : 'grass';
    if (type === 'house' || type === 'roof') {
      if (mapId === 'capital' || mapId === 'kaifeng' || mapId === 'tower') return 'stone';
      if (mapId === 'poyang' || mapId === 'fish' || mapId === 'boyang' || mapId === 'quanzhou' || mapId === 'zhedong') return 'dock';
      return 'dirt';
    }
    return type || 'grass';
  };

  Gnd.kindAt = function (grid, x, y, mapId) {
    if (!grid || !grid.length) return 'grass';
    var ty = Math.max(0, Math.min(grid.length - 1, y | 0));
    var tx = Math.max(0, Math.min(grid[0].length - 1, x | 0));
    return Gnd.surface(grid[ty][tx], mapId);
  };

  Gnd.palOf = function (kind) {
    return Gnd.PAL[kind] || Gnd.PAL.grass;
  };

  function wrap01(v) {
    v = v - Math.floor(v);
    return v < 0 ? v + 1 : v;
  }

  function applyBrick(c, wx, wy, mapId) {
    var iso = wx + wy;
    var iso2 = wx - wy;
    var bw = 0.78;
    var bh = 0.39;
    var gx = wrap01(iso / bw);
    var gy = wrap01(iso2 / bh);
    var brickId = Math.floor(iso / bw) * 13 + Math.floor(iso2 / bh) * 7;
    var shade = (Gnd.hash(brickId, brickId * 0.37) - 0.5) * 14;
    c[0] += shade;
    c[1] += shade * 0.92;
    c[2] += shade * 0.82;
    var grout = gx < 0.07 || gx > 0.93 || gy < 0.08 || gy > 0.92;
    if (grout) {
      c[0] *= 0.72;
      c[1] *= 0.71;
      c[2] *= 0.68;
    } else {
      var hl = Math.max(0, 0.18 - Math.abs(gx - 0.35)) * 22;
      c[0] += hl;
      c[1] += hl * 0.95;
      c[2] += hl * 0.82;
    }
    if (mapId === 'capital' || mapId === 'kaifeng') {
      c[0] = Gnd.lerp(c[0], 186, 0.2);
      c[1] = Gnd.lerp(c[1], 182, 0.2);
      c[2] = Gnd.lerp(c[2], 172, 0.2);
      var cx = 25;
      var cy = 18;
      var d = Math.abs(wx - cx) + Math.abs(wy - cy);
      if (d < 7) {
        c[0] = Gnd.lerp(c[0], 148, 0.28);
        c[1] = Gnd.lerp(c[1], 146, 0.28);
        c[2] = Gnd.lerp(c[2], 140, 0.28);
      }
      var rr = Math.sqrt((wx - cx) * (wx - cx) + (wy - cy) * (wy - cy));
      if (Math.abs(rr - 2.4) < 0.14) {
        c[0] *= 0.82;
        c[1] *= 0.82;
        c[2] *= 0.8;
      }
    }
  }

  function applyPlank(c, wx, wy) {
    var plank = Math.floor(wy * 2.55);
    var seam = wrap01(wy * 2.55);
    var grain = (Gnd.hash(wx * 9.2, plank) - 0.5) * 16;
    c[0] += grain + (plank % 2 ? -6 : 5);
    c[1] += grain * 0.7 + (plank % 2 ? -4 : 3);
    c[2] += grain * 0.45;
    if (seam < 0.09 || seam > 0.94) {
      c[0] *= 0.62;
      c[1] *= 0.58;
      c[2] *= 0.52;
    }
    var nail = wrap01(wx * 0.85 + plank * 0.17);
    if (nail > 0.46 && nail < 0.5 && seam > 0.2 && seam < 0.8) {
      c[0] *= 0.55;
      c[1] *= 0.52;
      c[2] *= 0.48;
    }
  }

  function applyGrass(c, wx, wy) {
    var n = (Gnd.hash(wx * 4.1, wy * 4.3) - 0.5) * 18;
    var tuft = Gnd.hash(Math.floor(wx * 2.2), Math.floor(wy * 2.2));
    c[0] += n * 0.55;
    c[1] += n;
    c[2] += n * 0.35;
    if (tuft > 0.78) {
      c[0] *= 0.86;
      c[1] *= 0.92;
      c[2] *= 0.8;
    }
    var blade = wrap01(wx * 6.4 + wy * 1.1);
    if (blade < 0.08) {
      c[1] += 8;
      c[0] -= 4;
    }
  }

  function applyDirt(c, wx, wy) {
    var n = (Gnd.hash(wx * 5.5, wy * 5.1) - 0.5) * 16;
    c[0] += n;
    c[1] += n * 0.8;
    c[2] += n * 0.5;
    var pebble = Gnd.hash(Math.floor(wx * 8), Math.floor(wy * 8));
    if (pebble > 0.88) {
      c[0] += 18;
      c[1] += 14;
      c[2] += 10;
    }
  }

  function applyWater(c, wx, wy) {
    var w1 = Math.sin(wx * 3.2 + wy * 1.4) * 10;
    var w2 = Math.cos(wx * 1.1 - wy * 2.6) * 8;
    c[0] += w1 * 0.35 + 4;
    c[1] += w1 * 0.5 + w2 * 0.3;
    c[2] += w2 * 0.7 + 10;
    var spark = Gnd.hash(wx * 3.7, wy * 3.3);
    if (spark > 0.93) {
      c[0] += 28;
      c[1] += 36;
      c[2] += 32;
    }
  }

  function applyRock(c, wx, wy) {
    var n = (Gnd.hash(wx * 3.8, wy * 3.5) - 0.5) * 22;
    c[0] += n;
    c[1] += n * 0.95;
    c[2] += n * 0.9;
    var crack = wrap01(wx * 2.2 + wy * 0.4);
    if (crack < 0.04) {
      c[0] *= 0.7;
      c[1] *= 0.7;
      c[2] *= 0.68;
    }
  }

  Gnd.sample = function (grid, wx, wy, mapId) {
    var x0 = Math.floor(wx);
    var y0 = Math.floor(wy);
    var fx = wx - x0;
    var fy = wy - y0;
    var nearest = Gnd.kindAt(grid, x0, y0, mapId);
    var c = Gnd.palOf(nearest).base.slice();
    var border = 0.34;
    var mx = 0;
    var my = 0;
    if (fx > 1 - border) mx = Gnd.smooth((fx - (1 - border)) / border);
    else if (fx < border) mx = -Gnd.smooth((border - fx) / border);
    if (fy > 1 - border) my = Gnd.smooth((fy - (1 - border)) / border);
    else if (fy < border) my = -Gnd.smooth((border - fy) / border);
    if (mx > 0) c = Gnd.lerp3(c, Gnd.palOf(Gnd.kindAt(grid, x0 + 1, y0, mapId)).base, mx * 0.5);
    else if (mx < 0) c = Gnd.lerp3(c, Gnd.palOf(Gnd.kindAt(grid, x0 - 1, y0, mapId)).base, (-mx) * 0.5);
    if (my > 0) c = Gnd.lerp3(c, Gnd.palOf(Gnd.kindAt(grid, x0, y0 + 1, mapId)).base, my * 0.5);
    else if (my < 0) c = Gnd.lerp3(c, Gnd.palOf(Gnd.kindAt(grid, x0, y0 - 1, mapId)).base, (-my) * 0.5);
    var pal = Gnd.palOf(nearest);
    var n = (Gnd.hash(wx * 7.3, wy * 6.1) - 0.5) * pal.v;
    c[0] += n;
    c[1] += n * 0.9;
    c[2] += n * 0.75;
    if (pal.style === 'brick') applyBrick(c, wx, wy, mapId);
    else if (pal.style === 'plank') applyPlank(c, wx, wy);
    else if (pal.style === 'grass') applyGrass(c, wx, wy);
    else if (pal.style === 'dirt') applyDirt(c, wx, wy);
    else if (pal.style === 'water') applyWater(c, wx, wy);
    else if (pal.style === 'rock') applyRock(c, wx, wy);

    var occ = 0;
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var i = 0; i < dirs.length; i++) {
      var nx = x0 + dirs[i][0];
      var ny = y0 + dirs[i][1];
      if (!grid || ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) continue;
      var t = grid[ny][nx];
      if (t === 'wall' || t === 'rock' || t === 'house' || t === 'tree') occ += 1;
    }
    if (occ) {
      var ao = 1 - occ * 0.06;
      c[0] *= ao;
      c[1] *= ao;
      c[2] *= ao;
    }
    c[0] = Math.max(0, Math.min(255, c[0]));
    c[1] = Math.max(0, Math.min(255, c[1]));
    c[2] = Math.max(0, Math.min(255, c[2]));
    return c;
  };

  Gnd.waterAlpha = function (grid, wx, wy, mapId) {
    var x0 = Math.floor(wx);
    var y0 = Math.floor(wy);
    var fx = wx - x0;
    var fy = wy - y0;
    function isW(x, y) {
      return Gnd.kindAt(grid, x, y, mapId) === 'water' ? 1 : 0;
    }
    var a = isW(x0, y0);
    var border = 0.34;
    var mx = 0;
    var my = 0;
    if (fx > 1 - border) mx = Gnd.smooth((fx - (1 - border)) / border);
    else if (fx < border) mx = -Gnd.smooth((border - fx) / border);
    if (fy > 1 - border) my = Gnd.smooth((fy - (1 - border)) / border);
    else if (fy < border) my = -Gnd.smooth((border - fy) / border);
    if (mx > 0) a = Gnd.lerp(a, isW(x0 + 1, y0), mx * 0.5);
    else if (mx < 0) a = Gnd.lerp(a, isW(x0 - 1, y0), (-mx) * 0.5);
    if (my > 0) a = Gnd.lerp(a, isW(x0, y0 + 1), my * 0.5);
    else if (my < 0) a = Gnd.lerp(a, isW(x0, y0 - 1), (-my) * 0.5);
    return a;
  };

  Gnd.fillRgba = function (data, pw, ph, grid, mapId, cell, waterOnly) {
    var gw = grid[0].length;
    var gh = grid.length;
    var i, x, y, wx, wy, c, a, idx;
    for (y = 0; y < ph; y++) {
      wy = y / cell;
      if (wy >= gh) wy = gh - 0.001;
      for (x = 0; x < pw; x++) {
        wx = x / cell;
        if (wx >= gw) wx = gw - 0.001;
        idx = (y * pw + x) * 4;
        if (waterOnly) {
          a = Gnd.waterAlpha(grid, wx, wy, mapId);
          if (a < 0.01) {
            data[idx + 3] = 0;
            continue;
          }
          c = Gnd.sample(grid, wx, wy, mapId);
          data[idx] = Math.min(255, c[0] + 18);
          data[idx + 1] = Math.min(255, c[1] + 28);
          data[idx + 2] = Math.min(255, c[2] + 36);
          data[idx + 3] = Math.floor(a * 210);
        } else {
          c = Gnd.sample(grid, wx, wy, mapId);
          data[idx] = c[0] | 0;
          data[idx + 1] = c[1] | 0;
          data[idx + 2] = c[2] | 0;
          data[idx + 3] = 255;
        }
      }
    }
  };

  Gnd.css = function (c) {
    return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
  };

  Gnd.decorate = function (ctx, kind, x, y, cell, mapId) {
    var pal = Gnd.palOf(kind);
    var ox = x * cell;
    var oy = y * cell;
    var i, hx, hy;
    if (pal.style === 'brick') {
      ctx.strokeStyle = 'rgba(48, 42, 36, 0.42)';
      ctx.lineWidth = Math.max(1, cell / 18);
      ctx.beginPath();
      for (i = -2; i < 4; i++) {
        ctx.moveTo(ox, oy + i * cell * 0.38 + (x % 2) * cell * 0.12);
        ctx.lineTo(ox + cell, oy + (i - 1) * cell * 0.38 + (x % 2) * cell * 0.12);
      }
      ctx.stroke();
      if ((mapId === 'capital' || mapId === 'kaifeng') && Math.abs(x - 25) + Math.abs(y - 18) < 6) {
        ctx.fillStyle = 'rgba(140, 86, 42, 0.18)';
        ctx.fillRect(ox, oy, cell, cell);
      }
    } else if (pal.style === 'plank') {
      ctx.strokeStyle = 'rgba(52, 32, 16, 0.45)';
      ctx.lineWidth = Math.max(1, cell / 16);
      for (i = 1; i < 3; i++) {
        hy = oy + (i * cell) / 2.4;
        ctx.beginPath();
        ctx.moveTo(ox, hy);
        ctx.lineTo(ox + cell, hy);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(30, 18, 8, 0.28)';
      ctx.fillRect(ox + cell * 0.48, oy + cell * 0.18, 2, 2);
    } else if (pal.style === 'grass') {
      ctx.fillStyle = kind === 'moss' ? 'rgba(20, 50, 36, 0.28)' : 'rgba(36, 64, 24, 0.28)';
      for (i = 0; i < 7; i++) {
        hx = Gnd.hash(x * 9.1 + i, y * 7.3);
        hy = Gnd.hash(x * 4.7 + i, y * 11.1);
        ctx.fillRect(ox + hx * cell, oy + hy * cell, 2, 2);
      }
    } else if (pal.style === 'dirt') {
      ctx.fillStyle = 'rgba(70, 48, 24, 0.22)';
      for (i = 0; i < 5; i++) {
        hx = Gnd.hash(x * 6.2 + i, y * 5.8);
        hy = Gnd.hash(x * 3.3 + i, y * 8.4);
        ctx.fillRect(ox + hx * cell, oy + hy * cell, 2, 2);
      }
    } else if (pal.style === 'water') {
      ctx.fillStyle = 'rgba(170, 220, 230, 0.12)';
      ctx.fillRect(ox, oy + cell * 0.35, cell, 2);
    } else if (pal.style === 'rock') {
      ctx.fillStyle = 'rgba(20, 18, 16, 0.28)';
      ctx.fillRect(ox, oy, cell, cell);
    }
  };

  Gnd.paintCanvas = function (ctx, grid, mapId, cell) {
    cell = cell || 24;
    var gh = grid.length;
    var gw = grid[0].length;
    var x, y, kind, pal, k2, mid;
    for (y = 0; y < gh; y++) {
      for (x = 0; x < gw; x++) {
        kind = Gnd.surface(grid[y][x], mapId);
        pal = Gnd.palOf(kind);
        ctx.fillStyle = Gnd.css(pal.base);
        ctx.fillRect(x * cell, y * cell, cell + 1, cell + 1);
        Gnd.decorate(ctx, kind, x, y, cell, mapId);
      }
    }
    ctx.globalAlpha = 0.5;
    for (y = 0; y < gh; y++) {
      for (x = 0; x < gw; x++) {
        kind = Gnd.surface(grid[y][x], mapId);
        if (x + 1 < gw) {
          k2 = Gnd.surface(grid[y][x + 1], mapId);
          if (k2 !== kind) {
            mid = Gnd.lerp3(Gnd.palOf(kind).base, Gnd.palOf(k2).base, 0.5);
            ctx.fillStyle = Gnd.css(mid);
            ctx.fillRect((x + 1) * cell - 4, y * cell, 8, cell);
          }
        }
        if (y + 1 < gh) {
          k2 = Gnd.surface(grid[y + 1][x], mapId);
          if (k2 !== kind) {
            mid = Gnd.lerp3(Gnd.palOf(kind).base, Gnd.palOf(k2).base, 0.5);
            ctx.fillStyle = Gnd.css(mid);
            ctx.fillRect(x * cell, (y + 1) * cell - 4, cell, 8);
          }
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  Gnd.paintWaterMask = function (ctx, grid, mapId, cell) {
    cell = cell || 16;
    var gh = grid.length;
    var gw = grid[0].length;
    var x, y;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, gw * cell, gh * cell);
    for (y = 0; y < gh; y++) {
      for (x = 0; x < gw; x++) {
        if (Gnd.kindAt(grid, x, y, mapId) !== 'water') continue;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x * cell - 2, y * cell - 2, cell + 4, cell + 4);
      }
    }
  };

  Gnd.paintTile = function (ctx, type, sx, sy, size, time, tx, ty, mapId) {
    var kind = Gnd.surface(type, mapId);
    var pal = Gnd.palOf(kind);
    ctx.fillStyle = Gnd.css(pal.base);
    ctx.fillRect(sx, sy, size + 1, size + 1);
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, size + 1, size + 1);
    ctx.clip();
    ctx.translate(sx - (tx || 0) * size, sy - (ty || 0) * size);
    Gnd.decorate(ctx, kind, tx || 0, ty || 0, size, mapId);
    ctx.restore();
    if (kind === 'water' && time != null) {
      ctx.strokeStyle = 'rgba(190,230,240,' + (0.18 + Math.sin(time * 2 + (tx || 0)) * 0.08) + ')';
      ctx.beginPath();
      ctx.moveTo(sx, sy + size * 0.4 + Math.sin(time * 1.6 + (ty || 0)) * 3);
      ctx.lineTo(sx + size, sy + size * 0.55 + Math.cos(time * 1.2 + (tx || 0)) * 3);
      ctx.stroke();
    }
  };

  root.GroundPaint = Gnd;
  if (typeof module !== 'undefined' && module.exports) module.exports = Gnd;
})(typeof window !== 'undefined' ? window : global);
