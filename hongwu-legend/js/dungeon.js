/**
 * 大明传说 — 副本、押镖、英雄试炼
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.inInstance = function () {
    return !!(D.MAP_META[G.mapId] && D.MAP_META[G.mapId].instance);
  }

  H.dungeonDay = function () {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  H.ensureDungeon = function (p) {
    p.dungeon = p.dungeon || { day: '', poyang: 0, tower: 0 };
    var day = H.dungeonDay();
    if (p.dungeon.day !== day) {
      p.dungeon = { day: day, poyang: 0, tower: 0, fish: 0, treasure: 0, arena: 0, mentor: 0, jingxin: 0, palace: 0, pagoda: 0 };
    }
    ['fish', 'treasure', 'arena', 'mentor', 'jingxin', 'palace', 'pagoda'].forEach(function (k) {
      p.dungeon[k] = p.dungeon[k] || 0;
    });
    if (!p.towerUnlock) p.towerUnlock = 1;
  }

  H.canEnterDungeon = function (id) {
    var p = G.player;
    var spec = D.INSTANCES[id];
    if (!spec) return false;
    H.ensureDungeon(p);
    if (p.level < (spec.minLevel || 1)) {
      H.toast('等级不足 ' + spec.minLevel + ' 级');
      return false;
    }
    if (spec.daily) {
      var cap = H.dungeonDaily ? H.dungeonDaily(id) : spec.daily;
      if ((p.dungeon[id] || 0) >= cap) {
        H.toast('你今天的挑战次数已满');
        return false;
      }
    }
    return true;
  }

  H.useDungeon = function (id) {
    H.ensureDungeon(G.player);
    G.player.dungeon[id] = (G.player.dungeon[id] || 0) + 1;
  }

  H.hideFloorClear = function () {
    var el = document.getElementById('floor-clear');
    if (el) el.hidden = true;
    G.hold = false;
  }

  H.leaveInstance = function () {
    H.hideFloorClear();
    G.escort = null;
    G.towerAuto = false;
    var from = G.mapId;
    G.instance = null;
    var land = (D.CAPITAL_LAND) || {};
    var tx = (land.center && land.center[0]) || 110;
    var ty = (land.center && land.center[1]) || 83;
    if (from === 'poyang') { tx = (land.shuibing && land.shuibing[0]) || 124; ty = (land.shuibing && land.shuibing[1]) || 63; }
    else if (from === 'tower') { tx = (land.shilian && land.shilian[0]) || 124; ty = (land.shilian && land.shilian[1]) || 59; }
    else if (from === 'road') { tx = (land.yabiao && land.yabiao[0]) || 111; ty = (land.yabiao && land.yabiao[1]) || 38; }
    else if (from === 'fish' || from === 'treasure' || from === 'arena') { tx = (land.muying && land.muying[0]) || 124; ty = (land.muying && land.muying[1]) || 55; }
    else if (from === 'mentor') { tx = (land.limengyang && land.limengyang[0]) || 135; ty = (land.limengyang && land.limengyang[1]) || 101; }
    if (from === 'treasure') H.settleTreasure();
    if (from === 'jingxin' || from === 'palace' || from === 'pagoda') {
      H.travel('kaifeng', 73, 81);
    } else {
      H.travel('capital', tx, ty);
    }
    H.toast('离开副本');
  }

  H.spawnAt = function (kind, tx, ty, lv) {
    var pos = H.snapWalkable((tx + 0.5) * TILE, (ty + 0.5) * TILE);
    return H.spawnOne(kind, pos.x, pos.y, lv);
  }

  H.poyangLevel = function () {
    var id = G.instance && G.instance.diff;
    var diffs = (D.INSTANCES.poyang && D.INSTANCES.poyang.diffs) || [];
    for (var i = 0; i < diffs.length; i++) if (diffs[i].id === id) return diffs[i].lv;
    return 10;
  }

  H.spawnPoyangWave = function () {
    var lv = H.poyangLevel();
    [[6, 16], [8, 17], [10, 15], [12, 18], [7, 19], [11, 16]].forEach(function (xy) {
      H.spawnAt('sailor', xy[0], xy[1], lv);
    });
    [[16, 18], [18, 16], [17, 20]].forEach(function (xy) {
      H.spawnAt('xianfeng', xy[0], xy[1], lv + 1);
    });
    [[22, 8], [24, 9], [26, 8], [28, 10], [23, 11]].forEach(function (xy) {
      H.spawnAt('gongshou', xy[0], xy[1], lv);
    });
    H.spawnAt('fujiang', 34, 18, lv + 2);
    H.spawnAt('fujiang', 36, 20, lv + 2);
    H.spawnAt('lake_boss', 40, 20, lv + 4);
  }

  H.enterPoyang = function (diffId) {
    if (!H.canEnterDungeon('poyang')) return;
    var diffs = D.INSTANCES.poyang.diffs;
    var spec = diffs[0];
    diffs.forEach(function (d) { if (d.id === diffId) spec = d; });
    H.useDungeon('poyang');
    G.instance = { id: 'poyang', diff: spec.id, left: D.INSTANCES.poyang.duration };
    H.closeDialog();
    H.closePanels();
    H.travel('poyang', 4, 18);
    H.log('开始挑战鄱阳湖大战 · ' + spec.name + '难度');
    H.toast('鄱阳湖大战 · ' + spec.name + '　半个时辰内了结');
    if (H.addActivity) H.addActivity(10);
  }

  H.enterTower = function (floor, auto) {
    if (!H.canEnterDungeon('tower')) return;
    H.ensureDungeon(G.player);
    floor = floor || G.player.towerUnlock || 1;
    if (floor > (G.player.towerUnlock || 1)) { H.toast('本关卡尚未开通'); return; }
    H.useDungeon('tower');
    G.instance = { id: 'tower' };
    G.towerAuto = !!auto;
    G.towerFloor = floor;
    H.closeDialog();
    H.closePanels();
    H.hideFloorClear();
    H.travel('tower', 12, 20);
    H.log('开始挑战大明英雄副本 第 ' + floor + ' 关');
    if (H.addActivity) H.addActivity(10);
  }

  H.startEscort = function () {
    var p = G.player;
    if (p.level < 8) { H.toast('等级不足 8 级'); return; }
    if (!H.paySilver(20, 'unbind', '押金需 20 两不绑定银两')) return;
    G.escort = { hp: 220, maxHp: 220, x: 4 * TILE, y: 11 * TILE, t: 0, spawn: 0 };
    G.instance = { id: 'road' };
    H.travel('road', 3, 11);
    H.log('护送军资出发，沿官道向东。');
    H.closeDialog();
  }

  H.startTowerFloor = function (n) {
    G.towerFloor = n;
    G.entities = [];
    G.towerDmg = 0;
    G.towerT0 = G.time;
    var count = 3 + Math.floor(n / 2);
    for (var i = 0; i < count; i++) {
      H.spawnOne('tower', H.rand(6, 20) * TILE, H.rand(6, 20) * TILE, 8 + n * 2);
    }
    if (n % 5 === 0) {
      var boss = H.spawnOne('tower', 13 * TILE, 12 * TILE, 10 + n * 2);
      boss.boss = true;
      boss.name = '本关守将';
    }
    G.waveLeft = G.entities.length;
    G.hold = false;
    H.toast('大明英雄副本 第 ' + n + ' 关');
  }

  H.onTowerKill = function () {
    if (G.entities.length !== 0) return;
    if (G.towerFloor >= 5) G.player.flags.tower5 = true;
    H.questCheck();
    G.player.towerUnlock = Math.max(G.player.towerUnlock || 1, G.towerFloor + 1);
    if (G.towerFloor % 5 === 0) H.addItem(G.player, { id: 'hero_pack', n: 1, bind: true });
    if (G.towerFloor >= 10) {
      H.toast('您已通关所有关卡');
      H.showFloorClear(true);
      return;
    }
    if (G.towerAuto) {
      var cost = D.INSTANCES.tower.autoCost || 5;
      if (!H.paySilver(cost, 'preferBind', '银两不足，自动闯关停止')) {
        H.showFloorClear(false);
        return;
      }
      H.startTowerFloor(G.towerFloor + 1);
      return;
    }
    H.showFloorClear(false);
  }

  H.showFloorClear = function (done) {
    G.hold = true;
    G.player.auto = false;
    G.player.target = null;
    G.dest = null;
    G.path = [];
    var el = document.getElementById('floor-clear');
    var text = document.getElementById('floor-clear-text');
    if (!el) return;
    var used = Math.max(0, G.time - (G.towerT0 || G.time));
    var hp = Math.floor(G.towerDmg || 0);
    if (text) {
      text.textContent = (done ? '您已通关所有关卡。' : '第 ' + G.towerFloor + ' 关挑战成功。') +
        '通关用时 ' + Math.floor(used) + ' 秒，总损血量 ' + hp + '。' +
        (done ? '' : '可继续挑战，或休息一下下次从下一关进入。');
    }
    var cont = el.querySelector('[data-floor="continue"]');
    if (cont) cont.hidden = !!done;
    el.hidden = false;
  }

  H.continueTower = function () {
    H.hideFloorClear();
    H.startTowerFloor(G.towerFloor + 1);
  }

  H.tickInstance = function (dt) {
    if (!G.instance || G.hold) return;
    if (G.instance.left == null) return;
    G.instance.left -= dt;
    if (G.instance.left <= 0) {
      G.instance.left = 0;
      H.toast('副本时间已到，地图关闭');
      H.leaveInstance();
    }
  }

  H.refreshInstanceHud = function () {
    var el = document.getElementById('instance-hud');
    if (!el) return;
    var on = H.inInstance();
    el.hidden = !on;
    if (!on) return;
    var spec = D.INSTANCES[G.mapId] || {};
    var title = document.getElementById('instance-title');
    var info = document.getElementById('instance-info');
    if (title) title.textContent = spec.name || (D.MAP_META[G.mapId] && D.MAP_META[G.mapId].name) || '副本';
    if (!info) return;
    if (G.mapId === 'poyang' && G.instance) {
      var left = Math.max(0, Math.floor(G.instance.left || 0));
      var m = Math.floor(left / 60), s = left % 60;
      var diff = G.instance.diff || '';
      var dname = '';
      (spec.diffs || []).forEach(function (d) { if (d.id === diff) dname = d.name; });
      info.textContent = (dname ? dname + '难度　' : '') + '剩余 ' + m + ':' + (s < 10 ? '0' : '') + s +
        '　敌军 ' + G.entities.length;
    } else if (G.mapId === 'tower') {
      info.textContent = '第 ' + (G.towerFloor || 1) + ' 关　剩余怪物 ' + G.entities.length;
    } else if (G.mapId === 'road' && G.escort) {
      info.textContent = '护送中　镖车生命 ' + Math.floor(G.escort.hp) + '/' + G.escort.maxHp;
    } else if (G.mapId === 'fish' && G.instance) {
      var lf = Math.max(0, Math.floor(G.instance.left || 0));
      info.textContent = '剩余 ' + Math.floor(lf / 60) + ':' + ((lf % 60) < 10 ? '0' : '') + (lf % 60) +
        '　敌军 ' + G.entities.length;
    } else if (G.mapId === 'treasure' && G.instance) {
      var lt = Math.max(0, Math.floor(G.instance.left || 0));
      info.textContent = '剩余 ' + Math.floor(lt / 60) + ':' + ((lt % 60) < 10 ? '0' : '') + (lt % 60) +
        '　积分符 ' + H.countItem(G.player, 'treasure_pt');
    } else if (G.mapId === 'arena') {
      info.textContent = '校场　积分 ' + (G.player.arenaScore || 0) + '　教头 ' + G.entities.length;
    } else if (G.mapId === 'mentor' && G.instance) {
      var lm = Math.max(0, Math.floor(G.instance.left || 0));
      info.textContent = '同心　剩余 ' + Math.floor(lm / 60) + ':' + ((lm % 60) < 10 ? '0' : '') + (lm % 60) +
        '　敌人 ' + G.entities.length;
    } else if (G.mapId === 'jingxin' || G.mapId === 'palace' || G.mapId === 'pagoda') {
      var spec2 = D.INSTANCES[G.mapId] || {};
      var wave = (G.instance && G.instance.wave) || 1;
      var total = (spec2.seq || []).length;
      var lf2 = G.instance && G.instance.left != null ? Math.max(0, Math.floor(G.instance.left)) : 0;
      info.textContent = '第 ' + wave + '/' + total + ' 关　敌军 ' + G.entities.length +
        (G.instance && G.instance.left != null
          ? ('　剩余 ' + Math.floor(lf2 / 60) + ':' + ((lf2 % 60) < 10 ? '0' : '') + (lf2 % 60))
          : '');
    } else {
      info.textContent = '副本中';
    }
  }

  H.enterSeqDungeon = function (id, tx, ty) {
    var spec = D.INSTANCES[id];
    if (!spec) return;
    if (!H.canEnterDungeon(id)) return;
    H.useDungeon(id);
    G.instance = { id: id, left: spec.duration, wave: 1 };
    H.closeDialog();
    H.closePanels();
    H.travel(id, tx, ty);
    H.log('进入' + spec.name + '。原作建议三人组队，学习服可单人。');
    H.toast(spec.name + '　第 1 关');
    if (H.addActivity) H.addActivity(12);
  }

  H.enterJingxin = function () { H.enterSeqDungeon('jingxin', 6, 12); };
  H.enterPalace = function () { H.enterSeqDungeon('palace', 6, 10); };
  H.enterPagoda = function () { H.enterSeqDungeon('pagoda', 6, 14); };

  H.spawnSeqWave = function (id) {
    var spec = D.INSTANCES[id];
    if (!spec || !spec.seq || !G.instance) return;
    var wave = G.instance.wave || 1;
    var kind = spec.seq[wave - 1];
    if (!kind) return;
    var def = D.MONSTERS[kind];
    var lv = Math.max(def && def.level || 10, (G.player && G.player.level) || 10);
    var e = H.spawnAt(kind, 16, 12, lv);
    if (e && wave === spec.seq.length) e.boss = true;
    if (wave > 1) {
      H.spawnPack(kind === 'pagoda_king' ? 'pagoda_monk' : (id === 'palace' ? 'bandit' : 'sailor'), 2, Math.max(8, lv - 4));
    }
  }

  H.onSeqDungeonKill = function () {
    var id = G.mapId;
    var spec = D.INSTANCES[id];
    if (!spec || !spec.seq || !G.instance) return;
    var left = G.entities.filter(function (e) { return e.hp > 0; });
    if (left.length) return;
    var wave = G.instance.wave || 1;
    if (wave >= spec.seq.length) {
      if (id === 'jingxin') G.player.flags.jingxin_clear = true;
      if (id === 'palace') G.player.flags.palace_clear = true;
      if (id === 'pagoda') G.player.flags.pagoda_clear = true;
      if (H.questCheck) H.questCheck();
      if (spec.lottery && spec.lottery.length) {
        var lid = spec.lottery[H.irand(0, spec.lottery.length - 1)];
        H.addItem(G.player, { id: lid, n: 1, bind: true });
        H.toast('过关抽奖：' + H.itemName({ id: lid, bind: true }));
      } else H.toast('通关 ' + spec.name);
      H.log('通关 ' + spec.name);
      return;
    }
    G.instance.wave = wave + 1;
    H.spawnSeqWave(id);
    H.toast(spec.name + '　第 ' + G.instance.wave + ' 关');
  }

})(window.Hongwu);
