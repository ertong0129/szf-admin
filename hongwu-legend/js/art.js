/**
 * 大明传说 — 局内贴图
 * 立绘 / 半身像 / 头像取自公开资源。地面为程序绘制，不再把世界地图切图当砖贴。
 */
(function (root) {
  var A = {
    ready: false,
    imgs: {},
    variants: {},
    src: {
      warrior: 'assets/ingame/sprites/warrior.png',
      dao: 'assets/ingame/sprites/dao.png',
      spear: 'assets/ingame/sprites/spear.png',
      archer: 'assets/ingame/sprites/spear.png',
      wanderer: 'assets/ingame/sprites/wing.png',
      healer: 'assets/ingame/sprites/fairy.png',
      elder: 'assets/ingame/sprites/officer.png',
      guard: 'assets/ingame/sprites/guard.png',
      redguard: 'assets/ingame/sprites/redguard.png',
      smith: 'assets/ingame/sprites/smith.png',
      officer: 'assets/ingame/sprites/officer.png',
      tiger: 'assets/ingame/sprites/tiger.png',
      fox: 'assets/ingame/sprites/fox.png',
      water: 'assets/ingame/sprites/water.png',
      wing: 'assets/ingame/sprites/wing.png',
      fairy: 'assets/ingame/sprites/fairy.png',
      boss: 'assets/ingame/sprites/boss.png',
      cart: 'assets/ingame/sprites/cart.png',
      house: 'assets/prop-house.jpg',
      tree: 'assets/prop-tree.jpg',
      grass: 'assets/ingame/tile/grass.jpg',
      stone: 'assets/ingame/tile/stone.jpg',
      waterTile: 'assets/ingame/tile/water.jpg',
      dirtTile: 'assets/ingame/tile/dirt.jpg',
      worldMap: 'assets/ingame/map/world.jpg',
      countryMap: 'assets/ingame/map/country.jpg',
      towerBg: 'assets/ingame/map/tower.jpg',
      radar: 'assets/ingame/map/radar.jpg',
      roleBg: 'assets/ingame/ui/rolebg.png',
      forgeBg: 'assets/ingame/ui/forge.jpg',
      portraitCun: 'assets/ingame/portrait/xs_tai_ping_cun_zhi_shi.png',
      portraitShop: 'assets/ingame/portrait/xs_za_huo_dian_lao_ban.png',
      portraitLady: 'assets/ingame/portrait/xs_chen_yuan_yuan.png',
      portraitMaster: 'assets/ingame/portrait/xs_ji_neng_da_shi.png',
      portraitXuda: 'assets/ingame/portrait/xu_da.png',
      portraitLi: 'assets/ingame/portrait/li_shi_zhen.png',
      portraitZhang: 'assets/ingame/portrait/xs_zhang_san_feng.png',
      portraitMu: 'assets/ingame/portrait/mu_ying.png',
      portraitYue: 'assets/ingame/portrait/xs_yue_lao.png',
      portraitShen: 'assets/ingame/portrait/xs_shen_wan_san.png',
      headWarrior: 'assets/ingame/head/m4.png',
      headArcher: 'assets/ingame/head/m2.png',
      headWanderer: 'assets/ingame/head/m1.png',
      headHealer: 'assets/ingame/head/f3.png',
      iconCun: 'assets/ingame/icon/xs_tai_ping_cun_zhi_shi.png',
      iconSmith: 'assets/ingame/icon/tie_jiang.png',
      iconShop: 'assets/ingame/icon/xs_za_huo_dian_lao_ban.png',
      iconFarmer: 'assets/ingame/icon/tian_yuan_nong_fu.png',
      iconCart: 'assets/ingame/icon/che_fu.png',
      iconElder: 'assets/ingame/icon/zong_zu_zhang_lao.png',
      iconMaster: 'assets/ingame/icon/xs_ji_neng_da_shi.png',
      iconBoat: 'assets/ingame/icon/xs_chuan_song_1.png',
      iconXuda: 'assets/ingame/icon/xu_da.png',
      iconLi: 'assets/ingame/icon/li_shi_zhen.png',
      iconShen: 'assets/ingame/icon/shen_wan_san.png',
      iconZhang: 'assets/ingame/icon/zhang_san_feng.png',
      iconMu: 'assets/ingame/icon/mu_ying.png',
      iconChe: 'assets/ingame/icon/che_fu.png',
      iconTie: 'assets/ingame/icon/tie_jiang.png',
      iconClan: 'assets/ingame/icon/zong_zu_zhang_lao.png'
    }
  };

  var TILE_SRC = {
    grass: 'grass', moss: 'grass', dirt: 'dirtTile',
    stone: 'stone', arena: 'stone', dock: 'stone', wall: 'stone', rock: 'stone',
    water: 'waterTile', house: 'stone', roof: 'stone', tree: 'grass'
  };

  var CLASS_SRC = {
    warrior: 'dao', archer: 'spear', wanderer: 'wanderer', healer: 'healer'
  };

  var CLASS_HEAD = {
    warrior: 'headWarrior', archer: 'headArcher', wanderer: 'headWanderer', healer: 'headHealer'
  };

  var MOB_SRC = {
    boar: 'tiger', boar_boss: 'tiger',
    wolf: 'tiger', snake: 'fox',
    bandit: 'redguard', escort: 'redguard',
    sailor: 'officer', cannon: 'officer',
    xianfeng: 'redguard', gongshou: 'spear', fujiang: 'guard',
    tower: 'guard', spirit: 'water',
    lake_boss: 'boss', mammoth20: 'boss', mammoth30: 'boss', mammoth40: 'boss',
    chenyouliang: 'boss', zhangshicheng: 'boss', wala_chief: 'boss', wangzhen: 'boss',
    yibang: 'boss', wala: 'redguard', wokou: 'officer', yuanbing: 'guard', nuzhen: 'tiger',
    fishman: 'officer', shark: 'water', fish_boss: 'boss',
    boxguard: 'guard', box_boss: 'boss', coach: 'dao',
    zhouyingqiu: 'officer', yangshuai: 'redguard', sunyunhe: 'healer', tianergeng: 'wanderer', xuxianchun: 'boss',
    jinyi_baihu: 'guard', jinyi_zhuque: 'redguard', jinyi_qinglong: 'officer', jinyi_xuanwu: 'dao',
    pagoda_monk: 'dao', pagoda_spirit: 'fox', pagoda_king: 'boss'
  };

  var NPC_SRC = {
    cunzheng: 'officer', tiesmith: 'smith', yaopu: 'fairy', xunshou: 'fox',
    chefu: 'officer', bagong: 'smith', yabiao: 'guard', shilian: 'dao',
    shuibing: 'guard', chuansong: 'wanderer',
    xuda: 'officer', lishizhen: 'healer', shenwansan: 'elder', zhangsanfeng: 'elder',
    muying: 'guard', limengyang: 'officer', yuelao: 'elder', yushi: 'officer',
    shichang: 'smith', yufu: 'wanderer', baoku: 'guard', jiaochang: 'dao', tongxin: 'elder',
    liubowen: 'elder', zhuwenzheng: 'guard', pingzhi: 'officer', lanyu: 'guard',
    zhusu: 'officer', wangyangming: 'elder',
    zhangxiaoxiao: 'fairy', jinyi: 'guard', tieta: 'dao',
    jx_leave: 'wanderer', sg_leave: 'guard', tt_leave: 'elder'
  };

  var NPC_PORTRAIT = {
    cunzheng: 'portraitCun', yaopu: 'portraitShop', xunshou: 'portraitLady',
    chefu: 'portraitCun', bagong: 'portraitMaster', yabiao: 'portraitCun',
    shilian: 'portraitMaster', shuibing: 'portraitCun', chuansong: 'portraitLady', tiesmith: 'portraitCun',
    xuda: 'portraitXuda', lishizhen: 'portraitLi', zhangsanfeng: 'portraitZhang',
    muying: 'portraitMu', yuelao: 'portraitYue', limengyang: 'portraitMaster', yushi: 'portraitXuda',
    shenwansan: 'portraitShen'
  };

  var NPC_ICON = {
    cunzheng: 'iconCun', tiesmith: 'iconTie', yaopu: 'iconShop', xunshou: 'iconFarmer',
    chefu: 'iconChe', bagong: 'iconElder', yabiao: 'iconMaster', shilian: 'iconMaster',
    chuansong: 'iconBoat', shuibing: 'iconBoat',
    xuda: 'iconXuda', lishizhen: 'iconLi', shenwansan: 'iconShen', zhangsanfeng: 'iconZhang',
    muying: 'iconMu', limengyang: 'iconClan', yushi: 'iconXuda'
  };

  var PET_SRC = { wolf: 'tiger', crane: 'water', fox: 'fox', ape: 'tiger' };

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
          if (A.imgs.grass) A.variants.dirt = A.imgs.dirtTile || tintCanvas(A.imgs.grass, 90, 50, 10, 0.38);
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
    return CLASS_SRC[cls] || 'dao';
  };

  A.classHead = function (cls) {
    var k = CLASS_HEAD[cls];
    return k && A.src[k] ? A.src[k] : A.src.headWarrior;
  };

  A.npcKey = function (id) {
    return NPC_SRC[id] || 'officer';
  };

  A.npcPortrait = function (id) {
    var k = NPC_PORTRAIT[id];
    return k && A.src[k] ? A.src[k] : A.src.portraitCun;
  };

  A.npcIcon = function (id) {
    var k = NPC_ICON[id];
    return k && A.src[k] ? A.src[k] : A.src.iconCun;
  };

  A.mobKey = function (kind) {
    return MOB_SRC[kind] || 'guard';
  };

  A.petKey = function (id) {
    return PET_SRC[id] || 'tiger';
  };

  A.tileImg = function (type) {
    if (type === 'dirt') return A.imgs.dirtTile || A.variants.dirt || A.imgs.grass;
    if (type === 'moss') return A.variants.moss || A.imgs.grass;
    if (type === 'dock') return A.variants.dock || A.imgs.stone;
    if (type === 'arena') return A.variants.arena || A.imgs.stone;
    var key = TILE_SRC[type] || 'grass';
    return A.imgs[key];
  };

  A.drawTile = function (ctx, type, sx, sy, size, time, tx, ty, grid, mapId) {
    var Gnd = root.GroundPaint;
    if (Gnd && Gnd.paintTile) {
      Gnd.paintTile(ctx, type, sx, sy, size, time, tx, ty, mapId);
    } else {
      ctx.fillStyle = type === 'water' ? '#2a5a7a' : type === 'stone' ? '#8a8680' : '#4d7a3e';
      ctx.fillRect(sx, sy, size + 1, size + 1);
    }
    if (type === 'wall' || type === 'rock') {
      ctx.fillStyle = 'rgba(20,16,12,0.28)';
      ctx.fillRect(sx, sy, size + 1, size + 1);
    }
  };

  A.drawProp = function (ctx, type, sx, sy, size) {
    if (type === 'tree') {
      ctx.fillStyle = '#4a2c14';
      ctx.fillRect(sx + size * 0.42, sy + size * 0.35, size * 0.16, size * 0.55);
      ctx.fillStyle = '#2f6b38';
      ctx.beginPath();
      ctx.arc(sx + size * 0.5, sy + size * 0.28, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3d8548';
      ctx.beginPath();
      ctx.arc(sx + size * 0.38, sy + size * 0.18, size * 0.26, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (type === 'house' || type === 'roof') {
      if (type === 'roof') return;
      ctx.fillStyle = '#8b3a32';
      ctx.fillRect(sx + 4, sy + size * 0.28, size - 8, size * 0.7);
      ctx.fillStyle = '#c45c48';
      ctx.beginPath();
      ctx.moveTo(sx + size * 0.08, sy + size * 0.32);
      ctx.lineTo(sx + size * 0.5, sy - size * 0.18);
      ctx.lineTo(sx + size * 0.92, sy + size * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(sx + size * 0.46, sy - size * 0.16, 3, size * 0.48);
    }
  };

  function billboard(ctx, img, x, y, w, h, flip, bob, lean) {
    if (!img) return false;
    ctx.save();
    ctx.translate(x, y + (bob || 0));
    ctx.rotate(lean || 0);
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
    var moving = !!p._moving;
    var bob = Math.sin(time * (moving ? 11 : 2.2)) * (moving ? 3.2 : 0.7);
    var lean = moving ? Math.sin(time * 11) * 0.08 : 0;
    var ride = p.mount && p.mount.riding;
    A.drawAura(ctx, screen.x, screen.y, ride ? 'rgba(255,170,70,0.62)' : 'rgba(90,210,255,0.5)', time, ride ? 1.15 : 1);
    if (!billboard(ctx, img, screen.x, screen.y + (ride ? 4 : 10), 48, 96, flip, bob - (ride ? 8 : 0), lean)) {
      return false;
    }
    return true;
  };

  A.drawNpc = function (ctx, n, screen, time) {
    A.drawAura(ctx, screen.x, screen.y, 'rgba(255,210,80,0.4)', time, 0.85);
    var img = A.imgs[A.npcKey(n.id)] || A.imgs.officer;
    billboard(ctx, img, screen.x, screen.y + 8, 48, 96, false, Math.sin(time * 2) * 0.6, 0);
    if (n.questMark) {
      ctx.fillStyle = n.questMark === '?' ? '#6fdf7a' : '#ffd36a';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.questMark === '?' ? '？' : '！', screen.x, screen.y - 58);
    }
    A.drawNameplate(ctx, screen.x, screen.y + 18, n.title || '', n.name, '#7dff7a');
  };

  A.drawMob = function (ctx, e, screen, time) {
    var key = A.mobKey(e.kind);
    var img = A.imgs[key];
    var scale = e.boss ? 1.35 : 1;
    var w = (key === 'tiger' || key === 'fox' ? 56 : 48) * scale;
    var h = (key === 'tiger' ? 88 : 96) * scale;
    A.drawAura(ctx, screen.x, screen.y, e.boss ? 'rgba(255,80,40,0.45)' : 'rgba(80,20,20,0.3)', time, scale);
    billboard(ctx, img, screen.x, screen.y + 8, w, h, Math.cos(e.facing || 0) < 0, Math.sin(time * 6 + e.x) * 1.2, 0);
    return !!img;
  };

  A.drawPet = function (ctx, pet, screen, time) {
    var img = A.imgs[A.petKey(pet.id)] || A.imgs.tiger;
    A.drawAura(ctx, screen.x, screen.y, 'rgba(160,200,255,0.35)', time, 0.7);
    billboard(ctx, img, screen.x, screen.y + 6, 40, 56, false, Math.sin(time * 7) * 1, 0);
    A.drawNameplate(ctx, screen.x, screen.y + 14, '', pet.name, '#c8e6ff');
  };

  A.drawCart = function (ctx, screen) {
    if (A.imgs.cart) {
      ctx.drawImage(A.imgs.cart, screen.x - 28, screen.y - 36, 56, 48);
      return;
    }
    ctx.fillStyle = '#6a3a18';
    ctx.fillRect(screen.x - 18, screen.y - 8, 36, 16);
  };

  root.Art = A;
})(typeof window !== 'undefined' ? window : global);
