/**
 * 斜视 3D 场景：对照原作「3D 建模 + 2D 原画」的页游镜头。
 * 必须使用独立 canvas，不能和 2D getContext 共用同一块画布。
 */
(function (root) {
  var W = { ready: false, enabled: false };
  var scene, camera, renderer;
  var ground, marker, targetRing, follow = { x: 0, z: 0 };
  var actors = {};
  var extras = {};
  var floatPool = [];
  var propGroup;
  var raycaster, mouse;
  var groundMeshes = [];
  var texCache = {};

  function can() {
    return typeof THREE !== 'undefined';
  }

  function px(n) { return n / 40; }

  W.init = function (canvas) {
    if (!can()) return false;
    if (W.ready) return true;
    try {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x7ea4b8);
      scene.fog = new THREE.Fog(0x7ea4b8, 22, 58);

      camera = new THREE.PerspectiveCamera(28, 1, 0.1, 160);
      camera.position.set(10, 16, 12);

      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputEncoding = THREE.sRGBEncoding;

      scene.add(new THREE.HemisphereLight(0xfff3d6, 0x2a3a22, 0.9));
      var sun = new THREE.DirectionalLight(0xffe6b0, 0.85);
      sun.position.set(18, 28, 10);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 80;
      sun.shadow.camera.left = -28;
      sun.shadow.camera.right = 28;
      sun.shadow.camera.top = 28;
      sun.shadow.camera.bottom = -28;
      scene.add(sun);
      scene.add(new THREE.AmbientLight(0x3a4a58, 0.32));

      marker = new THREE.Mesh(
        new THREE.RingGeometry(0.2, 0.4, 28),
        new THREE.MeshBasicMaterial({ color: 0xffd24a, side: THREE.DoubleSide, transparent: true, opacity: 0.95 })
      );
      marker.rotation.x = -Math.PI / 2;
      marker.visible = false;
      scene.add(marker);

      targetRing = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.42, 28),
        new THREE.MeshBasicMaterial({ color: 0xff4a3a, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
      );
      targetRing.rotation.x = -Math.PI / 2;
      targetRing.visible = false;
      scene.add(targetRing);

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
    var t = new THREE.Texture(img);
    t.needsUpdate = true;
    t.encoding = THREE.sRGBEncoding;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
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

  function bakeGround(grid, mapId) {
    var gh = grid.length, gw = grid[0].length;
    var c = document.createElement('canvas');
    c.width = gw * 32;
    c.height = gh * 32;
    var ctx = c.getContext('2d');
    var art = root.Art;
    if (mapId === 'tower' && art && art.imgs && art.imgs.towerBg) {
      ctx.drawImage(art.imgs.towerBg, 0, 0, c.width, c.height);
    } else if ((mapId === 'capital' || mapId === 'road') && art && art.imgs && art.imgs.countryMap) {
      ctx.globalAlpha = 0.55;
      ctx.drawImage(art.imgs.countryMap, 0, 0, c.width, c.height);
      ctx.globalAlpha = 1;
    }
    for (var y = 0; y < gh; y++) {
      for (var x = 0; x < gw; x++) {
        var type = grid[y][x];
        if (mapId === 'tower' && type !== 'wall' && type !== 'rock' && type !== 'arena') {
          if (type === 'water') ctx.fillStyle = 'rgba(20,40,80,0.28)';
          else continue;
          ctx.fillRect(x * 32, y * 32, 32, 32);
          continue;
        }
        var img = art && art.tileImg ? art.tileImg(type) : null;
        if (img) ctx.drawImage(img, x * 32, y * 32, 32, 32);
        else {
          ctx.fillStyle = type === 'water' ? '#2a5a7a' : type === 'stone' ? '#6a6460' : '#3d6a32';
          ctx.fillRect(x * 32, y * 32, 32, 32);
        }
        if (type === 'wall' || type === 'rock') {
          ctx.fillStyle = 'rgba(20,16,12,0.4)';
          ctx.fillRect(x * 32, y * 32, 32, 32);
        }
      }
    }
    var tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipMapLinearFilter;
    return { tex: tex, gw: gw, gh: gh };
  }

  function addHouse(x, z, w, d) {
    var art = root.Art;
    var houseTex = art && art.imgs && art.imgs.house ? texFromImg(art.imgs.house) : null;
    var body = new THREE.Mesh(
      new THREE.BoxGeometry(w || 1.7, 1.15, d || 1.45),
      new THREE.MeshStandardMaterial({
        map: houseTex,
        color: houseTex ? 0xffffff : 0x6a3a28,
        roughness: 0.88
      })
    );
    body.position.set(x, 0.58, z);
    body.castShadow = true;
    body.receiveShadow = true;
    var roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, d) * 0.92, 0.72, 4),
      new THREE.MeshStandardMaterial({ color: 0x9a1f1a, roughness: 0.55, metalness: 0.08 })
    );
    roof.position.set(x, 1.42, z);
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    var ridge = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.08, Math.max(w, d) * 1.05),
      new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.4 })
    );
    ridge.position.set(x, 1.78, z);
    propGroup.add(body);
    propGroup.add(roof);
    propGroup.add(ridge);
  }

  function addTree(x, z) {
    var art = root.Art;
    if (art && art.imgs && art.imgs.tree) {
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: texFromImg(art.imgs.tree),
        transparent: true,
        depthWrite: false
      }));
      spr.position.set(x, 1.15, z);
      spr.scale.set(1.7, 2.15, 1);
      propGroup.add(spr);
      return;
    }
    var trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 0.7, 6),
      new THREE.MeshStandardMaterial({ color: 0x4a2a14 })
    );
    trunk.position.set(x, 0.35, z);
    var leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x2f6b38 })
    );
    leaf.position.set(x, 0.95, z);
    leaf.castShadow = true;
    propGroup.add(trunk);
    propGroup.add(leaf);
  }

  function addBlock(x, z, h, color) {
    var box = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, h, 0.95),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.9 })
    );
    box.position.set(x, h / 2, z);
    box.castShadow = true;
    box.receiveShadow = true;
    propGroup.add(box);
  }

  W.rebuild = function (grid, mapId) {
    if (!W.ready || !grid) return;
    W.mapId = mapId || W.mapId;
    if (ground) {
      scene.remove(ground);
      ground.geometry.dispose();
      if (ground.material.map) ground.material.map.dispose();
      ground.material.dispose();
    }
    groundMeshes = [];
    while (propGroup.children.length) {
      var ch = propGroup.children[0];
      propGroup.remove(ch);
      if (ch.geometry) ch.geometry.dispose();
    }
    if (mapId === 'poyang') {
      scene.background = new THREE.Color(0x4a6a88);
      scene.fog = new THREE.Fog(0x4a6a88, 18, 52);
    } else if (mapId === 'tower') {
      scene.background = new THREE.Color(0x2a1838);
      scene.fog = new THREE.Fog(0x2a1838, 16, 48);
    } else if (mapId === 'capital') {
      scene.background = new THREE.Color(0x8aa0a8);
      scene.fog = new THREE.Fog(0x8aa0a8, 24, 60);
    } else {
      scene.background = new THREE.Color(0x7ea4b8);
      scene.fog = new THREE.Fog(0x7ea4b8, 22, 58);
    }
    var baked = bakeGround(grid, mapId || W.mapId);
    var geo = new THREE.PlaneGeometry(baked.gw, baked.gh, 1, 1);
    var mat = new THREE.MeshStandardMaterial({ map: baked.tex, roughness: 0.96 });
    ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(baked.gw / 2, 0, baked.gh / 2);
    ground.receiveShadow = true;
    scene.add(ground);
    groundMeshes = [ground];
    W.size = { w: baked.gw, h: baked.gh };

    var placed = {};
    for (var y = 0; y < grid.length; y++) {
      for (var x = 0; x < grid[0].length; x++) {
        var t = grid[y][x];
        var k = (x >> 1) + ',' + (y >> 1);
        if (t === 'house' && !placed['h' + k]) {
          placed['h' + k] = 1;
          addHouse(x + 0.5, y + 0.5, 1.7, 1.45);
        } else if (t === 'tree' && !placed['t' + x + ',' + y]) {
          placed['t' + x + ',' + y] = 1;
          addTree(x + 0.5, y + 0.5);
        } else if (t === 'wall') {
          addBlock(x + 0.5, y + 0.5, 1.35, 0x4a4038);
        } else if (t === 'rock') {
          addBlock(x + 0.5, y + 0.5, 0.55, 0x5a5854);
        }
      }
    }
  };

  function makeShadow() {
    var m = new THREE.Mesh(
      new THREE.CircleGeometry(0.32, 16),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32 })
    );
    m.rotation.x = -Math.PI / 2;
    m.position.y = 0.03;
    scene.add(m);
    return m;
  }

  function makeSprite(img, scaleX, scaleY, color) {
    var mat;
    if (img) {
      mat = new THREE.SpriteMaterial({ map: texFromImg(img), transparent: true, depthWrite: false });
    } else {
      mat = new THREE.SpriteMaterial({ color: color || 0xffcc66, transparent: true, depthWrite: false });
    }
    var spr = new THREE.Sprite(mat);
    spr.scale.set(scaleX || 1.4, scaleY || 1.8, 1);
    scene.add(spr);
    return spr;
  }

  function makeLabel(text, color) {
    var tex = textTex('n:' + text + ':' + color, function (x, c) {
      x.clearRect(0, 0, c.width, c.height);
      x.fillStyle = 'rgba(10,6,4,0.55)';
      x.fillRect(18, 16, 220, 34);
      x.font = 'bold 22px "Microsoft YaHei","PingFang SC",sans-serif';
      x.textAlign = 'center';
      x.fillStyle = color || '#ffe7a0';
      x.fillText(text, 128, 40);
    });
    var spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    spr.scale.set(1.7, 0.42, 1);
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

  function ensureActor(id, img, opt) {
    opt = opt || {};
    if (actors[id]) return actors[id];
    var a = {
      sprite: makeSprite(img, opt.sx || 1.5, opt.sy || 1.9, opt.color),
      shadow: makeShadow(),
      label: opt.label ? makeLabel(opt.label, opt.labelColor || '#ffe7a0') : null,
      bar: opt.bar ? makeBar() : null
    };
    actors[id] = a;
    return a;
  }

  function placeActor(a, x, z, h, bob) {
    a.sprite.position.set(x, h + (bob || 0), z);
    a.shadow.position.set(x, 0.03, z);
    if (a.label) a.label.position.set(x, h + 1.05, z);
    if (a.bar) a.bar.position.set(x, h + 0.82, z);
  }

  function hideUnused(map, alive) {
    Object.keys(map).forEach(function (id) {
      if (alive[id]) return;
      var a = map[id];
      ['sprite', 'shadow', 'label', 'bar', 'mesh'].forEach(function (k) {
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
    } else {
      mesh = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.05, 8, 20),
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
    if (!W.ready) return;
    var p = state.player;
    var px0 = px(p.x), pz0 = px(p.y);
    follow.x += (px0 - follow.x) * 0.14;
    follow.z += (pz0 - follow.z) * 0.14;
    camera.position.set(follow.x + 7.2, 16.8, follow.z + 9.4);
    camera.lookAt(follow.x, 0.45, follow.z);

    var art = root.Art;
    var heroKey = art && art.classKey ? art.classKey(p.cls) : 'dao';
    var heroImg = art && art.imgs ? art.imgs[heroKey] : null;
    var hs = spriteSize(heroKey, false);
    var hero = ensureActor('hero', heroImg, {
      sx: hs[0], sy: hs[1], label: p.name, labelColor: '#ffe7a0', bar: true
    });
    var bob = Math.sin((state.time || 0) * 8) * (p._moving ? 0.05 : 0.012);
    placeActor(hero, px0, pz0, 1.15, bob);
    paintBar(hero.bar, p.hp / Math.max(1, (state.maxHp || p.hp)), '#c8312a');

    var alive = { hero: 1 };
    (state.npcs || []).forEach(function (n) {
      var id = 'npc-' + n.id;
      var nkey = art && art.npcKey ? art.npcKey(n.id) : 'officer';
      var nimg = art && art.imgs ? (art.imgs[nkey] || art.imgs.officer) : null;
      var ns = spriteSize(nkey, false);
      var a = ensureActor(id, nimg, {
        sx: ns[0], sy: ns[1], label: n.name, labelColor: '#ffe7a0'
      });
      placeActor(a, px(n.x), px(n.y), 1.05, Math.sin((state.time || 0) * 2) * 0.02);
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
      placeActor(a, px(e.x), px(e.y), e.boss ? 1.25 : 1.0);
      paintBar(a.bar, e.hp / Math.max(1, e.maxHp), e.boss ? '#ff6b4a' : '#c8312a');
      alive[id] = 1;
    });

    if (state.pet) {
      var pkey = art && art.petKey ? art.petKey(state.pet.id) : 'tiger';
      var pimg = art && art.imgs ? (art.imgs[pkey] || art.imgs.tiger) : null;
      var psz = spriteSize(pkey, false);
      var ps = ensureActor('pet', pimg, {
        sx: psz[0] * 0.85, sy: psz[1] * 0.85, label: state.pet.name, labelColor: '#c8e6ff'
      });
      placeActor(ps, px(state.pet.x), px(state.pet.y), 0.7);
      alive.pet = 1;
    }
    hideUnused(actors, alive);

    var extraAlive = {};
    (state.drops || []).forEach(function (d, i) {
      var id = 'drop-' + (d.uid || i);
      var ex = ensureExtra(id, 'drop');
      ex.mesh.position.set(px(d.x), 0.28 + Math.sin((state.time || 0) * 4 + i) * 0.06, px(d.y));
      extraAlive[id] = 1;
    });
    (state.herbs || []).forEach(function (hb, i) {
      var id = 'herb-' + i;
      var ex = ensureExtra(id, 'herb');
      ex.mesh.position.set(px(hb.x), 0.16, px(hb.y));
      extraAlive[id] = 1;
    });
    (state.portals || []).forEach(function (pt, i) {
      var id = 'portal-' + i;
      var ex = ensureExtra(id, 'portal');
      var x = ((pt.x + 0.5) * 40) / 40, z = ((pt.y + 0.5) * 40) / 40;
      ex.mesh.position.set(x, 0.08, z);
      ex.mesh.rotation.z = (state.time || 0) * 1.4;
      extraAlive[id] = 1;
    });
    hideUnused(extras, extraAlive);

    if (state.click && state.click.t > 0) {
      marker.visible = true;
      marker.position.set(px(state.click.x), 0.05, px(state.click.y));
      marker.material.opacity = Math.max(0.2, state.click.t);
    } else {
      marker.visible = false;
    }

    if (state.target) {
      targetRing.visible = true;
      targetRing.position.set(px(state.target.x), 0.06, px(state.target.y));
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
