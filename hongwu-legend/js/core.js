/**
 * 大明传说 — 核心状态、工具函数、存档
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {
  H.F = window.Formulas;
  H.D = window.GameData;
  H.TILE = 40;
  H.SAVE_KEY = 'hongwu-legend-save-v1';
  H.BAG_CAP = 36;
  H.SPAWN = { x: 50.5 * 40, y: 68.5 * 40 };

  H.canvas = document.getElementById('world');
  H.canvas3d = document.getElementById('world3d');
  H.ctx = H.canvas.getContext('2d');
  H.mini = document.getElementById('minimap');
  H.mctx = H.mini.getContext('2d');

  H.G = {
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
    selectedNation: 'ming',
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
    deathKind: 'village',
    fires: [],
    rankTab: 'level',
    peers: [],
    chatChan: 'near',
    chatTo: '',
    hidePeers: false,
    followUser: '',
    netAcc: 0,
    tradeOffer: { items: [], silver: 0 },
    onlineN: 0
  };

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.uid = function () { return 'id' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3); }

  H.rand = function (a, b) { return a + Math.random() * (b - a); }

  H.irand = function (a, b) { return Math.floor(H.rand(a, b + 1)); }

  H.clamp = function (n, a, b) { return Math.max(a, Math.min(b, n)); }

  H.dist = function (a, b) { var dx = a.x - b.x, dy = a.y - b.y; return Math.hypot(dx, dy); }

  H.ang = function (a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }

  H.toast = function (msg) {
    var el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.style.display = 'block';
    G.toastT = 2.2;
  }

  H.log = function (msg) {
    G.log.unshift(msg);
    if (G.log.length > 30) G.log.pop();
    H.renderLog();
  }

  H.emoteHtml = function (s) {
    s = String(s || '');
    (D.CHAT_FACES || []).forEach(function (f) {
      s = s.split('[:' + f.id + ':]').join('<img class="chat-emo" src="' + f.src + '" alt="' + f.tag + '" />');
    });
    return s;
  }

  H.renderLog = function () {
    var chat = document.getElementById('chat-log');
    if (chat) {
      chat.innerHTML = G.log.slice(0, 16).map(function (l) {
        return '<p><i>系统</i> ' + H.emoteHtml(l) + '</p>';
      }).join('');
    }
    var legacy = document.getElementById('log-list');
    if (legacy) legacy.innerHTML = G.log.slice(0, 8).map(function (l) { return '<p>' + H.emoteHtml(l) + '</p>'; }).join('');
  }

  H.showScreen = function (id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
  }

  H.sizeCanvas = function (c, w, h) {
    if (!c) return;
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    if (c.width !== w) c.width = w;
    if (c.height !== h) c.height = h;
  };

  H.resize = function () {
    var fit = document.getElementById('play-fit');
    var dock = fit && fit.querySelector('.dock');
    if (fit && dock) {
      var barH = Math.round(68 * fit.clientWidth / 978);
      dock.style.height = Math.max(104, barH + 36) + 'px';
      var shop = dock.querySelector('.shop-btn');
      if (shop) shop.style.height = barH + 'px';
    }
    var host = canvas.parentElement || canvas;
    var w = host.clientWidth | 0;
    var h = host.clientHeight | 0;
    if (w < 2) w = 960;
    if (h < 2) h = 540;
    H.sizeCanvas(canvas, w, h);
    H.sizeCanvas(canvas3d, w, h);
    if (window.World3D) World3D.resize();
  }

  H.currentServer = function () {
    var q = new URLSearchParams(location.search);
    return q.get('server') || 's1';
  }

  H.serialize = function () {
    return {
      v: 1, player: G.player, mapId: G.mapId, towerFloor: G.towerFloor, log: G.log.slice(0, 5)
    };
  }

  H.saveSilent = function () {
    if (!window.GameAPI || !GameAPI.online || !GameAPI.token || !G.player) return;
    GameAPI.saveRole(H.currentServer(), H.serialize()).catch(function () {});
  }

  H.saveNow = function () {
    if (!window.GameAPI || !GameAPI.online || !GameAPI.token) {
      H.toast('请先启动本地服务端，存档在本机数据库');
      return;
    }
    H.saveSilent();
    H.toast('进度已写入本机数据库');
  }

  H.applySave = function (data) {
    if (!data || !data.player) return false;
    G.player = data.player;
    G.player.buffs = G.player.buffs || [];
    G.player.skillCd = {};
    G.player.target = null;
    G.player.auto = false;
    G.player.pkMode = G.player.pkMode || 'peace';
    G.player.nation = G.player.nation || 'ming';
    G.player.pkValue = G.player.pkValue || 0;
    G.player.towerUnlock = G.player.towerUnlock || 1;
    H.ensureDaily(G.player);
    if (H.ensureLife) H.ensureLife(G.player);
    G.log = data.log || [];
    G.towerFloor = data.towerFloor || 0;
    var mapId = data.mapId || 'taiping';
    if (D.MAP_META[mapId] && D.MAP_META[mapId].instance) {
      mapId = 'capital';
      G.player.x = 122 * TILE;
      G.player.y = 68 * TILE;
      G.instance = null;
    }
    H.buildMap(mapId);
    var pos = H.snapWalkable(G.player.x, G.player.y);
    G.player.x = pos.x;
    G.player.y = pos.y;
    H.renderLog();
    H.refreshQuestUI();
    return true;
  }

  H.hasSave = function () {
    return false;
  }

  H.loadSave = function () {
    return false;
  }

  window.addEventListener('resize', function () { H.resize(); });
  window.addEventListener('orientationchange', function () { setTimeout(H.resize, 50); });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () { H.resize(); });
  }

})((window.Hongwu = window.Hongwu || {}));
