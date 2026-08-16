/**
 * 洪武风云录 — 2D 绘制、小地图、HUD
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {
  H.TILE_COLOR = {
    grass: '#3d6a32', dirt: '#8a6a3a', water: '#2a5a7a', moss: '#2f5a44',
    tree: '#245228', house: '#6a3a28', roof: '#8b1e1e', stone: '#6a6460',
    wall: '#3a3430', dock: '#8a6a48', rock: '#5a5854',     arena: '#4a3a4a'
  };
  var TILE_COLOR = H.TILE_COLOR;

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.draw = function () {
    H.stampNpcMarks();
    if (window.World3D && World3D.enabled && G.player && G.grid) {
      World3D.sync({
        player: G.player,
        maxHp: H.stats(G.player).maxHp,
        npcs: G.npcs,
        entities: G.entities,
        peers: G.hidePeers ? [] : (G.peers || []).filter(function (o) { return !o.mapId || o.mapId === G.mapId; }),
        pet: G.player.pet && G.player.pet.hp > 0 ? G.player.pet : null,
        click: G.clickFx,
        target: G.player.target,
        drops: G.drops,
        herbs: G.herbs,
        portals: G.portals,
        fires: G.fires || [],
        floats: G.floats,
        path: G.path,
        questNpcId: H.currentQuestNpcId(),
        time: G.time
      });
      H.drawMinimap();
      H.drawHud();
      return;
    }
    var w = canvas.width, h = canvas.height;
    ctx.fillStyle = '#0a0806';
    ctx.fillRect(0, 0, w, h);
    if (!G.grid || !G.player) return;
    var p = G.player;
    G.cam.x = p.x - w / 2;
    G.cam.y = p.y - h / 2;
    var ws = H.worldSize();
    G.cam.x = H.clamp(G.cam.x, 0, Math.max(0, ws.w - w));
    G.cam.y = H.clamp(G.cam.y, 0, Math.max(0, ws.h - h));

    var x0 = Math.floor(G.cam.x / TILE), y0 = Math.floor(G.cam.y / TILE);
    var x1 = Math.ceil((G.cam.x + w) / TILE), y1 = Math.ceil((G.cam.y + h) / TILE);
    for (var ty = y0; ty < y1; ty++) {
      for (var tx = x0; tx < x1; tx++) {
        if (!H.inGrid(G.grid, tx, ty)) continue;
        var t = G.grid[ty][tx];
        var sx = tx * TILE - G.cam.x, sy = ty * TILE - G.cam.y;
        if (window.Art && Art.ready) {
          Art.drawTile(ctx, t, sx, sy, TILE, G.time, tx, ty);
        } else {
          var col = TILE_COLOR[t] || '#333';
          ctx.fillStyle = t === 'water' ? H.shade(col, Math.sin(G.time * 2 + tx) * 8) : H.shade(col, ((tx * 13 + ty * 7) % 9) - 4);
          ctx.fillRect(sx, sy, TILE + 1, TILE + 1);
        }
      }
    }

    if (window.Art && Art.ready) {
      for (ty = y0; ty < y1; ty++) {
        for (tx = x0; tx < x1; tx++) {
          if (!H.inGrid(G.grid, tx, ty)) continue;
          var pt = G.grid[ty][tx];
          if (pt === 'tree' || pt === 'house' || pt === 'roof') {
            Art.drawProp(ctx, pt, tx * TILE - G.cam.x, ty * TILE - G.cam.y, TILE);
          }
        }
      }
    }

    G.herbs.forEach(function (hb) {
      var s = H.worldToScreen(hb.x, hb.y);
      ctx.fillStyle = '#7dff9a';
      ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
    });
    G.drops.forEach(function (d) {
      var s = H.worldToScreen(d.x, d.y);
      ctx.fillStyle = d.item.rarity ? D.RARITY_COLOR[d.item.rarity] : '#f0d56a';
      ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
    });
    G.portals.forEach(function (pt) {
      var s = H.worldToScreen((pt.x + 0.5) * TILE, (pt.y + 0.5) * TILE);
      ctx.strokeStyle = '#d4af37';
      ctx.globalAlpha = 0.7 + Math.sin(G.time * 3) * 0.2;
      ctx.beginPath(); ctx.arc(s.x, s.y, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#f3e6c4';
      ctx.font = '11px serif';
      ctx.textAlign = 'center';
      ctx.fillText(pt.label, s.x, s.y - 18);
    });
    (G.fires || []).forEach(function (f) {
      var fs = H.worldToScreen(f.x, f.y);
      var pulse = 0.5 + Math.sin(G.time * 6) * 0.18;
      ctx.fillStyle = 'rgba(255, 96, 24,' + pulse + ')';
      ctx.beginPath(); ctx.arc(fs.x, fs.y, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255, 210, 80, 0.95)';
      ctx.beginPath(); ctx.arc(fs.x, fs.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe7a0';
      ctx.font = '11px serif';
      ctx.textAlign = 'center';
      ctx.fillText('篝火', fs.x, fs.y - 22);
    });
    if (G.path && G.path.length > 1) {
      ctx.strokeStyle = 'rgba(255, 210, 80, 0.55)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      G.path.forEach(function (wp, i) {
        var s = H.worldToScreen((wp.x + 0.5) * TILE, (wp.y + 0.5) * TILE);
        if (i === 0) ctx.moveTo(s.x, s.y);
        else ctx.lineTo(s.x, s.y);
      });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineWidth = 1;
    }
    G.npcs.forEach(function (n) {
      var s = H.worldToScreen(n.x, n.y);
      if (window.Art && Art.ready) Art.drawNpc(ctx, n, s, G.time);
      else {
        var mk = n.questMark === '?' ? '？' : (n.questMark ? '！' : '');
        H.drawActor(n.x, n.y, '#d4af37', 11, mk);
        ctx.fillStyle = '#c9a227';
        ctx.font = '11px serif';
        ctx.textAlign = 'center';
        if (n.title) ctx.fillText(n.title, s.x, s.y - 34);
        ctx.fillStyle = '#7dff7a';
        ctx.fillText(n.name, s.x, s.y - 22);
      }
    });
    G.entities.forEach(function (e) { H.drawMonster(e); });
    if (!G.hidePeers) {
      (G.peers || []).forEach(function (o) {
        if (o.mapId && o.mapId !== G.mapId) return;
        H.drawPeer(o);
      });
    }
    if (G.escort && G.mapId === 'road') {
      var cs = H.worldToScreen(G.escort.x, G.escort.y);
      if (window.Art && Art.ready) Art.drawCart(ctx, cs);
      else { ctx.fillStyle = '#c4a060'; ctx.fillRect(cs.x - 16, cs.y - 10, 32, 20); }
      H.drawBar(cs.x - 16, cs.y - 18, 32, G.escort.hp / G.escort.maxHp, '#c8312a');
      ctx.fillStyle = '#fff'; ctx.font = '11px serif'; ctx.textAlign = 'center';
      ctx.fillText('军资车', cs.x, cs.y + 22);
    }
    if (G.clickFx && G.clickFx.t > 0) {
      var mk = H.worldToScreen(G.clickFx.x, G.clickFx.y);
      ctx.strokeStyle = 'rgba(255,220,80,' + H.clamp(G.clickFx.t * 1.4, 0, 1) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mk.x, mk.y, 10 + (0.7 - G.clickFx.t) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    if (p.pet && p.pet.hp > 0) {
      var ps = H.worldToScreen(p.pet.x, p.pet.y);
      if (window.Art && Art.ready) Art.drawPet(ctx, p.pet, ps, G.time);
      else H.drawActor(p.pet.x, p.pet.y, p.pet.color, 8, '');
    }
    H.drawHero(p);
    G.projectiles.forEach(function (pr) {
      var s = H.worldToScreen(pr.x, pr.y);
      ctx.fillStyle = pr.color || '#fff';
      ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, Math.PI * 2); ctx.fill();
    });
    G.particles.forEach(function (pt) {
      var s = H.worldToScreen(pt.x, pt.y);
      ctx.globalAlpha = H.clamp(pt.t * 2, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.fillRect(s.x, s.y, 3, 3);
      ctx.globalAlpha = 1;
    });
    G.floats.forEach(function (f) {
      var s = H.worldToScreen(f.x, f.y);
      ctx.globalAlpha = H.clamp(f.t * 1.4, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(f.text, s.x, s.y);
      ctx.globalAlpha = 1;
    });

    var tint = D.MAP_META[G.mapId].tint;
    ctx.fillStyle = 'rgba(' + Math.floor(tint[0] * 255) + ',' + Math.floor(tint[1] * 255) + ',' + Math.floor(tint[2] * 255) + ',0.16)';
    ctx.fillRect(0, 0, w, h);
    H.drawMinimap();
    H.drawHud();
  }

  H.shade = function (hex, d) {
    var n = parseInt(hex.slice(1), 16);
    var r = H.clamp(((n >> 16) & 255) + d, 0, 255);
    var g = H.clamp(((n >> 8) & 255) + d, 0, 255);
    var b = H.clamp((n & 255) + d, 0, 255);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  H.worldToScreen = function (x, y) { return { x: x - G.cam.x, y: y - G.cam.y }; }

  H.drawActor = function (x, y, color, r, mark) {
    var s = H.worldToScreen(x, y);
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

  H.drawHero = function (p) {
    var s = H.worldToScreen(p.x, p.y);
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
    var fdef = (D.FASHIONS || []).filter(function (x) { return x.id === p.fashionId; })[0];
    if (fdef && fdef.glow) {
      ctx.strokeStyle = fdef.glow;
      ctx.globalAlpha = 0.7;
      ctx.beginPath(); ctx.ellipse(s.x, s.y + 10, 16, 6, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (window.Art && Art.ready) {
      Art.drawNameplate(ctx, s.x, s.y + 22, D.CLASSES[p.cls].name, p.name, '#d8f5a0');
    }
    if (p.target) {
      var ts = H.worldToScreen(p.target.x, p.target.y);
      ctx.strokeStyle = '#ffd36a';
      ctx.beginPath(); ctx.arc(ts.x, ts.y, (p.target.r || 14) + 16, 0, Math.PI * 2); ctx.stroke();
    }
  }

  H.drawPeer = function (o) {
    var s = H.worldToScreen(o.x, o.y);
    var fake = { cls: o.cls || 'warrior', name: o.name, x: o.x, y: o.y, facing: o.facing || 0, sit: o.sit, _moving: true };
    if (!(window.Art && Art.ready && Art.drawHero(ctx, fake, s, G.time))) {
      H.drawActor(o.x, o.y, '#6cb6ff', 12, o.stall ? '摊' : '');
    }
    var col = o.red ? '#ff6a6a' : (o.nation === 'yuan' ? '#c089ff' : '#8ad4d6');
    if (window.Art && Art.ready) Art.drawNameplate(ctx, s.x, s.y + 22, (D.CLASSES[o.cls] ? D.CLASSES[o.cls].name : ''), o.name, col);
    else {
      ctx.fillStyle = col;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(o.name, s.x, s.y - 22);
    }
    H.drawBar(s.x - 18, s.y - 58, 36, (o.hp || 0) / Math.max(1, o.maxHp || 1), '#c8312a');
    if (o.stall) {
      ctx.fillStyle = '#ffd36a';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(o.stall.title || '摊位', s.x, s.y + 34);
    }
  }

  H.drawMonster = function (e) {
    var s = H.worldToScreen(e.x, e.y);
    if (!(window.Art && Art.ready && Art.drawMob(ctx, e, s, G.time))) {
      H.drawActor(e.x, e.y, e.color, e.r, e.boss ? '★' : '');
    }
    H.drawBar(s.x - 18, s.y - (e.boss ? 78 : 62), 36, e.hp / e.maxHp, '#c8312a');
    ctx.fillStyle = e.boss ? '#ffd36a' : '#f3e6c4';
    ctx.font = '10px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText((e.boss ? '★ ' : '') + e.level + ' ' + e.name, s.x, s.y + 20);
  }

  H.drawBar = function (x, y, w, ratio, color) {
    ctx.fillStyle = '#1a1008';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w * H.clamp(ratio, 0, 1), 4);
  }

  H.paintRadar = function (ctx, w, h, labeled) {
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
      ctx.fillStyle = '#8ad4d6';
      ctx.fillRect((pt.x + 0.5) * sx - 2, (pt.y + 0.5) * sy - 2, 4, 4);
      if (labeled) {
        ctx.fillStyle = '#8ad4d6';
        ctx.font = '11px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(pt.label || '传送', (pt.x + 0.5) * sx + 4, (pt.y + 0.5) * sy);
      }
    });
    G.npcs.forEach(function (n) {
      ctx.fillStyle = '#ffd36a';
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
    (G.peers || []).forEach(function (o) {
      if (o.mapId && o.mapId !== G.mapId) return;
      ctx.fillStyle = o.red ? '#ff6a6a' : '#6fdf7a';
      ctx.fillRect(o.x / TILE * sx - 2, o.y / TILE * sy - 2, 4, 4);
    });
    if (G.player) {
      ctx.fillStyle = '#1e4a8a';
      ctx.fillRect(G.player.x / TILE * sx - 3, G.player.y / TILE * sy - 3, 6, 6);
      if (labeled) {
        ctx.fillStyle = '#ffe7a0';
        ctx.font = '11px "Microsoft YaHei",sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('我', G.player.x / TILE * sx + 6, G.player.y / TILE * sy - 4);
      }
    }
  }

  H.drawMinimap = function () {
    if (!mini || !mctx) return;
    H.paintRadar(mctx, mini.width, mini.height, false);
    var nameEl = document.getElementById('map-name');
    if (nameEl && D.MAP_META[G.mapId]) nameEl.textContent = D.MAP_META[G.mapId].name;
    var coord = document.getElementById('map-coord');
    if (coord && G.player) {
      coord.textContent = Math.floor(G.player.x / TILE) + ',' + Math.floor(G.player.y / TILE);
    }
    var qb = document.querySelector('.quest-box');
    var inst = D.INSTANCES[G.mapId];
    if (qb) qb.hidden = !!(inst && inst.hideQuest);
    H.refreshInstanceHud();
    if (H.mapOverlayOpen() && H.regionTabOn()) H.paintRegionMap();
  }

  H.drawHud = function () {
    var p = G.player, st = H.stats(p);
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
    H.setBar('hp', p.hp, st.maxHp);
    H.setBar('mp', p.mp, st.maxMp);
    H.setBar('xp', p.exp, F.xpToNext(p.level));
    H.refreshPkMode();
    var en = document.getElementById('energy-line');
    if (en) {
      H.ensureDaily(p);
      en.textContent = '精力 ' + (p.energy || 0) + '/' + (D.ENERGY_MAX || 4000) + (p.sit ? '　打坐中' : '') +
        (p.sit && H.nearCampfire && H.nearCampfire() ? '　篝火' : '') +
        (p.mount && p.mount.riding ? '　骑乘' : '');
    }
    var mailBtn = document.querySelector('[data-panel="mail"]');
    if (mailBtn && p.mail) {
      var unread = p.mail.filter(function (m) { return m.unread; }).length;
      mailBtn.textContent = unread ? '信件(' + unread + ')' : '信件';
    }
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
    H.renderSkills();
  }

  H.setBar = function (id, cur, max) {
    document.getElementById(id + '-fill').style.width = (100 * cur / Math.max(1, max)) + '%';
    document.getElementById(id + '-text').textContent = Math.floor(cur) + '/' + Math.floor(max);
  }

  H.ensureSkillBar = function () {
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
    html += '<div class="util-slot" id="slot-hp"><div class="key">7</div><div class="name">金创</div></div>';
    html += '<div class="util-slot" id="slot-mp"><div class="key">8</div><div class="name">内力</div></div>';
    html += '<div class="util-slot" id="slot-auto"><div class="key">Z</div><div class="name">挂机</div></div>';
    html += '<div class="util-slot" id="slot-pick"><div class="key">空格</div><div class="name">拾取</div></div>';
    box.innerHTML = html;
  }

  H.renderSkills = function () {
    var p = G.player;
    H.ensureSkillBar();
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

})(window.Hongwu);
