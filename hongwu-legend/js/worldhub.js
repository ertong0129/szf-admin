/**
 * 局域网联机世界：在线列表、聊天频道、组队/好友/宗族、PK、交易、摆摊。
 * 浏览器不加载此文件；Node 服务端与测试共用。
 */
(function (root) {
  var NEAR = 420;
  var STALE_MS = 4000;
  var PK_DECAY_MS = 10 * 60 * 1000;

  function uid(p) {
    return (p || 'id') + Math.random().toString(36).slice(2, 10);
  }

  function dist(a, b) {
    if (!a || !b) return 1e9;
    var dx = (a.x || 0) - (b.x || 0);
    var dy = (a.y || 0) - (b.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }

  function create(opts) {
    opts = opts || {};
    var nowFn = opts.now || function () { return Date.now(); };
    var persist = opts.persist || function () {};

    var presence = {}; /* server -> user -> slot */
    var events = {}; /* user -> [{kind,...}] */
    var chat = {}; /* server -> lines */
    var friends = {}; /* user -> [user] */
    var partyOf = {};
    var parties = {};
    var clanOf = {};
    var clans = {};
    var trades = {};
    var tradeOf = {};
    var invites = {}; /* user -> [{kind, from, ...}] */
    var pkLast = {};

    function socialDump() {
      return { friends: friends, clans: clans, clanOf: clanOf };
    }

    function loadSocial(data) {
      if (!data) return;
      friends = data.friends || friends;
      clans = data.clans || clans;
      clanOf = data.clanOf || clanOf;
    }

    function pushEvent(user, ev) {
      events[user] = events[user] || [];
      events[user].push(ev);
      if (events[user].length > 40) events[user] = events[user].slice(-40);
    }

    function takeEvents(user) {
      var list = events[user] || [];
      events[user] = [];
      return list;
    }

    function takeInvites(user) {
      var list = invites[user] || [];
      invites[user] = [];
      return list;
    }

    function invite(user, inv) {
      invites[user] = invites[user] || [];
      invites[user].push(inv);
    }

    function slotOf(server, user) {
      return (presence[server] || {})[user] || null;
    }

    function allSlots(server) {
      var map = presence[server] || {};
      var t = nowFn();
      var out = [];
      Object.keys(map).forEach(function (u) {
        if (t - (map[u].t || 0) > STALE_MS) {
          delete map[u];
          return;
        }
        out.push(map[u]);
      });
      return out;
    }

    function publicSlot(s) {
      if (!s) return null;
      return {
        user: s.user,
        name: s.name,
        cls: s.cls,
        level: s.level,
        mapId: s.mapId,
        x: s.x,
        y: s.y,
        hp: s.hp,
        maxHp: s.maxHp,
        mp: s.mp,
        pkMode: s.pkMode,
        pkValue: s.pkValue || 0,
        nation: s.nation || 'ming',
        sit: !!s.sit,
        facing: s.facing || 0,
        stall: s.stall || null,
        party: partyOf[s.user] || '',
        clan: clanOf[s.user] || '',
        red: (s.pkValue || 0) >= 18
      };
    }

    function canAttack(atk, def, mapSafe) {
      if (!atk || !def || atk.user === def.user) return false;
      if (mapSafe) return false;
      var mode = atk.pkMode || 'peace';
      if (mode === 'peace') return false;
      if (mode === 'all') return true;
      if (mode === 'nation') return (atk.nation || 'ming') !== (def.nation || 'ming');
      if (mode === 'party') {
        var pa = partyOf[atk.user];
        return !pa || pa !== partyOf[def.user];
      }
      if (mode === 'clan') {
        var ca = clanOf[atk.user];
        return !ca || ca !== clanOf[def.user];
      }
      if (mode === 'karma') return (def.pkValue || 0) >= 18;
      return false;
    }

    function upsert(server, user, body) {
      presence[server] = presence[server] || {};
      var prev = presence[server][user] || {};
      var t = nowFn();
      if (!pkLast[user]) pkLast[user] = t;
      var pk = prev.pkValue || body.pkValue || 0;
      while (t - pkLast[user] >= PK_DECAY_MS && pk > 0) {
        pk -= 1;
        pkLast[user] += PK_DECAY_MS;
      }
      var slot = {
        user: user,
        name: String(body.name || user).slice(0, 8),
        cls: body.cls || 'warrior',
        level: body.level || 1,
        mapId: body.mapId || 'taiping',
        x: +body.x || 0,
        y: +body.y || 0,
        hp: Math.max(0, +body.hp || 0),
        maxHp: Math.max(1, +body.maxHp || 1),
        mp: Math.max(0, +body.mp || 0),
        pkMode: body.pkMode || 'peace',
        pkValue: pk,
        nation: body.nation === 'yuan' ? 'yuan' : 'ming',
        sit: !!body.sit,
        facing: +body.facing || 0,
        stall: prev.stall || null,
        t: t
      };
      presence[server][user] = slot;
      return snapshot(server, user);
    }

    function leave(server, user) {
      if (presence[server]) delete presence[server][user];
    }

    function snapshot(server, user) {
      var me = slotOf(server, user);
      var others = allSlots(server).filter(function (s) { return s.user !== user; }).map(publicSlot);
      var lines = visibleChat(server, user, chat[server] || []);
      var partyId = partyOf[user];
      var party = partyId && parties[partyId] ? parties[partyId] : null;
      var clanId = clanOf[user];
      var clan = clanId && clans[clanId] ? clans[clanId] : null;
      var tradeId = tradeOf[user];
      var trade = tradeId && trades[tradeId] ? publicTrade(trades[tradeId], user) : null;
      return {
        me: publicSlot(me),
        players: others,
        chat: lines,
        events: takeEvents(user),
        invites: takeInvites(user),
        friends: friends[user] || [],
        party: party,
        clan: clan,
        trade: trade,
        online: allSlots(server).length
      };
    }

    function pushChat(server, line) {
      chat[server] = chat[server] || [];
      chat[server].push(line);
      if (chat[server].length > 120) chat[server] = chat[server].slice(-120);
    }

    function say(server, user, text, chan, to) {
      var me = slotOf(server, user);
      text = String(text || '').slice(0, 80);
      if (!text) return { error: '空消息' };
      chan = chan || 'near';
      var line = {
        who: me ? me.name : user,
        user: user,
        text: text,
        chan: chan,
        to: to || '',
        mapId: me ? me.mapId : '',
        x: me ? me.x : 0,
        y: me ? me.y : 0,
        t: nowFn()
      };
      if (chan === 'whisper') {
        if (!to) return { error: '没有密聊对象' };
        pushEvent(to, { kind: 'whisper', from: user, name: line.who, text: text });
        pushEvent(user, { kind: 'whisper', from: user, name: line.who, text: text, self: true });
        return { ok: true };
      }
      pushChat(server, line);
      return { ok: true };
    }

    function visibleChat(server, user, lines) {
      var me = slotOf(server, user);
      return (lines || []).filter(function (l) {
        if (l.chan === 'world' || l.chan === 'sys') return true;
        if (l.chan === 'near') {
          if (!me) return l.user === user;
          if (l.mapId !== me.mapId) return false;
          return dist(me, l) <= NEAR;
        }
        if (l.chan === 'party') return partyOf[user] && partyOf[l.user] === partyOf[user];
        if (l.chan === 'clan') return clanOf[user] && clanOf[l.user] === clanOf[user];
        return false;
      });
    }

    function addFriend(a, b) {
      if (!b || a === b) return { error: '无效对象' };
      friends[a] = friends[a] || [];
      if (friends[a].indexOf(b) < 0) friends[a].push(b);
      persist(socialDump());
      invite(b, { kind: 'friend', from: a });
      return { ok: true };
    }

    function delFriend(a, b) {
      friends[a] = (friends[a] || []).filter(function (x) { return x !== b; });
      persist(socialDump());
      return { ok: true };
    }

    function partyInvite(server, from, to) {
      if (!to || from === to) return { error: '无效对象' };
      invite(to, { kind: 'party', from: from });
      return { ok: true };
    }

    function partyAccept(fromLeader, user) {
      var pid = partyOf[fromLeader];
      if (!pid) {
        pid = uid('p');
        parties[pid] = { id: pid, leader: fromLeader, members: [fromLeader] };
        partyOf[fromLeader] = pid;
      }
      var p = parties[pid];
      if (p.members.indexOf(user) < 0) p.members.push(user);
      partyOf[user] = pid;
      p.members.forEach(function (m) {
        pushEvent(m, { kind: 'party', text: user + ' 加入队伍' });
      });
      return { ok: true, party: p };
    }

    function partyLeave(user) {
      var pid = partyOf[user];
      if (!pid || !parties[pid]) return { ok: true };
      var p = parties[pid];
      p.members = p.members.filter(function (m) { return m !== user; });
      delete partyOf[user];
      p.members.forEach(function (m) { pushEvent(m, { kind: 'party', text: user + ' 离队' }); });
      if (!p.members.length) delete parties[pid];
      else if (p.leader === user) p.leader = p.members[0];
      return { ok: true };
    }

    function clanCreate(user, name) {
      name = String(name || '').trim().slice(0, 8);
      if (!name) return { error: '请输入宗族名' };
      if (clanOf[user]) return { error: '已有宗族' };
      var id = uid('c');
      clans[id] = { id: id, name: name, leader: user, members: [user] };
      clanOf[user] = id;
      persist(socialDump());
      return { ok: true, clan: clans[id] };
    }

    function clanInvite(from, to) {
      if (!clanOf[from]) return { error: '你还没有宗族' };
      invite(to, { kind: 'clan', from: from, clan: clanOf[from] });
      return { ok: true };
    }

    function clanAccept(from, user) {
      var id = clanOf[from];
      if (!id || !clans[id]) return { error: '宗族不存在' };
      if (clanOf[user]) return { error: '已有宗族' };
      clans[id].members.push(user);
      clanOf[user] = id;
      persist(socialDump());
      return { ok: true, clan: clans[id] };
    }

    function clanLeave(user) {
      var id = clanOf[user];
      if (!id || !clans[id]) return { ok: true };
      clans[id].members = clans[id].members.filter(function (m) { return m !== user; });
      delete clanOf[user];
      if (!clans[id].members.length) delete clans[id];
      persist(socialDump());
      return { ok: true };
    }

    function publicTrade(tr, user) {
      return {
        id: tr.id,
        a: tr.a,
        b: tr.b,
        mine: user === tr.a ? tr.aOffer : tr.bOffer,
        theirs: user === tr.a ? tr.bOffer : tr.aOffer,
        myLock: user === tr.a ? tr.aLock : tr.bLock,
        theirLock: user === tr.a ? tr.bLock : tr.aLock,
        myOk: user === tr.a ? tr.aOk : tr.bOk,
        theirOk: user === tr.a ? tr.bOk : tr.aOk
      };
    }

    function tradeAsk(from, to) {
      if (!to || from === to) return { error: '无效对象' };
      invite(to, { kind: 'trade', from: from });
      return { ok: true };
    }

    function tradeAccept(from, user) {
      var id = uid('t');
      trades[id] = {
        id: id, a: from, b: user,
        aOffer: { items: [], silver: 0 },
        bOffer: { items: [], silver: 0 },
        aLock: false, bLock: false, aOk: false, bOk: false
      };
      tradeOf[from] = id;
      tradeOf[user] = id;
      pushEvent(from, { kind: 'trade_open', id: id });
      pushEvent(user, { kind: 'trade_open', id: id });
      return { ok: true };
    }

    function tradePut(user, offer) {
      var id = tradeOf[user];
      if (!id || !trades[id]) return { error: '没有交易' };
      var tr = trades[id];
      if (tr.aLock && tr.bLock) return { error: '双方已锁定' };
      var pack = { items: Array.isArray(offer.items) ? offer.items.slice(0, 12) : [], silver: Math.max(0, offer.silver | 0) };
      if (tr.a === user) { tr.aOffer = pack; tr.aLock = false; tr.aOk = false; tr.bOk = false; }
      else { tr.bOffer = pack; tr.bLock = false; tr.aOk = false; tr.bOk = false; }
      return { ok: true };
    }

    function tradeLock(user) {
      var id = tradeOf[user];
      if (!id || !trades[id]) return { error: '没有交易' };
      var tr = trades[id];
      if (tr.a === user) tr.aLock = true; else tr.bLock = true;
      return { ok: true };
    }

    function tradeOk(user) {
      var id = tradeOf[user];
      if (!id || !trades[id]) return { error: '没有交易' };
      var tr = trades[id];
      if (!tr.aLock || !tr.bLock) return { error: '双方锁定后才能确认' };
      if (tr.a === user) tr.aOk = true; else tr.bOk = true;
      if (tr.aOk && tr.bOk) {
        pushEvent(tr.a, { kind: 'trade_done', give: tr.aOffer, take: tr.bOffer });
        pushEvent(tr.b, { kind: 'trade_done', give: tr.bOffer, take: tr.aOffer });
        delete tradeOf[tr.a];
        delete tradeOf[tr.b];
        delete trades[id];
      }
      return { ok: true };
    }

    function tradeCancel(user) {
      var id = tradeOf[user];
      if (!id || !trades[id]) return { ok: true };
      var tr = trades[id];
      pushEvent(tr.a, { kind: 'trade_cancel', offer: tr.aOffer });
      pushEvent(tr.b, { kind: 'trade_cancel', offer: tr.bOffer });
      delete tradeOf[tr.a];
      delete tradeOf[tr.b];
      delete trades[id];
      return { ok: true };
    }

    function stallOpen(server, user, title, goods) {
      var me = slotOf(server, user);
      if (!me) return { error: '尚未进入世界' };
      if (me.mapId !== 'capital' && me.mapId !== 'taiping' && me.mapId !== 'kaifeng') return { error: '请在城镇摆摊' };
      me.stall = {
        title: String(title || (me.name + '的摊')).slice(0, 12),
        goods: Array.isArray(goods) ? goods.slice(0, 8) : []
      };
      return { ok: true };
    }

    function stallClose(server, user) {
      var me = slotOf(server, user);
      if (me) me.stall = null;
      return { ok: true };
    }

    function stallBuy(server, buyer, seller, idx) {
      var shop = slotOf(server, seller);
      var me = slotOf(server, buyer);
      if (!shop || !shop.stall) return { error: '摊位已收' };
      if (!me || shop.mapId !== me.mapId) return { error: '不在同一地图' };
      var g = shop.stall.goods[idx];
      if (!g) return { error: '已售出' };
      shop.stall.goods.splice(idx, 1);
      pushEvent(buyer, { kind: 'stall_got', item: g.item, price: g.price | 0, seller: seller });
      pushEvent(seller, { kind: 'stall_sold', idx: idx, price: g.price | 0, buyer: buyer, item: g.item });
      return { ok: true };
    }

    function pvpHit(server, from, to, dmg, mapSafe) {
      var atk = slotOf(server, from);
      var def = slotOf(server, to);
      if (!atk || !def) return { error: '目标不在线' };
      if (atk.mapId !== def.mapId) return { error: '不在同一地图' };
      if (dist(atk, def) > 220) return { error: '距离太远' };
      if (!canAttack(atk, def, mapSafe)) return { error: '当前 PK 模式不能攻击' };
      dmg = Math.max(1, Math.min(9999, dmg | 0));
      def.hp = Math.max(0, def.hp - dmg);
      pushEvent(to, { kind: 'pvp_hurt', from: from, name: atk.name, dmg: dmg, hp: def.hp });
      var killed = def.hp <= 0;
      if (killed) {
        var add = 6;
        if ((def.pkValue || 0) >= 18) add = atk.pkMode === 'karma' ? 0 : 6;
        else if ((def.pkValue || 0) > 0) add = 3;
        if ((atk.nation || 'ming') !== (def.nation || 'ming')) add = Math.min(add, 3);
        atk.pkValue = (atk.pkValue || 0) + add;
        pushEvent(to, { kind: 'pvp_dead', from: from, name: atk.name });
        pushEvent(from, { kind: 'pvp_kill', target: to, name: def.name, pkValue: atk.pkValue });
        def.hp = 0;
      }
      return { ok: true, hp: def.hp, killed: killed, pkValue: atk.pkValue };
    }

    function social(server, user, op, body) {
      body = body || {};
      var target = String(body.user || body.target || '').trim();
      if (op === 'friend_add') return addFriend(user, target);
      if (op === 'friend_del') return delFriend(user, target);
      if (op === 'party_invite') return partyInvite(server, user, target);
      if (op === 'party_accept') return partyAccept(target, user);
      if (op === 'party_leave') return partyLeave(user);
      if (op === 'clan_create') return clanCreate(user, body.name);
      if (op === 'clan_invite') return clanInvite(user, target);
      if (op === 'clan_accept') return clanAccept(target, user);
      if (op === 'clan_leave') return clanLeave(user);
      if (op === 'trade_ask') return tradeAsk(user, target);
      if (op === 'trade_accept') return tradeAccept(target, user);
      if (op === 'trade_put') return tradePut(user, body.offer || body);
      if (op === 'trade_lock') return tradeLock(user);
      if (op === 'trade_ok') return tradeOk(user);
      if (op === 'trade_cancel') return tradeCancel(user);
      if (op === 'stall_open') return stallOpen(server, user, body.title, body.goods);
      if (op === 'stall_close') return stallClose(server, user);
      if (op === 'stall_buy') return stallBuy(server, user, target, body.idx | 0);
      if (op === 'say') return say(server, user, body.text, body.chan, body.to);
      if (op === 'hit') {
        var mapSafe = !!body.safe;
        return pvpHit(server, user, target, body.dmg, mapSafe);
      }
      if (op === 'leave') {
        leave(server, user);
        return { ok: true };
      }
      return { error: '未知操作' };
    }

    return {
      upsert: upsert,
      snapshot: snapshot,
      social: social,
      canAttack: canAttack,
      visibleChat: visibleChat,
      loadSocial: loadSocial,
      socialDump: socialDump,
      NEAR: NEAR
    };
  }

  var api = { create: create, NEAR: NEAR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.WorldHub = api;
})(typeof global !== 'undefined' ? global : this);
