/* 洪武风云录 — 单机引擎 */
(function () {
  var F = window.Formulas;
  var D = window.GameData;
  var TILE = 40;
  var SAVE_KEY = 'hongwu-legend-save-v1';
  var BAG_CAP = 36;
  var SPAWN = { x: 24.5 * 40, y: 17.5 * 40 };

  var canvas = document.getElementById('world');
  var canvas3d = document.getElementById('world3d');
  var ctx = canvas.getContext('2d');
  var mini = document.getElementById('minimap');
  var mctx = mini.getContext('2d');

  var G = {
    mode: 'title',
    player: null,
    mapId: 'taiping',
    grid: null,
    decals: [],
    entities: [],
    projectiles: [],
    drops: [],
    floats: [],
    particles: [],
    npcs: [],
    portals: [],
    herbs: [],
    keys: {},
    mouse: { x: 0, y: 0, down: false, wx: 0, wy: 0 },
    cam: { x: 0, y: 0 },
    dest: null,
    guide: null,
    path: [],
    time: 0,
    last: 0,
    log: [],
    selectedClass: 'warrior',
    dialogNpc: null,
    toastT: 0,
    escort: null,
    towerFloor: 0,
    waveLeft: 0,
    hold: false,
    instance: null,
    towerAuto: false,
    towerDmg: 0,
    towerT0: 0,
    deathKind: 'village'
  };

  function uid() { return 'id' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function irand(a, b) { return Math.floor(rand(a, b + 1)); }
  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
  function dist(a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.hypot(dx, dy); }
  function ang(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

  function toast(msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    G.toastT = 2.2;
  }

  function log(msg) {
    G.log.unshift(msg);
    if (G.log.length > 30) G.log.pop();
    renderLog();
  }

  function renderLog() {
    var chat = document.getElementById('chat-log');
    if (chat) {
      chat.innerHTML = G.log.slice(0, 16).map(function (l) {
        return '<p><i>系统</i> ' + l + '</p>';
      }).join('');
    }
    var legacy = document.getElementById('log-list');
    if (legacy) legacy.innerHTML = G.log.slice(0, 8).map(function (l) { return '<p>' + l + '</p>'; }).join('');
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
  }

  function resize() {
    var host = canvas.parentElement || canvas;
    var w = host.clientWidth || canvas.clientWidth;
    var h = host.clientHeight || canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    if (canvas3d) {
      canvas3d.width = w;
      canvas3d.height = h;
    }
    if (window.World3D) World3D.resize();
  }
  window.addEventListener('resize', resize);

  /* ========== 角色 / 属性 ========== */
  function emptyEquip() {
    var e = {};
    D.SLOTS.forEach(function (s) { e[s.id] = null; });
    return e;
  }

  function makePlayer(name, cls) {
    var c = D.CLASSES[cls];
    var p = {
      name: name || '无名',
      cls: cls,
      level: 1,
      exp: 0,
      x: SPAWN.x,
      y: SPAWN.y,
      facing: 0,
      hp: 1,
      mp: 1,
      added: { str: 0, int: 0, agi: 0, spi: 0, con: 0 },
      unspentAttr: 0,
      unspentSkill: 1,
      skills: {},
      skillCd: {},
      equip: emptyEquip(),
      bag: [],
      silver: 40,
      gold: 0,
      pet: null,
      quests: { active: ['q1'], done: [], progress: {} },
      flags: {},
      buffs: [],
      auto: false,
      pkMode: 'peace',
      target: null,
      atkCd: 0,
      gatherCd: 0,
      towerUnlock: 1,
      dungeon: { day: '', poyang: 0, tower: 0 }
    };
    D.SKILLS[cls].forEach(function (s) {
      if (s.unlock <= 1) p.skills[s.id] = 1;
    });
    giveStarterGear(p);
    addItem(p, { id: 'hp1', n: 5 });
    addItem(p, { id: 'mp1', n: 3 });
    var st = stats(p);
    p.hp = st.maxHp;
    p.mp = st.maxMp;
    return p;
  }

  function giveStarterGear(p) {
    D.SLOTS.forEach(function (s) {
      p.equip[s.id] = rollEquip(s.id, 1, 'white', p.cls);
    });
  }

  function rawAttrs(p) {
    var c = D.CLASSES[p.cls];
    var a = { str: c.base.str, int: c.base.int, agi: c.base.agi, spi: c.base.spi, con: c.base.con };
    Object.keys(p.added).forEach(function (k) { a[k] += p.added[k]; });
    eachEquip(p, function (it) {
      ['str', 'int', 'agi', 'spi', 'con'].forEach(function (k) {
        if (it.stats[k]) a[k] += it.stats[k];
      });
      (it.gems || []).forEach(function (g) {
        if (a[g.kind] != null) a[g.kind] += F.gemStat(g.kind, g.grade);
      });
    });
    return a;
  }

  function eachEquip(p, fn) {
    D.SLOTS.forEach(function (s) {
      if (p.equip[s.id]) fn(p.equip[s.id], s.id);
    });
  }

  function stats(p) {
    var c = D.CLASSES[p.cls];
    var attrs = rawAttrs(p);
    var d = F.attrDerive(attrs);
    var extra = { patk: 0, matk: 0, pdef: 0, mdef: 0, hp: 0, mp: 0, aspd: 0, crit: 0, speed: 0 };
    eachEquip(p, function (it) {
      Object.keys(extra).forEach(function (k) {
        if (it.stats[k]) extra[k] += it.stats[k];
      });
      (it.gems || []).forEach(function (g) {
        if (extra[g.kind] != null) extra[g.kind] += F.gemStat(g.kind, g.grade);
      });
    });
    var bpatk = 0, bmatk = 0, bpdef = 0, bmdef = 0, bspd = 0;
    p.buffs.forEach(function (b) {
      if (b.patk) bpatk += b.patk;
      if (b.matk) bmatk += b.matk;
      if (b.pdef) bpdef += b.pdef;
      if (b.mdef) bmdef += b.mdef;
      if (b.speed) bspd += b.speed;
    });
    var maxHp = Math.floor(c.baseHp + d.hp + extra.hp + p.level * 18);
    var maxMp = Math.floor(c.baseMp + d.mp + extra.mp + p.level * 6);
    return {
      attrs: attrs,
      maxHp: maxHp,
      maxMp: maxMp,
      patk: Math.floor((d.patk + extra.patk) * (1 + bpatk)),
      matk: Math.floor((d.matk + extra.matk) * (1 + bmatk)),
      pdef: Math.floor((d.pdef + extra.pdef) * (1 + bpdef)),
      mdef: Math.floor((d.mdef + extra.mdef) * (1 + bmdef)),
      aspd: 0.85 + d.aspd + extra.aspd,
      crit: 0.05 + d.crit + extra.crit,
      speed: c.speed * (1 + extra.speed + bspd),
      range: c.range
    };
  }

  function addExp(p, n) {
    p.exp += n;
    var up = 0;
    while (p.exp >= F.xpToNext(p.level) && p.level < 60) {
      p.exp -= F.xpToNext(p.level);
      p.level += 1;
      p.unspentAttr += 5;
      p.unspentSkill += 1;
      var st = stats(p);
      p.hp = st.maxHp;
      p.mp = st.maxMp;
      up += 1;
      D.SKILLS[p.cls].forEach(function (s) {
        if (s.unlock === p.level && p.skills[s.id] == null) p.skills[s.id] = 0;
      });
    }
    if (up) {
      toast('升至 ' + p.level + ' 级');
      log('境界提升：' + p.level + ' 级');
      beep(520, 0.08);
    }
  }

  /* ========== 物品 ========== */
  function rollEquip(slot, level, rarity, cls) {
    rarity = rarity || F.rollRarity(null, Math.max(0, level - 6));
    var names = D.EQUIP_NAMES[slot];
    var nm;
    if (slot === 'weapon') {
      var arr = names[cls] || names.warrior;
      nm = arr[clamp(Math.floor((level - 1) / 8), 0, arr.length - 1)];
    } else {
      nm = names[clamp(Math.floor((level - 1) / 8), 0, names.length - 1)];
    }
    var base = D.EQUIP_BASE[slot];
    var st = {};
    Object.keys(base).forEach(function (k) {
      var v = base[k];
      if (k === 'crit' || k === 'speed') st[k] = +(v * (F.RARITY_MULT[rarity] || 1) * (0.8 + level * 0.03)).toFixed(3);
      else st[k] = F.scaleEquipStat(v, level, rarity, 0);
    });
    if (slot === 'weapon' && cls === 'wanderer') { st.matk = Math.floor(st.matk * 1.15); st.patk = Math.floor(st.patk * 0.45); }
    if (slot === 'weapon' && cls === 'healer') { st.matk = Math.floor(st.matk * 1.1); st.patk = Math.floor(st.patk * 0.4); }
    return {
      uid: uid(), type: 'equip', slot: slot, name: nm, rarity: rarity, level: level,
      stars: 0, sockets: 0, gems: [], stats: st
    };
  }

  function itemName(it) {
    if (it.type === 'equip') {
      return (it.stars ? '+' + it.stars + ' ' : '') + it.name;
    }
    var c = D.CONSUMABLES[it.id];
    if (c) return c.name;
    if (it.type === 'gem') return it.name + '·' + it.grade + '级';
    return it.name || it.id;
  }

  function addItem(p, item) {
    if (item.type === 'equip' || item.type === 'gem') {
      if (p.bag.length >= BAG_CAP) { toast('背包已满'); return false; }
      p.bag.push(item);
      return true;
    }
    var found = p.bag.find(function (x) { return x.id === item.id && x.type !== 'equip' && x.type !== 'gem'; });
    if (found) { found.n = (found.n || 1) + (item.n || 1); return true; }
    if (p.bag.length >= BAG_CAP) { toast('背包已满'); return false; }
    var proto = D.CONSUMABLES[item.id];
    p.bag.push(Object.assign({ n: item.n || 1, type: proto ? proto.kind : 'item' }, proto || item, { id: item.id }));
    return true;
  }

  function takeItem(p, id, n) {
    n = n || 1;
    for (var i = 0; i < p.bag.length; i++) {
      var it = p.bag[i];
      if (it.id === id && it.type !== 'equip') {
        if ((it.n || 1) < n) return false;
        it.n -= n;
        if (it.n <= 0) p.bag.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  function countItem(p, id) {
    var n = 0;
    p.bag.forEach(function (it) {
      if (it.id === id) n += it.n || 1;
    });
    return n;
  }

  /* ========== 地图 ========== */
  function inGrid(g, x, y) { return y >= 0 && y < g.length && x >= 0 && x < g[0].length; }
  function setTile(g, x, y, t) { if (inGrid(g, x, y)) g[y][x] = t; }
  function fill(g, t) {
    for (var y = 0; y < g.length; y++) for (var x = 0; x < g[0].length; x++) g[y][x] = t;
  }
  function rect(g, x, y, w, h, t) {
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) setTile(g, x + i, y + j, t);
  }
  function scatter(g, t, n, ok) {
    var w = g[0].length, h = g.length, gds = 0;
    while (n-- > 0 && gds < 800) {
      gds++;
      var x = irand(1, w - 2), y = irand(1, h - 2);
      if (!ok || ok(g[y][x], x, y)) setTile(g, x, y, t);
    }
  }

  function makeGrid(w, h, t) {
    var g = [];
    for (var y = 0; y < h; y++) {
      g[y] = [];
      for (var x = 0; x < w; x++) g[y][x] = t;
    }
    return g;
  }

  function blockedTile(t, mapId) {
    if (t === 'wall' || t === 'tree' || t === 'house' || t === 'roof' || t === 'rock') return true;
    if (t === 'water' && mapId !== 'poyang') return true;
    return false;
  }

  function buildMap(id) {
    var w = 50, h = 36;
    var g = makeGrid(w, h, 'grass');
    G.decals = [];
    if (id === 'taiping') {
      fill(g, 'grass');
      rect(g, 16, 12, 16, 12, 'dirt');
      for (var i = 0; i < 50; i++) setTile(g, 24, i, i > 2 && i < 34 ? 'dirt' : g[Math.min(i, h - 1)][24]);
      rect(g, 18, 14, 4, 3, 'house'); rect(g, 18, 13, 4, 1, 'roof');
      rect(g, 26, 14, 4, 3, 'house'); rect(g, 26, 13, 4, 1, 'roof');
      rect(g, 22, 20, 5, 3, 'house'); rect(g, 22, 19, 5, 1, 'roof');
      rect(g, 0, 30, 50, 6, 'water');
      scatter(g, 'tree', 36, function (t) { return t === 'grass'; });
    } else if (id === 'wild') {
      fill(g, 'grass');
      rect(g, 1, 16, 48, 4, 'dirt');
      scatter(g, 'tree', 70, function (t) { return t === 'grass'; });
      scatter(g, 'dirt', 40, function (t) { return t === 'grass'; });
      rect(g, 36, 22, 10, 8, 'dirt');
    } else if (id === 'shennong') {
      fill(g, 'moss');
      rect(g, 0, 0, 50, 36, 'moss');
      scatter(g, 'tree', 90, function (t) { return t === 'moss'; });
      scatter(g, 'water', 18, function (t) { return t === 'moss'; });
      rect(g, 20, 14, 10, 8, 'dirt');
    } else if (id === 'poyang') {
      fill(g, 'water');
      rect(g, 2, 14, 46, 8, 'dock');
      rect(g, 18, 6, 16, 24, 'dock');
      rect(g, 34, 16, 10, 10, 'house');
      scatter(g, 'rock', 12, function (t) { return t === 'dock'; });
    } else if (id === 'capital') {
      fill(g, 'stone');
      rect(g, 0, 0, 50, 36, 'stone');
      for (var x = 0; x < 50; x++) { setTile(g, x, 0, 'wall'); setTile(g, x, 35, 'wall'); }
      for (var y = 0; y < 36; y++) { setTile(g, 0, y, 'wall'); setTile(g, 49, y, 'wall'); }
      rect(g, 6, 6, 8, 6, 'house'); rect(g, 6, 5, 8, 1, 'roof');
      rect(g, 20, 8, 10, 7, 'house'); rect(g, 20, 7, 10, 1, 'roof');
      rect(g, 36, 10, 8, 6, 'house'); rect(g, 36, 9, 8, 1, 'roof');
      rect(g, 8, 18, 34, 4, 'dirt');
      rect(g, 22, 4, 4, 28, 'dirt');
    } else if (id === 'tower') {
      fill(g, 'arena');
      for (x = 0; x < 26; x++) for (y = 0; y < 26; y++) {
        if (x === 0 || y === 0 || x === 25 || y === 25) setTile(g, x, y, 'wall');
        else setTile(g, x, y, 'arena');
      }
      w = 26; h = 26;
      g = g.slice(0, 26).map(function (row) { return row.slice(0, 26); });
    } else if (id === 'road') {
      fill(g, 'grass');
      rect(g, 0, 8, 56, 6, 'dirt');
      w = 56; h = 22;
      g = makeGrid(56, 22, 'grass');
      rect(g, 0, 8, 56, 6, 'dirt');
      scatter(g, 'tree', 50, function (t) { return t === 'grass'; });
    }
    G.grid = g;
    G.mapId = id;
    spawnMapContent(id);
    if (window.World3D && World3D.ready) World3D.rebuild(G.grid, G.mapId);
  }

  function worldSize() {
    return { w: G.grid[0].length * TILE, h: G.grid.length * TILE };
  }

  function tileAtWorld(x, y) {
    var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (!inGrid(G.grid, tx, ty)) return 'wall';
    return G.grid[ty][tx];
  }

  function canWalk(x, y) {
    return !blockedTile(tileAtWorld(x, y), G.mapId) &&
      !blockedTile(tileAtWorld(x - 6, y), G.mapId) &&
      !blockedTile(tileAtWorld(x + 6, y), G.mapId) &&
      !blockedTile(tileAtWorld(x, y - 6), G.mapId) &&
      !blockedTile(tileAtWorld(x, y + 6), G.mapId);
  }

  function tileWalkable(tx, ty) {
    return inGrid(G.grid, tx, ty) && !blockedTile(G.grid[ty][tx], G.mapId);
  }

  function snapWalkable(x, y) {
    if (canWalk(x, y)) return { x: x, y: y };
    var tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    for (var r = 1; r <= 14; r++) {
      for (var dy = -r; dy <= r; dy++) {
        for (var dx = -r; dx <= r; dx++) {
          if (tileWalkable(tx + dx, ty + dy)) {
            return { x: (tx + dx + 0.5) * TILE, y: (ty + dy + 0.5) * TILE };
          }
        }
      }
    }
    return { x: x, y: y };
  }

  function setDest(x, y) {
    var goal = snapWalkable(x, y);
    G.clickFx = { x: goal.x, y: goal.y, t: 0.7 };
    G.dest = goal;
    G.path = [];
    if (window.PathFind && G.grid) {
      var p = G.player;
      G.path = PathFind.astar(
        tileWalkable, G.grid[0].length, G.grid.length,
        Math.floor(p.x / TILE), Math.floor(p.y / TILE),
        Math.floor(goal.x / TILE), Math.floor(goal.y / TILE)
      );
    }
  }

  function spawnMapContent(id) {
    G.entities = [];
    G.projectiles = [];
    G.drops = [];
    G.npcs = [];
    G.portals = (D.PORTALS[id] || []).map(function (p) { return Object.assign({}, p); });
    G.herbs = [];
    Object.keys(D.NPCS).forEach(function (k) {
      var n = D.NPCS[k];
      if (n.map === id) {
        var pos = npcPos(n.id, id);
        G.npcs.push({ id: n.id, name: n.name, title: n.title || '', x: pos.x, y: pos.y });
      }
    });
    if (id === 'wild') {
      spawnPack('boar', 10, 2);
      spawnPack('wolf', 7, 5);
      spawnPack('bandit', 5, 8);
      if (G.player && G.player.level >= 16) spawnOne('world_boss', 40 * TILE, 26 * TILE);
      scatterHerbs(12);
    } else if (id === 'shennong') {
      spawnPack('snake', 8, 7);
      spawnPack('spirit', 5, 11);
      scatterHerbs(16);
    } else if (id === 'poyang') {
      spawnPoyangWave();
    } else if (id === 'tower') {
      startTowerFloor(G.towerFloor || 1);
    } else if (id === 'road') {
      /* escort fills this */
    }
  }

  function npcPos(id, map) {
    var table = {
      cunzheng: [19.5 * TILE, 17.6 * TILE],
      tiesmith: [28 * TILE, 17.6 * TILE],
      yaopu: [20.5 * TILE, 23.2 * TILE],
      xunshou: [24 * TILE, 16 * TILE],
      chefu: [10 * TILE, 20 * TILE],
      bagong: [24 * TILE, 12 * TILE],
      yabiao: [32 * TILE, 20 * TILE],
      shilian: [40 * TILE, 14 * TILE],
      chuansong: [6 * TILE, 18 * TILE],
      shuibing: [36 * TILE, 22 * TILE]
    };
    var p = table[id] || [10 * TILE, 10 * TILE];
    return { x: p[0], y: p[1] };
  }

  function spawnPack(kind, n, lv) {
    var def = D.MONSTERS[kind];
    for (var i = 0; i < n; i++) {
      var tries = 0, x, y;
      do {
        x = rand(3, G.grid[0].length - 3) * TILE;
        y = rand(3, G.grid.length - 3) * TILE;
        tries++;
      } while (!canWalk(x, y) && tries < 40);
      spawnOne(kind, x, y, lv || def.level);
    }
  }

  function spawnOne(kind, x, y, lv) {
    var def = D.MONSTERS[kind];
    var level = lv || def.level;
    var e = {
      uid: uid(), kind: kind, name: def.name, color: def.color,
      x: x, y: y, r: def.radius, speed: def.speed,
      level: level, boss: !!def.boss, magic: !!def.magic,
      hp: F.monsterHp(level, def.boss),
      maxHp: F.monsterHp(level, def.boss),
      atk: F.monsterAtk(level, def.boss),
      stun: 0, atkCd: 0, aggro: 0,
      ranged: !!def.ranged, range: def.range || 0, elite: !!def.elite
    };
    G.entities.push(e);
    return e;
  }

  function scatterHerbs(n) {
    var kinds = ['herb_san', 'herb_wu', 'herb_fu', 'herb_ling'];
    for (var i = 0; i < n; i++) {
      var x = rand(2, G.grid[0].length - 2) * TILE;
      var y = rand(2, G.grid.length - 2) * TILE;
      if (!canWalk(x, y)) continue;
      G.herbs.push({ id: kinds[i % 4], x: x, y: y });
    }
  }

  /* ========== 传送 / 进出图 ========== */
  function travel(to, tx, ty) {
    var p = G.player;
    buildMap(to);
    var landed = snapWalkable((tx + 0.5) * TILE, (ty + 0.5) * TILE);
    p.x = landed.x;
    p.y = landed.y;
    p.target = null;
    G.dest = null;
    G.path = [];
    log('抵达 ' + D.MAP_META[to].name);
    if (to === 'capital') maybeCompleteTalk('chefu');
    if (!(D.MAP_META[to] && D.MAP_META[to].instance)) {
      G.instance = null;
      G.hold = false;
      hideFloorClear();
    }
    refreshQuestUI();
    if (mapOverlayOpen()) refreshMapOverlay();
    saveSilent();
    if (G.guide) {
      setTimeout(function () { guideStep(); }, 30);
    }
  }

  /* ========== 战斗 ========== */
  function floatText(x, y, text, color) {
    G.floats.push({ x: x, y: y, text: text, color: color || '#fff', t: 0.9 });
  }

  function burst(x, y, color, n) {
    n = n || 8;
    for (var i = 0; i < n; i++) {
      G.particles.push({
        x: x, y: y, vx: rand(-70, 70), vy: rand(-90, 20),
        color: color, t: rand(0.25, 0.55)
      });
    }
  }

  function beep(freq, dur) {
    try {
      if (!G.ac) G.ac = new (window.AudioContext || window.webkitAudioContext)();
      var o = G.ac.createOscillator();
      var g = G.ac.createGain();
      o.frequency.value = freq;
      o.type = 'square';
      g.gain.value = 0.03;
      o.connect(g); g.connect(G.ac.destination);
      o.start();
      o.stop(G.ac.currentTime + (dur || 0.05));
    } catch (e) { /* ignore */ }
  }

  function hurtMonster(e, dmg, crit) {
    e.hp -= dmg;
    e.aggro = 4;
    floatText(e.x, e.y - 18, (crit ? '暴 ' : '') + dmg, crit ? '#ffd36a' : '#ffe8c8');
    burst(e.x, e.y, e.color, crit ? 14 : 7);
    if (e.hp <= 0) killMonster(e);
  }

  function killMonster(e) {
    var p = G.player;
    var xp = F.killXp(p.level, e.level, e.boss);
    addExp(p, xp);
    var sil = irand(2, 6 + e.level);
    if (e.boss) sil *= 8;
    p.silver += sil;
    log('击败 ' + e.name + '，经验 +' + xp + ' 银两 +' + sil);
    dropLoot(e);
    noteKill(e.kind);
    if (e.kind === 'lake_boss') { p.flags.poyang_clear = true; questCheck(); }
    if (e.kind === 'spirit' && !p.pet && Math.random() < 0.45) grantPet();
    if (e.kind === 'spirit' && !p.pet) {
      /* extra chance already handled */
    }
    if (G.mapId === 'shennong' && !p.pet && e.kind === 'spirit') {
      if (!p.flags.pet_hint) { toast('山魈气息未散，再寻一只或可结缘'); p.flags.pet_hint = true; }
    }
    G.entities = G.entities.filter(function (x) { return x !== e; });
    if (p.target === e) p.target = null;
    if (G.mapId === 'tower') onTowerKill();
    if (G.mapId === 'wild' && e.kind !== 'world_boss' && G.entities.filter(function (x) { return !x.boss; }).length < 8) {
      spawnPack(e.kind, 1, e.level);
    }
  }

  function dropLoot(e) {
    var p = G.player;
    if (Math.random() < (e.boss || e.elite ? 0.95 : 0.28)) {
      var eq = rollEquip(D.SLOTS[irand(0, D.SLOTS.length - 1)].id, e.level, null, p.cls);
      G.drops.push({ x: e.x + rand(-12, 12), y: e.y + rand(-12, 12), item: eq });
    }
    var def = D.MONSTERS[e.kind];
    (def.loot || []).forEach(function (id) {
      if (id === 'gem') {
          if (Math.random() < (e.boss || e.elite ? 0.7 : 0.12)) {
          var gdef = D.GEMS[irand(0, D.GEMS.length - 1)];
          G.drops.push({
            x: e.x + rand(-10, 10), y: e.y + rand(-10, 10),
            item: { uid: uid(), type: 'gem', id: gdef.id, name: gdef.name, kind: gdef.kind, grade: clamp(1 + Math.floor(e.level / 8), 1, 6) }
          });
        }
      } else if (Math.random() < (e.boss || e.elite ? 0.8 : 0.22)) {
        G.drops.push({ x: e.x + rand(-10, 10), y: e.y + rand(-10, 10), item: { id: id, n: 1 } });
      }
    });
  }

  function pickupNear() {
    var p = G.player;
    G.drops = G.drops.filter(function (d) {
      if (dist(p, d) < 36) {
        if (addItem(p, d.item)) {
          log('获得 ' + itemName(d.item));
          return false;
        }
      }
      return true;
    });
    G.herbs = G.herbs.filter(function (h) {
      if (dist(p, h) < 32) {
        addItem(p, { id: h.id, n: 1 });
        log('采集 ' + D.CONSUMABLES[h.id].name);
        noteGather(h.id);
        if (G.guide && G.guide.wantHerb) guideStep();
        return false;
      }
      return true;
    });
  }

  function playerAttack() {
    var p = G.player;
    if (!p.target || p.atkCd > 0) return;
    var st = stats(p);
    if (dist(p, p.target) > st.range + 8) return;
    p.facing = ang(p, p.target);
    var magic = p.cls === 'wanderer' || p.cls === 'healer';
    var atk = magic ? st.matk : st.patk;
    var def = magic ? 0 : p.target.level * 1.2;
    var crit = F.critRoll(st.crit);
    var dmg = F.calcDamage(atk, def, 1, crit, rand(-0.08, 0.08));
    hurtMonster(p.target, dmg, crit);
    p.atkCd = 1 / Math.max(0.45, st.aspd);
    beep(220, 0.03);
  }

  function castSkill(sk) {
    var p = G.player;
    if (!sk) return;
    var lv = p.skills[sk.id] || 0;
    if (lv <= 0) { toast('尚未领悟'); return; }
    if ((p.skillCd[sk.id] || 0) > 0) return;
    var st = stats(p);
    if (p.mp < sk.cost) { toast('内力不足'); return; }
    var mul = sk.mul ? sk.mul + (lv - 1) * 0.08 : 1;
    var magic = !!sk.magic || p.cls === 'wanderer' || (p.cls === 'healer' && sk.kind !== 'heal');
    p.mp -= sk.cost;
    p.skillCd[sk.id] = sk.cd * Math.max(0.55, 1 - lv * 0.03);
    p.facing = p.target ? ang(p, p.target) : p.facing;

    if (sk.kind === 'heal') {
      var h = Math.floor(st.maxHp * (sk.heal || 0.2) * (1 + lv * 0.06));
      p.hp = Math.min(st.maxHp, p.hp + h);
      floatText(p.x, p.y - 20, '+' + h, '#7dff9a');
      if (sk.pet && p.pet) {
        p.pet.hp = Math.min(p.pet.maxHp, p.pet.hp + Math.floor(h * 0.8));
      }
    } else if (sk.kind === 'manaburn') {
      var r = Math.floor(st.maxMp * (sk.mana || 0.2));
      p.mp = Math.min(st.maxMp, p.mp + r + sk.cost);
      floatText(p.x, p.y - 20, '+' + r + ' 内', '#7ec8ff');
    } else if (sk.kind === 'buff') {
      p.buffs.push(Object.assign({ t: sk.buff.dur }, sk.buff));
      toast(sk.name + ' 生效');
    } else if (sk.kind === 'blink') {
      var a = Math.atan2(G.mouse.wy - p.y, G.mouse.wx - p.x);
      tryMove(p, Math.cos(a) * 110, Math.sin(a) * 110);
    } else if (sk.kind === 'dash' && p.target) {
      var dsh = ang(p, p.target);
      tryMove(p, Math.cos(dsh) * 80, Math.sin(dsh) * 80);
      hitTarget(p, p.target, mul, magic, sk);
    } else if (sk.kind === 'nova') {
      G.entities.forEach(function (e) {
        if (dist(p, e) <= (sk.range || 80)) hitTarget(p, e, mul, magic, sk);
      });
      burst(p.x, p.y, D.CLASSES[p.cls].color, 18);
    } else if (sk.kind === 'pierce') {
      fireBolt(p, sk, mul, magic, true);
    } else if (sk.kind === 'blast' || sk.kind === 'bolt' || sk.kind === 'stun' || sk.kind === 'debuff') {
      if (sk.kind === 'melee') {
        if (p.target && dist(p, p.target) <= (sk.range || 50)) hitTarget(p, p.target, mul, magic, sk);
      } else {
        fireBolt(p, sk, mul, magic, false);
      }
    } else if (sk.kind === 'melee') {
      if (p.target && dist(p, p.target) <= (sk.range || 54) + 10) hitTarget(p, p.target, mul, magic, sk);
      else toast('距离不够');
    }
    beep(330, 0.04);
  }

  function fireBolt(p, sk, mul, magic, pierce) {
    var aim = p.target || { x: G.mouse.wx, y: G.mouse.wy };
    var a = ang(p, aim);
    G.projectiles.push({
      x: p.x, y: p.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320,
      life: 0.9, r: 5, from: 'player', mul: mul, magic: magic, skill: sk,
      pierce: pierce, hit: {}, color: D.CLASSES[p.cls].accent
    });
  }

  function hitTarget(p, e, mul, magic, sk) {
    var st = stats(p);
    var atk = magic ? st.matk : st.patk;
    var crit = F.critRoll(st.crit + (sk && sk.crit ? sk.crit : 0));
    var dmg = F.calcDamage(atk, e.level, mul, crit, rand(-0.05, 0.05));
    if (sk && sk.stun) e.stun = Math.max(e.stun, sk.stun);
    if (sk && sk.debuff) e.debuff = Object.assign({ t: sk.debuff.dur }, sk.debuff);
    hurtMonster(e, dmg, crit);
  }

  function usePotion(kind) {
    var p = G.player;
    var st = stats(p);
    var order = kind === 'hp' ? ['hp2', 'hp1'] : ['mp2', 'mp1'];
    for (var i = 0; i < order.length; i++) {
      if (countItem(p, order[i]) > 0) {
        takeItem(p, order[i], 1);
        if (kind === 'hp') {
          var h = F.potionHeal(order[i] === 'hp2' ? 2 : 1, st.maxHp);
          p.hp = Math.min(st.maxHp, p.hp + h);
          floatText(p.x, p.y - 16, '+' + h, '#7dff9a');
        } else {
          var m = F.potionHeal(order[i] === 'mp2' ? 2 : 1, st.maxMp);
          p.mp = Math.min(st.maxMp, p.mp + m);
          floatText(p.x, p.y - 16, '+' + m, '#7ec8ff');
        }
        return true;
      }
    }
    return false;
  }

  /* ========== 任务 ========== */
  function currentQuest() {
    var p = G.player;
    for (var i = 0; i < D.QUESTS.length; i++) {
      if (p.quests.active.indexOf(D.QUESTS[i].id) >= 0) return D.QUESTS[i];
    }
    return null;
  }

  function noteKill(kind) {
    var q = currentQuest();
    if (!q || !q.kill || q.kill.id !== kind) return;
    pprog(q.id, 1);
    questCheck();
  }

  function noteGather(id) {
    var q = currentQuest();
    if (!q || !q.gather || q.gather.id !== id) return;
    questCheck();
  }

  function pprog(id, n) {
    G.player.quests.progress[id] = (G.player.quests.progress[id] || 0) + n;
  }

  function maybeCompleteTalk(npcId) {
    var q = currentQuest();
    if (q && q.talk === npcId) completeQuest(q);
  }

  function questCheck() {
    var p = G.player;
    var q = currentQuest();
    if (!q) return;
    if (q.kill && (p.quests.progress[q.id] || 0) >= q.kill.n) completeQuest(q);
    else if (q.gather && countItem(p, q.gather.id) >= q.gather.n) completeQuest(q);
    else if (q.flag && p.flags[q.flag]) completeQuest(q);
  }

  function completeQuest(q) {
    var p = G.player;
    if (p.quests.done.indexOf(q.id) >= 0) return;
    p.quests.active = p.quests.active.filter(function (id) { return id !== q.id; });
    p.quests.done.push(q.id);
    addExp(p, q.reward.exp || 0);
    p.silver += q.reward.silver || 0;
    p.gold += q.reward.gold || 0;
    (q.reward.items || []).forEach(function (it) { addItem(p, { id: it.id, n: it.n }); });
    toast('完成：' + q.name);
    log('任务完成：' + q.name);
    if (G.guide && G.guide.qid === q.id) G.guide = null;
    var idx = D.QUESTS.findIndex(function (x) { return x.id === q.id; });
    if (idx >= 0 && D.QUESTS[idx + 1]) p.quests.active.push(D.QUESTS[idx + 1].id);
    refreshQuestUI();
    beep(660, 0.1);
  }

  function nextAcceptQuest() {
    var p = G.player;
    if (!p) return null;
    for (var i = 0; i < D.QUESTS.length; i++) {
      var q = D.QUESTS[i];
      if (p.quests.done.indexOf(q.id) >= 0) continue;
      if (p.quests.active.indexOf(q.id) >= 0) continue;
      return q;
    }
    return null;
  }

  function questProgressText(q) {
    if (q.kill) return '（' + (G.player.quests.progress[q.id] || 0) + '/' + q.kill.n + '）';
    if (q.gather) return '（' + countItem(G.player, q.gather.id) + '/' + q.gather.n + '）';
    return '';
  }

  function questLineHtml(q) {
    var extra = questProgressText(q);
    var icon = '';
    if (q.talk && window.Art && Art.npcIcon) icon = Art.npcIcon(q.talk);
    var bits = [];
    if (q.talk && D.NPCS[q.talk]) {
      bits.push('与 <span class="q-link" data-quest-go="' + q.id + '">' + D.NPCS[q.talk].name + '</span> 交谈');
    }
    if (q.kill && D.MONSTERS[q.kill.id]) {
      bits.push('击杀 <span class="q-link mob" data-quest-go="' + q.id + '">' + D.MONSTERS[q.kill.id].name + '</span>' + extra);
    }
    if (q.gather && D.CONSUMABLES[q.gather.id]) {
      bits.push('采集 <span class="q-link" data-quest-go="' + q.id + '">' + D.CONSUMABLES[q.gather.id].name + '</span>' + extra);
    }
    var mapName = D.MAP_META[q.map] ? D.MAP_META[q.map].name : '';
    if (mapName) {
      bits.push('地点：<span class="q-link" data-quest-go="' + q.id + '">' + mapName + '</span>');
    }
    if (!bits.length) {
      bits.push('<span class="q-link" data-quest-go="' + q.id + '">' + q.text + '</span>');
    }
    return '<div class="q-item">' +
      (icon ? '<img src="' + icon + '" alt="" />' : '') +
      '<div><b>' + q.name + extra + '</b>' + bits.join('<br/>') + '</div></div>';
  }

  function refreshQuestUI() {
    var el = document.getElementById('quest-track');
    if (!el) return;
    var q = currentQuest();
    var nxt = nextAcceptQuest();
    var html = '';
    html += '<div class="q-sec">当前任务</div>';
    html += q ? questLineHtml(q) : '<div class="q-item muted">暂无进行中的任务。</div>';
    html += '<div class="q-sec">可接任务</div>';
    html += nxt ? questLineHtml(nxt) : '<div class="q-item muted">暂无可接。可挂机或挑战试炼。</div>';
    el.innerHTML = html;
  }

  function questTarget(q) {
    if (q.talk && D.NPCS[q.talk]) return { kind: 'npc', map: D.NPCS[q.talk].map, npcId: q.talk };
    if (q.kill) return { kind: 'kill', map: q.map, monster: q.kill.id };
    if (q.gather) return { kind: 'herb', map: q.map, herb: q.gather.id };
    if (q.flag === 'got_pet') return { kind: 'npc', map: 'shennong', npcId: 'xunshou' };
    if (q.flag === 'enhanced') return { kind: 'npc', map: 'capital', npcId: 'bagong' };
    if (q.flag === 'poyang_clear') {
      if (G.mapId === 'poyang') return { kind: 'kill', map: 'poyang', monster: 'lake_boss' };
      return { kind: 'npc', map: 'capital', npcId: 'shuibing' };
    }
    if (q.flag === 'escort_done') return { kind: 'npc', map: 'capital', npcId: 'yabiao' };
    if (q.flag === 'tower5') {
      if (G.mapId === 'tower') return { kind: 'kill', map: 'tower', monster: 'tower' };
      return { kind: 'npc', map: 'capital', npcId: 'shilian' };
    }
    return { kind: 'map', map: q.map };
  }

  function findNpc(id) {
    for (var i = 0; i < G.npcs.length; i++) if (G.npcs[i].id === id) return G.npcs[i];
    return null;
  }

  function currentQuestNpcId() {
    var q = currentQuest();
    if (!q) return null;
    var t = questTarget(q);
    return t && t.npcId ? t.npcId : null;
  }

  function npcQuestMark(n) {
    if (currentQuestNpcId() === n.id) return '?';
    var nxt = nextAcceptQuest();
    if (nxt) {
      var t = questTarget(nxt);
      if (t && t.npcId === n.id && t.map === G.mapId) return '!';
    }
    return '';
  }

  function stampNpcMarks() {
    G.npcs.forEach(function (n) { n.questMark = npcQuestMark(n); });
  }

  function guidedQuest() {
    if (!G.guide) return null;
    if (G.guide.qid) {
      for (var i = 0; i < D.QUESTS.length; i++) {
        if (D.QUESTS[i].id === G.guide.qid) return D.QUESTS[i];
      }
      return null;
    }
    return currentQuest();
  }

  function followQuest(q) {
    if (inInstance()) { toast('在副本地图中不能自动寻路'); return; }
    if (!q) q = currentQuest();
    if (!q) { toast('当前没有任务'); return; }
    G.guide = { qid: q.id };
    toast('自动寻路：' + q.name);
    log('自动寻路 → ' + q.name);
    guideStep();
  }

  function followNpcOnMap(npcId) {
    if (inInstance()) { toast('在副本地图中不能自动寻路'); return; }
    G.guide = { tgt: { kind: 'npc', map: G.mapId, npcId: npcId } };
    toast('自动寻路：' + (D.NPCS[npcId] ? D.NPCS[npcId].name : '人物'));
    guideStep();
  }

  function guideStep() {
    if (!G.guide || !G.player) return;
    var tgt = G.guide.tgt;
    if (!tgt) {
      var q = guidedQuest();
      if (!q) { G.guide = null; return; }
      tgt = questTarget(q);
    }
    var destMap = tgt.map;
    if (!destMap) { G.guide = null; return; }
    if (G.mapId !== destMap) {
      var route = window.PathFind && PathFind.mapRoute ? PathFind.mapRoute(D.PORTALS, G.mapId, destMap) : null;
      if (!route || !route.length) {
        toast('无法到达' + (D.MAP_META[destMap] ? D.MAP_META[destMap].name : ''));
        G.guide = null;
        return;
      }
      var pt = route[0].portal;
      G.guide.wantTalk = null;
      G.guide.wantKill = null;
      G.guide.wantHerb = null;
      G.guide.wantPortal = pt.to;
      setDest((pt.x + 0.5) * TILE, (pt.y + 0.5) * TILE);
      return;
    }
    G.guide.wantPortal = null;
    if (tgt.kind === 'npc') {
      var npc = findNpc(tgt.npcId);
      if (!npc) { toast('目标不在本地图'); return; }
      G.guide.wantTalk = tgt.npcId;
      G.guide.wantKill = null;
      G.guide.wantHerb = null;
      if (dist(G.player, npc) < 56) {
        G.guide = null;
        talkNpc(npc);
        return;
      }
      setDest(npc.x, npc.y);
      return;
    }
    if (tgt.kind === 'kill') {
      G.guide.wantKill = tgt.monster;
      G.guide.wantTalk = null;
      G.guide.wantHerb = null;
      var best = null, bd = 1e9;
      G.entities.forEach(function (e) {
        if (e.kind !== tgt.monster) return;
        var d = dist(G.player, e);
        if (d < bd) { bd = d; best = e; }
      });
      if (best) {
        G.player.target = best;
        setDest(best.x, best.y);
      } else {
        setDest((G.grid[0].length * 0.5) * TILE, (G.grid.length * 0.5) * TILE);
      }
      return;
    }
    if (tgt.kind === 'herb') {
      G.guide.wantHerb = 1;
      G.guide.wantTalk = null;
      G.guide.wantKill = null;
      var hb = null, hd = 1e9;
      G.herbs.forEach(function (h) {
        var d = dist(G.player, h);
        if (d < hd) { hd = d; hb = h; }
      });
      if (hb) setDest(hb.x, hb.y);
      else toast('附近没有可采草药');
      return;
    }
    if (G.grid) setDest((G.grid[0].length * 0.5) * TILE, (G.grid.length * 0.5) * TILE);
  }

  function tickGuideArrive() {
    if (!G.guide || G.player._moving) return;
    if (G.guide.qid && !guidedQuest()) { G.guide = null; return; }
    if (G.guide.wantTalk) {
      var npc = findNpc(G.guide.wantTalk);
      if (npc && dist(G.player, npc) < 56) {
        G.guide = null;
        talkNpc(npc);
      } else if (npc) setDest(npc.x, npc.y);
      return;
    }
    if (G.guide.wantKill || G.guide.wantHerb || G.guide.wantPortal) guideStep();
  }

  /* ========== 灵宠 ========== */
  function grantPet() {
    var p = G.player;
    if (p.pet) return;
    var def = D.PETS[irand(0, D.PETS.length - 1)];
    p.pet = {
      id: def.id, name: def.name, color: def.color, magic: !!def.magic,
      level: 1, exp: 0, atkMul: def.atk, hpMul: def.hp,
      hp: 80, maxHp: 80, x: p.x - 20, y: p.y, atkCd: 0
    };
    syncPet(p);
    p.flags.got_pet = true;
    toast('灵宠结缘：' + def.name);
    log('收服灵宠 ' + def.name);
    questCheck();
  }

  function syncPet(p) {
    if (!p.pet) return;
    var st = stats(p);
    p.pet.maxHp = Math.floor((70 + p.level * 22) * p.pet.hpMul);
    if (p.pet.hp > p.pet.maxHp) p.pet.hp = p.pet.maxHp;
    p.pet.atk = Math.floor(((st.patk + st.matk) * 0.28 + p.level * 2) * p.pet.atkMul);
  }

  /* ========== 押镖 / 副本 ========== */
  function inInstance() {
    return !!(D.MAP_META[G.mapId] && D.MAP_META[G.mapId].instance);
  }

  function dungeonDay() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function ensureDungeon(p) {
    p.dungeon = p.dungeon || { day: '', poyang: 0, tower: 0 };
    var day = dungeonDay();
    if (p.dungeon.day !== day) p.dungeon = { day: day, poyang: 0, tower: 0 };
    if (!p.towerUnlock) p.towerUnlock = 1;
  }

  function canEnterDungeon(id) {
    var p = G.player;
    var spec = D.INSTANCES[id];
    if (!spec) return false;
    ensureDungeon(p);
    if (p.level < (spec.minLevel || 1)) {
      toast('等级不足 ' + spec.minLevel + ' 级');
      return false;
    }
    if (spec.daily && (p.dungeon[id] || 0) >= spec.daily) {
      toast('你今天的挑战次数已满');
      return false;
    }
    return true;
  }

  function useDungeon(id) {
    ensureDungeon(G.player);
    G.player.dungeon[id] = (G.player.dungeon[id] || 0) + 1;
  }

  function hideFloorClear() {
    var el = document.getElementById('floor-clear');
    if (el) el.hidden = true;
    G.hold = false;
  }

  function leaveInstance() {
    hideFloorClear();
    G.escort = null;
    G.towerAuto = false;
    G.instance = null;
    var tx = 20, ty = 20;
    if (G.mapId === 'poyang') { tx = 36; ty = 22; }
    else if (G.mapId === 'tower') { tx = 40; ty = 14; }
    else if (G.mapId === 'road') { tx = 32; ty = 20; }
    travel('capital', tx, ty);
    toast('离开副本');
  }

  function spawnAt(kind, tx, ty, lv) {
    var pos = snapWalkable((tx + 0.5) * TILE, (ty + 0.5) * TILE);
    return spawnOne(kind, pos.x, pos.y, lv);
  }

  function poyangLevel() {
    var id = G.instance && G.instance.diff;
    var diffs = (D.INSTANCES.poyang && D.INSTANCES.poyang.diffs) || [];
    for (var i = 0; i < diffs.length; i++) if (diffs[i].id === id) return diffs[i].lv;
    return 10;
  }

  function spawnPoyangWave() {
    var lv = poyangLevel();
    [[6, 16], [8, 17], [10, 15], [12, 18], [7, 19], [11, 16]].forEach(function (xy) {
      spawnAt('sailor', xy[0], xy[1], lv);
    });
    [[16, 18], [18, 16], [17, 20]].forEach(function (xy) {
      spawnAt('xianfeng', xy[0], xy[1], lv + 1);
    });
    [[22, 8], [24, 9], [26, 8], [28, 10], [23, 11]].forEach(function (xy) {
      spawnAt('gongshou', xy[0], xy[1], lv);
    });
    spawnAt('fujiang', 34, 18, lv + 2);
    spawnAt('fujiang', 36, 20, lv + 2);
    spawnAt('lake_boss', 40, 20, lv + 4);
  }

  function enterPoyang(diffId) {
    if (!canEnterDungeon('poyang')) return;
    var diffs = D.INSTANCES.poyang.diffs;
    var spec = diffs[0];
    diffs.forEach(function (d) { if (d.id === diffId) spec = d; });
    useDungeon('poyang');
    G.instance = { id: 'poyang', diff: spec.id, left: D.INSTANCES.poyang.duration };
    closeDialog();
    closePanels();
    travel('poyang', 4, 18);
    log('开始挑战鄱阳湖大战 · ' + spec.name + '难度');
    toast('鄱阳湖大战 · ' + spec.name + '　半个时辰内了结');
  }

  function enterTower(floor, auto) {
    if (!canEnterDungeon('tower')) return;
    ensureDungeon(G.player);
    floor = floor || G.player.towerUnlock || 1;
    if (floor > (G.player.towerUnlock || 1)) { toast('本关卡尚未开通'); return; }
    useDungeon('tower');
    G.instance = { id: 'tower' };
    G.towerAuto = !!auto;
    G.towerFloor = floor;
    closeDialog();
    closePanels();
    hideFloorClear();
    travel('tower', 12, 20);
    log('开始挑战大明英雄副本 第 ' + floor + ' 关');
  }

  function startEscort() {
    var p = G.player;
    if (p.level < 8) { toast('等级不足 8 级'); return; }
    if (p.silver < 20) { toast('押金 20 两不足'); return; }
    p.silver -= 20;
    G.escort = { hp: 220, maxHp: 220, x: 4 * TILE, y: 11 * TILE, t: 0, spawn: 0 };
    G.instance = { id: 'road' };
    travel('road', 3, 11);
    log('护送军资出发，沿官道向东。');
    closeDialog();
  }

  function startTowerFloor(n) {
    G.towerFloor = n;
    G.entities = [];
    G.towerDmg = 0;
    G.towerT0 = G.time;
    var count = 3 + Math.floor(n / 2);
    for (var i = 0; i < count; i++) {
      spawnOne('tower', rand(6, 20) * TILE, rand(6, 20) * TILE, 8 + n * 2);
    }
    if (n % 5 === 0) {
      var boss = spawnOne('tower', 13 * TILE, 12 * TILE, 10 + n * 2);
      boss.boss = true;
      boss.name = '本关守将';
    }
    G.waveLeft = G.entities.length;
    G.hold = false;
    toast('大明英雄副本 第 ' + n + ' 关');
  }

  function onTowerKill() {
    if (G.entities.length !== 0) return;
    if (G.towerFloor >= 5) G.player.flags.tower5 = true;
    questCheck();
    G.player.towerUnlock = Math.max(G.player.towerUnlock || 1, G.towerFloor + 1);
    if (G.towerFloor % 5 === 0) addItem(G.player, { id: 'hero_pack', n: 1 });
    if (G.towerFloor >= 10) {
      toast('您已通关所有关卡');
      showFloorClear(true);
      return;
    }
    if (G.towerAuto) {
      var cost = D.INSTANCES.tower.autoCost || 5;
      if (G.player.silver < cost) {
        toast('银两不足，自动闯关停止');
        showFloorClear(false);
        return;
      }
      G.player.silver -= cost;
      startTowerFloor(G.towerFloor + 1);
      return;
    }
    showFloorClear(false);
  }

  function showFloorClear(done) {
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

  function continueTower() {
    hideFloorClear();
    startTowerFloor(G.towerFloor + 1);
  }

  /* ========== 更新 ========== */
  function tryMove(ent, dx, dy) {
    var stuck = !canWalk(ent.x, ent.y);
    var nx = ent.x + dx, ny = ent.y + dy;
    if (stuck || canWalk(nx, ent.y)) ent.x = nx;
    if (stuck || canWalk(ent.x, ny)) ent.y = ny;
    if (stuck && !canWalk(ent.x, ent.y)) {
      var s = snapWalkable(ent.x, ent.y);
      ent.x = s.x; ent.y = s.y;
    }
    var ws = worldSize();
    ent.x = clamp(ent.x, 16, ws.w - 16);
    ent.y = clamp(ent.y, 16, ws.h - 16);
  }

  function updatePlayer(dt) {
    if (G.hold) return;
    var p = G.player;
    var st = stats(p);
    var mx = 0, my = 0;
    if (G.keys.KeyW || G.keys.ArrowUp) my -= 1;
    if (G.keys.KeyS || G.keys.ArrowDown) my += 1;
    if (G.keys.KeyA || G.keys.ArrowLeft) mx -= 1;
    if (G.keys.KeyD || G.keys.ArrowRight) mx += 1;
    p._moving = false;
    if (mx || my) {
      G.dest = null;
      G.path = [];
      G.guide = null;
      var len = Math.hypot(mx, my) || 1;
      tryMove(p, (mx / len) * st.speed * dt, (my / len) * st.speed * dt);
      p.facing = Math.atan2(my, mx);
      p._moving = true;
    } else if (G.path && G.path.length) {
      var wp = G.path[0];
      var wx = (wp.x + 0.5) * TILE, wy = (wp.y + 0.5) * TILE;
      if (Math.hypot(p.x - wx, p.y - wy) < 10) G.path.shift();
      else {
        var pa = Math.atan2(wy - p.y, wx - p.x);
        tryMove(p, Math.cos(pa) * st.speed * dt, Math.sin(pa) * st.speed * dt);
        p.facing = pa;
        p._moving = true;
      }
    } else if (G.dest) {
      var dd = dist(p, G.dest);
      if (dd < 8) {
        G.dest = null;
        tickGuideArrive();
      } else {
        var a = ang(p, G.dest);
        var ox = p.x, oy = p.y;
        tryMove(p, Math.cos(a) * st.speed * dt, Math.sin(a) * st.speed * dt);
        p.facing = a;
        p._moving = true;
        if (Math.hypot(p.x - ox, p.y - oy) < 0.2) {
          G.dest = null;
          tickGuideArrive();
        }
      }
    }
    p.atkCd = Math.max(0, p.atkCd - dt);
    Object.keys(p.skillCd).forEach(function (k) { p.skillCd[k] = Math.max(0, p.skillCd[k] - dt); });
    p.buffs = p.buffs.filter(function (b) { b.t -= dt; return b.t > 0; });
    if (p.hp < st.maxHp) p.hp = Math.min(st.maxHp, p.hp + dt * (1.2 + st.attrs.con * 0.05));
    if (p.mp < st.maxMp) p.mp = Math.min(st.maxMp, p.mp + dt * (1.6 + st.attrs.spi * 0.08));
    if (p.target && p.target.hp <= 0) p.target = null;
    if (p.target && dist(p, p.target) <= st.range) playerAttack();
    else if (p.target) {
      setDest(p.target.x, p.target.y);
    }
    pickupNear();
    G.portals.forEach(function (pt) {
      var px = (pt.x + 0.5) * TILE, py = (pt.y + 0.5) * TILE;
      if (Math.hypot(p.x - px, p.y - py) < 28) {
        if (!pt._cd) {
          pt._cd = 1.2;
          if (pt.to === 'poyang' && G.mapId !== 'poyang') {
            travel('capital', 36, 22);
            toast('找明军水兵，选择难度进入鄱阳湖大战');
          } else if (inInstance() && pt.to === 'capital') {
            leaveInstance();
          } else {
            travel(pt.to, pt.tx, pt.ty);
          }
        }
      }
      if (pt._cd) pt._cd = Math.max(0, pt._cd - dt);
    });
    if (p.auto) updateAuto(dt, st);
    else if (G.guide && G.guide.wantKill && (!p.target || p.target.hp <= 0)) guideStep();
    if (p.hp <= 0) die();
  }

  function updateAuto(dt, st) {
    var p = G.player;
    if (p.hp < st.maxHp * 0.4) usePotion('hp');
    if (p.mp < st.maxMp * 0.25) usePotion('mp');
    if (!p.target || p.target.hp <= 0) {
      var best = null, bd = 9999;
      G.entities.forEach(function (e) {
        var d = dist(p, e);
        if (d < bd && d < 420) { bd = d; best = e; }
      });
      p.target = best;
    }
    var skills = D.SKILLS[p.cls];
    for (var i = 0; i < skills.length; i++) {
      var sk = skills[i];
      if ((p.skills[sk.id] || 0) > 0 && (p.skillCd[sk.id] || 0) <= 0 && p.mp >= sk.cost) {
        if (sk.kind === 'heal' && p.hp > st.maxHp * 0.55) continue;
        if (sk.kind === 'manaburn' && p.mp > st.maxMp * 0.4) continue;
        if ((sk.kind === 'bolt' || sk.kind === 'melee' || sk.kind === 'nova' || sk.kind === 'blast' || sk.kind === 'pierce' || sk.kind === 'dash' || sk.kind === 'stun') && !p.target) continue;
        castSkill(sk);
        break;
      }
    }
  }

  function hurtPlayer(dmg) {
    var p = G.player;
    p.hp -= dmg;
    if (G.mapId === 'tower') G.towerDmg = (G.towerDmg || 0) + dmg;
    floatText(p.x, p.y - 18, '-' + dmg, '#ff8a7a');
  }

  function updateMonsters(dt) {
    if (G.hold) return;
    var p = G.player;
    var st = stats(p);
    G.entities.forEach(function (e) {
      if (e.stun > 0) { e.stun -= dt; return; }
      e.atkCd = Math.max(0, e.atkCd - dt);
      if (e.debuff) { e.debuff.t -= dt; if (e.debuff.t <= 0) e.debuff = null; }
      var d = dist(e, p);
      var sight = e.boss ? 260 : (e.ranged ? 240 : 170);
      if (d < sight) e.aggro = 3;
      if (e.aggro > 0) {
        e.aggro -= dt;
        var spd = e.speed * (e.debuff && e.debuff.speed ? 1 - e.debuff.speed : 1);
        var melee = e.r + 16;
        var want = e.ranged ? (e.range || 180) : melee;
        if (e.ranged && d < want && d > melee) {
          if (e.atkCd <= 0) {
            var a0 = ang(e, p);
            G.projectiles.push({
              x: e.x, y: e.y, vx: Math.cos(a0) * 260, vy: Math.sin(a0) * 260,
              life: 0.9, mul: 1, magic: !!e.magic, skill: null, hit: {},
              foe: true, atk: e.atk, color: '#c8e68a'
            });
            e.atkCd = 1.45;
          }
        } else if (d > want) {
          var a = ang(e, p);
          tryMove(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
        } else if (e.atkCd <= 0) {
          var def = e.magic ? st.mdef : st.pdef;
          var dmg = F.calcDamage(e.atk, def, 1, false, rand(-0.05, 0.05));
          hurtPlayer(dmg);
          e.atkCd = e.boss ? 1.15 : 1.35;
          beep(140, 0.04);
        }
      }
    });
  }

  function updatePet(dt) {
    if (G.hold) return;
    var p = G.player;
    if (!p.pet || p.pet.hp <= 0) return;
    syncPet(p);
    var pet = p.pet;
    var follow = dist(pet, p) > 46;
    if (follow && (!p.target || dist(pet, p) > 160)) {
      var a = ang(pet, p);
      pet.x += Math.cos(a) * 150 * dt;
      pet.y += Math.sin(a) * 150 * dt;
    }
    pet.atkCd = Math.max(0, pet.atkCd - dt);
    var t = p.target;
    if (t && dist(pet, t) < 220) {
      if (dist(pet, t) > 28) {
        var b = ang(pet, t);
        pet.x += Math.cos(b) * 140 * dt;
        pet.y += Math.sin(b) * 140 * dt;
      } else if (pet.atkCd <= 0) {
        var dmg = Math.max(1, pet.atk - t.level);
        hurtMonster(t, dmg, false);
        pet.atkCd = 1.1;
      }
    }
  }

  function updateProjectiles(dt) {
    if (G.hold) return;
    G.projectiles = G.projectiles.filter(function (pr) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.life <= 0) return false;
      if (pr.foe) {
        var p = G.player;
        if (p && Math.hypot(pr.x - p.x, pr.y - p.y) < 16) {
          var st = stats(p);
          var def = pr.magic ? st.mdef : st.pdef;
          var dmg = F.calcDamage(pr.atk || 8, def, 1, false, 0);
          hurtPlayer(dmg);
          beep(140, 0.04);
          return false;
        }
        return true;
      }
      for (var i = 0; i < G.entities.length; i++) {
        var e = G.entities[i];
        if (pr.hit[e.uid]) continue;
        if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + 8) {
          pr.hit[e.uid] = true;
          hitTarget(G.player, e, pr.mul, pr.magic, pr.skill);
          if (pr.skill && pr.skill.kind === 'blast') {
            G.entities.forEach(function (o) {
              if (o !== e && dist(o, e) < 56) hitTarget(G.player, o, pr.mul * 0.7, pr.magic, pr.skill);
            });
          }
          if (!pr.pierce) return false;
        }
      }
      return true;
    });
  }

  function updateEscort(dt) {
    if (G.mapId !== 'road' || !G.escort) return;
    var cart = G.escort;
    cart.x += 36 * dt;
    cart.t += dt;
    cart.spawn += dt;
    if (cart.spawn > 6) {
      cart.spawn = 0;
      spawnOne('escort', cart.x + rand(-30, 30), cart.y + rand(-80, 80), 10 + G.player.level);
    }
    G.entities.forEach(function (e) {
      if (e.kind === 'escort' && dist(e, cart) < 22 && e.atkCd <= 0) {
        cart.hp -= 8;
        e.atkCd = 1.2;
      }
    });
    if (cart.hp <= 0) {
      toast('镖车被劫，任务失败');
      G.escort = null;
      travel('capital', 32, 20);
      return;
    }
    if (cart.x > 52 * TILE) {
      G.player.flags.escort_done = true;
      G.player.silver += 80;
      addExp(G.player, 140);
      toast('军资送达');
      G.escort = null;
      questCheck();
      travel('capital', 32, 20);
    }
  }

  function updateFx(dt) {
    G.floats = G.floats.filter(function (f) { f.t -= dt; f.y -= 22 * dt; return f.t > 0; });
    G.particles = G.particles.filter(function (p) {
      p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; return p.t > 0;
    });
    if (G.clickFx) G.clickFx.t -= dt;
    if (G.toastT > 0) {
      G.toastT -= dt;
      if (G.toastT <= 0) document.getElementById('toast').style.display = 'none';
    }
  }

  function die() {
    var p = G.player;
    p.auto = false;
    var spec = D.INSTANCES[G.mapId];
    var title = document.getElementById('death-title');
    var text = document.getElementById('death-text');
    var btn = document.getElementById('btn-revive');
    if (spec && spec.revive === 'here') {
      G.deathKind = 'here';
      if (title) title.textContent = '身受重创';
      if (text) text.textContent = '副本地图内可以原地复活，角色死亡不掉落物品。';
      if (btn) btn.textContent = '立即在原地复活';
    } else if (spec && spec.revive === 'entrance') {
      G.deathKind = 'entrance';
      if (title) title.textContent = '挑战失败';
      if (text) text.textContent = '副本地图内无法原地复活。返回入口后，已开通关卡仍保留。';
      if (btn) btn.textContent = '返回入口';
    } else {
      G.deathKind = 'village';
      p.silver = Math.max(0, Math.floor(p.silver * 0.9));
      if (title) title.textContent = '身死道消';
      if (text) text.textContent = '银两略有折损，将在太平村回魂。';
      if (btn) btn.textContent = '回 村 再 战';
    }
    document.getElementById('death').classList.add('open');
  }

  function revive() {
    document.getElementById('death').classList.remove('open');
    var p = G.player;
    var st = stats(p);
    p.hp = st.maxHp;
    p.mp = st.maxMp;
    p.target = null;
    if (G.deathKind === 'here') {
      toast('成功原地复活');
      return;
    }
    if (G.deathKind === 'entrance') {
      leaveInstance();
      return;
    }
    travel('taiping', 24, 17);
  }

  /* ========== 绘制 ========== */
  var TILE_COLOR = {
    grass: '#3d6a32', dirt: '#8a6a3a', water: '#2a5a7a', moss: '#2f5a44',
    tree: '#245228', house: '#6a3a28', roof: '#8b1e1e', stone: '#6a6460',
    wall: '#3a3430', dock: '#8a6a48', rock: '#5a5854', arena: '#4a3a4a'
  };

  function draw() {
    stampNpcMarks();
    if (window.World3D && World3D.enabled && G.player && G.grid) {
      World3D.sync({
        player: G.player,
        maxHp: stats(G.player).maxHp,
        npcs: G.npcs,
        entities: G.entities,
        pet: G.player.pet && G.player.pet.hp > 0 ? G.player.pet : null,
        click: G.clickFx,
        target: G.player.target,
        drops: G.drops,
        herbs: G.herbs,
        portals: G.portals,
        floats: G.floats,
        path: G.path,
        questNpcId: currentQuestNpcId(),
        time: G.time
      });
      drawMinimap();
      drawHud();
      return;
    }
    var w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(0, 0, w, h);
    if (!G.grid || !G.player) return;
    var p = G.player;
    G.cam.x = p.x - w / 2;
    G.cam.y = p.y - h / 2;
    var ws = worldSize();
    G.cam.x = clamp(G.cam.x, 0, Math.max(0, ws.w - w));
    G.cam.y = clamp(G.cam.y, 0, Math.max(0, ws.h - h));

    var x0 = Math.floor(G.cam.x / TILE), y0 = Math.floor(G.cam.y / TILE);
    var x1 = Math.ceil((G.cam.x + w) / TILE), y1 = Math.ceil((G.cam.y + h) / TILE);
    for (var ty = y0; ty < y1; ty++) {
      for (var tx = x0; tx < x1; tx++) {
        if (!inGrid(G.grid, tx, ty)) continue;
        var t = G.grid[ty][tx];
        var sx = tx * TILE - G.cam.x, sy = ty * TILE - G.cam.y;
        if (window.Art && Art.ready) {
          Art.drawTile(ctx, t, sx, sy, TILE, G.time, tx, ty);
        } else {
          var col = TILE_COLOR[t] || '#333';
          ctx.fillStyle = t === 'water' ? shade(col, Math.sin(G.time * 2 + tx) * 8) : shade(col, ((tx * 13 + ty * 7) % 9) - 4);
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
        }
      }
    }

    if (window.Art && Art.ready) {
      for (ty = y0; ty < y1; ty++) {
        for (tx = x0; tx < x1; tx++) {
          if (!inGrid(G.grid, tx, ty)) continue;
          var pt = G.grid[ty][tx];
          if (pt === 'tree' || pt === 'house' || pt === 'roof') {
            Art.drawProp(ctx, pt, tx * TILE - G.cam.x, ty * TILE - G.cam.y, TILE);
          }
        }
      }
    }

    G.herbs.forEach(function (hb) {
      var s = worldToScreen(hb.x, hb.y);
      ctx.fillStyle = '#7dff9a';
      ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
    });
    G.drops.forEach(function (d) {
      var s = worldToScreen(d.x, d.y);
      ctx.fillStyle = d.item.rarity ? D.RARITY_COLOR[d.item.rarity] : '#f0d56a';
      ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
    });
    G.portals.forEach(function (pt) {
      var s = worldToScreen((pt.x + 0.5) * TILE, (pt.y + 0.5) * TILE);
      ctx.strokeStyle = '#d4af37';
      ctx.globalAlpha = 0.7 + Math.sin(G.time * 3) * 0.2;
      ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f3e6c4';
      ctx.font = '11px serif';
      ctx.textAlign = 'center';
      ctx.fillText(pt.label, s.x, s.y - 18);
    });
    if (G.path && G.path.length > 1) {
      ctx.strokeStyle = 'rgba(255, 210, 80, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      G.path.forEach(function (wp, i) {
        var s = worldToScreen((wp.x + 0.5) * TILE, (wp.y + 0.5) * TILE);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }
    G.npcs.forEach(function (n) {
      var s = worldToScreen(n.x, n.y);
      if (window.Art && Art.ready) Art.drawNpc(ctx, n, s, G.time);
      else {
        var mk = n.questMark === '?' ? '？' : (n.questMark ? '！' : '');
        drawActor(n.x, n.y, '#d4af37', 11, mk);
        ctx.fillStyle = '#c9a227';
        ctx.font = '11px serif';
        ctx.textAlign = 'center';
        if (n.title) ctx.fillText(n.title, s.x, s.y - 34);
        ctx.fillStyle = '#7dff7a';
        ctx.fillText(n.name, s.x, s.y - 22);
      }
    });
    G.entities.forEach(function (e) { drawMonster(e); });
    if (G.escort && G.mapId === 'road') {
      var cs = worldToScreen(G.escort.x, G.escort.y);
      if (window.Art && Art.ready) Art.drawCart(ctx, cs);
      else { ctx.fillStyle = '#c4a060'; ctx.fillRect(cs.x - 16, cs.y - 10, 32, 20); }
      drawBar(cs.x - 16, cs.y - 18, 32, G.escort.hp / G.escort.maxHp, '#c8312a');
      ctx.fillStyle = '#fff'; ctx.font = '11px serif'; ctx.textAlign = 'center';
      ctx.fillText('军资车', cs.x, cs.y + 22);
    }
    if (G.clickFx && G.clickFx.t > 0) {
      var mk = worldToScreen(G.clickFx.x, G.clickFx.y);
      ctx.strokeStyle = 'rgba(255,220,80,' + clamp(G.clickFx.t * 1.4, 0, 1) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, 10 + (0.7 - G.clickFx.t) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (p.pet && p.pet.hp > 0) {
      var ps = worldToScreen(p.pet.x, p.pet.y);
      if (window.Art && Art.ready) Art.drawPet(ctx, p.pet, ps, G.time);
      else drawActor(p.pet.x, p.pet.y, p.pet.color, 8, '');
    }
    drawHero(p);
    G.projectiles.forEach(function (pr) {
      var s = worldToScreen(pr.x, pr.y);
      ctx.fillStyle = pr.color || '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
    });
    G.particles.forEach(function (pt) {
      var s = worldToScreen(pt.x, pt.y);
      ctx.globalAlpha = clamp(pt.t * 2, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.fillRect(s.x, s.y, 3, 3);
      ctx.globalAlpha = 1;
    });
    G.floats.forEach(function (f) {
      var s = worldToScreen(f.x, f.y);
      ctx.globalAlpha = clamp(f.t * 1.4, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, s.x, s.y);
      ctx.globalAlpha = 1;
    });

    var tint = D.MAP_META[G.mapId].tint;
    ctx.fillStyle = 'rgba(' + Math.floor(tint[0] * 255) + ',' + Math.floor(tint[1] * 255) + ',' + Math.floor(tint[2] * 255) + ',0.16)';
    ctx.fillRect(0, 0, w, h);
    drawMinimap();
    drawHud();
  }

  function shade(hex, d) {
    var n = parseInt(hex.slice(1), 16);
    var r = clamp(((n >> 16) & 255) + d, 0, 255);
    var g = clamp(((n >> 8) & 255) + d, 0, 255);
    var b = clamp((n & 255) + d, 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function worldToScreen(x, y) { return { x: x - G.cam.x, y: y - G.cam.y }; }

  function drawActor(x, y, color, r, mark) {
    var s = worldToScreen(x, y);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y + r, r * 0.9, r * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
    if (mark) {
      ctx.fillStyle = '#ffd36a';
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(mark, s.x, s.y - r - 6);
    }
  }

  function drawHero(p) {
    var s = worldToScreen(p.x, p.y);
    var c = D.CLASSES[p.cls];
    if (!(window.Art && Art.ready && Art.drawHero(ctx, p, s, G.time))) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(p.facing);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 10, 12, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.color;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = c.accent;
      ctx.fillRect(10, -2, 14, 4);
      ctx.restore();
    }
    if (window.Art && Art.ready) {
      Art.drawNameplate(ctx, s.x, s.y + 22, D.CLASSES[p.cls].name, p.name, '#d8f5a0');
    }
    if (p.target) {
      var ts = worldToScreen(p.target.x, p.target.y);
      ctx.strokeStyle = '#ffd36a';
      ctx.beginPath(); ctx.arc(ts.x, ts.y, (p.target.r || 14) + 16, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawMonster(e) {
    var s = worldToScreen(e.x, e.y);
    if (!(window.Art && Art.ready && Art.drawMob(ctx, e, s, G.time))) {
      drawActor(e.x, e.y, e.color, e.r, e.boss ? '★' : '');
    }
    drawBar(s.x - 18, s.y - (e.boss ? 78 : 62), 36, e.hp / e.maxHp, '#c8312a');
    ctx.fillStyle = e.boss ? '#ffd36a' : '#f3e6c4';
    ctx.font = '10px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((e.boss ? '★ ' : '') + e.level + ' ' + e.name, s.x, s.y + 20);
  }

  function drawBar(x, y, w, ratio, color) {
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * clamp(ratio, 0, 1), 4);
  }

  function paintRadar(ctx, w, h, labeled) {
    ctx.fillStyle = '#071214';
    ctx.fillRect(0, 0, w, h);
    if (window.Art && Art.imgs && Art.imgs.radar) {
      ctx.globalAlpha = labeled ? 0.28 : 0.4;
      ctx.drawImage(Art.imgs.radar, 0, 0, w, h);
      ctx.globalAlpha = 1;
    }
    if (!G.grid) return;
    var gw = G.grid[0].length, gh = G.grid.length;
    var sx = w / gw, sy = h / gh;
    for (var y = 0; y < gh; y++) {
      for (var x = 0; x < gw; x++) {
        var t = G.grid[y][x];
        if (t === 'water') ctx.fillStyle = 'rgba(42,110,150,0.55)';
        else if (t === 'wall' || t === 'rock' || t === 'house' || t === 'roof') ctx.fillStyle = 'rgba(20,16,12,0.55)';
        else if (t === 'tree') ctx.fillStyle = 'rgba(30,70,40,0.35)';
        else ctx.fillStyle = 'rgba(46,90,70,0.22)';
        ctx.fillRect(x * sx, y * sy, sx + 0.4, sy + 0.4);
      }
    }
    if (G.path && G.path.length) {
      ctx.fillStyle = '#ffd36a';
      G.path.forEach(function (wp) {
        ctx.fillRect(wp.x * sx, wp.y * sy, Math.max(2, sx), Math.max(2, sy));
      });
    }
    G.portals.forEach(function (pt) {
      ctx.fillStyle = '#6cb6ff';
      ctx.fillRect((pt.x + 0.5) * sx - 2, (pt.y + 0.5) * sy - 2, 4, 4);
      if (labeled) {
        ctx.fillStyle = '#8ad4d6';
        ctx.font = '11px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(pt.label || '传送', (pt.x + 0.5) * sx + 4, (pt.y + 0.5) * sy);
      }
    });
    G.npcs.forEach(function (n) {
      ctx.fillStyle = n.questMark ? '#ffd36a' : '#ffe7a0';
      ctx.fillRect(n.x / TILE * sx - 2, n.y / TILE * sy - 2, 4, 4);
      if (labeled) {
        ctx.fillStyle = '#6fdf7a';
        ctx.font = '11px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(n.name, n.x / TILE * sx + 5, n.y / TILE * sy);
      }
    });
    G.entities.forEach(function (e) {
      ctx.fillStyle = e.boss ? '#ffd36a' : '#c8312a';
      ctx.fillRect(e.x / TILE * sx - 1, e.y / TILE * sy - 1, 3, 3);
    });
    if (G.player) {
      ctx.fillStyle = '#6fdf7a';
      ctx.fillRect(G.player.x / TILE * sx - 3, G.player.y / TILE * sy - 3, 6, 6);
      if (labeled) {
        ctx.fillStyle = '#ffe7a0';
        ctx.font = '11px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('我', G.player.x / TILE * sx + 6, G.player.y / TILE * sy - 4);
      }
    }
  }

  function drawMinimap() {
    if (!mini || !mctx) return;
    paintRadar(mctx, mini.width, mini.height, false);
    var nameEl = document.getElementById('map-name');
    if (nameEl && D.MAP_META[G.mapId]) nameEl.textContent = D.MAP_META[G.mapId].name;
    var coord = document.getElementById('map-coord');
    if (coord && G.player) {
      coord.textContent = Math.floor(G.player.x / TILE) + ',' + Math.floor(G.player.y / TILE);
    }
    var qb = document.querySelector('.quest-box');
    var inst = D.INSTANCES[G.mapId];
    if (qb) qb.hidden = !!(inst && inst.hideQuest);
    refreshInstanceHud();
    if (mapOverlayOpen() && regionTabOn()) paintRegionMap();
  }

  function mapOverlayOpen() {
    var el = document.getElementById('map-overlay');
    return !!(el && !el.hidden);
  }

  function regionTabOn() {
    var pane = document.getElementById('map-region');
    return !!(pane && !pane.hidden);
  }

  function closeMapOverlay() {
    var el = document.getElementById('map-overlay');
    if (el) el.hidden = true;
  }

  function showMapTab(tab) {
    var region = document.getElementById('map-region');
    var world = document.getElementById('map-world');
    if (region) region.hidden = tab !== 'region';
    if (world) world.hidden = tab !== 'world';
    document.querySelectorAll('[data-map-tab]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.mapTab === tab);
    });
    var title = document.getElementById('map-overlay-title');
    if (title) {
      title.textContent = tab === 'world'
        ? '世界地图'
        : (D.MAP_META[G.mapId] ? D.MAP_META[G.mapId].name : '区域地图');
    }
    if (tab === 'region') {
      paintRegionMap();
      fillMapNpcList();
    } else {
      fillWorldPins();
    }
  }

  function openMapOverlay(tab) {
    if (G.mode !== 'play') return;
    closePanels();
    closeDialog();
    var el = document.getElementById('map-overlay');
    if (!el) return;
    el.hidden = false;
    showMapTab(tab || 'region');
  }

  function refreshMapOverlay() {
    if (!mapOverlayOpen()) return;
    showMapTab(regionTabOn() ? 'region' : 'world');
  }

  function paintRegionMap() {
    var c = document.getElementById('region-canvas');
    if (!c) return;
    var ctx2 = c.getContext('2d');
    paintRadar(ctx2, c.width, c.height, true);
    var cx = document.getElementById('map-cx');
    var cy = document.getElementById('map-cy');
    if (cx && cy && G.player && document.activeElement !== cx && document.activeElement !== cy) {
      cx.placeholder = String(Math.floor(G.player.x / TILE));
      cy.placeholder = String(Math.floor(G.player.y / TILE));
    }
  }

  function fillMapNpcList() {
    var box = document.getElementById('map-npc-list');
    if (!box) return;
    var html = '';
    G.npcs.forEach(function (n) {
      var mark = n.questMark === '?' ? '？' : (n.questMark === '!' ? '！' : '');
      html += '<button type="button" class="map-npc" data-map-npc="' + n.id + '">' +
        mark + n.name + (n.title ? '　' + n.title : '') + '</button>';
    });
    G.portals.forEach(function (pt, i) {
      html += '<button type="button" class="map-pt" data-map-portal="' + i + '">传送 · ' +
        (pt.label || pt.to) + '</button>';
    });
    if (!html) html = '<p class="map-tip">此地暂无人物。</p>';
    box.innerHTML = html;
  }

  function fillWorldPins() {
    var box = document.getElementById('world-pins');
    if (!box) return;
    box.innerHTML = (D.WORLD_NODES || []).map(function (n) {
      return '<button type="button" class="world-pin' + (G.mapId === n.id ? ' here' : '') +
        '" data-world-go="' + n.id + '" style="left:' + n.left + ';top:' + n.top + '" title="' +
        (n.desc || n.name) + '">' + n.name + '</button>';
    }).join('');
  }

  function clickRegionCanvas(ev) {
    var c = document.getElementById('region-canvas');
    if (!c || !G.grid || !G.player) return;
    var r = c.getBoundingClientRect();
    var gx = ((ev.clientX - r.left) / r.width) * G.grid[0].length;
    var gy = ((ev.clientY - r.top) / r.height) * G.grid.length;
    G.guide = null;
    G.player.target = null;
    setDest((gx + 0.5) * TILE, (gy + 0.5) * TILE);
    toast('寻路至 ' + Math.floor(gx) + ',' + Math.floor(gy));
  }

  function pathToCoord(tx, ty) {
    if (!G.grid || !G.player) return;
    var gw = G.grid[0].length, gh = G.grid.length;
    tx = clamp(tx | 0, 0, gw - 1);
    ty = clamp(ty | 0, 0, gh - 1);
    G.guide = null;
    G.player.target = null;
    setDest((tx + 0.5) * TILE, (ty + 0.5) * TILE);
    toast('寻路至 ' + tx + ',' + ty);
  }

  function worldJump(id) {
    if (inInstance()) { toast('在副本地图中不能进行地图跳转'); return; }
    var node = null;
    (D.WORLD_NODES || []).forEach(function (n) { if (n.id === id) node = n; });
    if (!node) return;
    if (G.mapId === id) {
      toast('已在' + node.name);
      return;
    }
    closeMapOverlay();
    G.guide = null;
    if (id === 'poyang') {
      travel('capital', 36, 22);
      toast('找明军水兵进入鄱阳湖大战');
      return;
    }
    travel(id, node.tx, node.ty);
  }

  function refreshInstanceHud() {
    var el = document.getElementById('instance-hud');
    if (!el) return;
    var on = inInstance();
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
      info.textContent = '护送中　镖车 ' + Math.floor(G.escort.hp) + '/' + G.escort.maxHp;
    } else {
      info.textContent = '副本中';
    }
  }

  function tickInstance(dt) {
    if (!G.instance || G.hold) return;
    if (G.instance.left == null) return;
    G.instance.left -= dt;
    if (G.instance.left <= 0) {
      G.instance.left = 0;
      toast('副本时间已到，地图关闭');
      leaveInstance();
    }
  }

  function cyclePkMode() {
    if (!G.player) return;
    var list = D.PK_MODES || [];
    if (!list.length) return;
    var i = 0;
    for (; i < list.length; i++) if (list[i].id === G.player.pkMode) break;
    if (i >= list.length) i = 0;
    var next = list[(i + 1) % list.length];
    G.player.pkMode = next.id;
    toast('PK 模式：' + next.name);
    refreshPkMode();
  }

  function refreshPkMode() {
    var btn = document.getElementById('pk-mode');
    if (!btn || !G.player) return;
    var mode = (D.PK_MODES || []).filter(function (m) { return m.id === G.player.pkMode; })[0] || D.PK_MODES[0];
    btn.textContent = mode.name;
    btn.classList.toggle('all', mode.id === 'all');
    btn.classList.toggle('karma', mode.id === 'karma');
  }

  function drawHud() {
    var p = G.player, st = stats(p);
    document.getElementById('who-line').textContent = p.name + ' · ' + D.CLASSES[p.cls].name + '  ' + p.level + '级';
    var port = document.getElementById('portrait');
    var head = window.Art && Art.classHead ? Art.classHead(p.cls) : '';
    if (head) {
      port.textContent = '';
      port.style.backgroundImage = 'url(' + head + ')';
      port.style.backgroundSize = 'cover';
      port.style.backgroundRepeat = 'no-repeat';
      port.style.backgroundPosition = 'center top';
    } else {
      port.textContent = D.CLASSES[p.cls].name[0];
      port.style.color = D.CLASSES[p.cls].accent;
    }
    setBar('hp', p.hp, st.maxHp);
    setBar('mp', p.mp, st.maxMp);
    setBar('xp', p.exp, F.xpToNext(p.level));
    refreshPkMode();
    var tf = document.getElementById('target-frame');
    if (tf) {
      var t = p.target;
      if (t && t.hp > 0) {
        tf.hidden = false;
        document.getElementById('target-name').textContent = (t.boss ? '★ ' : '') + t.name + '  Lv.' + t.level;
        var ratio = t.hp / Math.max(1, t.maxHp);
        document.getElementById('target-hp').style.width = (100 * ratio) + '%';
        var tht = document.getElementById('target-hp-text');
        if (tht) tht.textContent = Math.floor(t.hp) + '/' + Math.floor(t.maxHp);
      } else {
        tf.hidden = true;
      }
    }
    renderSkills();
  }

  function setBar(id, cur, max) {
    document.getElementById(id + '-fill').style.width = (100 * cur / Math.max(1, max)) + '%';
    document.getElementById(id + '-text').textContent = Math.floor(cur) + '/' + Math.floor(max);
  }

  function ensureSkillBar() {
    var p = G.player;
    var box = document.getElementById('skill-bar');
    if (box.dataset.cls === p.cls && box.childElementCount) return;
    box.dataset.cls = p.cls;
    var html = D.SKILLS[p.cls].map(function (sk) {
      return '<div class="skill-slot" data-skill="' + sk.id + '">' +
        '<div class="key">' + sk.key + '</div>' +
        '<div class="name">' + sk.name + '</div>' +
        '<div class="cd" hidden></div></div>';
    }).join('');
    html += '<div class="util-slot" id="slot-hp"><div class="key">Q</div><div class="name">金创</div></div>';
    html += '<div class="util-slot" id="slot-mp"><div class="key">R</div><div class="name">内力</div></div>';
    html += '<div class="util-slot" id="slot-auto"><div class="key">Z</div><div class="name">挂机</div></div>';
    html += '<div class="util-slot" id="slot-pick"><div class="key">F</div><div class="name">拾取</div></div>';
    box.innerHTML = html;
  }

  function renderSkills() {
    var p = G.player;
    ensureSkillBar();
    var box = document.getElementById('skill-bar');
    D.SKILLS[p.cls].forEach(function (sk, i) {
      var slot = box.children[i];
      if (!slot) return;
      var lv = p.skills[sk.id] || 0;
      slot.classList.toggle('locked', lv <= 0);
      var cdEl = slot.querySelector('.cd');
      var cd = p.skillCd[sk.id] || 0;
      if (cd > 0) {
        cdEl.hidden = false;
        cdEl.textContent = cd.toFixed(1);
      } else {
        cdEl.hidden = true;
      }
    });
    var auto = document.getElementById('slot-auto');
    if (auto) auto.classList.toggle('auto-on', !!p.auto);
  }

  /* ========== 面板 ========== */
  function closePanels() {
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('open'); });
    closeMapOverlay();
  }

  function openPanel(id) {
    var el = document.getElementById('panel-' + id);
    var was = el.classList.contains('open');
    closePanels();
    if (!was) {
      el.classList.add('open');
      paintPanel(id);
    }
  }

  function paintPanel(id) {
    var p = G.player, st = stats(p);
    if (id === 'char') {
      var attrs = st.attrs;
      var rows = Object.keys(D.ATTR_LABEL).map(function (k) {
        return '<div class="stat-line"><span>' + D.ATTR_LABEL[k] + '</span><span>' + attrs[k] +
          (p.unspentAttr > 0 ? ' <button class="plus" data-add="' + k + '">+</button>' : '') + '</span></div>';
      }).join('');
      document.getElementById('panel-char').innerHTML =
        header('角色') +
        '<div class="grid-2"><div>' +
        '<div class="stat-line"><span>名号</span><span>' + p.name + '</span></div>' +
        '<div class="stat-line"><span>职业</span><span>' + D.CLASSES[p.cls].name + '</span></div>' +
        '<div class="stat-line"><span>等级</span><span>' + p.level + '</span></div>' +
        '<div class="stat-line"><span>银两 / 金锭</span><span>' + p.silver + ' / ' + p.gold + '</span></div>' +
        '<div class="stat-line"><span>可分配属性</span><span>' + p.unspentAttr + '</span></div>' +
        rows + '</div><div class="equip-list">' +
        D.SLOTS.map(function (s) {
          var it = p.equip[s.id];
          return '<div class="slot-row"><span>' + s.name + '</span><span style="color:' +
            (it ? D.RARITY_COLOR[it.rarity] : '#888') + '">' + (it ? itemName(it) : '空') + '</span></div>';
        }).join('') +
        '<div class="stat-line"><span>外攻 / 内攻</span><span>' + st.patk + ' / ' + st.matk + '</span></div>' +
        '<div class="stat-line"><span>外防 / 内防</span><span>' + st.pdef + ' / ' + st.mdef + '</span></div>' +
        '<div class="stat-line"><span>暴击</span><span>' + (st.crit * 100).toFixed(1) + '%</span></div>' +
        '</div></div>';
    } else if (id === 'bag') {
      document.getElementById('panel-bag').innerHTML = header('背包') +
        '<p style="color:#b8a57a;margin-bottom:8px">左键使用/装备，右键丢弃。银两 ' + p.silver + '</p>' +
        '<div class="bag-grid">' + p.bag.map(function (it, i) {
          var col = it.rarity ? D.RARITY_COLOR[it.rarity] : '#f3e6c4';
          return '<div class="item-cell" data-bag="' + i + '" style="color:' + col + '">' + itemName(it) +
            (it.n > 1 ? '<span class="n">' + it.n + '</span>' : '') + '</div>';
        }).join('') + '</div>';
    } else if (id === 'skills') {
      document.getElementById('panel-skills').innerHTML = header('武学') +
        '<p style="margin-bottom:8px">剩余技能点 ' + p.unspentSkill + '</p>' +
        D.SKILLS[p.cls].map(function (sk) {
          var lv = p.skills[sk.id] || 0;
          return '<div class="stat-line"><span>' + sk.name + ' Lv.' + lv +
            (p.level < sk.unlock ? '（' + sk.unlock + '级）' : '') +
            '<br/><small style="color:#b8a57a">' + sk.desc + '</small></span>' +
            (p.unspentSkill > 0 && p.level >= sk.unlock && lv < 8 ?
              '<button class="plus" data-sk="' + sk.id + '">+</button>' : '') + '</div>';
        }).join('');
    } else if (id === 'pet') {
      document.getElementById('panel-pet').innerHTML = header('灵宠') + (p.pet
        ? '<p>' + p.pet.name + '　生命 ' + Math.floor(p.pet.hp) + '/' + p.pet.maxHp + '</p>' +
          '<p style="color:#b8a57a;margin:8px 0">出战随行，自动攻击你的目标。口粮可回复生命。</p>' +
          '<button class="btn" id="btn-feed">喂食口粮</button>'
        : '<p>尚未结缘。前往神农谷击败山魈，有机会收服灵宠。</p>');
    } else if (id === 'forge') {
      document.getElementById('panel-forge').innerHTML = header('百工炉') +
        '<p style="color:#b8a57a;margin-bottom:8px">强化石 ' + countItem(p, 'stone') +
        '　开孔符 ' + countItem(p, 'socket') + '　银两 ' + p.silver + '</p>' +
        '<div class="equip-list">' + D.SLOTS.map(function (s) {
          var it = p.equip[s.id];
          if (!it) return '';
          return '<div class="slot-row"><span style="color:' + D.RARITY_COLOR[it.rarity] + '">' + itemName(it) +
            ' 孔' + it.sockets + '</span><span>' +
            '<button class="btn" data-en="' + s.id + '">升星</button> ' +
            '<button class="btn ghost" data-so="' + s.id + '">开孔</button></span></div>';
        }).join('') + '</div>' +
        '<h4 style="color:#d4af37;margin:12px 0 6px">炼药</h4>' +
        D.RECIPES.map(function (r, i) {
          var keys = Object.keys(r.ins);
          return '<div class="stat-line"><span>' + keys.map(function (k) {
            return D.CONSUMABLES[k].name + '×' + r.ins[k] + '（有' + countItem(p, k) + '）';
          }).join(' + ') + ' → ' + D.CONSUMABLES[r.out.id].name + '</span>' +
            '<button class="btn" data-craft="' + i + '">炼</button></div>';
        }).join('') +
        '<h4 style="color:#d4af37;margin:12px 0 6px">镶石（点击灵石镶入当前武器）</h4>' +
        p.bag.filter(function (it) { return it.type === 'gem'; }).map(function (it, i) {
          return '<div class="stat-line"><span>' + itemName(it) + '</span><button class="btn ghost" data-gem="' + it.uid + '">镶武器</button></div>';
        }).join('') || '<p>背包暂无灵石</p>';
    } else if (id === 'quest') {
      document.getElementById('panel-quest').innerHTML = header('功业') +
        D.QUESTS.map(function (q) {
          var stt = p.quests.done.indexOf(q.id) >= 0 ? '已完成' : (p.quests.active.indexOf(q.id) >= 0 ? '进行中' : '未开启');
          var go = p.quests.active.indexOf(q.id) >= 0
            ? '<button class="btn" data-quest-go="' + q.id + '">寻路</button>' : '';
          return '<div class="stat-line"><span>' + q.name + '<br/><small style="color:#b8a57a">' + q.text + '</small></span><span>' + stt + ' ' + go + '</span></div>';
        }).join('');
    } else if (id === 'help') {
      document.getElementById('panel-help').innerHTML = header('帮助') +
        D.HELP.map(function (h) { return '<p style="margin:6px 0;color:#d8c8a0">' + h + '</p>'; }).join('');
    }
  }

  function header(title) {
    return '<h3>' + title + '<button class="close" data-close="1">×</button></h3>';
  }

  function openShop(kind) {
    var p = G.player;
    G.shopKind = kind;
    var list;
    if (kind === 'mall') {
      var seen = {};
      list = [];
      ['smith', 'drug'].forEach(function (k) {
        (D.SHOPS[k] || []).forEach(function (s) {
          if (seen[s.id]) return;
          seen[s.id] = 1;
          list.push(s);
        });
      });
    } else {
      list = D.SHOPS[kind] || [];
    }
    closePanels();
    var el = document.getElementById('panel-shop');
    el.classList.add('open');
    el.innerHTML = header(kind === 'mall' ? '商城' : '货殖') + list.map(function (s) {
      return '<div class="stat-line"><span>' + D.CONSUMABLES[s.id].name + '　' + s.price + ' 两</span>' +
        '<button class="btn" data-buy="' + s.id + '" data-price="' + s.price + '">购</button></div>';
    }).join('');
  }

  /* ========== 对话 ========== */
  function talkNpc(n) {
    var def = D.NPCS[n.id];
    if (!def) return;
    var el = document.getElementById('dialog');
    var opts = '<button class="btn ghost" data-bye="1">告辞</button>';
    if (def.shop) opts += '<button class="btn" data-openshop="' + def.shop + '">买卖</button>';
    if (def.forge) opts += '<button class="btn" data-openforge="1">开炉</button>';
    if (def.escort) opts += '<button class="btn" data-escort="1">接下押镖（押金20两）</button>';
    if (def.tower) {
      ensureDungeon(G.player);
      opts += '<button class="btn" data-open-tower="1">选择关卡</button>';
      opts += '<button class="btn ghost" data-tower-auto="1">自动闯关（每关' + (D.INSTANCES.tower.autoCost || 5) + '两）</button>';
    }
    if (def.poyang) {
      (D.INSTANCES.poyang.diffs || []).forEach(function (d) {
        opts += '<button class="btn" data-poyang-diff="' + d.id + '">' + d.name + '难度</button>';
      });
    }
    if (inInstance()) opts += '<button class="btn ghost" data-leave-instance="1">离开副本</button>';
    if (n.id === 'xunshou' && !G.player.pet) opts += '<button class="btn" data-buypet="1">以 80 两请一只幼兽</button>';
    var face = (window.Art && Art.npcPortrait) ? Art.npcPortrait(n.id) : '';
    var who = (def.title ? def.title + ' · ' : '') + n.name;
    el.innerHTML = '<div class="dialog-body">' +
      (face ? '<img class="npc-face" src="' + face + '" alt="" />' : '') +
      '<div class="dialog-text"><div class="who">' + who + '</div><div>' + (def.lines[0] || '') +
      '</div><div class="opts">' + opts + '</div></div></div>';
    el.classList.add('open');
    G.dialogNpc = n;
    maybeCompleteTalk(n.id);
    if (n.id === 'bagong') maybeCompleteTalk('chefu');
  }

  function openTowerSelect() {
    var p = G.player;
    ensureDungeon(p);
    var unlock = p.towerUnlock || 1;
    var used = p.dungeon.tower || 0;
    var daily = D.INSTANCES.tower.daily;
    var floors = '';
    for (var i = 1; i <= (D.INSTANCES.tower.floors || 10); i++) {
      var locked = i > unlock;
      floors += '<button type="button" class="btn' + (locked ? ' ghost' : '') +
        '" data-tower-floor="' + i + '"' + (locked ? ' disabled' : '') + '>第' + i + '关' +
        (locked ? '（未开通）' : '') + '</button>';
    }
    var el = document.getElementById('dialog');
    el.innerHTML = '<div class="dialog-body"><div class="dialog-text">' +
      '<div class="who">大明英雄副本</div>' +
      '<div>今日次数 ' + used + '/' + daily + '　已开通至第 ' + unlock + ' 关。击败本关全部怪物即算成功。</div>' +
      '<div class="opts">' + floors +
      '<button class="btn ghost" data-bye="1">告辞</button></div></div></div>';
    el.classList.add('open');
  }

  function closeDialog() {
    document.getElementById('dialog').classList.remove('open');
    G.dialogNpc = null;
  }

  /* ========== 存档 ========== */
  function currentServer() {
    var q = new URLSearchParams(location.search);
    return q.get('server') || localStorage.getItem('hongwu-server') || 's1';
  }

  function serialize() {
    return {
      v: 1, player: G.player, mapId: G.mapId, towerFloor: G.towerFloor, log: G.log.slice(0, 5)
    };
  }

  function saveSilent() {
    var data = serialize();
    try { localStorage.setItem(SAVE_KEY + ':' + currentServer(), JSON.stringify(data)); } catch (e) { /* ignore */ }
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { /* ignore */ }
    if (window.GameAPI && GameAPI.online && GameAPI.token) {
      GameAPI.saveRole(currentServer(), data).catch(function () {});
    }
  }

  function saveNow() {
    saveSilent();
    toast('进度已记入本机');
  }

  function applySave(data) {
    if (!data || !data.player) return false;
    G.player = data.player;
    G.player.buffs = G.player.buffs || [];
    G.player.skillCd = {};
    G.player.target = null;
    G.player.auto = false;
    G.player.pkMode = G.player.pkMode || 'peace';
    G.player.towerUnlock = G.player.towerUnlock || 1;
    ensureDungeon(G.player);
    G.log = data.log || [];
    G.towerFloor = data.towerFloor || 0;
    var mapId = data.mapId || 'taiping';
    if (D.MAP_META[mapId] && D.MAP_META[mapId].instance) {
      mapId = 'capital';
      G.player.x = 20 * TILE;
      G.player.y = 20 * TILE;
      G.instance = null;
    }
    buildMap(mapId);
    var pos = snapWalkable(G.player.x, G.player.y);
    G.player.x = pos.x;
    G.player.y = pos.y;
    renderLog();
    refreshQuestUI();
    return true;
  }

  function hasSave() {
    try { return !!(localStorage.getItem(SAVE_KEY + ':' + currentServer()) || localStorage.getItem(SAVE_KEY)); } catch (e) { return false; }
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY + ':' + currentServer()) || localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      return applySave(JSON.parse(raw));
    } catch (e) {
      return false;
    }
  }

  /* ========== 输入 ========== */
  function screenToWorld(clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    return { x: clientX - r.left + G.cam.x, y: clientY - r.top + G.cam.y };
  }

  function onPointer(ev) {
    if (G.mode !== 'play') return;
    var wpos = (window.World3D && World3D.enabled)
      ? World3D.pick(ev.clientX, ev.clientY)
      : screenToWorld(ev.clientX, ev.clientY);
    if (!wpos) return;
    G.mouse.wx = wpos.x;
    G.mouse.wy = wpos.y;
    var p = G.player;
    for (var i = 0; i < G.npcs.length; i++) {
      if (dist(wpos, G.npcs[i]) < 28) { talkNpc(G.npcs[i]); return; }
    }
    var nearest = null, nd = 40;
    G.entities.forEach(function (e) {
      var d = dist(wpos, e);
      if (d < nd) { nd = d; nearest = e; }
    });
    if (nearest) {
      p.target = nearest;
      closeDialog();
      return;
    }
    setDest(wpos.x, wpos.y);
    p.target = null;
    G.guide = null;
    closeDialog();
  }

  function useBagItem(index, discard) {
    var p = G.player;
    var it = p.bag[index];
    if (!it) return;
    if (discard) {
      p.bag.splice(index, 1);
      toast('弃去 ' + itemName(it));
      paintPanel('bag');
      return;
    }
    if (it.type === 'equip') {
      var old = p.equip[it.slot];
      p.equip[it.slot] = it;
      p.bag.splice(index, 1);
      if (old) p.bag.push(old);
      toast('装备 ' + itemName(it));
    } else if (it.potion === 'hp') {
      takeItem(p, it.id, 1);
      var st = stats(p);
      var h = F.potionHeal(it.tier || 1, st.maxHp);
      p.hp = Math.min(st.maxHp, p.hp + h);
    } else if (it.potion === 'mp') {
      takeItem(p, it.id, 1);
      var st2 = stats(p);
      var m = F.potionHeal(it.tier || 1, st2.maxMp);
      p.mp = Math.min(st2.maxMp, p.mp + m);
    } else if (it.id === 'badge') {
      takeItem(p, 'badge', 1);
      addExp(p, 80);
      toast('缴上腰牌，经验 +80');
    } else if (it.id === 'hero_pack' || it.kind === 'pack') {
      takeItem(p, it.id, 1);
      if (Math.random() < 0.45) {
        var gdef = D.GEMS[irand(0, D.GEMS.length - 1)];
        addItem(p, { uid: uid(), type: 'gem', id: gdef.id, name: gdef.name, kind: gdef.kind, grade: 1 });
        toast('打开英雄礼包：' + gdef.name);
      } else if (Math.random() < 0.5) {
        addItem(p, { id: 'stone', n: 2 });
        toast('打开英雄礼包：强化石×2');
      } else {
        addItem(p, { id: 'hp2', n: 2 });
        toast('打开英雄礼包：大型金创药×2');
      }
    } else if (it.kind === 'feed' || it.id === 'feed') {
      if (!p.pet) { toast('没有灵宠'); return; }
      takeItem(p, 'feed', 1);
      p.pet.hp = Math.min(p.pet.maxHp, p.pet.hp + 60);
      toast('灵宠进食');
    } else {
      toast(itemName(it));
    }
    paintPanel('bag');
  }

  function enhanceSlot(slot) {
    var p = G.player;
    var it = p.equip[slot];
    if (!it) return;
    if (it.stars >= 10) { toast('已至满星'); return; }
    var cost = F.enhanceCost(it.stars, it.level);
    if (p.silver < cost) { toast('银两不足 ' + cost); return; }
    if (!takeItem(p, 'stone', 1)) { toast('缺少强化石'); return; }
    p.silver -= cost;
    if (Math.random() < F.enhanceChance(it.stars)) {
      it.stars += 1;
      Object.keys(it.stats).forEach(function (k) {
        if (k === 'crit' || k === 'speed') it.stats[k] = +(it.stats[k] * 1.08).toFixed(3);
        else it.stats[k] = Math.floor(it.stats[k] * 1.08);
      });
      toast(itemName(it) + ' 升星成功');
      p.flags.enhanced = true;
      questCheck();
    } else {
      toast('炉火不稳，升星失败');
    }
    paintPanel('forge');
  }

  function socketSlot(slot) {
    var p = G.player;
    var it = p.equip[slot];
    if (!it) return;
    if (it.sockets >= 3) { toast('孔位已满'); return; }
    var cost = F.socketCost(it.sockets);
    if (p.silver < cost) { toast('银两不足'); return; }
    if (!takeItem(p, 'socket', 1)) { toast('缺少开孔符'); return; }
    p.silver -= cost;
    it.sockets += 1;
    toast('开孔成功');
    paintPanel('forge');
  }

  function inlayGem(uid) {
    var p = G.player;
    var it = p.equip.weapon;
    if (!it) return;
    if ((it.gems || []).length >= (it.sockets || 0)) { toast('先开孔'); return; }
    var idx = p.bag.findIndex(function (x) { return x.uid === uid; });
    if (idx < 0) return;
    var gem = p.bag.splice(idx, 1)[0];
    it.gems = it.gems || [];
    it.gems.push(gem);
    toast('镶入 ' + itemName(gem));
    paintPanel('forge');
  }

  function craftRecipe(i) {
    var p = G.player;
    var r = D.RECIPES[i];
    var keys = Object.keys(r.ins);
    for (var k = 0; k < keys.length; k++) {
      if (countItem(p, keys[k]) < r.ins[keys[k]]) { toast('材料不足'); return; }
    }
    keys.forEach(function (id) { takeItem(p, id, r.ins[id]); });
    addItem(p, { id: r.out.id, n: r.out.n });
    toast('炼成 ' + D.CONSUMABLES[r.out.id].name);
    paintPanel('forge');
  }

  function bindPlayEvents() {
    function bindCanvas(el) {
      if (!el) return;
      el.addEventListener('mousedown', onPointer);
      el.addEventListener('mousemove', function (ev) {
        var wpos = (window.World3D && World3D.enabled)
          ? World3D.pick(ev.clientX, ev.clientY)
          : screenToWorld(ev.clientX, ev.clientY);
        if (!wpos) return;
        G.mouse.wx = wpos.x;
        G.mouse.wy = wpos.y;
      });
    }
    bindCanvas(canvas);
    bindCanvas(canvas3d);
    window.addEventListener('keydown', function (ev) {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) {
        if (ev.code === 'Escape') { ev.target.blur(); closeMapOverlay(); }
        return;
      }
      if (mapOverlayOpen()) {
        if (ev.code === 'Escape' || ev.code === 'KeyM') {
          ev.preventDefault();
          closeMapOverlay();
        }
        return;
      }
      G.keys[ev.code] = true;
      if (G.mode !== 'play') return;
      if (ev.code === 'Escape') { closePanels(); closeDialog(); return; }
      if (ev.code === 'KeyM') { ev.preventDefault(); openMapOverlay('region'); return; }
      if (ev.code === 'KeyC') openPanel('char');
      if (ev.code === 'KeyB') openPanel('bag');
      if (ev.code === 'KeyV') openPanel('skills');
      if (ev.code === 'KeyP') openPanel('pet');
      if (ev.code === 'KeyE') openPanel('forge');
      if (ev.code === 'KeyJ') openPanel('quest');
      if (ev.code === 'KeyN' || ev.code === 'Slash') openPanel('help');
      if (ev.code === 'KeyF') pickupNear();
      if (ev.code === 'KeyZ') {
        G.player.auto = !G.player.auto;
        toast(G.player.auto ? '挂机开启' : '挂机关闭');
      }
      if (ev.code === 'KeyQ') usePotion('hp');
      if (ev.code === 'KeyR') usePotion('mp');
      if (ev.code === 'Space') { ev.preventDefault(); playerAttack(); }
      var map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 };
      if (map[ev.code] != null) castSkill(D.SKILLS[G.player.cls][map[ev.code]]);
    });
    window.addEventListener('keyup', function (ev) {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
      G.keys[ev.code] = false;
    });

    var sys = document.querySelector('.sys-btns') || document.querySelector('.menu-left');
    if (sys) {
      sys.addEventListener('click', function (ev) {
        var btn = ev.target.closest('button');
        if (!btn) return;
        if (btn.id === 'btn-save') saveNow();
        else if (btn.id === 'btn-auto') {
          G.player.auto = !G.player.auto;
          toast(G.player.auto ? '挂机开启' : '挂机关闭');
        } else if (btn.dataset.panel) openPanel(btn.dataset.panel);
      });
    }
    var chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var input = document.getElementById('chat-input');
        var text = (input.value || '').trim();
        if (!text) return;
        input.value = '';
        log((window.GameAPI && GameAPI.user ? GameAPI.user : '我') + '：' + text);
        if (window.GameAPI && GameAPI.online) GameAPI.chatSend(text).catch(function () {});
      });
    }
    document.getElementById('skill-bar').addEventListener('click', function (ev) {
      var slot = ev.target.closest('.skill-slot');
      if (slot) {
        var sk = D.SKILLS[G.player.cls].find(function (s) { return s.id === slot.dataset.skill; });
        castSkill(sk);
        return;
      }
      if (ev.target.closest('#slot-hp')) usePotion('hp');
      if (ev.target.closest('#slot-mp')) usePotion('mp');
      if (ev.target.closest('#slot-pick')) pickupNear();
      if (ev.target.closest('#slot-auto')) {
        G.player.auto = !G.player.auto;
        toast(G.player.auto ? '挂机开启' : '挂机关闭');
      }
    });
    document.getElementById('play-screen').addEventListener('click', function (ev) {
      if (ev.target.dataset.close) closePanels();
      if (ev.target.dataset.add && G.player.unspentAttr > 0) {
        G.player.added[ev.target.dataset.add] += 1;
        G.player.unspentAttr -= 1;
        paintPanel('char');
      }
      if (ev.target.dataset.sk && G.player.unspentSkill > 0) {
        G.player.skills[ev.target.dataset.sk] = (G.player.skills[ev.target.dataset.sk] || 0) + 1;
        G.player.unspentSkill -= 1;
        paintPanel('skills');
      }
      if (ev.target.dataset.bag != null) useBagItem(+ev.target.dataset.bag, false);
      if (ev.target.dataset.en) enhanceSlot(ev.target.dataset.en);
      if (ev.target.dataset.so) socketSlot(ev.target.dataset.so);
      if (ev.target.dataset.gem) inlayGem(ev.target.dataset.gem);
      if (ev.target.dataset.craft != null) craftRecipe(+ev.target.dataset.craft);
      if (ev.target.dataset.buy) {
        var price = +ev.target.dataset.price;
        if (G.player.silver < price) { toast('银两不足'); return; }
        G.player.silver -= price;
        addItem(G.player, { id: ev.target.dataset.buy, n: 1 });
        toast('购得物品');
        openShop(G.shopKind || 'smith');
      }
      if (ev.target.closest && ev.target.closest('[data-quest-go]')) {
        var qid = ev.target.closest('[data-quest-go]').dataset.questGo;
        var qq = D.QUESTS.find(function (x) { return x.id === qid; }) || currentQuest();
        closePanels();
        followQuest(qq);
      }
      if (ev.target.id === 'btn-feed') {
        if (takeItem(G.player, 'feed', 1) && G.player.pet) {
          G.player.pet.hp = Math.min(G.player.pet.maxHp, G.player.pet.hp + 60);
          toast('灵宠进食');
          paintPanel('pet');
        } else toast('没有口粮');
      }
    });
    document.getElementById('play-screen').addEventListener('contextmenu', function (ev) {
      var cell = ev.target.closest('[data-bag]');
      if (cell) {
        ev.preventDefault();
        useBagItem(+cell.dataset.bag, true);
      }
    });
    document.getElementById('dialog').addEventListener('click', function (ev) {
      if (ev.target.dataset.bye) closeDialog();
      if (ev.target.dataset.openshop) { closeDialog(); openShop(ev.target.dataset.openshop); }
      if (ev.target.dataset.openforge) { closeDialog(); openPanel('forge'); }
      if (ev.target.dataset.escort) startEscort();
      if (ev.target.dataset.openTower) { closeDialog(); openTowerSelect(); }
      if (ev.target.dataset.towerAuto) { closeDialog(); enterTower(G.player.towerUnlock || 1, true); }
      if (ev.target.dataset.towerFloor) enterTower(+ev.target.dataset.towerFloor, false);
      if (ev.target.dataset.poyangDiff) enterPoyang(ev.target.dataset.poyangDiff);
      if (ev.target.dataset.leaveInstance) { closeDialog(); leaveInstance(); }
      if (ev.target.dataset.buypet) {
        if (G.player.silver < 80) { toast('银两不足'); return; }
        G.player.silver -= 80;
        grantPet();
        closeDialog();
      }
    });
    var shopBtn = document.getElementById('btn-shop');
    if (shopBtn) {
      shopBtn.addEventListener('click', function () { openShop('mall'); });
    }
    if (mini) {
      mini.addEventListener('mousedown', function (ev) {
        if (G.mode !== 'play' || !G.grid || !G.player) return;
        var r = mini.getBoundingClientRect();
        var gx = ((ev.clientX - r.left) / r.width) * G.grid[0].length;
        var gy = ((ev.clientY - r.top) / r.height) * G.grid.length;
        G.guide = null;
        G.player.target = null;
        setDest((gx + 0.5) * TILE, (gy + 0.5) * TILE);
      });
    }
    var btnRegion = document.getElementById('btn-region-map');
    if (btnRegion) btnRegion.addEventListener('click', function () { openMapOverlay('region'); });
    var btnWorld = document.getElementById('btn-world-map');
    if (btnWorld) btnWorld.addEventListener('click', function () { openMapOverlay('world'); });
    var pkBtn = document.getElementById('pk-mode');
    if (pkBtn) pkBtn.addEventListener('click', cyclePkMode);
    var overlay = document.getElementById('map-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay || (ev.target.closest && ev.target.closest('[data-close-map]'))) {
          closeMapOverlay();
          return;
        }
        var tab = ev.target.closest && ev.target.closest('[data-map-tab]');
        if (tab) showMapTab(tab.dataset.mapTab);
        var npcBtn = ev.target.closest && ev.target.closest('[data-map-npc]');
        if (npcBtn) followNpcOnMap(npcBtn.dataset.mapNpc);
        var ptBtn = ev.target.closest && ev.target.closest('[data-map-portal]');
        if (ptBtn && G.portals[+ptBtn.dataset.mapPortal]) {
          var pt = G.portals[+ptBtn.dataset.mapPortal];
          G.guide = null;
          setDest((pt.x + 0.5) * TILE, (pt.y + 0.5) * TILE);
          toast('寻路至传送点：' + (pt.label || pt.to));
        }
        var pin = ev.target.closest && ev.target.closest('[data-world-go]');
        if (pin) worldJump(pin.dataset.worldGo);
      });
    }
    var regionCanvas = document.getElementById('region-canvas');
    if (regionCanvas) regionCanvas.addEventListener('mousedown', clickRegionCanvas);
    var coordForm = document.getElementById('map-coord-form');
    if (coordForm) {
      coordForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var x = parseInt(document.getElementById('map-cx').value, 10);
        var y = parseInt(document.getElementById('map-cy').value, 10);
        if (isNaN(x) || isNaN(y)) {
          toast('请输入坐标 X、Y');
          return;
        }
        pathToCoord(x, y);
      });
    }
    document.getElementById('btn-revive').addEventListener('click', revive);
    var leaveBtn = document.getElementById('btn-leave-instance');
    if (leaveBtn) leaveBtn.addEventListener('click', leaveInstance);
    var floorEl = document.getElementById('floor-clear');
    if (floorEl) {
      floorEl.addEventListener('click', function (ev) {
        var act = ev.target.dataset.floor;
        if (act === 'continue') continueTower();
        if (act === 'rest' || act === 'leave') leaveInstance();
      });
    }
  }

  /* ========== 主循环 ========== */
  function loop(ts) {
    if (!G.last) G.last = ts;
    var dt = Math.min(0.05, (ts - G.last) / 1000);
    G.last = ts;
    G.time += dt;
    if (G.mode === 'play' && G.player && !document.getElementById('death').classList.contains('open')) {
      updatePlayer(dt);
      updateMonsters(dt);
      updatePet(dt);
      updateProjectiles(dt);
      updateEscort(dt);
      tickInstance(dt);
      updateFx(dt);
      G.saveAcc = (G.saveAcc || 0) + dt;
      if (G.saveAcc > 15) { G.saveAcc = 0; saveSilent(); }
    } else if (G.mode === 'play') {
      updateFx(dt);
    }
    if (G.mode === 'play') draw();
    requestAnimationFrame(loop);
  }

  function enterPlay(fromSave) {
    G.mode = 'play';
    showScreen('play-screen');
    resize();
    requestAnimationFrame(function () { resize(); });
    if (!fromSave) {
      buildMap('taiping');
      G.player.x = SPAWN.x;
      G.player.y = SPAWN.y;
      log('洪武元年。点右侧任务可自动寻路；左键点地行走，点人对话，点怪攻击。');
      toast('点击任务追踪即可自动寻路');
    } else {
      var fix = snapWalkable(G.player.x, G.player.y);
      G.player.x = fix.x;
      G.player.y = fix.y;
    }
    refreshQuestUI();
    renderLog();
    saveSilent();
  }

  function paintClasses() {
    var box = document.getElementById('class-grid');
    if (!box) return;
    box.innerHTML = Object.keys(D.CLASSES).map(function (id) {
      var c = D.CLASSES[id];
      var src = window.Art && Art.src[Art.classKey(id)] ? Art.src[Art.classKey(id)] : '';
      return '<div class="class-card' + (G.selectedClass === id ? ' selected' : '') + '" data-cls="' + id + '">' +
        (src ? '<div class="class-art" style="background-image:url(' + src + ')"></div>' : '') +
        '<h3 style="color:' + c.accent + '">' + c.name + '</h3>' +
        '<div class="weapon">兵器 · ' + c.weapon + '</div>' +
        '<p>' + c.desc + '</p></div>';
    }).join('');
    var tip = document.getElementById('class-tip');
    if (tip) tip.textContent = D.CLASSES[G.selectedClass].tip;
  }

  function startCreate() {
    showScreen('create-screen');
    paintClasses();
  }

  function boot() {
    if (!document.getElementById('play-screen')) return;
    localStorage.setItem('hongwu-server', currentServer());
    var grid = document.getElementById('class-grid');
    if (grid) {
      grid.addEventListener('click', function (ev) {
        var card = ev.target.closest('[data-cls]');
        if (!card) return;
        G.selectedClass = card.dataset.cls;
        paintClasses();
      });
    }
    var enter = document.getElementById('btn-enter');
    if (enter) {
      enter.addEventListener('click', function () {
        var name = (document.getElementById('name-input').value || '').trim() || randomName();
        G.player = makePlayer(name, G.selectedClass);
        enterPlay(false);
      });
    }
    bindPlayEvents();
    function start3D() {
      if (!window.World3D || !canvas3d) return;
      canvas3d.style.display = 'block';
      resize();
      if (World3D.init(canvas3d)) {
        canvas.style.display = 'none';
        if (G.grid) World3D.rebuild(G.grid, G.mapId);
      } else {
        canvas3d.style.display = 'none';
        canvas.style.display = 'block';
      }
    }
    if (window.Art) {
      Art.load(function () {
        paintClasses();
        start3D();
      });
    } else {
      start3D();
    }
    requestAnimationFrame(loop);

    function goSavedOrCreate() {
      if (loadSave()) enterPlay(true);
      else startCreate();
    }

    if (window.GameAPI) {
      GameAPI.probe().then(function (ok) {
        if (!ok || !GameAPI.token) { goSavedOrCreate(); return; }
        return GameAPI.loadRole(currentServer()).then(function (j) {
          if (j.role && applySave(j.role)) enterPlay(true);
          else goSavedOrCreate();
        });
      }).catch(goSavedOrCreate);
    } else {
      goSavedOrCreate();
    }
  }

  function randomName() {
    var a = ['沈', '陆', '萧', '叶', '苏', '白', '顾', '江'];
    var b = ['行舟', '听雨', '无锋', '清和', '望舒', '未央', '拾光'];
    return a[irand(0, a.length - 1)] + b[irand(0, b.length - 1)];
  }

  boot();
})();
