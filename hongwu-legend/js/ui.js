/**
 * 大明传说 — 面板、对话、商店、地图 overlay
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.mapOverlayOpen = function () {
    var el = document.getElementById('map-overlay');
    return !!(el && !el.hidden);
  }

  H.mapTabOn = function () {
    var current = document.getElementById('map-current');
    var nation = document.getElementById('map-nation');
    if (current && !current.hidden) return 'current';
    if (nation && !nation.hidden) return 'nation';
    return 'world';
  }

  H.regionTabOn = function () {
    return H.mapTabOn() === 'current';
  }

  H.closeMapOverlay = function () {
    var el = document.getElementById('map-overlay');
    if (el) el.hidden = true;
  }

  H.eraName = function () {
    return D.ERA || '洪武';
  }

  H.mapLocText = function () {
    var meta = D.MAP_META[G.mapId];
    return H.eraName() + '-' + (meta ? meta.name : '未知');
  }

  H.showMapTab = function (tab) {
    if (tab === 'region') tab = 'current';
    var current = document.getElementById('map-current');
    var nation = document.getElementById('map-nation');
    var world = document.getElementById('map-world');
    if (current) current.hidden = tab !== 'current';
    if (nation) nation.hidden = tab !== 'nation';
    if (world) world.hidden = tab !== 'world';
    document.querySelectorAll('[data-map-tab]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.mapTab === tab);
    });
    var loc = document.getElementById('map-loc');
    var era = document.getElementById('map-era');
    var hint = document.getElementById('map-hint');
    if (loc) {
      loc.hidden = tab === 'world';
      loc.textContent = H.mapLocText();
    }
    if (era) era.hidden = tab !== 'nation';
    if (hint) {
      hint.textContent = '点场景名或传送：免费瞬移，可检阅全部地图';
    }
    if (tab === 'current') {
      H.paintRegionMap();
      H.fillMapNpcList();
      H.fillMapJumpList();
      H.applyMapSideTab();
    } else if (tab === 'nation') {
      H.fillNationPins();
    } else {
      H.fillWorldPins();
    }
  }

  H.openMapOverlay = function (tab) {
    if (G.mode !== 'play') return;
    H.closePanels();
    H.closeDialog();
    var el = document.getElementById('map-overlay');
    if (!el) return;
    el.hidden = false;
    H.showMapTab(tab || 'current');
  }

  H.refreshMapOverlay = function () {
    if (!H.mapOverlayOpen()) return;
    H.showMapTab(H.mapTabOn());
  }

  H.paintRegionMap = function () {
    var c = document.getElementById('region-canvas');
    if (!c) return;
    if (c.width !== 446) c.width = 446;
    if (c.height !== 315) c.height = 315;
    var ctx2 = c.getContext('2d');
    H.paintRadar(ctx2, c.width, c.height, true);
    var cx = document.getElementById('map-cx');
    var cy = document.getElementById('map-cy');
    if (cx && cy && G.player && document.activeElement !== cx && document.activeElement !== cy) {
      cx.placeholder = String(Math.floor(G.player.x / TILE));
      cy.placeholder = String(Math.floor(G.player.y / TILE));
    }
  }

  H.fillMapNpcList = function () {
    var box = document.getElementById('map-npc-list');
    if (!box) return;
    var html = '';
    var spec = (D.MAP_FUNC && D.MAP_FUNC[G.mapId]) || null;
    function row(id, name) {
      var n = null;
      G.npcs.forEach(function (x) { if (x.id === id) n = x; });
      if (!n && D.NPCS[id] && D.NPCS[id].map === G.mapId) n = D.NPCS[id];
      if (!n) return;
      var ico = (window.Art && Art.npcIcon) ? Art.npcIcon(id) : '';
      html += '<button type="button" class="map-npc" data-map-npc="' + id + '">' +
        (ico ? '<img src="' + ico + '" alt="" />' : '') + (name || n.name) + '</button>';
    }
    if (spec && spec.length) {
      spec.forEach(function (it) { row(it.id, it.name); });
    } else {
      G.npcs.forEach(function (n) { row(n.id, n.name); });
    }
    if (!html) html = '<p class="map-tip">此地暂无功能 NPC。</p>';
    box.innerHTML = html;
  }

  H.fillMapJumpList = function () {
    var box = document.getElementById('map-jump-list');
    if (!box) return;
    var html = '';
    G.portals.forEach(function (pt, i) {
      html += '<button type="button" class="map-pt" data-map-portal="' + i + '">' +
        (pt.label || pt.to) + '</button>';
    });
    if (!html) html = '<p class="map-tip">此地暂无跳转点。</p>';
    box.innerHTML = html;
  }

  H.applyMapSideTab = function () {
    var tab = G.mapSideTab || 'npc';
    var npc = document.getElementById('map-npc-list');
    var jump = document.getElementById('map-jump-list');
    var title = document.getElementById('map-side-title');
    if (npc) npc.hidden = tab !== 'npc';
    if (jump) jump.hidden = tab !== 'jump';
    if (title) title.textContent = tab === 'jump' ? '跳转点' : '功能NPC';
    document.querySelectorAll('[data-side-tab]').forEach(function (b) {
      b.classList.toggle('on', b.dataset.sideTab === tab);
    });
  }

  H.fillNationPins = function () {
    var box = document.getElementById('nation-pins');
    var list = document.getElementById('nation-list');
    var era = H.eraName();
    var nodes = D.NATION_NODES || [];
    if (box) {
      box.innerHTML = nodes.map(function (n) {
        var cls = 'world-pin' + (G.mapId === n.id ? ' here' : '') + (n.locked ? ' locked' : '') +
          (G.mapPick === n.id ? ' pick' : '');
        return '<button type="button" class="' + cls + '" data-nation-go="' + n.id +
          '" style="left:' + n.left + ';top:' + n.top + '">' + n.name + '</button>';
      }).join('');
    }
    if (list) {
      list.innerHTML = nodes.map(function (n) {
        var cls = 'nation-row' + (G.mapId === n.id ? ' here' : '') + (n.locked ? ' locked' : '');
        return '<button type="button" class="' + cls + '" data-nation-go="' + n.id + '">' +
          era + '-' + n.name + '</button>';
      }).join('');
    }
  }

  H.fillWorldPins = function () {
    var box = document.getElementById('world-pins');
    if (box) {
      box.innerHTML = (D.WORLD_REGIONS || []).map(function (n) {
        var here = (n.go && G.mapId === n.go) || (n.tab === 'nation' && (D.NATION_NODES || []).some(function (m) { return m.id === G.mapId; }));
        var cls = 'world-pin' + (here ? ' here' : '') + (n.locked ? ' locked' : '');
        return '<button type="button" class="' + cls + '" data-world-go="' + n.id +
          '" style="left:' + n.left + ';top:' + n.top + '">' + n.name + '</button>';
      }).join('');
    }
    var list = document.getElementById('world-list');
    if (list) {
      var html = '<h5>地图</h5>';
      (D.WORLD_REGIONS || []).forEach(function (n) {
        var cls = 'nation-row' + (n.locked ? ' locked' : '');
        html += '<button type="button" class="' + cls + '" data-world-go="' + n.id + '">' + n.name + '</button>';
      });
      html += '<h5>全部场景</h5>';
      (D.WORLD_NODES || []).forEach(function (n) {
        html += '<button type="button" class="nation-row' + (G.mapId === n.id ? ' here' : '') +
          '" data-nation-go="' + n.id + '">' + n.name + '</button>';
      });
      html += '<h5>副本</h5>';
      (D.INSTANCE_WARPS || []).forEach(function (n) {
        html += '<button type="button" class="nation-row' + (G.mapId === n.id ? ' here' : '') +
          '" data-nation-go="' + n.id + '">' + n.name + '</button>';
      });
      list.innerHTML = html;
    }
  }

  H.clickRegionCanvas = function (ev) {
    var c = document.getElementById('region-canvas');
    if (!c || !G.grid || !G.player) return;
    var r = c.getBoundingClientRect();
    var px = ev.clientX - r.left, py = ev.clientY - r.top;
    var gx, gy;
    if (window.MapTiles && MapTiles.has(G.mapId)) {
      var meta = MapTiles.metaFor(G.mapId);
      var wlk = MapTiles.radarToWalk(px / r.width * c.width, py / r.height * c.height, c.width, c.height, meta, G.mapId);
      gx = Math.floor(wlk.tx);
      gy = Math.floor(wlk.ty);
    } else {
      gx = Math.floor((px / r.width) * G.grid[0].length);
      gy = Math.floor((py / r.height) * G.grid.length);
    }
    var cx = document.getElementById('map-cx');
    var cy = document.getElementById('map-cy');
    if (cx) cx.value = String(gx);
    if (cy) cy.value = String(gy);
    H.warpToCoord(gx, gy);
  }

  H.hoverRegionCanvas = function (ev) {
    var c = document.getElementById('region-canvas');
    var el = document.getElementById('map-cursor');
    if (!c || !el || !G.grid) return;
    var r = c.getBoundingClientRect();
    var px = ev.clientX - r.left, py = ev.clientY - r.top;
    var gx, gy;
    if (window.MapTiles && MapTiles.has(G.mapId)) {
      var meta = MapTiles.metaFor(G.mapId);
      var wlk = MapTiles.radarToWalk(px / r.width * c.width, py / r.height * c.height, c.width, c.height, meta, G.mapId);
      gx = Math.floor(wlk.tx);
      gy = Math.floor(wlk.ty);
    } else {
      gx = Math.floor((px / r.width) * G.grid[0].length);
      gy = Math.floor((py / r.height) * G.grid.length);
    }
    el.textContent = '[' + gx + ',' + gy + ']';
  }

  H.pathToCoord = function (tx, ty) {
    H.warpToCoord(tx, ty);
  }

  H.warpToCoord = function (tx, ty) {
    if (!G.grid || !G.player) return;
    var gw = G.grid[0].length, gh = G.grid.length;
    tx = H.clamp(tx | 0, 0, gw - 1);
    ty = H.clamp(ty | 0, 0, gh - 1);
    G.guide = null;
    G.player.target = null;
    G.dest = null;
    G.path = [];
    var landed = H.snapWalkable((tx + 0.5) * TILE, (ty + 0.5) * TILE);
    G.player.x = landed.x;
    G.player.y = landed.y;
    H.toast('传送至 ' + tx + ',' + ty);
    if (H.paintRegionMap) H.paintRegionMap();
  }

  H.mapNode = function (id) {
    var found = null;
    (D.WORLD_NODES || []).forEach(function (n) { if (n.id === id) found = n; });
    (D.NATION_NODES || []).forEach(function (n) { if (n.id === id) found = n; });
    (D.INSTANCE_WARPS || []).forEach(function (n) { if (n.id === id) found = n; });
    return found;
  }

  H.worldJump = function (id) {
    var node = H.mapNode(id);
    if (!node) return;
    if (node.locked) {
      H.toast(node.name + '本学习服未单独开放（对照原作标注）');
      return;
    }
    G.mapPick = id;
    if (G.mapId === id) {
      H.toast('已在' + node.name);
      return;
    }
    G.guide = null;
    G.instance = null;
    G.hold = false;
    if (H.hideFloorClear) H.hideFloorClear();
    H.travel(id, node.tx, node.ty);
    H.toast('传送至' + node.name);
  }

  H.worldRegionGo = function (id) {
    var node = null;
    (D.WORLD_REGIONS || []).forEach(function (n) { if (n.id === id) node = n; });
    if (!node) return;
    if (node.locked) {
      H.toast('本学习服对照洪武城拷，' + node.name + '与洪武共用场景。右侧列表可传送到具体地图');
      return;
    }
    if (node.tab) {
      H.showMapTab(node.tab);
      return;
    }
    if (node.go) H.worldJump(node.go);
  }

  H.mapTeleport = function () {
    var tab = H.mapTabOn();
    if (tab === 'current') {
      var cx = document.getElementById('map-cx');
      var cy = document.getElementById('map-cy');
      var x = parseInt((cx && (cx.value || cx.placeholder)) || '', 10);
      var y = parseInt((cy && (cy.value || cy.placeholder)) || '', 10);
      if (isNaN(x) || isNaN(y)) {
        H.toast('请输入坐标 X、Y，或点地图落点后再传送');
        return;
      }
      H.warpToCoord(x, y);
      return;
    }
    if (G.mapPick) {
      H.worldJump(G.mapPick);
      return;
    }
    H.toast('先点一个场景名，再按传送');
  }

  H.closePanels = function () {
    document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('open'); });
    H.closeMapOverlay();
  }

  H.openPanel = function (id) {
    var el = document.getElementById('panel-' + id);
    if (!el) return;
    var was = el.classList.contains('open');
    H.closePanels();
    if (!was) {
      el.classList.add('open');
      H.paintPanel(id);
    }
  }

  H.paintPanel = function (id) {
    var p = G.player, st = H.stats(p);
    if (id === 'char') {
      var attrs = st.attrs;
      var rows = Object.keys(D.ATTR_LABEL).map(function (k) {
        return '<div class="stat-line"><span>' + D.ATTR_LABEL[k] + '</span><span>' + attrs[k] +
          (p.unspentAttr > 0 ? ' <button class="plus" data-add="' + k + '">+</button>' : '') + '</span></div>';
      }).join('');
      document.getElementById('panel-char').innerHTML =
        H.header('角色', 'char') +
        '<div class="char-tabs"><button type="button" class="on" data-char-tab="attr">属性</button>' +
        '<button type="button" data-char-tab="mount">坐骑</button>' +
        '<button type="button" data-char-tab="fashion">时装</button>' +
        '<button type="button" data-char-tab="office">官职</button></div>' +
        '<div id="char-attr">' +
        '<div class="grid-2"><div>' +
        '<div class="stat-line"><span>名号</span><span>' + p.name + '</span></div>' +
        '<div class="stat-line"><span>性别 / 职业</span><span>' + (p.gender === 'f' ? '女侠' : '男侠') +
        '　' + D.CLASSES[p.cls].name + '</span></div>' +
        '<div class="stat-line"><span>等级</span><span>' + p.level + '</span></div>' +
        '<div class="stat-line"><span>阵营 / PK</span><span>' + (p.nation === 'yuan' ? '北元' : '大明') +
        '　' + (p.pkValue || 0) + ((p.pkValue || 0) >= 18 ? ' 红名' : '') + '</span></div>' +
        '<div class="stat-line"><span>银两 / 绑定</span><span>' + (p.silver || 0) + ' / ' + (p.bindSilver || 0) + '</span></div>' +
        '<div class="stat-line"><span>元宝 / 绑定</span><span>' + (p.gold || 0) + ' / ' + (p.bindGold || 0) + '</span></div>' +
        '<div class="stat-line"><span>明朝贵族</span><span>' + ((H.vipBonus && H.vipBonus(p).name) || '白身') + '</span></div>' +
        '<div class="stat-line"><span>官职</span><span>' + ((H.officeOf && H.officeOf(p).name) || '白身') + '</span></div>' +
        '<div class="stat-line"><span>精力</span><span>' + (p.energy || 0) + ' / ' + (H.energyMax ? H.energyMax(p) : (D.ENERGY_MAX || 4000)) + '</span></div>' +
        '<div class="stat-line"><span>可分配属性</span><span>' + p.unspentAttr + '</span></div>' +
        rows + '</div><div class="equip-list">' +
        D.SLOTS.map(function (s) {
          return H.slotRowHtml(s.name, p.equip[s.id]);
        }).join('') +
        '<div class="stat-line"><span>外攻 / 内攻</span><span>' + st.patk + ' / ' + st.matk + '</span></div>' +
        '<div class="stat-line"><span>外防 / 内防</span><span>' + st.pdef + ' / ' + st.mdef + '</span></div>' +
        '<div class="stat-line"><span>暴击</span><span>' + (st.crit * 100).toFixed(1) + '%</span></div>' +
        '<div class="stat-line"><span>移速</span><span>' + Math.floor(st.speed) + '</span></div>' +
        '</div></div></div>' +
        '<div id="char-mount" hidden>' + H.mountPanelHtml(p) + '</div>' +
        '<div id="char-fashion" hidden>' + H.fashionHtml(p) + '</div>' +
        '<div id="char-office" hidden>' + H.officeHtml(p) + '</div>';
    } else if (id === 'bag') {
      document.getElementById('panel-bag').innerHTML = H.header('背包', 'bag') +
        '<p style="color:#b8a57a;margin-bottom:8px">左键使用/装备，右键丢弃。[绑] 为绑定，不能交易。银两 ' +
        (p.silver || 0) + ' / 绑定 ' + (p.bindSilver || 0) +
        '　容量 ' + p.bag.length + '/' + H.bagCap(p) +
        '　<button class="btn ghost" data-bag-expand="1">扩展背包</button></p>' +
        '<div class="bag-grid">' + p.bag.map(function (it, i) {
          return H.itemCellHtml(it, 'data-bag="' + i + '"');
        }).join('') + '</div>';
    } else if (id === 'skills') {
      document.getElementById('panel-skills').innerHTML = H.header('武学', 'skills') +
        '<p style="margin-bottom:8px">剩余技能点 ' + p.unspentSkill + '</p>' +
        D.SKILLS[p.cls].map(function (sk) {
          var lv = p.skills[sk.id] || 0;
          var src = (window.Art && Art.skillIcon) ? Art.skillIcon(sk) : (sk.icon ? 'assets/ingame/skills/' + sk.icon + '.png' : '');
          return '<div class="stat-line skill-row">' +
            (src ? '<img class="skill-ico" src="' + src + '" alt="" />' : '') +
            '<span class="skill-meta">' + sk.name + ' Lv.' + lv +
            (p.level < sk.unlock ? '（' + sk.unlock + '级）' : '') +
            '<br/><small style="color:#b8a57a">' + sk.desc + '</small></span>' +
            (p.unspentSkill > 0 && p.level >= sk.unlock && lv < 8 ?
              '<button class="plus" data-sk="' + sk.id + '">+</button>' : '') + '</div>';
        }).join('');
    } else if (id === 'pet') {
      document.getElementById('panel-pet').innerHTML = H.header('灵宠', 'pet') + (p.pet
        ? '<div class="pet-board">' +
          '<p>' + p.pet.name + '　生命 ' + Math.floor(p.pet.hp) + '/' + p.pet.maxHp +
          '　资质 ' + (p.pet.apt || 1200) + '　悟性 ' + (p.pet.insight || 0) +
          '　训练星 ' + (p.pet.star || 0) + '　技能 ' + (p.pet.skills || 0) + '</p>' +
          '<p style="color:#b8a57a;margin:8px 0">出战随行。洗灵重掷资质，提悟提升生命倍率，训练牌升星。</p>' +
          '<img class="pet-wuxing" src="assets/ingame/petui/wu_xing.png" alt="五行" />' +
          '<img class="pet-heti" src="assets/ingame/petui/heti.png" alt="" />' +
          '<button class="btn" id="btn-feed">喂食口粮</button> ' +
          '<button class="btn ghost" data-pet-wash="1">洗灵</button> ' +
          '<button class="btn ghost" data-pet-insight="1">提悟</button> ' +
          '<button class="btn ghost" data-pet-train="1">训练</button> ' +
          '<button class="btn ghost" data-pet-book="1">技能书</button></div>'
        : '<p>尚未结缘。前往神农谷击败山魈，有机会收服灵宠。</p>');
    } else if (id === 'forge') {
      document.getElementById('panel-forge').innerHTML = H.header('百工炉', 'forge') +
        '<p style="color:#b8a57a;margin-bottom:8px"><img class="forge-tag" src="assets/ingame/ui/qianghua.png" alt="强化" /> 强化石 ' + H.countItem(p, 'stone') +
        '　开孔符 ' + H.countItem(p, 'socket') + '　银两 ' + (p.silver || 0) +
        ' / 绑定 ' + (p.bindSilver || 0) + '</p>' +
        '<div class="equip-list">' + D.SLOTS.map(function (s) {
          var it = p.equip[s.id];
          if (!it) return '';
          return '<div class="slot-row">' + H.itemArt(it) +
            '<span style="color:' + D.RARITY_COLOR[it.rarity] + '">' + H.itemName(it) +
            ' 孔' + it.sockets + '</span><span>' +
            '<button class="btn" data-en="' + s.id + '">升星</button> ' +
            '<button class="btn ghost" data-so="' + s.id + '">开孔</button> ' +
            '<button class="btn ghost" data-recolor="' + s.id + '">提色</button></span></div>';
        }).join('') + '</div>' +
        '<h4 style="color:#d4af37;margin:12px 0 6px">炼药</h4>' +
        D.RECIPES.map(function (r, i) {
          var keys = Object.keys(r.ins);
          return '<div class="stat-line"><span>' + keys.map(function (k) {
            return D.CONSUMABLES[k].name + '×' + r.ins[k] + '（有' + H.countItem(p, k) + '）';
          }).join(' + ') + ' → ' + D.CONSUMABLES[r.out.id].name + '</span>' +
            '<button class="btn" data-craft="' + i + '">炼</button></div>';
        }).join('') +
        '<h4 style="color:#d4af37;margin:12px 0 6px">镶石（点击灵石镶入当前武器）</h4>' +
        p.bag.filter(function (it) { return it.type === 'gem'; }).map(function (it, i) {
          return '<div class="stat-line"><span>' + H.itemName(it) + '</span><button class="btn ghost" data-gem="' + it.uid + '">镶武器</button></div>';
        }).join('') || '<p>背包暂无灵石</p>';
    } else if (id === 'quest') {
      document.getElementById('panel-quest').innerHTML = H.header('功业', 'quest') +
        D.QUESTS.map(function (q) {
          var stt = p.quests.done.indexOf(q.id) >= 0 ? '已完成' : (p.quests.active.indexOf(q.id) >= 0 ? '进行中' : '未开启');
          var go = p.quests.active.indexOf(q.id) >= 0
            ? '<button class="btn" data-quest-go="' + q.id + '">寻路</button>' : '';
          return '<div class="stat-line"><span>' + q.name + '<br/><small style="color:#b8a57a">' + q.text + '</small></span><span>' + stt + ' ' + go + '</span></div>';
        }).join('');
    } else if (id === 'help') {
      document.getElementById('panel-help').innerHTML = H.header('帮助', 'help') +
        D.HELP.map(function (h) { return '<p style="margin:6px 0;color:#d8c8a0">' + h + '</p>'; }).join('') +
        '<p style="margin-top:12px"><a href="index.html" style="color:#ffe7a0">返回选服</a></p>';
    } else if (id === 'warehouse') {
      H.paintWarehouse();
    } else if (id === 'social') {
      var invs = (G.pendingInvites || []).map(function (inv, i) {
        return '<div class="stat-line"><span>' + inv.from + '　' + inv.kind + '</span>' +
          '<button class="btn" data-inv-accept="' + i + '">接受</button></div>';
      }).join('') || '<p style="color:#b8a57a">暂无邀请</p>';
      var fl = (G.netFriends || []).map(function (u) { return '<div>' + u + '</div>'; }).join() || '无';
      var pt = G.netParty ? ('队长 ' + G.netParty.leader + '　' + (G.netParty.members || []).join('、')) : '未组队';
      var cl = G.netClan ? (G.netClan.name + '　' + (G.netClan.members || []).join('、')) : '无宗族';
      document.getElementById('panel-social').innerHTML = H.header('社交', 'social') +
        '<p>在线 ' + (G.onlineN || 0) + '　PK 值 ' + (G.player.pkValue || 0) +
        ((G.player.pkValue || 0) >= 18 ? '　红名' : '') + '</p>' +
        '<h4 style="color:#d4af37;margin:8px 0 4px">邀请</h4>' + invs +
        '<h4 style="color:#d4af37;margin:8px 0 4px">好友</h4><p>' + fl + '</p>' +
        '<h4 style="color:#d4af37;margin:8px 0 4px">队伍</h4><p>' + pt + '</p>' +
        (G.netParty ? '<button class="btn ghost" data-party-leave="1">离队</button>' : '') +
        '<h4 style="color:#d4af37;margin:8px 0 4px">宗族</h4><p>' + cl + '</p>' +
        (G.netClan
          ? '<button class="btn ghost" data-clan-leave="1">退出宗族</button>'
          : '<button class="btn" data-clan-create="1">创建宗族</button>') +
        '<h4 style="color:#d4af37;margin:8px 0 4px">师徒</h4><p>' +
        (p.mentor && p.mentor.master ? ('师父 ' + p.mentor.master) : '') +
        (p.mentor && p.mentor.pupil ? ('　徒弟 ' + p.mentor.pupil) : (p.mentor && p.mentor.master ? '' : '未结师徒')) +
        '</p><p style="color:#b8a57a">京城李梦阳处拜师/收徒。点其他玩家赠花增亲密度。</p>' +
        '<p style="color:#b8a57a;margin-top:8px">点其他玩家：组队 / 交易 / 加好友 / 密聊 / 跟随。K 摆摊。G 跟随。H 隐藏玩家。</p>';
    } else if (id === 'mail' && H.paintMail) {
      H.paintMail();
    } else if (id === 'achieve' && H.paintAchieve) {
      H.paintAchieve();
    } else if (id === 'rank' && H.paintRank) {
      H.paintRank();
    } else if (id === 'daily' && H.paintDaily) {
      H.paintDaily();
    } else if (id === 'vip' && H.paintVip) {
      H.paintVip();
    }
  }

  H.mountPanelHtml = function (p) {
    H.ensureDaily(p);
    if (!p.mount.owned) {
      return '<p style="color:#b8a57a">达到 ' + (D.MOUNT_LEVEL || 18) + ' 级时系统赠送坐骑。</p>';
    }
    var col = D.RARITY_COLOR[p.mount.rarity] || '#d8d0c4';
    var mul = F.mountSpeedMul(p.mount.rarity);
    var next = F.mountUpgradeChance(p.mount.rarity);
    var mg = H.mountEquipStats(p);
    var slots = (D.MOUNT_SLOTS || []).map(function (s) {
      var it = (p.mount.equip || {})[s.id];
      return H.slotRowHtml(s.name, it, it ? ' <button class="btn ghost" data-mount-en="' + s.id + '">升星</button>' : '');
    }).join('');
    return '<p>坐骑品质 <span style="color:' + col + '">' + (D.RARITY_NAME[p.mount.rarity] || p.mount.rarity) +
      '</span>　移速 ×' + mul.toFixed(2) + '　提星 ' + (p.mount.star || 0) + '</p>' +
      '<p style="color:#b8a57a;margin:8px 0">提速牌 ' + H.countItem(p, 'mount_token') +
      '　坐骑宝石 ' + H.countItem(p, 'mount_gem') +
      '　成功率 ' + (next ? Math.floor(next * 100) + '%' : '已满') + '</p>' +
      '<p style="color:#b8a57a">马装：生命 +' + mg.hp + '　外攻 +' + mg.patk + '　外防 +' + mg.pdef +
      '。穿上绑定。开封铁塔掉落。</p>' +
      '<div class="equip-list">' + slots + '</div>' +
      '<button class="btn" data-mount-ride="1">' + (p.mount.riding ? '下马' : '骑乘') + '</button> ' +
      (next ? '<button class="btn ghost" data-mount-up="1">提升速度</button>' : '') +
      '<button class="btn ghost" data-buy="mount_token" data-price="40">购提速牌 40 两</button>';
  }

  H.paintWarehouse = function () {
    var p = G.player;
    H.ensureDaily(p);
    G.whTab = G.whTab || 0;
    if (G.whTab >= p.warehouse.tabs) G.whTab = 0;
    var spec = D.WAREHOUSE || { cap: 36, maxTabs: 4, unlock: [0, 200, 500, 1000] };
    var tabs = '';
    for (var i = 0; i < spec.maxTabs; i++) {
      var open = i < p.warehouse.tabs;
      tabs += '<button type="button" class="' + (G.whTab === i ? 'on' : '') + '" data-wh-tab="' + i + '"' +
        (open ? '' : ' data-wh-unlock="' + i + '"') + '>' + (open ? '仓库' + (i + 1) : '开通 ' + spec.unlock[i] + '两') +
        '</button>';
    }
    var stash = p.warehouse.items[G.whTab] || [];
    document.getElementById('panel-warehouse').innerHTML = H.header('仓库', 'warehouse') +
      '<p style="color:#b8a57a;margin-bottom:6px">第一仓免费，最多四仓。左键：背包→仓 / 仓→背包。</p>' +
      '<div class="char-tabs">' + tabs + '</div>' +
      '<div class="grid-2"><div><h4 style="color:#d4af37">背包</h4><div class="bag-grid">' +
      p.bag.map(function (it, i) {
        return H.itemCellHtml(it, 'data-wh-in="' + i + '"');
      }).join('') + '</div></div><div><h4 style="color:#d4af37">仓库</h4><div class="bag-grid">' +
      stash.map(function (it, i) {
        return H.itemCellHtml(it, 'data-wh-out="' + i + '"');
      }).join('') + '</div></div></div>';
  }

  H.header = function (title, panelId) {
    var img = panelId && D.PANEL_TITLE && D.PANEL_TITLE[panelId];
    var label = img
      ? '<img class="panel-title-img" src="assets/ingame/' + img + '" alt="' + title + '" />'
      : title;
    return '<h3>' + label + '<button class="close" data-close="1">×</button></h3>';
  }

  H.escAttr = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  };

  H.itemArt = function (it) {
    var src = window.Art && Art.itemIcon ? Art.itemIcon(typeof it === 'string' ? { id: it } : it) : '';
    return src ? '<img class="item-ico" src="' + src + '" alt="" />' : '';
  };

  H.itemCellHtml = function (it, attrs) {
    var name = H.itemName(it);
    return '<div class="item-cell" title="' + H.escAttr(name) + '" ' + (attrs || '') + '>' +
      H.itemArt(it) +
      (it && it.n > 1 ? '<span class="n">' + it.n + '</span>' : '') +
      '</div>';
  };

  H.slotRowHtml = function (label, it, extra) {
    var col = it ? (D.RARITY_COLOR[it.rarity] || '#f3e6c4') : '#888';
    return '<div class="slot-row">' + H.itemArt(it) +
      '<span>' + label + '</span><span style="color:' + col + '">' +
      (it ? H.itemName(it) : '空') + '</span>' + (extra || '') + '</div>';
  };

  H.openShop = function (kind) {
    var p = G.player;
    G.shopKind = kind;
    var list;
    if (kind === 'mall') {
      var seen = {};
      list = [];
      ['smith', 'drug', 'mall'].forEach(function (k) {
        (D.SHOPS[k] || []).forEach(function (s) {
          if (seen[s.id]) return;
          seen[s.id] = 1;
          list.push(s);
        });
      });
    } else {
      list = D.SHOPS[kind] || [];
    }
    H.closePanels();
    var el = document.getElementById('panel-shop');
    el.classList.add('open');
    var pay = G.shopPay || 'silver';
    var tabs = '';
    if (kind === 'mall') {
      tabs = '<div class="rank-tabs">' +
        '<button type="button" class="' + (pay !== 'gold' ? 'on' : '') + '" data-shop-pay="silver">银两</button>' +
        '<button type="button" class="' + (pay === 'gold' ? 'on' : '') + '" data-shop-pay="gold">元宝商城</button></div>';
    }
    var body;
    if (kind === 'mall' && pay === 'gold') {
      body = (D.SHOPS.gold || []).map(function (s) {
        var cost = H.goldPrice ? H.goldPrice(s.gold) : s.gold;
        return '<div class="stat-line">' + H.itemArt(s.id) + '<span>' + D.CONSUMABLES[s.id].name + '　' + cost + ' 元宝</span>' +
          '<button class="btn" data-buy-gold="' + s.id + '">购</button></div>';
      }).join('');
      el.innerHTML = H.header('元宝商城', 'shop') + tabs +
        '<p style="color:#b8a57a;margin-bottom:8px">你当前拥有元宝 ' + (p.gold || 0) +
        '　绑定 ' + (p.bindGold || 0) + '。优先使用绑定元宝。购得道具绑定。</p>' + body;
      return;
    }
    el.innerHTML = H.header(kind === 'mall' ? '商城' : '货殖', 'shop') + tabs +
      '<p style="color:#b8a57a;margin-bottom:8px">银两 ' + (p.silver || 0) + ' / 绑定 ' + (p.bindSilver || 0) +
      '。优先扣绑定银两。购得道具绑定。</p>' + list.map(function (s) {
      return '<div class="stat-line">' + H.itemArt(s.id) + '<span>' + D.CONSUMABLES[s.id].name + '　' + s.price + ' 两</span>' +
        '<button class="btn" data-buy="' + s.id + '" data-price="' + s.price + '">购</button></div>';
    }).join('');
  }

  H.talkNpc = function (n) {
    var def = D.NPCS[n.id];
    if (!def) return;
    var el = document.getElementById('dialog');
    var opts = '<button class="btn ghost" data-bye="1">告辞</button>';
    if (def.shop) opts += '<button class="btn" data-openshop="' + def.shop + '">买卖</button>';
    if (def.forge) opts += '<button class="btn" data-openforge="1">开炉</button>';
    if (def.warehouse) opts += '<button class="btn" data-openwh="1">仓库</button>';
    if (def.bank) {
      opts += '<button class="btn" data-bank="to">兑银票（500两）</button>';
      opts += '<button class="btn ghost" data-bank="from">银票兑银</button>';
      opts += '<button class="btn" data-yb-buy="1">买入元宝（100两）</button>';
      opts += '<button class="btn ghost" data-yb-buy="10">买入10元宝</button>';
      opts += '<button class="btn ghost" data-yb-sell="1">卖出元宝（80两）</button>';
    }
    if (def.skills) opts += '<button class="btn" data-openskills="1">技能</button>';
    if (def.travel) opts += '<button class="btn" data-npc-travel="' + def.travel + '">乘车前往</button>';
    if (def.merit) {
      if (H.meritReady()) opts += '<button class="btn" data-merit="turn">交还建功立业</button>';
      else if (!(G.player.merit && G.player.merit.active)) opts += '<button class="btn" data-merit="take">领取建功立业</button>';
      else opts += '<button class="btn ghost" data-merit="hint">查看差事</button>';
    }
    if (def.escort) opts += '<button class="btn" data-escort="1">接下押镖（押金20两）</button>';
    if (def.tower) {
      H.ensureDungeon(G.player);
      opts += '<button class="btn" data-open-tower="1">选择关卡</button>';
      opts += '<button class="btn ghost" data-tower-auto="1">自动闯关（每关' + (D.INSTANCES.tower.autoCost || 5) + '两）</button>';
    }
    if (def.poyang) {
      (D.INSTANCES.poyang.diffs || []).forEach(function (d) {
        opts += '<button class="btn poyang-diff" data-poyang-diff="' + d.id + '">' +
          (d.img ? '<img src="assets/ingame/dup/' + d.img + '" alt="" />' : '') + d.name + '难度</button>';
      });
    }
    if (def.portal) {
      opts += '<button class="btn" data-enter-fish="1">捕鱼儿海</button>';
      opts += '<button class="btn" data-enter-treasure="1">大明宝藏</button>';
      opts += '<button class="btn ghost" data-enter-arena="1">竞技场</button>';
    }
    if (def.mentor) {
      opts += '<button class="btn" data-mentor="pupil">拜师</button>';
      opts += '<button class="btn ghost" data-mentor="master">收徒</button>';
      opts += '<button class="btn" data-enter-mentor="1">师徒同心副本</button>';
    }
    if (def.jingxin) {
      opts += '<button class="btn" data-enter-jingxin="1">进入步步惊心</button>';
    }
    if (def.palace) {
      opts += '<button class="btn" data-enter-palace="1">进入深宫谍影</button>';
    }
    if (def.pagoda) {
      opts += '<button class="btn" data-enter-pagoda="1">进入开封铁塔</button>';
    }
    if (def.market) opts += '<button class="btn" data-open-market="1">浏览市场</button>';
    if (def.office) opts += '<button class="btn" data-open-office="1">查看官职</button>';
    if (def.rank) opts += '<button class="btn ghost" data-open-flower-rank="1">鲜花榜</button>';
    if (def.merit) {
      opts += '<button class="btn ghost" data-chue-take="1">除恶令</button>';
    }
    if (H.inInstance()) opts += '<button class="btn ghost" data-leave-instance="1">离开副本</button>';
    if (n.id === 'xunshou' && !G.player.pet) opts += '<button class="btn" data-buypet="1">以 80 两请一只幼兽</button>';
    var face = (window.Art && Art.npcPortrait) ? Art.npcPortrait(n.id) : '';
    var who = (def.title ? def.title + ' · ' : '') + n.name;
    el.innerHTML = '<div class="dialog-body">' +
      (face ? '<img class="npc-face" src="' + face + '" alt="" />' : '') +
      '<div class="dialog-text"><div class="who">' + who + '</div><div>' + (def.lines[0] || '') +
      '</div><div class="opts">' + opts + '</div></div></div>';
    el.classList.add('open');
    G.dialogNpc = n;
    H.paintPanel('char');
  }

  H.fashionHtml = function (p) {
    var g = p.gender === 'f' ? 'f' : 'm';
    return '<div class="fashion-bg"><div class="fashion-list">' + (D.FASHIONS || []).map(function (f) {
      var locked = p.level < f.min;
      var src = (window.Art && Art.heroSheetSrc) ? Art.heroSheetSrc(g, f.id) : '';
      var on = p.fashionId === f.id;
      return '<div class="fashion-card' + (on ? ' on' : '') + (locked ? ' locked' : '') + '">' +
        (src ? '<div class="role-preview ' + (on ? 'walk-front' : 'stand-front') + '" style="background-image:url(' + src + ')"></div>' : '') +
        '<div class="fashion-meta"><b>' + f.name + '</b><span>' + f.desc +
        (locked ? '（' + f.min + '级）' : '') + '</span>' +
        (on ? '<em>使用中</em>' :
          (locked ? '' : '<button class="btn ghost" data-fashion="' + f.id + '">换装</button>')) +
        '</div></div>';
    }).join('') + '</div></div>';
  };

  H.officeHtml = function (p) {
    var cur = H.officeOf(p);
    return '<p>当前官职 <b>' + cur.name + '</b>　生命 +' + cur.hp + '　外攻 +' + cur.patk + '　外防 +' + cur.pdef + '</p>' +
      '<p style="color:#b8a57a;margin:8px 0">按等级自动授官，找京城吏部主事查看。</p>' +
      (D.OFFICES || []).map(function (o) {
        return '<div class="stat-line"><span>' + o.name + '</span><span>' + o.min + ' 级</span></div>';
      }).join('');
  }

  H.openTowerSelect = function () {
    var p = G.player;
    H.ensureDungeon(p);
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

  H.closeDialog = function () {
    document.getElementById('dialog').classList.remove('open');
    G.dialogNpc = null;
  }

})(window.Hongwu);
