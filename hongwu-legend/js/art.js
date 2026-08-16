/**
 * 洪武风云录 — 原创贴图与 2.5D 精灵
 * 画风对照旧页游的预渲染立绘 / 地砖 / 金红界面，资源均为新绘，不包含 91wan 原文件。
 */
(function (root) {
  var A = {
    ready: false,
    imgs: {},
    variants: {},
    src: {
      title: 'assets/title-bg.jpg',
      warrior: 'assets/class-warrior.jpg',
      archer: 'assets/class-archer.jpg',
      wanderer: 'assets/class-wanderer.jpg',
      healer: 'assets/class-healer.jpg',
      elder: 'assets/npc-elder.jpg',
      boar: 'assets/mob-boar.jpg',
      wolf: 'assets/mob-wolf.jpg',
      bandit: 'assets/mob-bandit.jpg',
      boss: 'assets/mob-boss.jpg',
      house: 'assets/prop-house.jpg',
      tree: 'assets/prop-tree.jpg',
      grass: 'assets/tile-grass.jpg',
      stone: 'assets/tile-stone.jpg',
      water: 'assets/tile-water.jpg'
    }
  };

  var TILE_SRC = {
    grass: 'grass', moss: 'grass', dirt: 'grass',
    stone: 'stone', arena: 'stone', dock: 'stone', wall: 'stone', rock: 'stone',
    water: 'water', house: 'stone', roof: 'stone', tree: 'grass'
  };

  var MOB_SRC = {
    boar: 'boar', boar_boss: 'boar',
    wolf: 'wolf', snake: 'wolf',
    bandit: 'bandit', escort: 'bandit', sailor: 'bandit', cannon: 'bandit', tower: 'bandit', spirit: 'bandit',
    lake_boss: 'boss', world_boss: 'boss'
  };

  function loadImage(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  function tintCanvas(img, r, g, b, a) {
    var c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    var x = c.getContext('2d');
    x.drawImage(img, 0, 0);
    x.globalCompositeOperation = 'source-atop';
    x.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
    x.fillRect(0, 0, c.width, c.height);
    return c;
  }

  A.load = function (done) {
    var keys = Object.keys(A.src);
    var left = keys.length;
    if (!left) { A.ready = true; done && done(); return; }
    keys.forEach(function (k) {
      loadImage(A.src[k]).then(function (img) {
        if (img) A.imgs[k] = img;
        left -= 1;
        if (left <= 0) {
          if (A.imgs.grass) A.variants.dirt = tintCanvas(A.imgs.grass, 90, 50, 10, 0.38);
          if (A.imgs.grass) A.variants.moss = tintCanvas(A.imgs.grass, 10, 50, 40, 0.28);
          if (A.imgs.stone) A.variants.dock = tintCanvas(A.imgs.stone, 80, 50, 10, 0.32);
          if (A.imgs.stone) A.variants.arena = tintCanvas(A.imgs.stone, 40, 10, 50, 0.25);
          A.ready = true;
          done && done();
        }
      });
    });
  };

  A.classKey = function (cls) {
    return ({ warrior: 'warrior', archer: 'archer', wanderer: 'wanderer', healer: 'healer' })[cls] || 'warrior';
  };

  A.tileImg = function (type) {
    if (type === 'dirt') return A.variants.dirt || A.imgs.grass;
    if (type === 'moss') return A.variants.moss || A.imgs.grass;
    if (type === 'dock') return A.variants.dock || A.imgs.stone;
    if (type === 'arena') return A.variants.arena || A.imgs.stone;
    var key = TILE_SRC[type] || 'grass';
    return A.imgs[key];
  };

  A.drawTile = function (ctx, type, sx, sy, size, time, tx, ty) {
    var img = A.tileImg(type);
    if (img) {
      var sw = img.width || 256, sh = img.height || 256;
      var ox = ((tx * 47) % Math.max(1, sw - size));
      var oy = ((ty * 31) % Math.max(1, sh - size));
      if (type === 'water') {
        ox = (ox + Math.sin(time * 1.4 + tx) * 8 + sw) % Math.max(1, sw - size);
        oy = (oy + Math.cos(time * 1.1 + ty) * 6 + sh) % Math.max(1, sh - size);
      }
      try {
        ctx.drawImage(img, ox, oy, size, size, sx, sy, size + 1, size + 1);
      } catch (e) {
        ctx.drawImage(img, sx, sy, size + 1, size + 1);
      }
    } else {
      ctx.fillStyle = '#3d6a32';
      ctx.fillRect(sx, sy, size + 1, size + 1);
    }
    if (type === 'wall' || type === 'rock') {
      ctx.fillStyle = 'rgba(20,16,12,0.35)';
      ctx.fillRect(sx, sy, size + 1, size + 1);
    }
  };

  A.drawProp = function (ctx, type, sx, sy, size) {
    if (type === 'tree' && A.imgs.tree) {
      ctx.drawImage(A.imgs.tree, sx - size * 0.35, sy - size * 0.85, size * 1.7, size * 1.85);
    } else if ((type === 'house' || type === 'roof') && A.imgs.house) {
      if (type === 'house') ctx.drawImage(A.imgs.house, sx - 6, sy - size * 0.7, size + 12, size * 1.7);
    }
  };

  function billboard(ctx, img, x, y, w, h, flip, bob) {
    if (!img) return false;
    ctx.save();
    ctx.translate(x, y + (bob || 0));
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -w / 2, -h, w, h);
    ctx.restore();
    return true;
  }

  A.drawAura = function (ctx, x, y, color, time, scale) {
    var r = (18 + Math.sin(time * 4) * 2) * (scale || 1);
    var g = ctx.createRadialGradient(x, y + 6, 2, x, y + 6, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, r, r * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  };

  A.drawNameplate = function (ctx, x, y, title, name, color) {
    ctx.font = 'bold 11px "Microsoft YaHei","PingFang SC",sans-serif';
    ctx.textAlign = 'center';
    if (title) {
      ctx.fillStyle = '#c9a227';
      ctx.fillText(title, x, y - 14);
    }
    ctx.fillStyle = color || '#e8f6c8';
    ctx.fillText(name, x, y);
  };

  A.drawHero = function (ctx, p, screen, time) {
    var img = A.imgs[A.classKey(p.cls)];
    var flip = Math.cos(p.facing) < 0;
    var bob = Math.sin(time * 8) * (p._moving ? 2 : 0.4);
    A.drawAura(ctx, screen.x, screen.y, 'rgba(255,200,80,0.55)', time, 1);
    if (!billboard(ctx, img, screen.x, screen.y + 10, 54, 72, flip, bob)) {
      return false;
    }
    return true;
  };

  A.drawNpc = function (ctx, n, screen, time) {
    A.drawAura(ctx, screen.x, screen.y, 'rgba(255,210,80,0.4)', time, 0.85);
    billboard(ctx, A.imgs.elder, screen.x, screen.y + 8, 46, 62, false, Math.sin(time * 2) * 0.6);
    ctx.fillStyle = '#ffd36a';
    ctx.font = 'bold 16px serif';
    ctx.textAlign = 'center';
    ctx.fillText('！', screen.x, screen.y - 58);
    A.drawNameplate(ctx, screen.x, screen.y + 18, '', n.name, '#ffe7a0');
  };

  A.drawMob = function (ctx, e, screen, time) {
    var key = MOB_SRC[e.kind] || 'bandit';
    var img = A.imgs[key];
    var scale = e.boss ? 1.35 : 1;
    var w = (key === 'boar' || key === 'wolf' ? 56 : 48) * scale;
    var h = (key === 'boar' || key === 'wolf' ? 48 : 68) * scale;
    A.drawAura(ctx, screen.x, screen.y, e.boss ? 'rgba(255,80,40,0.45)' : 'rgba(80,20,20,0.3)', time, scale);
    billboard(ctx, img, screen.x, screen.y + 8, w, h, false, Math.sin(time * 6 + e.x) * 1.2);
    return !!img;
  };

  A.drawPet = function (ctx, pet, screen, time) {
    var img = A.imgs.wolf;
    A.drawAura(ctx, screen.x, screen.y, 'rgba(160,200,255,0.35)', time, 0.7);
    billboard(ctx, img, screen.x, screen.y + 6, 36, 32, false, Math.sin(time * 7) * 1);
    A.drawNameplate(ctx, screen.x, screen.y + 14, '', pet.name, '#c8e6ff');
  };

  A.drawCart = function (ctx, screen) {
    ctx.fillStyle = '#6a3a18';
    ctx.fillRect(screen.x - 18, screen.y - 8, 36, 16);
    ctx.fillStyle = '#c4a060';
    ctx.fillRect(screen.x - 14, screen.y - 18, 28, 12);
    ctx.fillStyle = '#2a1a10';
    ctx.beginPath(); ctx.arc(screen.x - 10, screen.y + 8, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(screen.x + 10, screen.y + 8, 5, 0, Math.PI * 2); ctx.fill();
  };

  root.Art = A;
})(typeof window !== 'undefined' ? window : global);
