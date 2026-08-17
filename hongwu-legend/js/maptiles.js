/**
 * 原作场景切片：CDN 上 300×300 JPEG，按 {col}_{row} 轴对齐拼成等距大图。
 * 行走仍用方形格子；镜头按等距投影把格子映射到拼图像素。
 */
(function (root) {
  var T = {
    TILE: 40,
    FOLDER: {
      capital: 'jing_cheng',
      kaifeng: 'kai_feng',
      pingjiang: 'ping_jiang',
      quanzhou: 'quan_zhou',
      zhedong: 'zhe_dong',
      xiliang: 'xi_liang',
      taiping: 'xin_shou_cun',
      wild: 'heng_jian_shan',
      shennong: 'shen_nong_jia',
      xinghua: 'xing_hua_ling',
      annan: 'an_nan',
      desert: 'da_mo',
      tumu: 'tu_mu_bao',
      jianzhou: 'jian_zhou',
      border: 'bian_cheng_1',
      arena: 'jing_ji_chang',
      fish: 'bu_yu_er_hai',
      palace: 'shen_gong_die_ying',
      jingxin: 'bu_bu_jing_xin',
      boyang: 'po_yang_hu'
    },
    manifest: null,
    imgs: {},
    loading: {},
    cam: { x: 0, y: 0, scale: 1, mapId: '', cx: 0, cy: 0 },
    _active: false
  };

  function walkSize(mapId, meta) {
    var sz = root.GameData && root.GameData.MAP_SIZE && root.GameData.MAP_SIZE[mapId];
    if (sz && sz.w && sz.h) return sz;
    return { w: (meta && meta.walkW) || 50, h: (meta && meta.walkH) || 36 };
  }

  T.folderOf = function (mapId) {
    return T.FOLDER[mapId] || '';
  };

  T.metaFor = function (mapId) {
    if (!T.manifest || !T.manifest.maps) return null;
    var folder = T.folderOf(mapId);
    if (!folder) return null;
    var m = T.manifest.maps[folder];
    if (m) return m;
    var maps = T.manifest.maps;
    var k;
    for (k in maps) {
      if (maps[k] && maps[k].mapId === mapId) return maps[k];
    }
    return null;
  };

  T.has = function (mapId) {
    return !!T.metaFor(mapId);
  };

  T.image = function (mapId) {
    var m = T.metaFor(mapId);
    if (!m) return null;
    var img = T.imgs[m.folder];
    return img && img.width ? img : null;
  };

  T.ready = function (mapId) {
    return !!T.image(mapId);
  };

  T.active = function () {
    return T._active;
  };

  T.iso = function (meta, mapId) {
    var walk = walkSize(mapId, meta);
    var span = Math.max(1, walk.w + walk.h);
    var nativeW = meta.nativeW || meta.imgW;
    var nativeH = meta.nativeH || meta.imgH;
    return {
      walkW: walk.w,
      walkH: walk.h,
      hw: nativeW / span,
      hh: nativeH / span,
      ox: walk.h * (nativeW / span),
      oy: (meta.originY || 0) * nativeH,
      nativeW: nativeW,
      nativeH: nativeH
    };
  };

  T.walkToImg = function (tx, ty, meta, mapId) {
    var iso = T.iso(meta, mapId);
    return {
      x: iso.ox + (tx - ty) * iso.hw,
      y: iso.oy + (tx + ty) * iso.hh
    };
  };

  T.imgToWalk = function (ix, iy, meta, mapId) {
    var iso = T.iso(meta, mapId);
    var u = (ix - iso.ox) / iso.hw;
    var v = (iy - iso.oy) / iso.hh;
    return { tx: (u + v) / 2, ty: (v - u) / 2 };
  };

  T.worldToScreen = function (x, y) {
    var mapId = T.cam.mapId;
    var meta = T.metaFor(mapId);
    if (!meta) return { x: 0, y: 0 };
    var img = T.walkToImg(x / T.TILE, y / T.TILE, meta, mapId);
    var s = T.cam.scale || 1;
    return {
      x: (img.x - T.cam.x) * s + T.cam.cx,
      y: (img.y - T.cam.y) * s + T.cam.cy
    };
  };

  T.screenToWorld = function (sx, sy) {
    var mapId = T.cam.mapId;
    var meta = T.metaFor(mapId);
    if (!meta) return { x: 0, y: 0 };
    var s = T.cam.scale || 1;
    var ix = T.cam.x + (sx - T.cam.cx) / s;
    var iy = T.cam.y + (sy - T.cam.cy) / s;
    var wlk = T.imgToWalk(ix, iy, meta, mapId);
    return { x: wlk.tx * T.TILE, y: wlk.ty * T.TILE };
  };

  function setScene(on) {
    T._active = on;
    var c2 = typeof document !== 'undefined' ? document.getElementById('world') : null;
    var c3 = typeof document !== 'undefined' ? document.getElementById('world3d') : null;
    if (on) {
      if (c3) c3.style.display = 'none';
      if (c2) c2.style.display = 'block';
    } else if (root.World3D && root.World3D.enabled) {
      if (c3) c3.style.display = 'block';
      if (c2) c2.style.display = 'none';
    }
  }

  T.follow = function (mapId, player, w, h) {
    var meta = T.metaFor(mapId);
    if (!meta || !player) {
      setScene(false);
      return false;
    }
    var img = T.image(mapId);
    if (!img) {
      T.ensure(mapId);
      setScene(false);
      return false;
    }
    var pos = T.walkToImg(player.x / T.TILE, player.y / T.TILE, meta, mapId);
    var scale = w / Math.max(1, meta.viewNative || 960);
    T.cam.mapId = mapId;
    T.cam.x = pos.x;
    T.cam.y = pos.y;
    T.cam.scale = scale;
    T.cam.cx = w / 2;
    T.cam.cy = h * 0.62;
    setScene(true);
    return true;
  };

  T.draw = function (ctx, w, h) {
    var mapId = T.cam.mapId;
    var meta = T.metaFor(mapId);
    var img = T.image(mapId);
    if (!meta || !img) return;
    var s = T.cam.scale || 1;
    var dw = meta.nativeW * s;
    var dh = meta.nativeH * s;
    var dx = T.cam.cx - T.cam.x * s;
    var dy = T.cam.cy - T.cam.y * s;
    ctx.fillStyle = '#0a1214';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, img.width, img.height, dx, dy, dw, dh);
  };

  function loadImage(src, done) {
    if (typeof Image === 'undefined') {
      done(null);
      return;
    }
    var img = new Image();
    img.onload = function () { done(img); };
    img.onerror = function () { done(null); };
    img.src = src;
  }

  T.ensure = function (mapId) {
    var meta = T.metaFor(mapId);
    if (!meta) return;
    if (T.imgs[meta.folder] || T.loading[meta.folder]) return;
    T.loading[meta.folder] = 1;
    loadImage('assets/ingame/maptiles/' + meta.file, function (img) {
      T.loading[meta.folder] = 0;
      if (img) T.imgs[meta.folder] = img;
    });
  };

  T.load = function (done) {
    if (typeof fetch === 'undefined') {
      T.manifest = { maps: {} };
      if (done) done();
      return;
    }
    fetch('assets/ingame/maptiles/manifest.json')
      .then(function (r) { return r.ok ? r.json() : { maps: {} }; })
      .then(function (man) {
        T.manifest = man || { maps: {} };
        if (done) done();
      })
      .catch(function () {
        T.manifest = { maps: {} };
        if (done) done();
      });
  };

  root.MapTiles = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})(typeof window !== 'undefined' ? window : global);
