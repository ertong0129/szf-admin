/**
 * 大明传说 — 局域网玩家、社交、交易、摆摊
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {
  H.chatSeen = {};
  var chatSeen = H.chatSeen;

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.asPeerTarget = function (o) {
    return {
      isPeer: true,
      user: o.user,
      name: o.name,
      x: o.x,
      y: o.y,
      hp: o.hp,
      maxHp: o.maxHp,
      level: o.level || 1,
      r: 14,
      pkMode: o.pkMode,
      pkValue: o.pkValue,
      nation: o.nation,
      red: o.red,
      stall: o.stall,
      cls: o.cls,
      mapId: o.mapId
    };
  }

  H.findPeerAt = function (wpos, rad) {
    rad = rad || 32;
    var best = null, bd = rad;
    (G.peers || []).forEach(function (o) {
      if (o.mapId && o.mapId !== G.mapId) return;
      var d = H.dist(wpos, o);
      if (d < bd) { bd = d; best = o; }
    });
    return best;
  }

  H.hitPeer = function (t, dmg, crit) {
    var p = G.player;
    var safe = !!(D.MAP_META[G.mapId] && D.MAP_META[G.mapId].safe);
    H.floatText(t.x, t.y - 18, (crit ? '暴 ' : '') + dmg, crit ? '#ffd36a' : '#ff8a6a');
    if (!window.GameAPI || !GameAPI.online) {
      H.toast('需要连接服务端才能 PK');
      return;
    }
    GameAPI.social('hit', {
      server: H.currentServer(),
      target: t.user,
      dmg: dmg,
      safe: safe
    }).then(function (j) {
      if (j.pkValue != null) p.pkValue = j.pkValue;
      if (j.killed) H.toast('击败 ' + t.name);
    }).catch(function (e) {
      H.toast((e && e.message) || '无法攻击');
    });
  }

  H.netTick = function () {
    if (G.mode !== 'play' || !G.player) return;
    if (!window.GameAPI || !GameAPI.online || !GameAPI.token) return;
    var p = G.player;
    var st = H.stats(p);
    GameAPI.worldTick({
      server: H.currentServer(),
      name: p.name,
      cls: p.cls,
      level: p.level,
      mapId: G.mapId,
      x: p.x,
      y: p.y,
      hp: p.hp,
      maxHp: st.maxHp,
      mp: p.mp,
      pkMode: p.pkMode,
      pkValue: p.pkValue || 0,
      nation: p.nation || 'ming',
      sit: !!p.sit,
      facing: p.facing || 0
    }).then(function (snap) { H.applyNet(snap); }).catch(function () {});
  }

  H.applyNet = function (snap) {
    if (!snap || !G.player) return;
    G.peers = snap.players || [];
    G.onlineN = snap.online || G.peers.length;
    G.netParty = snap.party || null;
    G.netClan = snap.clan || null;
    G.netFriends = snap.friends || [];
    G.netTrade = snap.trade || null;
    if (snap.me && snap.me.pkValue != null) G.player.pkValue = snap.me.pkValue;
    if (G.player.target && G.player.target.isPeer) {
      var keep = null;
      G.peers.forEach(function (o) {
        if (o.user === G.player.target.user) keep = H.asPeerTarget(o);
      });
      G.player.target = keep;
    }
    if (G.followUser) {
      var fu = null;
      G.peers.forEach(function (o) { if (o.user === G.followUser) fu = o; });
      if (fu && G.mapId === fu.mapId) H.setDest(fu.x, fu.y);
    }
    (snap.chat || []).forEach(function (l) {
      H.ingestChat(l);
    });
    (snap.events || []).forEach(H.applyNetEvent);
    (snap.invites || []).forEach(H.applyInvite);
    H.refreshOnlineHud();
    if (document.getElementById('panel-social') && document.getElementById('panel-social').classList.contains('open')) {
      H.paintPanel('social');
    }
    if (G.netTrade) H.paintTrade();
  }

  H.ingestChat = function (l) {
    var key = (l.t || 0) + ':' + l.user + ':' + l.text;
    if (chatSeen[key]) return;
    chatSeen[key] = 1;
    var tag = l.chan === 'world' ? '世界' : l.chan === 'party' ? '队伍' : l.chan === 'clan' ? '宗族' : '附近';
    G.log.unshift('[' + tag + '] ' + l.who + '：' + l.text);
    if (G.log.length > 40) G.log.pop();
    H.renderLog();
  }

  H.applyNetEvent = function (ev) {
    var p = G.player;
    if (!ev || !p) return;
    if (ev.kind === 'pvp_hurt') {
      p.hp = Math.max(0, ev.hp != null ? ev.hp : p.hp - (ev.dmg || 0));
      H.floatText(p.x, p.y - 18, '-' + ev.dmg, '#ff6a6a');
      H.log(ev.name + ' 对你造成 ' + ev.dmg + ' 伤害');
      if (p.hp <= 0) H.die();
    } else if (ev.kind === 'pvp_dead') {
      H.toast(ev.name + ' 将你击倒');
    } else if (ev.kind === 'pvp_kill') {
      p.pkValue = ev.pkValue || p.pkValue;
      H.toast('击败 ' + ev.name + '　PK ' + p.pkValue);
    } else if (ev.kind === 'whisper') {
      H.log('[密] ' + ev.name + '：' + ev.text);
    } else if (ev.kind === 'party') {
      H.toast(ev.text || '队伍变动');
    } else if (ev.kind === 'trade_open') {
      H.toast('开始交易');
      H.paintTrade();
    } else if (ev.kind === 'trade_done') {
      (ev.give && ev.give.items || []).forEach(function () { /* already removed locally */ });
      (ev.take && ev.take.items || []).forEach(function (it) { H.addItem(p, it); });
      if (ev.take && ev.take.silver) H.addSilver(p, ev.take.silver | 0, false);
      G.tradeOffer = { items: [], silver: 0 };
      H.toast('交易完成');
      H.closePanels();
    } else if (ev.kind === 'trade_cancel') {
      (ev.offer && ev.offer.items || []).forEach(function (it) { H.addItem(p, it); });
      if (ev.offer && ev.offer.silver) H.addSilver(p, ev.offer.silver | 0, false);
      G.tradeOffer = { items: [], silver: 0 };
      H.toast('交易取消，物品已退回');
    } else if (ev.kind === 'stall_got') {
      if (!H.paySilver(ev.price || 0, 'unbind', '不绑定银两不足（摊主已下架请刷新）')) return;
      if (ev.item) H.addItem(p, Object.assign({}, ev.item, { bind: false }));
      H.toast('购得摊货');
    } else if (ev.kind === 'stall_sold') {
      H.addSilver(p, ev.price || 0, false);
      H.toast('摊位售出 ' + (ev.price || 0) + ' 两');
    }
  }

  H.applyInvite = function (inv) {
    if (!inv) return;
    var from = inv.from;
    if (inv.kind === 'party') H.toast(from + ' 邀请你组队，按 R 打开社交接受');
    else if (inv.kind === 'friend') H.toast(from + ' 想加你为好友，按 R 打开社交');
    else if (inv.kind === 'clan') H.toast(from + ' 邀请你入宗族，按 R 打开社交');
    else if (inv.kind === 'trade') H.toast(from + ' 请求交易，按 R 打开社交');
    G.pendingInvites = G.pendingInvites || [];
    G.pendingInvites.push(inv);
  }

  H.talkPeer = function (o) {
    var el = document.getElementById('dialog');
    var who = o.name + '　Lv.' + (o.level || 1) + (o.red ? '　红名' : '');
    var opts = '<button class="btn ghost" data-bye="1">告辞</button>' +
      '<button class="btn" data-soc="party_invite" data-who="' + o.user + '">组队</button>' +
      '<button class="btn" data-soc="trade_ask" data-who="' + o.user + '">交易</button>' +
      '<button class="btn" data-soc="friend_add" data-who="' + o.user + '">加好友</button>' +
      '<button class="btn ghost" data-whisper="' + o.user + '">密聊</button>' +
      '<button class="btn ghost" data-follow="' + o.user + '">跟随</button>' +
      '<button class="btn" data-soc="clan_invite" data-who="' + o.user + '">邀入宗族</button>' +
      '<button class="btn ghost" data-flower="' + o.user + '">赠花</button>';
    if (o.stall) opts += '<button class="btn" data-look-stall="' + o.user + '">看摊</button>';
    el.innerHTML = '<div class="dialog-body"><div class="dialog-text"><div class="who">' + who +
      '</div><div>阵营 ' + (o.nation === 'yuan' ? '北元' : '大明') +
      '　PK ' + (o.pkMode || '和平') + '</div><div class="opts">' + opts + '</div></div></div>';
    el.classList.add('open');
    G.dialogNpc = null;
    G.peerFocus = o.user;
  }

  H.doSocial = function (op, who, extra) {
    if (!window.GameAPI || !GameAPI.online) { H.toast('需要连接服务端'); return; }
    extra = extra || {};
    extra.server = H.currentServer();
    extra.user = who;
    extra.target = who;
    GameAPI.social(op, extra).then(function () {
      H.toast('已发送');
      H.netTick();
    }).catch(function (e) { H.toast((e && e.message) || '失败'); });
  }

  H.refreshOnlineHud = function () {
    var el = document.getElementById('online-line');
    if (!el) return;
    var n = G.onlineN || 0;
    el.textContent = n ? ('在线 ' + n) : '离线单人';
  }

  H.paintTrade = function () {
    var box = document.getElementById('panel-trade');
    if (!box) return;
    var tr = G.netTrade;
    if (!tr) { box.classList.remove('open'); return; }
    box.classList.add('open');
    var mine = (tr.mine && tr.mine.items) || G.tradeOffer.items || [];
    var theirs = (tr.theirs && tr.theirs.items) || [];
    box.innerHTML = H.header('交易') +
      '<div class="grid-2"><div><h4 style="color:#d4af37">我出</h4>' +
      mine.map(function (it) { return '<div>' + H.itemName(it) + '</div>'; }).join('') +
      '<p>银两 ' + ((tr.mine && tr.mine.silver) || G.tradeOffer.silver || 0) + '</p>' +
      '<p>' + (tr.myLock ? '已锁定' : '') + (tr.myOk ? ' 已确认' : '') + '</p></div>' +
      '<div><h4 style="color:#d4af37">对方</h4>' +
      theirs.map(function (it) { return '<div>' + H.itemName(it) + '</div>'; }).join('') +
      '<p>银两 ' + ((tr.theirs && tr.theirs.silver) || 0) + '</p>' +
      '<p>' + (tr.theirLock ? '已锁定' : '未锁定') + '</p></div></div>' +
      '<p style="color:#b8a57a">背包左键物品可放入（先点背包）。</p>' +
      '<button class="btn" data-trade-lock="1">锁定</button> ' +
      '<button class="btn" data-trade-ok="1">确认</button> ' +
      '<button class="btn ghost" data-trade-cancel="1">取消</button>';
  }

  H.openStall = function () {
    var p = G.player;
    if (G.mapId !== 'capital' && G.mapId !== 'taiping' && G.mapId !== 'kaifeng') { H.toast('请在城镇摆摊'); return; }
    var goods = p.bag.filter(function (it) { return it && !it.bind; }).slice(0, 6).map(function (it) {
      return { item: it, price: 20 };
    });
    if (!goods.length) { H.toast('没有不绑定物品可摆摊'); return; }
    goods.forEach(function (g) {
      var idx = p.bag.indexOf(g.item);
      if (idx >= 0) p.bag.splice(idx, 1);
    });
    H.doSocial('stall_open', '', { title: p.name + '的摊', goods: goods });
    G.stalling = true;
    H.toast('开始摆摊（K 收摊）');
    p.sit = true;
  }

  H.lookStall = function (user) {
    var o = null;
    (G.peers || []).forEach(function (x) { if (x.user === user) o = x; });
    if (!o || !o.stall) { H.toast('摊位已收'); return; }
    var el = document.getElementById('dialog');
    var rows = (o.stall.goods || []).map(function (g, i) {
      return '<div class="stat-line"><span>' + H.itemName(g.item) + '　' + (g.price || 0) + ' 两</span>' +
        '<button class="btn" data-stall-buy="' + user + '" data-idx="' + i + '">购</button></div>';
    }).join('') || '<p>暂无货物</p>';
    el.innerHTML = '<div class="dialog-body"><div class="dialog-text"><div class="who">' +
      (o.stall.title || '摊位') + '</div>' + rows +
      '<div class="opts"><button class="btn ghost" data-bye="1">离开</button></div></div></div>';
    el.classList.add('open');
  }

})(window.Hongwu);
