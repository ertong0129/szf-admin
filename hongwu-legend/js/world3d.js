/**
 * 斜视 3D 场景：对照原作「3D 建模 + 2D 原画」的页游镜头。
 * 地面程序绘制（等距石砖 / 木板码头 / 羽化草地），角色为绕 Y 朝向相机的立绘平面。
 * 必须使用独立 canvas，不能和 2D getContext 共用同一块画布。
 */
(function (root) {
  var W = { ready: false, enabled: false };
  var scene, camera, renderer;
  var ground, waterMesh, waterMat, marker, targetRing, follow = { x: 0, z: 0 };
  var actors = {};
  var extras = {};
  var floatPool = [];
  var propGroup;
  var raycaster, mouse;
  var groundMeshes = [];
  var texCache = {};
  var imgTexCache = [];
  var heroRing, heroRingInner;
  var waterTime = 0;

  function can() {
    return typeof THREE !== 'undefined';
  }

  function px(n) { return n / 40; }

  W.init = function (canvas) {
    if (!can()) return false;
    if (W.ready) return true;
    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x6e96aa);
      scene.fog = new THREE.FogExp2(0x6e96aa, 0.018);

      camera = new THREE.PerspectiveCamera(36, 1, 0.1, 180);
      camera.position.set(12, 12.5, 12);

      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;

      scene.add(new THREE.HemisphereLight(0xd8ecff, 0x3a4a28, 0.78));
      var sun = new THREE.DirectionalLight(0xffe2b8, 0.95);
      sun.position.set(16, 22, 10);
      sun.castShadow = true;
      sun.shadow.mapSize.set(512, 512);
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 80;
      sun.shadow.camera.left = -26;
      sun.shadow.camera.right = 26;
      sun.shadow.camera.top = 26;
      sun.shadow.camera.bottom = -26;
      sun.shadow.bias = -0.0008;
      scene.add(sun);
      var fill = new THREE.DirectionalLight(0x88aacc, 0.22);
      fill.position.set(-12, 8, -8);
      scene.add(fill);
      scene.add(new THREE.AmbientLight(0x3a4a58, 0.28));

      marker = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.36, 32),
        new THREE.MeshBasicMaterial({ color: 0xffd24a, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.visible = false;
      scene.add(marker);

      targetRing = new THREE.Mesh(
        new THREE.RingGeometry(0.26, 0.4, 32),
        new THREE.MeshBasicMaterial({ color: 0xff4a3a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
      );
      targetRing.rotation.x = -Math.PI / 2;
      targetRing.visible = false;
      scene.add(targetRing);

      heroRing = new THREE.Mesh(
        new THREE.RingGeometry(0.34, 0.5, 40),
        new THREE.MeshBasicMaterial({ color: 0x5ad8ff, side: THREE.DoubleSide, transparent: true, opacity: 0.72 })
      );
      heroRing.rotation.x = -Math.PI / 2;
      heroRing.position.y = 0.045;
      scene.add(heroRing);

      heroRingInner = new THREE.Mesh(
        new THREE.RingGeometry(0.12, 0.2, 24),
        new THREE.MeshBasicMaterial({ color: 0xc8f4ff, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
      );
      heroRingInner.rotation.x = -Math.PI / 2;
      heroRingInner.position.y = 0.05;
      scene.add(heroRingInner);

      propGroup = new THREE.Group();
      scene.add(propGroup);

      raycaster = new THREE.Raycaster();
      mouse = new THREE.Vector2();
      W.ready = true;
      W.enabled = true;
      W.resize();
      return true;
    } catch (err) {
      W.ready = false;
      W.enabled = false;
      return false;
    }
  };

  W.resize = function () {
    if (!renderer) return;
    var c = renderer.domElement;
    var w = c.clientWidth || c.width || 800;
    var h = c.clientHeight || c.height || 480;
    if (w < 2 || h < 2) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };

  function texFromImg(img) {
    if (!img) return null;
    if (img.__hwTex) return img.__hwTex;
    var t = new THREE.Texture(img);
    t.needsUpdate = true;
    t.encoding = THREE.sRGBEncoding;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    img.__hwTex = t;
    imgTexCache.push(t);
    return t;
  }

  function textTex(key, draw) {
    if (texCache[key]) return texCache[key];
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    var x = c.getContext('2d');
    draw(x, c);
    var t = new THREE.CanvasTexture(c);
    t.minFilter = THREE.LinearFilter;
    texCache[key] = t;
    return t;
  }

  function spriteSize(key, boss) {
    var map = {
      tiger: [1.35, 2.05], fox: [1.3, 2.4], water: [1.4, 2.25],
      wing: [1.75, 2.2], fairy: [1.7, 1.95], boss: [2.35, 2.85],
      dao: [1.28, 2.6], spear: [1.2, 2.5], officer: [1.4, 2.35],
      smith: [1.25, 2.3], redguard: [1.3, 2.2], cart: [1.05, 1.05]
    };
    var s = map[key] || [1.25, 2.4];
    if (boss) return [s[0] * 1.28, s[1] * 1.18];
    return s;
  }

  function canvasTex(canvas) {
    var tex = new THREE.CanvasTexture(canvas);
    tex.encoding = THREE.sRGBEncoding;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.generateMipmaps = false;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  }

  function bakeCanvas(grid, mapId, waterOnly) {
    var Gnd = root.GroundPaint;
    var gh = grid.length, gw = grid[0].length;
    var cell = waterOnly ? 16 : 24;
    var c = document.createElement('canvas');
    c.width = gw * cell;
    c.height = gh * cell;
    var ctx = c.getContext('2d');
    if (Gnd) {
      if (waterOnly) Gnd.paintWaterMask(ctx, grid, mapId, cell);
      else Gnd.paintCanvas(ctx, grid, mapId, cell);
    } else {
      ctx.fillStyle = waterOnly ? 'rgba(40,120,150,0)' : '#4d7a3e';
      ctx.fillRect(0, 0, c.width, c.height);
    }
    return { canvas: c, gw: gw, gh: gh };
  }

  function makeWaveTex() {
    var c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    var x = c.getContext('2d');
    var img = x.createImageData(256, 256);
    var d = img.data;
    for (var y = 0; y < 256; y++) {
      for (var xx = 0; xx < 256; xx++) {
        var n = Math.sin(xx * 0.11 + y * 0.04) * 0.5 + Math.sin(xx * 0.03 - y * 0.09) * 0.5;
        var v = 170 + n * 40;
        var i = (y * 256 + xx) * 4;
        d[i] = v * 0.45;
        d[i + 1] = v * 0.78;
        d[i + 2] = v;
        d[i + 3] = 90 + n * 40;
      }
    }
    x.putImageData(img, 0, 0);
    var t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.encoding = THREE.sRGBEncoding;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.repeat.set(18, 14);
    return t;
  }

  function disposeMesh(m) {
    if (!m) return;
    scene.remove(m);
    if (m.geometry) m.geometry.dispose();
    if (m.material) {
      if (m.material.map) m.material.map.dispose();
      if (m.material.alphaMap) m.material.alphaMap.dispose();
      m.material.dispose();
    }
  }

  function addHouse(x, z, w, d, style) {
    var ww = w || 1.7;
    var dd = d || 1.45;
    var wall = 0x8a4034;
    var roofCol = 0xc9a227;
    var ridgeCol = 0xe2c36a;
    var trimCol = 0xd4af37;
    var baseCol = 0x6a5850;
    if (style === 'town') {
      wall = 0xc4bba8;
      roofCol = 0x2a5864;
      ridgeCol = 0x1a3038;
      trimCol = 0x8a7a58;
      baseCol = 0x6a6860;
    } else if (style === 'village') {
      wall = 0x8a6a4e;
      roofCol = 0x3a3834;
      ridgeCol = 0x2a2824;
      trimCol = 0x6a5850;
      baseCol = 0x5a4a3c;
    }
    var base = new THREE.Mesh(
      new THREE.BoxGeometry(ww * 1.08, 0.12, dd * 1.08),
      new THREE.MeshStandardMaterial({ color: baseCol, roughness: 0.92 })
    );
    base.position.set(x, 0.06, z);
    base.receiveShadow = true;
    var body = new THREE.Mesh(
      new THREE.BoxGeometry(ww, 1.05, dd),
      new THREE.MeshStandardMaterial({ color: wall, roughness: 0.82 })
    );
    body.position.set(x, 0.62, z);
    body.castShadow = true;
    body.receiveShadow = true;
    var trim = new THREE.Mesh(
      new THREE.BoxGeometry(ww * 1.02, 0.08, dd * 1.02),
      new THREE.MeshStandardMaterial({ color: trimCol, roughness: 0.45, metalness: 0.18 })
    );
    trim.position.set(x, 1.14, z);
    var roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(ww, dd) * 0.92, 0.78, 4),
      new THREE.MeshStandardMaterial({ color: roofCol, roughness: 0.52, metalness: 0.06 })
    );
    roof.position.set(x, 1.55, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    var ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.07, 0.07, Math.max(ww, dd) * 1.08),
      new THREE.MeshStandardMaterial({ color: ridgeCol, roughness: 0.35, metalness: 0.3 })
    );
    ridge.position.set(x, 1.94, z);
    var door = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.48, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x3a2418, roughness: 0.9 })
    );
    door.position.set(x, 0.38, z + dd * 0.5);
    propGroup.add(base);
    propGroup.add(body);
    propGroup.add(trim);
    propGroup.add(roof);
    propGroup.add(ridge);
    propGroup.add(door);
  }

  function addTree(x, z, blossom) {
    var trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.12, 0.78, 7),
      new THREE.MeshStandardMaterial({ color: 0x5a3820, roughness: 0.95 })
    );
    trunk.position.set(x, 0.39, z);
    trunk.castShadow = true;
    var leafMat = new THREE.MeshStandardMaterial({ color: blossom ? 0xd48aa0 : 0x2f6b38, roughness: 0.78 });
    var leafMat2 = new THREE.MeshStandardMaterial({ color: blossom ? 0xe8b4c4 : 0x3d8544, roughness: 0.8 });
    var a = new THREE.Mesh(new THREE.SphereGeometry(0.48, 8, 6), leafMat);
    a.position.set(x, 1.05, z);
    var b = new THREE.Mesh(new THREE.SphereGeometry(0.36, 8, 6), leafMat2);
    b.position.set(x + 0.22, 1.18, z - 0.08);
    var c = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 5), leafMat);
    c.position.set(x - 0.18, 1.22, z + 0.12);
    propGroup.add(trunk);
    propGroup.add(a);
    propGroup.add(b);
    propGroup.add(c);
  }

  function addBlock(x, z, h, color) {
    var box = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, h, 0.92),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 })
    );
    box.position.set(x, h / 2, z);
    box.castShadow = true;
    box.receiveShadow = true;
    propGroup.add(box);
  }

  W.rebuild = function (grid, mapId) {
    if (!W.ready || !grid) return;
    try {
      rebuildScene(grid, mapId);
    } catch (err) {
      console.error(err);
      W.enabled = false;
      if (renderer && renderer.domElement) renderer.domElement.style.display = 'none';
      var two = document.getElementById('world');
      if (two) two.style.display = 'block';
    }
  };

  function rebuildScene(grid, mapId) {
    W.mapId = mapId || W.mapId;
    disposeMesh(ground);
    disposeMesh(waterMesh);
    ground = null;
    waterMesh = null;
    waterMat = null;
    groundMeshes = [];
    while (propGroup.children.length) {
      var ch = propGroup.children[0];
      propGroup.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
      if (ch.material) {
        if (ch.material.map) ch.material.map.dispose();
        ch.material.dispose();
      }
    }
    var fogCol = 0x6e96aa, fogD = 0.018;
    if (mapId === 'poyang' || mapId === 'boyang' || mapId === 'quanzhou' || mapId === 'zhedong' || mapId === 'fish') {
      fogCol = 0x4a6e88; fogD = 0.02;
    } else if (mapId === 'tower') {
      fogCol = 0x2a1838; fogD = 0.028;
    } else if (mapId === 'capital' || mapId === 'kaifeng') {
      fogCol = 0x8aa4ac; fogD = 0.015;
    } else if (mapId === 'desert' || mapId === 'tumu' || mapId === 'xiliang') {
      fogCol = 0xc4a070; fogD = 0.016;
    }
    scene.background = new THREE.Color(fogCol);
    scene.fog = new THREE.FogExp2(fogCol, fogD);

    var baked = bakeCanvas(grid, mapId || W.mapId, false);
    var geo = new THREE.PlaneGeometry(baked.gw, baked.gh, 1, 1);
    var mat = new THREE.MeshStandardMaterial({
      map: canvasTex(baked.canvas),
      roughness: 0.94,
      metalness: 0.02
    });
    ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(baked.gw / 2, 0, baked.gh / 2);
    ground.receiveShadow = true;
    scene.add(ground);
    groundMeshes = [ground];
    W.size = { w: baked.gw, h: baked.gh };

    var maskBake = bakeCanvas(grid, mapId || W.mapId, true);
    var wave = makeWaveTex();
    var mask = canvasTex(maskBake.canvas);
    waterMat = new THREE.MeshBasicMaterial({
      map: wave,
      alphaMap: mask,
      transparent: true,
      opacity: 0.42,
      depthWrite: false
    });
    waterMesh = new THREE.Mesh(new THREE.PlaneGeometry(baked.gw, baked.gh, 1, 1), waterMat);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set(baked.gw / 2, 0.04, baked.gh / 2);
    waterMesh.renderOrder = 1;
    scene.add(waterMesh);

    var placed = {};
    for (var y = 0; y < grid.length; y++) {
      for (var x = 0; x < grid[0].length; x++) {
        var t = grid[y][x];
        var k = (x >> 1) + ',' + (y >> 1);
        if (t === 'house' && !placed['h' + k]) {
          placed['h' + k] = 1;
          var st = (window.Art && Art.houseStyle) ? Art.houseStyle(mapId, x, y) : 'palace';
          addHouse(x + 0.5, y + 0.5, 1.7, 1.45, st);
        } else if (t === 'tree' && !placed['t' + x + ',' + y]) {
          placed['t' + x + ',' + y] = 1;
          var blossom = window.Art && Art.blossomAt && Art.blossomAt(mapId, x, y);
          addTree(x + 0.5, y + 0.5, blossom);
        } else if (t === 'wall') {
          addBlock(x + 0.5, y + 0.5, 1.35, 0x4a4038);
        } else if (t === 'rock') {
          addBlock(x + 0.5, y + 0.5, 0.55, 0x5a5854);
        }
      }
    }
  }

  function makeShadow() {
    var m = new THREE.Mesh(
      new THREE.CircleGeometry(0.34, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.025;
    m.scale.set(1.55, 1, 0.7);
    scene.add(m);
    return m;
  }

  function makeBillboard(img, scaleX, scaleY, color) {
    var geo = new THREE.PlaneGeometry(scaleX || 1.4, scaleY || 1.8);
    var mat;
    if (img) {
      mat = new THREE.MeshLambertMaterial({
        map: texFromImg(img),
        transparent: true,
        alphaTest: 0.18,
        side: THREE.DoubleSide,
        depthWrite: true,
        emissive: 0x1a1a1a
      });
    } else {
      mat = new THREE.MeshLambertMaterial({
        color: color || 0xffcc66,
        transparent: true,
        side: THREE.DoubleSide
      });
    }
    var mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = false;
    scene.add(mesh);
    return mesh;
  }

  function makeLabel(text, color, title) {
    var key = 'n:' + (title || '') + '|' + text + '|' + (color || '');
    var tex = textTex(key, function (x, c) {
      x.clearRect(0, 0, c.width, c.height);
      x.textAlign = 'center';
      if (title) {
        x.font = '16px "Microsoft YaHei","PingFang SC",sans-serif';
        x.strokeStyle = 'rgba(0,0,0,0.75)';
        x.lineWidth = 4;
        x.fillStyle = '#c9a227';
        x.strokeText(title, 128, 22);
        x.fillText(title, 128, 22);
        x.font = 'bold 20px "Microsoft YaHei","PingFang SC",sans-serif';
        x.fillStyle = color || '#7dff7a';
        x.strokeText(text, 128, 48);
        x.fillText(text, 128, 48);
      } else {
        x.font = 'bold 22px "Microsoft YaHei","PingFang SC",sans-serif';
        x.strokeStyle = 'rgba(0,0,0,0.75)';
        x.lineWidth = 4;
        x.fillStyle = color || '#ffe7a0';
        x.strokeText(text, 128, 40);
        x.fillText(text, 128, 40);
      }
    });
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(title ? 1.85 : 1.7, title ? 0.55 : 0.42, 1);
    scene.add(spr);
    return spr;
  }

  function makeBar() {
    var c = document.createElement('canvas');
    c.width = 128;
    c.height = 16;
    var tex = new THREE.CanvasTexture(c);
    tex.minFilter = THREE.LinearFilter;
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(1.15, 0.14, 1);
    spr.userData.canvas = c;
    spr.userData.tex = tex;
    scene.add(spr);
    return spr;
  }

  function paintBar(bar, ratio, color) {
    var c = bar.userData.canvas;
    var x = c.getContext('2d');
    x.clearRect(0, 0, c.width, c.height);
    x.fillStyle = 'rgba(0,0,0,0.65)';
    x.fillRect(0, 3, 128, 10);
    x.fillStyle = color || '#c8312a';
    x.fillRect(2, 5, Math.max(0, 124 * Math.max(0, Math.min(1, ratio))), 6);
    bar.userData.tex.needsUpdate = true;
  }

  function setActorLabel(a, text, color, title) {
    var key = (title || '') + '|' + text + '|' + (color || '');
    if (a._labelKey === key && a.label) return;
    if (a.label) scene.remove(a.label);
    a.label = makeLabel(text, color, title);
    a._labelKey = key;
  }

  function ensureActor(id, img, opt) {
    opt = opt || {};
    if (actors[id]) {
      if (opt.label) setActorLabel(actors[id], opt.label, opt.labelColor, opt.title);
      return actors[id];
    }
    var a = {
      mesh: makeBillboard(img, opt.sx || 1.5, opt.sy || 1.9, opt.color),
      shadow: makeShadow(),
      label: null,
      bar: opt.bar ? makeBar() : null,
      h: opt.sy || 1.9,
      lastX: 0,
      lastZ: 0,
      seed: Math.random() * 12
    };
    if (opt.label) setActorLabel(a, opt.label, opt.labelColor, opt.title);
    actors[id] = a;
    return a;
  }

  function faceCam(mesh) {
    mesh.rotation.y = Math.atan2(camera.position.x - mesh.position.x, camera.position.z - mesh.position.z);
  }

  function placeActor(a, x, z, opt) {
    opt = opt || {};
    var t = opt.time || 0;
    var moving = !!opt.moving;
    if (!moving && a.lastX && (Math.abs(x - a.lastX) > 0.01 || Math.abs(z - a.lastZ) > 0.01)) moving = true;
    a.lastX = x;
    a.lastZ = z;
    var seed = a.seed || 0;
    var bob = moving ? Math.sin(t * 11 + seed) * 0.07 : Math.sin(t * 2.2 + seed) * 0.016;
    var ride = !!opt.ride;
    var h = a.h || 1.9;
    var y = h * 0.5 + bob + (ride ? 0.22 : 0);
    a.mesh.position.set(x, y, z);
    faceCam(a.mesh);
    var flip = opt.facing != null ? Math.cos(opt.facing) < 0 : false;
    var sx = (flip ? -1 : 1) * (opt.hurt ? 0.92 : 1);
    a.mesh.scale.set(sx, 1 + (moving ? 0 : Math.sin(t * 2.2 + seed) * 0.025), 1);
    a.mesh.rotation.z = moving ? Math.sin(t * 11 + seed) * 0.07 : 0;
    a.shadow.position.set(x, 0.025, z);
    a.shadow.material.opacity = ride ? 0.38 : 0.28;
    a.shadow.scale.set(ride ? 1.85 : 1.55, 1, ride ? 0.85 : 0.7);
    if (a.label) a.label.position.set(x, y + h * 0.58, z);
    if (a.bar) a.bar.position.set(x, y + h * 0.46, z);
  }

  function hideUnused(map, alive) {
    Object.keys(map).forEach(function (id) {
      if (alive[id]) return;
      var a = map[id];
      ['mesh', 'sprite', 'shadow', 'label', 'bar'].forEach(function (k) {
        if (a[k]) scene.remove(a[k]);
      });
      delete map[id];
    });
  }

  function ensureExtra(id, kind) {
    if (extras[id]) return extras[id];
    var mesh;
    if (kind === 'drop') {
      mesh = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.16, 0),
        new THREE.MeshStandardMaterial({ color: 0xf0d56a, emissive: 0x664400, roughness: 0.35 })
      );
    } else if (kind === 'herb') {
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.12, 0.28, 5),
        new THREE.MeshStandardMaterial({ color: 0x4dff7a, emissive: 0x145520 })
      );
    } else if (kind === 'fire') {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xff7a28, transparent: true, opacity: 0.82 })
      );
    } else if (kind === 'path') {
      mesh = new THREE.Mesh(
        new THREE.CircleGeometry(0.1, 8),
        new THREE.MeshBasicMaterial({ color: 0xffd24a, transparent: true, opacity: 0.7, side: THREE.DoubleSide })
      );
      mesh.rotation.x = -Math.PI / 2;
    } else if (kind === 'bolt') {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff2a0 })
      );
    } else if (kind === 'spark') {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.05, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
      );
    } else {
      mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.05, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.85 })
      );
      mesh.rotation.x = Math.PI / 2;
    }
    scene.add(mesh);
    extras[id] = { mesh: mesh, kind: kind };
    return extras[id];
  }

  function syncFloats(list) {
    list = list || [];
    while (floatPool.length < list.length) {
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthTest: false }));
      scene.add(spr);
      floatPool.push(spr);
    }
    for (var i = 0; i < floatPool.length; i++) {
      var spr = floatPool[i];
      if (i >= list.length) { spr.visible = false; continue; }
      var f = list[i];
      spr.visible = true;
      spr.material.map = textTex('f:' + f.text + ':' + f.color, function (x, c) {
        x.clearRect(0, 0, c.width, c.height);
        x.font = 'bold 28px "Microsoft YaHei",sans-serif';
        x.textAlign = 'center';
        x.strokeStyle = 'rgba(0,0,0,0.7)';
        x.lineWidth = 5;
        x.strokeText(f.text, 128, 40);
        x.fillStyle = f.color || '#fff';
        x.fillText(f.text, 128, 40);
      });
      spr.material.opacity = Math.max(0.15, Math.min(1, f.t * 1.5));
      spr.position.set(px(f.x), 1.7 + (0.9 - f.t) * 0.9, px(f.y));
      spr.scale.set(1.35, 0.38, 1);
    }
  }

  W.sync = function (state) {
    if (!W.ready || !W.enabled) return;
    try {
      syncScene(state);
    } catch (err) {
      console.error(err);
      W.enabled = false;
      if (renderer && renderer.domElement) renderer.domElement.style.display = 'none';
      var two = document.getElementById('world');
      if (two) two.style.display = 'block';
    }
  };

  function syncScene(state) {
    var p = state.player;
    var px0 = px(p.x), pz0 = px(p.y);
    follow.x += (px0 - follow.x) * 0.14;
    follow.z += (pz0 - follow.z) * 0.14;
    var dist = 13.2;
    camera.position.set(follow.x + dist, 11.6, follow.z + dist);
    camera.lookAt(follow.x, 0.42, follow.z);

    waterTime = state.time || 0;
    if (waterMat && waterMat.map && waterMat.map.offset) {
      waterMat.map.offset.x = waterTime * 0.03;
      waterMat.map.offset.y = Math.sin(waterTime * 0.45) * 0.02;
    }

    var art = root.Art;
    var heroKey = art && art.classKey ? art.classKey(p.cls) : 'dao';
    var heroImg = art && art.imgs ? art.imgs[heroKey] : null;
    var hs = spriteSize(heroKey, false);
    var hero = ensureActor('hero', heroImg, {
      sx: hs[0], sy: hs[1], label: p.name, labelColor: '#ffe7a0', bar: true
    });
    placeActor(hero, px0, pz0, {
      time: waterTime,
      moving: !!p._moving,
      facing: p.facing,
      ride: p.mount && p.mount.riding,
      hurt: p.hp < 1
    });
    paintBar(hero.bar, p.hp / Math.max(1, (state.maxHp || p.hp)), '#c8312a');

    var pulse = 1 + Math.sin(waterTime * 4.2) * 0.08;
    heroRing.visible = true;
    heroRing.position.set(px0, 0.045, pz0);
    heroRing.scale.set(pulse, 1, pulse);
    heroRing.rotation.z = waterTime * 0.9;
    heroRing.material.opacity = 0.55 + Math.sin(waterTime * 3) * 0.14;
    heroRingInner.position.set(px0, 0.05, pz0);
    heroRingInner.scale.set(1.15 - Math.sin(waterTime * 4.2) * 0.12, 1, 1.15 - Math.sin(waterTime * 4.2) * 0.12);

    var alive = { hero: 1 };
    (state.npcs || []).forEach(function (n) {
      var id = 'npc-' + n.id;
      var nkey = art && art.npcKey ? art.npcKey(n.id) : 'officer';
      var nimg = art && art.imgs ? (art.imgs[nkey] || art.imgs.officer) : null;
      var ns = spriteSize(nkey, false);
      var quest = n.questMark;
      var mark = quest === '?' ? '？' : (quest ? '！' : '');
      var a = ensureActor(id, nimg, {
        sx: ns[0],
        sy: ns[1],
        label: mark + n.name,
        title: n.title || '',
        labelColor: quest === '?' ? '#6fdf7a' : (quest ? '#ffd36a' : '#7dff7a')
      });
      placeActor(a, px(n.x), px(n.y), { time: waterTime, moving: false });
      alive[id] = 1;
    });

    (state.entities || []).forEach(function (e) {
      var key = art && art.mobKey ? art.mobKey(e.kind) : 'guard';
      var img = art && art.imgs ? art.imgs[key] : null;
      var id = 'm-' + e.uid;
      var ms = spriteSize(key, !!e.boss);
      var a = ensureActor(id, img, {
        sx: ms[0],
        sy: ms[1],
        label: e.name,
        labelColor: e.boss ? '#ff8a6a' : '#e8f6c8',
        bar: true,
        color: 0xaa4444
      });
      placeActor(a, px(e.x), px(e.y), {
        time: waterTime,
        facing: e.facing,
        moving: !!e._moving
      });
      paintBar(a.bar, e.hp / Math.max(1, e.maxHp), e.boss ? '#ff6b4a' : '#c8312a');
      alive[id] = 1;
    });

    (state.peers || []).forEach(function (o) {
      var id = 'peer-' + o.user;
      var pkey = art && art.classKey ? art.classKey(o.cls) : 'dao';
      var pimg = art && art.imgs ? art.imgs[pkey] : null;
      var psz = spriteSize(pkey, false);
      var a = ensureActor(id, pimg, {
        sx: psz[0], sy: psz[1],
        label: o.name,
        labelColor: o.red ? '#ff8a6a' : '#8ad4d6',
        bar: true
      });
      placeActor(a, px(o.x), px(o.y), { time: waterTime, facing: o.facing, moving: true });
      paintBar(a.bar, (o.hp || 0) / Math.max(1, o.maxHp || 1), '#c8312a');
      alive[id] = 1;
    });

    if (state.pet) {
      var petKey = art && art.petKey ? art.petKey(state.pet.id) : 'tiger';
      var petImg = art && art.imgs ? (art.imgs[petKey] || art.imgs.tiger) : null;
      var petSz = spriteSize(petKey, false);
      var ps = ensureActor('pet', petImg, {
        sx: petSz[0] * 0.85, sy: petSz[1] * 0.85, label: state.pet.name, labelColor: '#c8e6ff'
      });
      placeActor(ps, px(state.pet.x), px(state.pet.y), { time: waterTime, moving: true });
      alive.pet = 1;
    }
    hideUnused(actors, alive);

    var extraAlive = {};
    (state.drops || []).forEach(function (d, i) {
      var id = 'drop-' + (d.uid || i);
      var ex = ensureExtra(id, 'drop');
      ex.mesh.position.set(px(d.x), 0.28 + Math.sin((state.time || 0) * 4 + i) * 0.06, px(d.y));
      ex.mesh.rotation.y = (state.time || 0) * 2 + i;
      extraAlive[id] = 1;
    });
    (state.herbs || []).forEach(function (hb, i) {
      var id = 'herb-' + i;
      var ex = ensureExtra(id, 'herb');
      ex.mesh.position.set(px(hb.x), 0.16, px(hb.y));
      extraAlive[id] = 1;
    });
    (state.fires || []).forEach(function (f, i) {
      var id = 'fire-' + i;
      var ex = ensureExtra(id, 'fire');
      var bounce = 0.42 + Math.sin((state.time || 0) * 8 + i) * 0.1;
      ex.mesh.position.set(px(f.x), bounce, px(f.y));
      ex.mesh.scale.setScalar(0.85 + Math.sin((state.time || 0) * 11 + i) * 0.18);
      extraAlive[id] = 1;
    });
    (state.portals || []).forEach(function (pt, i) {
      var id = 'portal-' + i;
      var ex = ensureExtra(id, 'portal');
      var x = pt.x + 0.5, z = pt.y + 0.5;
      ex.mesh.position.set(x, 0.1, z);
      ex.mesh.rotation.z = (state.time || 0) * 1.6;
      extraAlive[id] = 1;
    });
    (state.path || []).forEach(function (wp, i) {
      if (i % 2) return;
      var id = 'path-' + i;
      var ex = ensureExtra(id, 'path');
      ex.mesh.position.set((wp.x + 0.5), 0.05, (wp.y + 0.5));
      extraAlive[id] = 1;
    });
    (state.projectiles || []).forEach(function (pr, i) {
      var id = 'bolt-' + i;
      var ex = ensureExtra(id, 'bolt');
      ex.mesh.position.set(px(pr.x), 0.85, px(pr.y));
      if (pr.color) ex.mesh.material.color.set(pr.color);
      extraAlive[id] = 1;
    });
    (state.particles || []).forEach(function (pt, i) {
      var id = 'spark-' + i;
      var ex = ensureExtra(id, 'spark');
      ex.mesh.position.set(px(pt.x), 0.7 + (1 - (pt.t || 0.5)), px(pt.y));
      ex.mesh.material.opacity = Math.max(0.1, Math.min(1, (pt.t || 0.4) * 2));
      if (pt.color) {
        try { ex.mesh.material.color.set(pt.color); } catch (e) { /* ignore css colors */ }
      }
      extraAlive[id] = 1;
    });
    hideUnused(extras, extraAlive);

    if (state.click && state.click.t > 0) {
      marker.visible = true;
      marker.position.set(px(state.click.x), 0.05, px(state.click.y));
      marker.material.opacity = Math.max(0.2, state.click.t);
      marker.scale.setScalar(1 + (0.7 - state.click.t) * 0.6);
    } else {
      marker.visible = false;
    }

    if (state.target) {
      targetRing.visible = true;
      targetRing.position.set(px(state.target.x), 0.06, px(state.target.y));
      targetRing.rotation.z = waterTime * 1.2;
    } else {
      targetRing.visible = false;
    }

    syncFloats(state.floats);
    renderer.render(scene, camera);
  };

  W.pick = function (clientX, clientY) {
    if (!W.ready) return null;
    var rect = renderer.domElement.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return null;
    mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var hits = groundMeshes.length ? raycaster.intersectObjects(groundMeshes) : [];
    var pt;
    if (hits.length) {
      pt = hits[0].point;
    } else {
      var o = raycaster.ray.origin;
      var d = raycaster.ray.direction;
      if (Math.abs(d.y) < 1e-6) return null;
      var t = -o.y / d.y;
      if (t < 0) return null;
      pt = { x: o.x + d.x * t, z: o.z + d.z * t };
    }
    return { x: pt.x * 40, y: pt.z * 40 };
  };

  root.World3D = W;
})(typeof window !== 'undefined' ? window : global);
