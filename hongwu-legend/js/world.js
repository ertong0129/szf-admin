/**
 * 大明传说 — 地图、碰撞、传送、刷新
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.inGrid = function (g, x, y) { return y >= 0 && y < g.length && x >= 0 && x < g[0].length; }

  H.setTile = function (g, x, y, t) { if (H.inGrid(g, x, y)) g[y][x] = t; }

  H.fill = function (g, t) {
    for (var y = 0; y < g.length; y++) for (var x = 0; x < g[0].length; x++) g[y][x] = t;
  }

  H.rect = function (g, x, y, w, h, t) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) H.setTile(g, x + i, y + j, t);
  }

  H.scatter = function (g, t, n, ok) {
    var w = g[0].length, h = g.length, gds = 0;
    while (n-- > 0 && gds < 800) {
      gds++;
      var x = H.irand(1, w - 2), y = H.irand(1, h - 2);
      if (!ok || ok(g[y][x], x, y)) H.setTile(g, x, y, t);
    }
  }

  H.makeGrid = function (w, h, t) {
    var g = [];
    for (var y = 0; y < h; y++) {
      g[y] = [];
      for (var x = 0; x < w; x++) g[y][x] = t;
    }
    return g;
  }

  H.blockedTile = function (t, mapId) {
    if (t === 'wall' || t === 'tree' || t === 'house' || t === 'roof' || t === 'rock') return true;
    if (t === 'water' && mapId !== 'poyang' && mapId !== 'fish' && mapId !== 'boyang' && mapId !== 'quanzhou' && mapId !== 'zhedong') return true;
    return false;
  }

  H.buildMap = function (id) {
    var w = 50, h = 36;
    var g = H.makeGrid(w, h, 'grass');
    G.decals = [];
    if (id === 'taiping') {
      H.fill(g, 'grass');
      H.rect(g, 16, 12, 16, 12, 'dirt');
      for (var i = 0; i < 50; i++) H.setTile(g, 24, i, i > 2 && i < 34 ? 'dirt' : g[Math.min(i, h - 1)][24]);
      H.rect(g, 18, 14, 4, 3, 'house'); H.rect(g, 18, 13, 4, 1, 'roof');
      H.rect(g, 26, 14, 4, 3, 'house'); H.rect(g, 26, 13, 4, 1, 'roof');
      H.rect(g, 22, 20, 5, 3, 'house'); H.rect(g, 22, 19, 5, 1, 'roof');
      H.rect(g, 0, 30, 50, 6, 'water');
      H.scatter(g, 'tree', 36, function (t) { return t === 'grass'; });
    } else if (id === 'wild') {
      H.fill(g, 'grass');
      H.rect(g, 1, 16, 48, 4, 'dirt');
      H.scatter(g, 'tree', 70, function (t) { return t === 'grass'; });
      H.scatter(g, 'dirt', 40, function (t) { return t === 'grass'; });
      H.rect(g, 36, 22, 10, 8, 'dirt');
    } else if (id === 'shennong') {
      H.fill(g, 'moss');
      H.rect(g, 0, 0, 50, 36, 'moss');
      H.scatter(g, 'tree', 90, function (t) { return t === 'moss'; });
      H.scatter(g, 'water', 18, function (t) { return t === 'moss'; });
      H.rect(g, 20, 14, 10, 8, 'dirt');
    } else if (id === 'poyang') {
      H.fill(g, 'water');
      H.rect(g, 2, 14, 46, 8, 'dock');
      H.rect(g, 18, 6, 16, 24, 'dock');
      H.rect(g, 34, 16, 10, 10, 'house');
      H.scatter(g, 'rock', 12, function (t) { return t === 'dock'; });
    } else if (id === 'capital') {
      H.fill(g, 'stone');
      H.rect(g, 0, 0, 50, 36, 'stone');
      for (var x = 0; x < 50; x++) { H.setTile(g, x, 0, 'wall'); H.setTile(g, x, 35, 'wall'); }
      for (var y = 0; y < 36; y++) { H.setTile(g, 0, y, 'wall'); H.setTile(g, 49, y, 'wall'); }
      H.rect(g, 6, 6, 8, 6, 'house'); H.rect(g, 6, 5, 8, 1, 'roof');
      H.rect(g, 20, 8, 10, 7, 'house'); H.rect(g, 20, 7, 10, 1, 'roof');
      H.rect(g, 36, 10, 8, 6, 'house'); H.rect(g, 36, 9, 8, 1, 'roof');
      H.rect(g, 8, 18, 34, 4, 'dirt');
      H.rect(g, 22, 4, 4, 28, 'dirt');
    } else if (id === 'tower') {
      H.fill(g, 'arena');
      for (x = 0; x < 26; x++) for (y = 0; y < 26; y++) {
        if (x === 0 || y === 0 || x === 25 || y === 25) H.setTile(g, x, y, 'wall');
        else H.setTile(g, x, y, 'arena');
      }
      w = 26; h = 26;
      g = g.slice(0, 26).map(function (row) { return row.slice(0, 26); });
    } else if (id === 'road') {
      H.fill(g, 'grass');
      H.rect(g, 0, 8, 56, 6, 'dirt');
      w = 56; h = 22;
      g = H.makeGrid(56, 22, 'grass');
      H.rect(g, 0, 8, 56, 6, 'dirt');
      H.scatter(g, 'tree', 50, function (t) { return t === 'grass'; });
    } else if (id === 'fish') {
      H.fill(g, 'water');
      H.rect(g, 2, 14, 46, 8, 'dock');
      H.rect(g, 14, 8, 22, 20, 'dock');
      H.scatter(g, 'rock', 10, function (t) { return t === 'dock'; });
    } else if (id === 'treasure') {
      H.fill(g, 'stone');
      H.rect(g, 4, 4, 28, 20, 'arena');
      for (x = 0; x < 36; x++) {
        H.setTile(g, x, 0, 'wall'); H.setTile(g, x, 25, 'wall');
      }
      for (y = 0; y < 26; y++) {
        H.setTile(g, 0, y, 'wall'); H.setTile(g, 35, y, 'wall');
      }
      w = 36; h = 26;
      g = g.slice(0, 26).map(function (row) { return row.slice(0, 36); });
    } else if (id === 'arena' || id === 'mentor') {
      H.fill(g, 'arena');
      for (x = 0; x < 24; x++) for (y = 0; y < 24; y++) {
        if (x === 0 || y === 0 || x === 23 || y === 23) H.setTile(g, x, y, 'wall');
        else H.setTile(g, x, y, 'arena');
      }
      w = 24; h = 24;
      g = g.slice(0, 24).map(function (row) { return row.slice(0, 24); });
    } else if (id === 'jingxin' || id === 'palace') {
      H.fill(g, 'stone');
      for (x = 0; x < 32; x++) for (y = 0; y < 22; y++) {
        if (x === 0 || y === 0 || x === 31 || y === 21) H.setTile(g, x, y, 'wall');
        else H.setTile(g, x, y, 'arena');
      }
      H.rect(g, 10, 6, 12, 4, 'house');
      w = 32; h = 22;
      g = g.slice(0, 22).map(function (row) { return row.slice(0, 32); });
    } else if (id === 'pagoda') {
      H.fill(g, 'stone');
      for (x = 0; x < 24; x++) for (y = 0; y < 28; y++) {
        if (x === 0 || y === 0 || x === 23 || y === 27) H.setTile(g, x, y, 'wall');
        else H.setTile(g, x, y, 'arena');
      }
      H.rect(g, 8, 4, 8, 6, 'house');
      w = 24; h = 28;
      g = g.slice(0, 28).map(function (row) { return row.slice(0, 24); });
    } else {
      H.paintOverworld(g, id);
    }
    G.grid = g;
    G.mapId = id;
    H.spawnMapContent(id);
    if (window.World3D && World3D.ready) World3D.rebuild(G.grid, G.mapId);
  }

  H.paintOverworld = function (g, id) {
    var theme = (D.MAP_META[id] && D.MAP_META[id].theme) || 'grass';
    if (theme === 'water') {
      H.fill(g, 'water');
      H.rect(g, 4, 12, 42, 12, 'dock');
      H.rect(g, 16, 8, 18, 20, 'dock');
      H.scatter(g, 'rock', 10, function (t) { return t === 'dock'; });
    } else if (theme === 'city') {
      H.fill(g, 'stone');
      var x, y;
      for (x = 0; x < 50; x++) { H.setTile(g, x, 0, 'wall'); H.setTile(g, x, 35, 'wall'); }
      for (y = 0; y < 36; y++) { H.setTile(g, 0, y, 'wall'); H.setTile(g, 49, y, 'wall'); }
      H.rect(g, 8, 8, 8, 6, 'house'); H.rect(g, 8, 7, 8, 1, 'roof');
      H.rect(g, 22, 10, 10, 6, 'house'); H.rect(g, 22, 9, 10, 1, 'roof');
      H.rect(g, 36, 8, 8, 6, 'house'); H.rect(g, 36, 7, 8, 1, 'roof');
      H.rect(g, 8, 18, 34, 4, 'dirt');
      H.rect(g, 22, 4, 4, 28, 'dirt');
    } else if (theme === 'sand') {
      H.fill(g, 'dirt');
      H.rect(g, 18, 14, 14, 8, 'stone');
      H.scatter(g, 'rock', 28, function (t) { return t === 'dirt'; });
    } else if (theme === 'moss') {
      H.fill(g, 'moss');
      H.scatter(g, 'tree', 80, function (t) { return t === 'moss'; });
      H.scatter(g, 'water', 14, function (t) { return t === 'moss'; });
      H.rect(g, 20, 14, 10, 8, 'dirt');
    } else {
      H.fill(g, 'grass');
      H.rect(g, 1, 16, 48, 4, 'dirt');
      H.scatter(g, 'tree', 56, function (t) { return t === 'grass'; });
      H.scatter(g, 'dirt', 24, function (t) { return t === 'grass'; });
    }
  }

  H.worldSize = function () {
    return { w: G.grid[0].length * TILE, h: G.grid.length * TILE };
  }

  H.tileAtWorld = function (x, y) {
    var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (!H.inGrid(G.grid, tx, ty)) return 'wall';
    return G.grid[ty][tx];
  }

  H.canWalk = function (x, y) {
    return !H.blockedTile(H.tileAtWorld(x, y), G.mapId) &&
      !H.blockedTile(H.tileAtWorld(x - 6, y), G.mapId) &&
      !H.blockedTile(H.tileAtWorld(x + 6, y), G.mapId) &&
      !H.blockedTile(H.tileAtWorld(x, y - 6), G.mapId) &&
      !H.blockedTile(H.tileAtWorld(x, y + 6), G.mapId);
  }

  H.tileWalkable = function (tx, ty) {
    return H.inGrid(G.grid, tx, ty) && !H.blockedTile(G.grid[ty][tx], G.mapId);
  }

  H.snapWalkable = function (x, y) {
    if (H.canWalk(x, y)) return { x: x, y: y };
    var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (var r = 1; r <= 14; r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (H.tileWalkable(tx + dx, ty + dy)) {
            return { x: (tx + dx + 0.5) * TILE, y: (ty + dy + 0.5) * TILE };
          }
        }
      }
    }
    return { x: x, y: y };
  }

  H.setDest = function (x, y) {
    if (G.player) G.player.sit = false;
    var goal = H.snapWalkable(x, y);
    G.clickFx = { x: goal.x, y: goal.y, t: 0.7 };
    G.dest = goal;
    G.path = [];
    if (window.PathFind && G.grid) {
      var p = G.player;
      G.path = PathFind.astar(
        H.tileWalkable, G.grid[0].length, G.grid.length,
        Math.floor(p.x / TILE), Math.floor(p.y / TILE),
        Math.floor(goal.x / TILE), Math.floor(goal.y / TILE)
      );
    }
  }

  H.spawnMapContent = function (id) {
    G.entities = [];
    G.projectiles = [];
    G.drops = [];
    G.npcs = [];
    G.portals = (D.PORTALS[id] || []).map(function (p) { return Object.assign({}, p); });
    G.herbs = [];
    Object.keys(D.NPCS).forEach(function (k) {
      var n = D.NPCS[k];
      if (n.map === id) {
        var pos = H.npcPos(n.id, id);
        G.npcs.push({ id: n.id, name: n.name, title: n.title || '', x: pos.x, y: pos.y });
      }
    });
    if (id === 'poyang') {
      H.spawnPoyangWave();
    } else if (id === 'tower') {
      H.startTowerFloor(G.towerFloor || 1);
    } else if (id === 'road') {
      /* escort fills this */
    } else if (id === 'fish') {
      H.spawnPack('fishman', 8, 14);
      H.spawnPack('shark', 4, 16);
      H.spawnAt('fish_boss', 36, 18, 20);
      for (var fi = 0; fi < 10; fi++) {
        var hx = H.rand(4, 40) * TILE, hy = H.rand(8, 24) * TILE;
        if (H.canWalk(hx, hy)) G.herbs.push({ id: 'pet_stone', x: hx, y: hy });
      }
    } else if (id === 'treasure') {
      H.spawnPack('boxguard', 6, 15);
      H.spawnAt('box_boss', 24, 14, 19);
      for (var ti = 0; ti < 8; ti++) {
        var bx = H.rand(6, 28) * TILE, by = H.rand(6, 20) * TILE;
        if (H.canWalk(bx, by)) G.herbs.push({ id: 'treasure_pt', x: bx, y: by });
      }
    } else if (id === 'arena') {
      H.spawnAt('coach', 12, 12, Math.max(10, (G.player && G.player.level) || 10));
    } else if (id === 'mentor') {
      H.spawnPack('bandit', 6, 10);
      H.spawnAt('fujiang', 12, 12, 14);
    } else if (id === 'jingxin' || id === 'palace' || id === 'pagoda') {
      H.spawnSeqWave(id);
    } else {
      var packs = (D.MAP_SPAWNS && D.MAP_SPAWNS[id]) || [];
      packs.forEach(function (s) { H.spawnPack(s.kind, s.n, s.lv); });
      if (packs.length) H.scatterHerbs(id === 'shennong' ? 16 : 10);
      H.spawnFieldBosses(id);
      H.spawnWorldBoss(id);
    }
    G.fires = [];
    if (id === 'taiping') G.fires = [{ x: 24.5 * TILE, y: 18.5 * TILE }];
    if (id === 'capital') G.fires = [{ x: 24 * TILE, y: 20 * TILE }, { x: 12 * TILE, y: 20 * TILE }];
    if (id === 'capital') {
      for (var yi = 0; yi < 4; yi++) {
        var yx = H.rand(10, 40) * TILE, yy = H.rand(10, 28) * TILE;
        if (H.canWalk(yx, yy)) G.herbs.push({ id: 'yibao', x: yx, y: yy, yibao: true });
      }
    }
  }

  H.npcPos = function (id, map) {
    var table = {
      cunzheng: [19.5 * TILE, 17.6 * TILE],
      tiesmith: [28 * TILE, 17.6 * TILE],
      yaopu: [20.5 * TILE, 23.2 * TILE],
      xunshou: [24 * TILE, 16 * TILE],
      chefu: [24.5 * TILE, 5.2 * TILE],
      shanshan: [33 * TILE, 22 * TILE],
      qianzhuang: [15 * TILE, 22 * TILE],
      zhangsanfeng: [13 * TILE, 16 * TILE],
      xiaoliu: [22.5 * TILE, 20 * TILE],
      xunyang: [30 * TILE, 12 * TILE],
      jingche: [10 * TILE, 20 * TILE],
      xuda: [18 * TILE, 14 * TILE],
      bagong: [24 * TILE, 12 * TILE],
      yabiao: [32 * TILE, 20 * TILE],
      shilian: [40 * TILE, 14 * TILE],
      chuansong: [6 * TILE, 18 * TILE],
      shuibing: [36 * TILE, 22 * TILE],
      lishizhen: [28 * TILE, 26 * TILE],
      yiyi: [14 * TILE, 26 * TILE],
      shenwansan: [12 * TILE, 16 * TILE],
      jineng: [22 * TILE, 18 * TILE],
      muying: [18 * TILE, 22 * TILE],
      limengyang: [30 * TILE, 16 * TILE],
      yuelao: [34 * TILE, 12 * TILE],
      shichang: [16 * TILE, 20 * TILE],
      yushi: [26 * TILE, 16 * TILE],
      yufu: [8 * TILE, 16 * TILE],
      baoku: [8 * TILE, 12 * TILE],
      jiaochang: [6 * TILE, 12 * TILE],
      tongxin: [6 * TILE, 12 * TILE],
      liubowen: [28 * TILE, 14 * TILE],
      zhuwenzheng: [10 * TILE, 16 * TILE],
      pingzhi: [12 * TILE, 16 * TILE],
      lanyu: [12 * TILE, 18 * TILE],
      zhusu: [24 * TILE, 16 * TILE],
      zhangxiaoxiao: [14 * TILE, 22 * TILE],
      jinyi: [32 * TILE, 14 * TILE],
      tieta: [18 * TILE, 10 * TILE],
      jx_leave: [6 * TILE, 12 * TILE],
      sg_leave: [6 * TILE, 10 * TILE],
      tt_leave: [6 * TILE, 14 * TILE],
      wangyangming: [22 * TILE, 16 * TILE]
    };
    var p = table[id] || [10 * TILE, 10 * TILE];
    return { x: p[0], y: p[1] };
  }

  H.spawnPack = function (kind, n, lv) {
    var def = D.MONSTERS[kind];
    for (var i = 0; i < n; i++) {
      var tries = 0, x, y;
      do {
        x = H.rand(3, G.grid[0].length - 3) * TILE;
        y = H.rand(3, G.grid.length - 3) * TILE;
        tries++;
      } while (!H.canWalk(x, y) && tries < 40);
      H.spawnOne(kind, x, y, lv || def.level);
    }
  }

  H.spawnOne = function (kind, x, y, lv) {
    var def = D.MONSTERS[kind];
    var level = lv || def.level;
    var e = {
      uid: H.uid(), kind: kind, name: def.name, color: def.color,
      x: x, y: y, r: def.radius, speed: def.speed,
      level: level, boss: !!def.boss, magic: !!def.magic,
      hp: F.monsterHp(level, def.boss),
      maxHp: F.monsterHp(level, def.boss),
      atk: F.monsterAtk(level, def.boss),
      stun: 0, atkCd: 0, aggro: 0,
      ranged: !!def.ranged, range: def.range || 0, elite: !!def.elite,
      fieldBoss: !!def.fieldBoss, worldBoss: !!def.worldBoss, fieldId: def.fieldId || '',
      trait: def.trait || '', cloned: false, mountLoot: !!def.mountLoot
    };
    G.entities.push(e);
    return e;
  }

  H.spawnFieldBosses = function (mapId) {
    var B = window.BossLogic;
    if (!B || !H.ensureBossState) return;
    H.ensureBossState();
    B.fieldsOnMap(D, mapId).forEach(function (def) {
      if (!B.fieldAlive(G.bossState, def)) return;
      var e = H.spawnAt(def.monster, def.x, def.y, D.MONSTERS[def.monster] && D.MONSTERS[def.monster].level);
      if (e) { e.fieldBoss = true; e.fieldId = def.id; e.boss = true; }
    });
  }

  H.spawnWorldBoss = function (mapId) {
    var B = window.BossLogic;
    if (!B || !H.ensureBossState) return;
    H.ensureBossState();
    var w = G.bossState && G.bossState.world;
    if (!w || w.dead || w.map !== mapId) return;
    var already = G.entities.some(function (e) { return e.worldBoss; });
    if (already) return;
    var e = H.spawnAt(D.WORLD_BOSS.monster, 32, 18, D.WORLD_BOSS.level);
    if (e) {
      e.worldBoss = true;
      e.boss = true;
      e.hp = w.hp;
      e.maxHp = w.maxHp;
      e.name = w.name || e.name;
    }
  }

  H.scatterHerbs = function (n) {
    var kinds = ['herb_san', 'herb_wu', 'herb_fu', 'herb_ling'];
    for (var i = 0; i < n; i++) {
      var x = H.rand(2, G.grid[0].length - 2) * TILE;
      var y = H.rand(2, G.grid.length - 2) * TILE;
      if (!H.canWalk(x, y)) continue;
      G.herbs.push({ id: kinds[i % 4], x: x, y: y });
    }
  }

  H.travel = function (to, tx, ty) {
    var p = G.player;
    H.buildMap(to);
    var landed = H.snapWalkable((tx + 0.5) * TILE, (ty + 0.5) * TILE);
    p.x = landed.x;
    p.y = landed.y;
    p.target = null;
    G.dest = null;
    G.path = [];
    H.log('抵达 ' + D.MAP_META[to].name);
    if (!(D.MAP_META[to] && D.MAP_META[to].instance)) {
      G.instance = null;
      G.hold = false;
      H.hideFloorClear();
    }
    H.refreshQuestUI();
    if (H.mapOverlayOpen()) H.refreshMapOverlay();
    H.saveSilent();
    if (G.guide) {
      setTimeout(function () { H.guideStep(); }, 30);
    }
  }

  H.npcTravel = function (spec) {
    var p = G.player;
    if ((p.pkValue || 0) >= 18) { H.toast('红名不能使用车夫'); return; }
    var parts = (spec || '').split(':');
    if (parts.length < 3) return;
    H.closeDialog();
    H.travel(parts[0], +parts[1], +parts[2]);
  }

  H.tryMove = function (ent, dx, dy) {
    var stuck = !H.canWalk(ent.x, ent.y);
    var nx = ent.x + dx, ny = ent.y + dy;
    if (stuck || H.canWalk(nx, ent.y)) ent.x = nx;
    if (stuck || H.canWalk(ent.x, ny)) ent.y = ny;
    if (stuck && !H.canWalk(ent.x, ent.y)) {
      var s = H.snapWalkable(ent.x, ent.y);
      ent.x = s.x; ent.y = s.y;
    }
    var ws = H.worldSize();
    ent.x = H.clamp(ent.x, 16, ws.w - 16);
    ent.y = H.clamp(ent.y, 16, ws.h - 16);
  }

  H.showNearby = function () {
    var names = G.npcs.map(function (n) { return n.name; });
    (G.peers || []).forEach(function (o) {
      if (!o.mapId || o.mapId === G.mapId) names.push(o.name);
    });
    G.entities.slice(0, 4).forEach(function (e) { names.push(e.name); });
    H.toast('附近：' + (names.join('、') || '无人'));
  }

})(window.Hongwu);
