/**
 * 大明传说 — 主循环、进游戏、创角
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.loop = function (ts) {
    try {
      if (!G.last) G.last = ts;
      var dt = Math.min(0.05, (ts - G.last) / 1000);
      G.last = ts;
      G.time += dt;
      if (G.mode === 'play' && G.player && !document.getElementById('death').classList.contains('open')) {
        H.updatePlayer(dt);
        H.updateMonsters(dt);
        H.updatePet(dt);
        H.updateProjectiles(dt);
        H.updateEscort(dt);
        H.tickInstance(dt);
        G.netAcc = (G.netAcc || 0) + dt;
        if (G.netAcc > 0.28) { G.netAcc = 0; H.netTick(); }
        if (G.followUser && !G.player._moving) {
          var fu = null;
          (G.peers || []).forEach(function (o) { if (o.user === G.followUser) fu = o; });
          if (fu && G.mapId === fu.mapId && H.dist(G.player, fu) > 48) H.setDest(fu.x, fu.y);
        }
        H.updateFx(dt);
        G.saveAcc = (G.saveAcc || 0) + dt;
        if (G.saveAcc > 15) { G.saveAcc = 0; H.saveSilent(); }
      } else if (G.mode === 'play') {
        H.updateFx(dt);
      }
      if (G.mode === 'play') H.draw();
    } catch (err) {
      if (!G._drawErr) {
        G._drawErr = 1;
        console.error(err);
        if (window.World3D) World3D.enabled = false;
        if (canvas3d) canvas3d.style.display = 'none';
        if (canvas) canvas.style.display = 'block';
      }
    }
    requestAnimationFrame(H.loop);
  }

  H.enterPlay = function (fromSave) {
    G.mode = 'play';
    H.showScreen('play-screen');
    H.resize();
    requestAnimationFrame(function () { H.resize(); });
    if (!fromSave) {
      H.buildMap('taiping');
      G.player.x = SPAWN.x;
      G.player.y = SPAWN.y;
      H.log('洪武元年。点右侧任务可自动寻路。Q 任务，空格拾取，A 攻击，D 打坐，Z 挂机。');
      H.toast('快捷键已对照原作资料');
    } else {
      var fix = H.snapWalkable(G.player.x, G.player.y);
      G.player.x = fix.x;
      G.player.y = fix.y;
    }
    H.refreshQuestUI();
    if (H.ensureLife) H.ensureLife(G.player);
    if (H.paintChatFaces) H.paintChatFaces();
    if (H.pullBossState) H.pullBossState();
    H.renderLog();
    H.saveSilent();
    H.netTick();
    H.log('局域网联机：朋友打开同一地址、选同一服务器。点其他玩家可组队、交易、PK。');
  }

  H.paintClasses = function () {
    var box = document.getElementById('class-grid');
    if (!box) return;
    var g = G.selectedGender === 'f' ? 'f' : 'm';
    var src = (window.Art && Art.heroSheetSrc) ? Art.heroSheetSrc(g, 'plain') : '';
    box.innerHTML = Object.keys(D.CLASSES).map(function (id) {
      var c = D.CLASSES[id];
      var anim = G.selectedClass === id ? 'walk-front' : 'stand-front';
      return '<div class="class-card' + (G.selectedClass === id ? ' selected' : '') + '" data-cls="' + id + '">' +
        (src ? '<div class="class-art role-preview ' + anim + '" style="background-image:url(' + src + ')"></div>' : '') +
        '<h3 style="color:' + c.accent + '">' + c.name + '</h3>' +
        '<div class="weapon">兵器 · ' + c.weapon + '</div>' +
        '<p>' + c.desc + '</p></div>';
    }).join('');
    var tip = document.getElementById('class-tip');
    if (tip) tip.textContent = D.CLASSES[G.selectedClass].tip;
    var gp = document.getElementById('gender-pick');
    if (gp) {
      gp.querySelectorAll('[data-gender]').forEach(function (x) {
        x.classList.toggle('selected', x.dataset.gender === g);
      });
    }
  }

  H.startCreate = function () {
    H.showScreen('create-screen');
    H.paintClasses();
  }

  H.boot = function () {
    if (!document.getElementById('play-screen')) return;
    if (D.GAME_TITLE) document.title = D.GAME_TITLE;
    var nationBox = document.getElementById('nation-pick');
    if (nationBox) {
      nationBox.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-nation]');
        if (!b) return;
        G.selectedNation = b.dataset.nation;
        nationBox.querySelectorAll('[data-nation]').forEach(function (x) {
          x.classList.toggle('selected', x.dataset.nation === G.selectedNation);
        });
      });
    }
    var genderBox = document.getElementById('gender-pick');
    if (genderBox) {
      genderBox.addEventListener('click', function (ev) {
        var b = ev.target.closest('[data-gender]');
        if (!b) return;
        G.selectedGender = b.dataset.gender === 'f' ? 'f' : 'm';
        H.paintClasses();
      });
    }
    window.addEventListener('beforeunload', function () {
      if (window.GameAPI && GameAPI.online && GameAPI.token) {
        try {
          GameAPI.social('leave', { server: H.currentServer() });
        } catch (e) { /* ignore */ }
      }
    });
    var grid = document.getElementById('class-grid');
    if (grid) {
      grid.addEventListener('click', function (ev) {
        var card = ev.target.closest('[data-cls]');
        if (!card) return;
        G.selectedClass = card.dataset.cls;
        H.paintClasses();
      });
    }
    var enter = document.getElementById('btn-enter');
    if (enter) {
      enter.addEventListener('click', function () {
        var name = (document.getElementById('name-input').value || '').trim() || H.randomName();
        G.player = H.makePlayer(name, G.selectedClass, G.selectedGender);
        H.enterPlay(false);
      });
    }
    H.bindPlayEvents();
    function start3D() {
      if (!window.World3D || !canvas3d) return;
      canvas3d.style.display = 'block';
      H.resize();
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
        H.paintClasses();
        start3D();
      });
    } else {
      start3D();
    }
    requestAnimationFrame(H.loop);

    function needServer(msg) {
      H.toast(msg || '请从登录页进入，存档在本机数据库');
      setTimeout(function () { location.href = 'index.html'; }, 900);
    }

    if (window.GameAPI) {
      GameAPI.probe().then(function (ok) {
        if (!ok) { needServer('请先启动本地服务端'); return; }
        if (!GameAPI.token) { needServer('请先登录'); return; }
        return GameAPI.loadRole(H.currentServer()).then(function (j) {
          if (j.role && H.applySave(j.role)) H.enterPlay(true);
          else H.startCreate();
        });
      }).catch(function () { needServer('请先启动本地服务端'); });
    } else {
      needServer('请先启动本地服务端');
    }
  }

  H.randomName = function () {
    var a = ['沈', '陆', '萧', '叶', '苏', '白', '顾', '江'];
    var b = ['行舟', '听雨', '无锋', '清和', '望舒', '未央', '拾光'];
    return a[H.irand(0, a.length - 1)] + b[H.irand(0, b.length - 1)];
  }

  H.boot();

})(window.Hongwu);
