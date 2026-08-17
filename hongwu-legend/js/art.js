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
      jingCheng: 'assets/ingame/map/jing_cheng.jpg',
      kaiFeng: 'assets/ingame/map/kai_feng.jpg',
      pingJiang: 'assets/ingame/map/ping_jiang.jpg',
      quanZhou: 'assets/ingame/map/quan_zhou.jpg',
      zheDong: 'assets/ingame/map/zhe_dong.jpg',
      xiLiang: 'assets/ingame/map/xi_liang.jpg',
      taiPing: 'assets/ingame/map/xin_shou_cun.png',
      hengJian: 'assets/ingame/map/heng_jian_shan.png',
      shenNong: 'assets/ingame/map/shen_nong_jia.png',
      poYang: 'assets/ingame/map/po_yang_hu.png',
      xingHua: 'assets/ingame/map/xing_hua_ling.png',
      anNan: 'assets/ingame/map/an_nan.png',
      daMo: 'assets/ingame/map/da_mo.png',
      tuMu: 'assets/ingame/map/tu_mu_bao.png',
      jingJi: 'assets/ingame/map/jing_ji_chang.png',
      bottle: 'assets/ingame/ui/bottle.png',
      incense: 'assets/ingame/sprites/incense.png',
      dmgRed: 'assets/ingame/viewui/dmg-red.png',
      dmgGold: 'assets/ingame/viewui/dmg-gold.png',
      roleBg: 'assets/ingame/ui/rolebg.png',
      jiaoseBg: 'assets/ingame/ui/jiaosebg.png',
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

  A.ROLE_SHEET = {
    cellW: 104, cellH: 132, cols: 6, rows: 26,
    row: { stand: 0, walk: 5, attack: 10, arrow: 15, cast: 20, sit: 25 },
    frames: { stand: 6, walk: 6, attack: 6, arrow: 6, cast: 6, sit: 1 }
  };
  A.MOUNT_SHEET = {
    cellW: 104, cellH: 112, cols: 6, rows: 10,
    row: { stand: 0, walk: 5 },
    frames: { stand: 3, walk: 6 }
  };
  A.FASHION_IDS = ['plain', 'ink', 'gold', 'crimson'];
  ['m', 'f'].forEach(function (g) {
    A.FASHION_IDS.forEach(function (fid) {
      A.src['body_' + g + '_' + fid] = 'assets/ingame/role/body_' + g + '_' + fid + '.png';
    });
    A.src['mount_' + g] = 'assets/ingame/role/mount_' + g + '.png';
  });

  (function registerOriginalArt() {
    var D = root.GameData;
    if (!D) return;
    function add(key, src) {
      if (key && src && !A.src[key]) A.src[key] = src;
    }
    var art = D.NPC_ART || {};
    Object.keys(art).forEach(function (id) {
      var n = art[id];
      if (!n) return;
      if (n.job != null) add('stand_' + n.job, 'assets/ingame/npc-stand/job_' + n.job + '.png');
      if (n.icon) {
        add('portrait_' + n.icon, 'assets/ingame/portrait/' + n.icon + '.png');
        add('icon_' + n.icon, 'assets/ingame/icon/' + n.icon + '.png');
      }
    });
    var items = D.ITEM_ART || {};
    Object.keys(items).forEach(function (id) {
      var stem = items[id];
      if (stem) add('item_' + stem, 'assets/ingame/items/' + stem + '.png');
    });
    ['dao', 'gong', 'shan', 'zhan', 'hongyao', 'lanyao', 'baoguo', 'lingzhi'].forEach(function (stem) {
      add('item_' + stem, 'assets/ingame/items/' + stem + '.png');
    });
  })();

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
    shuibing: 'guard', chuansong: 'wanderer', jingtie: 'smith', xiaoqi: 'smith', xiaoba: 'smith',
    xuda: 'officer', lishizhen: 'healer', shenwansan: 'elder', zhangsanfeng: 'elder',
    muying: 'guard', limengyang: 'officer', yuelao: 'elder', yushi: 'officer',
    shichang: 'smith', yufu: 'wanderer', baoku: 'guard', jiaochang: 'dao', tongxin: 'elder',
    jinwei: 'guard', changyuchun: 'guard', nanguan: 'guard', xiguan: 'guard', tangbohu: 'wanderer',
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
    shenwansan: 'portraitShen', jingtie: 'portraitCun', jingzhishi: 'portraitCun', jinwei: 'portraitXuda'
  };

  var NPC_ICON = {
    cunzheng: 'iconCun', tiesmith: 'iconTie', yaopu: 'iconShop', xunshou: 'iconFarmer',
    chefu: 'iconChe', bagong: 'iconElder', yabiao: 'iconMaster', shilian: 'iconMaster',
    chuansong: 'iconBoat', shuibing: 'iconBoat', jingtie: 'iconTie',
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

  A.heroGender = function (p) {
    return p && p.gender === 'f' ? 'f' : 'm';
  };

  A.heroFashion = function (p) {
    var id = (p && p.fashionId) || 'plain';
    return A.FASHION_IDS.indexOf(id) >= 0 ? id : 'plain';
  };

  A.heroSheetKey = function (p) {
    if (p && p.mount && p.mount.riding) return 'mount_' + A.heroGender(p);
    return 'body_' + A.heroGender(p) + '_' + A.heroFashion(p);
  };

  A.heroSheetSrc = function (gender, fashionId) {
    var g = gender === 'f' ? 'f' : 'm';
    var f = A.FASHION_IDS.indexOf(fashionId) >= 0 ? fashionId : 'plain';
    return A.src['body_' + g + '_' + f];
  };

  A.heroDir = function (facing) {
    var oct = Math.round((facing || 0) / (Math.PI / 4));
    oct = ((oct % 8) + 8) % 8;
    var tab = [
      [2, 0], [3, 0], [4, 0], [3, 1],
      [2, 1], [1, 1], [0, 0], [1, 0]
    ];
    return { d: tab[oct][0], flip: tab[oct][1] };
  };

  A.heroDirIso = function (facing) {
    return A.heroDir((facing || 0) + Math.PI / 4);
  };

  A.heroAction = function (p) {
    if (p && p.mount && p.mount.riding) return p._moving ? 'walk' : 'stand';
    if (p && p.sit) return 'sit';
    if (p && p.atkCd > 0.04) {
      if (p.cls === 'archer') return 'arrow';
      if (p.cls === 'wanderer' || p.cls === 'healer') return 'cast';
      return 'attack';
    }
    return p && p._moving ? 'walk' : 'stand';
  };

  A.heroFrame = function (p, time, iso) {
    var ride = !!(p && p.mount && p.mount.riding);
    var sheet = ride ? A.MOUNT_SHEET : A.ROLE_SHEET;
    var act = A.heroAction(p);
    var dir = iso ? A.heroDirIso(p && p.facing) : A.heroDir(p && p.facing);
    var nfr = sheet.frames[act] || 1;
    var fr = 0;
    if (act === 'sit') {
      dir = { d: 0, flip: dir.flip };
    } else if (act === 'attack' || act === 'arrow' || act === 'cast') {
      fr = Math.min(nfr - 1, Math.floor((1 - Math.min(1, (p.atkCd || 0) / 0.55)) * nfr));
    } else if (act === 'walk') {
      fr = Math.floor((time || 0) * 9) % nfr;
    } else {
      fr = Math.floor((time || 0) * 2.2) % nfr;
    }
    return {
      key: A.heroSheetKey(p),
      col: fr,
      row: (sheet.row[act] || 0) + dir.d,
      cols: sheet.cols,
      rows: sheet.rows,
      cellW: sheet.cellW,
      cellH: sheet.cellH,
      flip: !!dir.flip,
      ride: ride,
      act: act
    };
  };

  A.classHead = function (cls) {
    var k = CLASS_HEAD[cls];
    return k && A.src[k] ? A.src[k] : A.src.headWarrior;
  };

  A.npcArt = function (id) {
    var D = root.GameData;
    return (D && D.NPC_ART && D.NPC_ART[id]) || null;
  };

  A.npcKey = function (id) {
    var n = A.npcArt(id);
    if (n) {
      if (A.imgs['stand_' + n.job]) return 'stand_' + n.job;
      if (A.imgs['portrait_' + n.icon]) return 'portrait_' + n.icon;
      if (!A.ready && A.src['stand_' + n.job]) return 'stand_' + n.job;
      if (A.src['portrait_' + n.icon]) return 'portrait_' + n.icon;
    }
    return NPC_SRC[id] || 'officer';
  };

  A.npcPortrait = function (id) {
    var n = A.npcArt(id);
    if (n && n.icon && A.src['portrait_' + n.icon]) return A.src['portrait_' + n.icon];
    var k = NPC_PORTRAIT[id];
    return k && A.src[k] ? A.src[k] : A.src.portraitCun;
  };

  A.npcIcon = function (id) {
    var n = A.npcArt(id);
    if (n && n.icon && A.src['icon_' + n.icon]) return A.src['icon_' + n.icon];
    var k = NPC_ICON[id];
    return k && A.src[k] ? A.src[k] : A.src.iconCun;
  };

  var WEAPON_STEM = { warrior: 'dao', archer: 'gong', wanderer: 'shan', healer: 'zhan' };

  A.weaponClass = function (it) {
    if (!it) return '';
    if (it.cls && WEAPON_STEM[it.cls]) return it.cls;
    var D = root.GameData;
    var names = D && D.EQUIP_NAMES && D.EQUIP_NAMES.weapon;
    if (!names || !it.name) return '';
    var cls, arr;
    for (cls in names) {
      if (!Object.prototype.hasOwnProperty.call(names, cls)) continue;
      arr = names[cls];
      if (arr && arr.indexOf(it.name) >= 0) return cls;
    }
    return '';
  };

  A.itemStem = function (it) {
    if (!it) return '';
    var D = root.GameData;
    var art = (D && D.ITEM_ART) || {};
    if (it.id && art[it.id]) return art[it.id];
    if (it.type === 'equip' && it.slot === 'weapon') {
      return WEAPON_STEM[A.weaponClass(it)] || art.slot_weapon || 'dao';
    }
    if (it.type === 'equip' && it.slot && art['slot_' + it.slot]) return art['slot_' + it.slot];
    if (it.type === 'gem') return art.gem || 'lingshi';
    if (it.type === 'mount') return art.mount_token || 'zuoqitisupai';
    return '';
  };

  A.itemIcon = function (it) {
    var stem = A.itemStem(it);
    return stem ? 'assets/ingame/items/' + stem + '.png' : '';
  };

  A.itemImage = function (it) {
    var stem = A.itemStem(it);
    return stem ? (A.imgs['item_' + stem] || null) : null;
  };

  A.spriteBox = function (key, img) {
    if (key && String(key).indexOf('stand_') === 0) {
      var sh = 78;
      var sw = img && img.height ? sh * img.width / img.height : 36;
      return { w: sw, h: sh };
    }
    if (key && String(key).indexOf('portrait_') === 0) {
      return { w: 46, h: 46 };
    }
    return { w: 48, h: 96 };
  };

  A.mobKey = function (kind) {
    return MOB_SRC[kind] || 'guard';
  };

  A.petKey = function (id) {
    return PET_SRC[id] || 'tiger';
  };

  var RADAR_SRC = {
    capital: 'jingCheng',
    kaifeng: 'kaiFeng',
    pingjiang: 'pingJiang',
    quanzhou: 'quanZhou',
    zhedong: 'zheDong',
    xiliang: 'xiLiang',
    taiping: 'taiPing',
    wild: 'hengJian',
    shennong: 'shenNong',
    boyang: 'poYang',
    poyang: 'poYang',
    xinghua: 'xingHua',
    annan: 'anNan',
    desert: 'daMo',
    tumu: 'tuMu',
    arena: 'jingJi'
  };

  A.radarFor = function (mapId) {
    var key = RADAR_SRC[mapId];
    if (key && A.imgs[key]) return A.imgs[key];
    return A.imgs.radar || null;
  };

  A.cityRadar = function (mapId) {
    var img = A.radarFor(mapId);
    if (!img || img === A.imgs.radar) return null;
    return img;
  };

  var DMG_GLYPHS = '-0123456789';

  A.drawDamage = function (ctx, text, x, y, gold) {
    var raw = String(text);
    if (gold == null) gold = /暴/.test(raw);
    var img = gold ? (A.imgs.dmgGold || A.imgs.dmgRed) : (A.imgs.dmgRed || A.imgs.dmgGold);
    if (!img || !img.width) return false;
    var str = raw.replace(/[^0-9+\-]/g, '');
    var cw = img.width / 11;
    var ch = img.height;
    var i, idx, w = 0;
    for (i = 0; i < str.length; i++) {
      if (DMG_GLYPHS.indexOf(str[i]) >= 0) w += cw * 0.9;
    }
    if (!w) return false;
    var sx = x - w / 2;
    var sy = y - ch;
    for (i = 0; i < str.length; i++) {
      idx = DMG_GLYPHS.indexOf(str[i]);
      if (idx < 0) continue;
      ctx.drawImage(img, idx * cw, 0, cw, ch, sx, sy, cw, ch);
      sx += cw * 0.9;
    }
    return true;
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

  A.houseStyle = function (mapId, x, y) {
    var n = Math.sin((x + 0.37) * 12.9898 + (y + 1.1) * 78.233) * 43758.5453;
    n -= Math.floor(n);
    if (mapId === 'capital') return n < 0.26 ? 'palace' : 'town';
    if (mapId === 'kaifeng' || mapId === 'pagoda') return n < 0.14 ? 'palace' : 'town';
    return 'village';
  };

  A.blossomAt = function (mapId, x, y) {
    if (mapId !== 'capital' && mapId !== 'kaifeng') return false;
    var n = Math.sin((x + 2.1) * 9.1 + y * 4.7) * 23421.3;
    n -= Math.floor(n);
    return n < 0.18;
  };

  A.drawProp = function (ctx, type, sx, sy, size, mapId, tx, ty) {
    if (type === 'tree') {
      ctx.fillStyle = '#4a2c14';
      ctx.fillRect(sx + size * 0.42, sy + size * 0.35, size * 0.16, size * 0.55);
      ctx.fillStyle = A.blossomAt(mapId, tx || 0, ty || 0) ? '#d48aa0' : '#2f6b38';
      ctx.beginPath();
      ctx.arc(sx + size * 0.5, sy + size * 0.28, size * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = A.blossomAt(mapId, tx || 0, ty || 0) ? '#e8b4c4' : '#3d8548';
      ctx.beginPath();
      ctx.arc(sx + size * 0.38, sy + size * 0.18, size * 0.26, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (type === 'house' || type === 'roof') {
      if (type === 'roof') return;
      var st = A.houseStyle(mapId, tx || 0, ty || 0);
      var wall = st === 'town' ? '#c4bba8' : (st === 'village' ? '#8a6a4e' : '#8b3a32');
      var roof = st === 'town' ? '#2a5864' : (st === 'village' ? '#3a3834' : '#c9a227');
      var ridge = st === 'palace' ? '#e2c36a' : '#1a3038';
      ctx.fillStyle = wall;
      ctx.fillRect(sx + 4, sy + size * 0.28, size - 8, size * 0.7);
      ctx.fillStyle = roof;
      ctx.beginPath();
      ctx.moveTo(sx + size * 0.08, sy + size * 0.32);
      ctx.lineTo(sx + size * 0.5, sy - size * 0.18);
      ctx.lineTo(sx + size * 0.92, sy + size * 0.32);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = ridge;
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
    var fr = A.heroFrame(p, time, false);
    var img = A.imgs[fr.key];
    var ride = fr.ride;
    A.drawAura(ctx, screen.x, screen.y, ride ? 'rgba(255,170,70,0.62)' : 'rgba(90,210,255,0.5)', time, ride ? 1.15 : 1);
    if (img && img.width) {
      var dw = ride ? 70 : 64;
      var dh = ride ? 76 : 82;
      ctx.save();
      ctx.translate(screen.x, screen.y + (ride ? 4 : 10));
      if (fr.flip) ctx.scale(-1, 1);
      ctx.drawImage(img, fr.col * fr.cellW, fr.row * fr.cellH, fr.cellW, fr.cellH, -dw / 2, -dh, dw, dh);
      ctx.restore();
      return true;
    }
    img = A.imgs[A.classKey(p.cls)];
    var flip = Math.cos(p.facing) < 0;
    var moving = !!p._moving;
    var bob = Math.sin(time * (moving ? 11 : 2.2)) * (moving ? 3.2 : 0.7);
    var lean = moving ? Math.sin(time * 11) * 0.08 : 0;
    if (!billboard(ctx, img, screen.x, screen.y + (ride ? 4 : 10), 48, 96, flip, bob - (ride ? 8 : 0), lean)) {
      return false;
    }
    return true;
  };

  A.drawNpc = function (ctx, n, screen, time) {
    A.drawAura(ctx, screen.x, screen.y, 'rgba(255,210,80,0.4)', time, 0.85);
    var key = A.npcKey(n.id);
    var img = A.imgs[key] || A.imgs.officer;
    var box = A.spriteBox(key, img);
    billboard(ctx, img, screen.x, screen.y + 8, box.w, box.h, false, Math.sin(time * 2) * 0.6, 0);
    if (n.questMark) {
      ctx.fillStyle = n.questMark === '?' ? '#6fdf7a' : '#ffd36a';
      ctx.font = 'bold 16px serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.questMark === '?' ? '？' : '！', screen.x, screen.y - box.h + 18);
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
