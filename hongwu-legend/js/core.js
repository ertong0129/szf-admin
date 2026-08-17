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
    selectedGender: 'm',
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
    sysFeed: [],
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

  H.CHAN_LABEL = {
    world: '世界', nation: '国家', clan: '家族', party: '队伍',
    near: '附近', horn: '喇叭', whisper: '私聊'
  };

  H.escHtml = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  H.log = function (msg, opts) {
    var line = String(msg == null ? '' : msg);
    if (!(opts && opts.raw) && line.charAt(0) !== '[') line = '[系] ' + line;
    G.log.unshift(line);
    if (G.log.length > 40) G.log.pop();
    H.renderLog();
  }

  H.sysFeed = function (text) {
    var box = document.getElementById('sys-feed');
    if (!box || !text) return;
    var p = document.createElement('p');
    p.textContent = text;
    box.appendChild(p);
    while (box.children.length > 8) box.removeChild(box.firstChild);
    p.addEventListener('animationend', function () {
      if (p.parentNode) p.parentNode.removeChild(p);
    });
  }

  H.syncChatChan = function () {
    var el = document.getElementById('chat-chan');
    if (el) el.textContent = H.CHAN_LABEL[G.chatChan || 'near'] || '附近';
  }

  H.emoteHtml = function (s) {
    s = String(s || '');
    (D.CHAT_FACES || []).forEach(function (f) {
      s = s.split('[:' + f.id + ':]').join('<img class="chat-emo" src="' + f.src + '" alt="' + f.tag + '" />');
    });
    return s;
  }

  H.formatLogLine = function (raw) {
    var line = String(raw == null ? '' : raw);
    if (line.charAt(0) !== '[') line = '[系] ' + line;
    var s = H.emoteHtml(H.escHtml(line));
    return s.replace(/\[([^\]]+)\]/g, function (m, inner) {
      if (inner.charAt(0) === ':') return m;
      if (inner === '系') return '<b class="tag-sys">[系]</b>';
      if (H.CHAN_LABEL && Object.keys(H.CHAN_LABEL).some(function (k) { return H.CHAN_LABEL[k] === inner; }) || inner === '密' || inner === '宗族') {
        return '<b class="tag-chan">[' + inner + ']</b>';
      }
      if (inner === '绑' || /珠|丹|石|卷|药|符|刀|剑|弓|杖|扇|盔|甲|靴|佩|戒|带|果|酒|衣|巾|坠|环/.test(inner)) {
        return '<b class="tag-item">[' + inner + ']</b>';
      }
      return '<b class="tag-name">[' + inner + ']</b>';
    });
  }

  H.renderLog = function () {
    var chat = document.getElementById('chat-log');
    if (chat) {
      chat.innerHTML = G.log.slice(0, 16).map(function (l) {
        return '<p>' + H.formatLogLine(l) + '</p>';
      }).join('');
    }
    var legacy = document.getElementById('log-list');
    if (legacy) legacy.innerHTML = G.log.slice(0, 8).map(function (l) { return '<p>' + H.formatLogLine(l) + '</p>'; }).join('');
  }

  H.showScreen = function (id) {
    document.querySelectorAll('.screen').forEach(function (s) { s.classList.remove('active'); });
    document.getElementById(id).classList.add('active');
  }

  H.sizeCanvas = function (c, w, h, hiDpi) {
    if (!c) return;
    c.style.width = w + 'px';
    c.style.height = h + 'px';
    var dpr = hiDpi ? Math.min(2, (typeof window !== 'undefined' && window.devicePixelRatio) || 1) : 1;
    var bw = Math.max(1, Math.round(w * dpr));
    var bh = Math.max(1, Math.round(h * dpr));
    if (c.width !== bw) c.width = bw;
    if (c.height !== bh) c.height = bh;
    if (hiDpi) {
      var cctx = c.getContext && c.getContext('2d');
      if (cctx && cctx.setTransform) cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  };

  H.resize = function () {
    var fit = document.getElementById('play-fit');
    var dock = fit && fit.querySelector('.dock');
    if (fit && dock) {
      dock.style.height = Math.max(52, Math.round(fit.clientWidth * 68 / 1000)) + 'px';
    }
    var host = canvas.parentElement || canvas;
    var w = host.clientWidth | 0;
    var h = host.clientHeight | 0;
    if (w < 2) w = 1000;
    if (h < 2) h = 532;
    H.viewW = w;
    H.viewH = h;
    H.sizeCanvas(canvas, w, h, true);
    H.sizeCanvas(canvas3d, w, h, false);
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
