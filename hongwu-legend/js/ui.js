/**
 * 洪武风云录 — 面板、对话、商店、地图 overlay
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

  H.regionTabOn = function () {
    var pane = document.getElementById('map-region');
    return !!(pane && !pane.hidden);
  }

  H.closeMapOverlay = function () {
    var el = document.getElementById('map-overlay');
    if (el) el.hidden = true;
  }

  H.showMapTab = function (tab) {
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
      H.paintRegionMap();
      H.fillMapNpcList();
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
    H.showMapTab(tab || 'region');
  }

  H.refreshMapOverlay = function () {
    if (!H.mapOverlayOpen()) return;
    H.showMapTab(H.regionTabOn() ? 'region' : 'world');
  }

  H.paintRegionMap = function () {
    var c = document.getElementById('region-canvas');
    if (!c) return;
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

  H.fillWorldPins = function () {
    var box = document.getElementById('world-pins');
    if (!box) return;
    box.innerHTML = (D.WORLD_NODES || []).map(function (n) {
      return '<button type="button" class="world-pin' + (G.mapId === n.id ? ' here' : '') +
        '" data-world-go="' + n.id + '" style="left:' + n.left + ';top:' + n.top + '" title="' +
        (n.desc || n.name) + '">' + n.name + '</button>';
    }).join('');
  }

  H.clickRegionCanvas = function (ev) {
    var c = document.getElementById('region-canvas');
    if (!c || !G.grid || !G.player) return;
    var r = c.getBoundingClientRect();
    var gx = ((ev.clientX - r.left) / r.width) * G.grid[0].length;
    var gy = ((ev.clientY - r.top) / r.height) * G.grid.length;
    G.guide = null;
    G.player.target = null;
    H.setDest((gx + 0.5) * TILE, (gy + 0.5) * TILE);
    H.toast('寻路至 ' + Math.floor(gx) + ',' + Math.floor(gy));
  }

  H.pathToCoord = function (tx, ty) {
    if (!G.grid || !G.player) return;
    var gw = G.grid[0].length, gh = G.grid.length;
    tx = H.clamp(tx | 0, 0, gw - 1);
    ty = H.clamp(ty | 0, 0, gh - 1);
    G.guide = null;
    G.player.target = null;
    H.setDest((tx + 0.5) * TILE, (ty + 0.5) * TILE);
    H.toast('寻路至 ' + tx + ',' + ty);
  }

  H.worldJump = function (id) {
    if (H.inInstance()) { H.toast('在副本地图中不能进行地图跳转'); return; }
    var node = null;
    (D.WORLD_NODES || []).forEach(function (n) { if (n.id === id) node = n; });
    if (!node) return;
    if (G.mapId === id) {
      H.toast('已在' + node.name);
      return;
    }
    H.closeMapOverlay();
    G.guide = null;
    if (id === 'poyang') {
      H.travel('capital', 36, 22);
      H.toast('找明军水兵进入鄱阳湖大战');
      return;
    }
    if (H.countItem(G.player, 'scroll') > 0) {
      H.takeItem(G.player, 'scroll', 1);
      H.travel(id, node.tx, node.ty);
      H.toast('使用传送卷抵达' + node.name);
      return;
    }
    G.guide = { tgt: { kind: 'map', map: id } };
    H.toast('寻路前往' + node.name + '（有传送卷可瞬移）');
    H.guideStep();
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
        H.header('角色') +
        '<div class="char-tabs"><button type="button" class="on" data-char-tab="attr">属性</button>' +
        '<button type="button" data-char-tab="mount">坐骑</button></div>' +
        '<div id="char-attr">' +
        '<div class="grid-2"><div>' +
        '<div class="stat-line"><span>名号</span><span>' + p.name + '</span></div>' +
        '<div class="stat-line"><span>职业</span><span>' + D.CLASSES[p.cls].name + '</span></div>' +
        '<div class="stat-line"><span>等级</span><span>' + p.level + '</span></div>' +
        '<div class="stat-line"><span>阵营 / PK</span><span>' + (p.nation === 'yuan' ? '北元' : '大明') +
        '　' + (p.pkValue || 0) + ((p.pkValue || 0) >= 18 ? ' 红名' : '') + '</span></div>' +
        '<div class="stat-line"><span>银两 / 金锭</span><span>' + p.silver + ' / ' + p.gold + '</span></div>' +
        '<div class="stat-line"><span>精力</span><span>' + (p.energy || 0) + ' / ' + (D.ENERGY_MAX || 4000) + '</span></div>' +
        '<div class="stat-line"><span>可分配属性</span><span>' + p.unspentAttr + '</span></div>' +
        rows + '</div><div class="equip-list">' +
        D.SLOTS.map(function (s) {
          var it = p.equip[s.id];
          return '<div class="slot-row"><span>' + s.name + '</span><span style="color:' +
            (it ? D.RARITY_COLOR[it.rarity] : '#888') + '">' + (it ? H.itemName(it) : '空') + '</span></div>';
        }).join('') +
        '<div class="stat-line"><span>外攻 / 内攻</span><span>' + st.patk + ' / ' + st.matk + '</span></div>' +
        '<div class="stat-line"><span>外防 / 内防</span><span>' + st.pdef + ' / ' + st.mdef + '</span></div>' +
        '<div class="stat-line"><span>暴击</span><span>' + (st.crit * 100).toFixed(1) + '%</span></div>' +
        '<div class="stat-line"><span>移速</span><span>' + Math.floor(st.speed) + '</span></div>' +
        '</div></div></div>' +
        '<div id="char-mount" hidden>' + H.mountPanelHtml(p) + '</div>';
    } else if (id === 'bag') {
      document.getElementById('panel-bag').innerHTML = H.header('背包') +
        '<p style="color:#b8a57a;margin-bottom:8px">左键使用/装备，右键丢弃。银两 ' + p.silver + '</p>' +
        '<div class="bag-grid">' + p.bag.map(function (it, i) {
          var col = it.rarity ? D.RARITY_COLOR[it.rarity] : '#f3e6c4';
          return '<div class="item-cell" data-bag="' + i + '" style="color:' + col + '">' + H.itemName(it) +
            (it.n > 1 ? '<span class="n">' + it.n + '</span>' : '') + '</div>';
        }).join('') + '</div>';
    } else if (id === 'skills') {
      document.getElementById('panel-skills').innerHTML = H.header('武学') +
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
      document.getElementById('panel-pet').innerHTML = H.header('灵宠') + (p.pet
        ? '<p>' + p.pet.name + '　生命 ' + Math.floor(p.pet.hp) + '/' + p.pet.maxHp + '</p>' +
          '<p style="color:#b8a57a;margin:8px 0">出战随行，自动攻击你的目标。口粮可回复生命。</p>' +
          '<button class="btn" id="btn-feed">喂食口粮</button>'
        : '<p>尚未结缘。前往神农谷击败山魈，有机会收服灵宠。</p>');
    } else if (id === 'forge') {
      document.getElementById('panel-forge').innerHTML = H.header('百工炉') +
        '<p style="color:#b8a57a;margin-bottom:8px">强化石 ' + H.countItem(p, 'stone') +
        '　开孔符 ' + H.countItem(p, 'socket') + '　银两 ' + p.silver + '</p>' +
        '<div class="equip-list">' + D.SLOTS.map(function (s) {
          var it = p.equip[s.id];
          if (!it) return '';
          return '<div class="slot-row"><span style="color:' + D.RARITY_COLOR[it.rarity] + '">' + H.itemName(it) +
            ' 孔' + it.sockets + '</span><span>' +
            '<button class="btn" data-en="' + s.id + '">升星</button> ' +
            '<button class="btn ghost" data-so="' + s.id + '">开孔</button></span></div>';
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
      document.getElementById('panel-quest').innerHTML = H.header('功业') +
        D.QUESTS.map(function (q) {
          var stt = p.quests.done.indexOf(q.id) >= 0 ? '已完成' : (p.quests.active.indexOf(q.id) >= 0 ? '进行中' : '未开启');
          var go = p.quests.active.indexOf(q.id) >= 0
            ? '<button class="btn" data-quest-go="' + q.id + '">寻路</button>' : '';
          return '<div class="stat-line"><span>' + q.name + '<br/><small style="color:#b8a57a">' + q.text + '</small></span><span>' + stt + ' ' + go + '</span></div>';
        }).join('');
    } else if (id === 'help') {
      document.getElementById('panel-help').innerHTML = H.header('帮助') +
        D.HELP.map(function (h) { return '<p style="margin:6px 0;color:#d8c8a0">' + h + '</p>'; }).join('');
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
      document.getElementById('panel-social').innerHTML = H.header('社交') +
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
        '<p style="color:#b8a57a;margin-top:8px">点其他玩家：组队 / 交易 / 加好友 / 密聊 / 跟随。K 摆摊。G 跟随。H 隐藏玩家。</p>';
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
    return '<p>坐骑品质 <span style="color:' + col + '">' + (D.RARITY_NAME[p.mount.rarity] || p.mount.rarity) +
      '</span>　移速 ×' + mul.toFixed(2) + '</p>' +
      '<p style="color:#b8a57a;margin:8px 0">提速牌 ' + H.countItem(p, 'mount_token') +
      '　成功率 ' + (next ? Math.floor(next * 100) + '%' : '已满') + '</p>' +
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
    document.getElementById('panel-warehouse').innerHTML = H.header('仓库') +
      '<p style="color:#b8a57a;margin-bottom:6px">第一仓免费，最多四仓。左键：背包→仓 / 仓→背包。</p>' +
      '<div class="char-tabs">' + tabs + '</div>' +
      '<div class="grid-2"><div><h4 style="color:#d4af37">背包</h4><div class="bag-grid">' +
      p.bag.map(function (it, i) {
        var col = it.rarity ? D.RARITY_COLOR[it.rarity] : '#f3e6c4';
        return '<div class="item-cell" data-wh-in="' + i + '" style="color:' + col + '">' + H.itemName(it) +
          (it.n > 1 ? '<span class="n">' + it.n + '</span>' : '') + '</div>';
      }).join('') + '</div></div><div><h4 style="color:#d4af37">仓库</h4><div class="bag-grid">' +
      stash.map(function (it, i) {
        var col = it.rarity ? D.RARITY_COLOR[it.rarity] : '#f3e6c4';
        return '<div class="item-cell" data-wh-out="' + i + '" style="color:' + col + '">' + H.itemName(it) +
          (it.n > 1 ? '<span class="n">' + it.n + '</span>' : '') + '</div>';
      }).join('') + '</div></div></div>';
  }

  H.header = function (title) {
    return '<h3>' + title + '<button class="close" data-close="1">×</button></h3>';
  }

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
    el.innerHTML = H.header(kind === 'mall' ? '商城' : '货殖') + list.map(function (s) {
      return '<div class="stat-line"><span>' + D.CONSUMABLES[s.id].name + '　' + s.price + ' 两</span>' +
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
        opts += '<button class="btn" data-poyang-diff="' + d.id + '">' + d.name + '难度</button>';
      });
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
    H.maybeCompleteTalk(n.id);
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
