/**
 * 野外 BOSS / 世界 BOSS 状态机（浏览器与 Node 共用）
 * 对照 4399/17173 公开攻略与 MingGame.swf WorldBossInfo/Luck/Award 文案。
 */
(function (root) {
  var B = {};

  B.dayKey = function (now) {
    var d = new Date(now || Date.now());
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  };

  B.fieldDef = function (D, id) {
    var list = (D && D.FIELD_BOSSES) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i];
    }
    return null;
  };

  B.fieldsOnMap = function (D, mapId) {
    return ((D && D.FIELD_BOSSES) || []).filter(function (b) { return b.map === mapId; });
  };

  B.fieldAlive = function (state, def, now) {
    if (!def) return false;
    now = now || Date.now();
    var rec = (state && state.field && state.field[def.id]) || null;
    if (!rec || !rec.deadAt) return true;
    return now - rec.deadAt >= (def.respawnH || 2) * 3600 * 1000;
  };

  B.markFieldDead = function (state, id, now) {
    state = state || { field: {}, world: null };
    state.field = state.field || {};
    state.field[id] = { deadAt: now || Date.now() };
    return state;
  };

  B.worldMapForDay = function (D, now) {
    var maps = (D && D.WORLD_BOSS && D.WORLD_BOSS.maps) || ['zhedong'];
    var d = new Date(now || Date.now());
    var n = Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
    return maps[Math.abs(n) % maps.length];
  };

  B.worldHp = function (D, F) {
    var lv = (D && D.WORLD_BOSS && D.WORLD_BOSS.level) || 60;
    if (F && F.monsterHp) return F.monsterHp(lv, true);
    return Math.floor((40 + lv * 28 + Math.pow(lv, 1.25) * 6) * 8);
  };

  B.ensureWorld = function (state, D, F, now) {
    now = now || Date.now();
    state = state || { field: {}, world: null };
    state.field = state.field || {};
    var day = B.dayKey(now);
    var hp = B.worldHp(D, F);
    var name = (D && D.WORLD_BOSS && D.WORLD_BOSS.name) || '异邦武士';
    if (!state.world || state.world.day !== day) {
      state.world = {
        day: day,
        map: B.worldMapForDay(D, now),
        hp: hp,
        maxHp: hp,
        dmg: {},
        first: '',
        last: '',
        nation: '',
        dead: false,
        name: name
      };
    }
    return state;
  };

  B.hitWorld = function (state, user, dmg, nation) {
    var w = state && state.world;
    if (!w || w.dead) return { ok: false, reason: 'dead' };
    user = String(user || '');
    if (!user) return { ok: false, reason: 'user' };
    dmg = Math.max(1, dmg | 0);
    if (!w.first) w.first = user;
    w.dmg = w.dmg || {};
    w.dmg[user] = (w.dmg[user] || 0) + dmg;
    w.hp = Math.max(0, (w.hp || 0) - dmg);
    var killed = false;
    if (w.hp <= 0 && !w.dead) {
      w.dead = true;
      w.last = user;
      w.nation = nation || '';
      killed = true;
    }
    return { ok: true, world: w, killed: killed };
  };

  B.rankList = function (world) {
    var dmg = (world && world.dmg) || {};
    return Object.keys(dmg).map(function (u) {
      return { user: u, dmg: dmg[u] };
    }).sort(function (a, b) { return b.dmg - a.dmg; });
  };

  B.rankOf = function (world, user) {
    var list = B.rankList(world);
    for (var i = 0; i < list.length; i++) {
      if (list[i].user === user) return i + 1;
    }
    return 0;
  };

  B.rankReward = function (rank, D) {
    var ranks = (D && D.WORLD_BOSS && D.WORLD_BOSS.rewardRanks) || [1, 2, 3, 5, 8, 11, 15, 19];
    return ranks.indexOf(rank) >= 0;
  };

  B.luckOk = function (world, user, D) {
    if (!world) return false;
    var need = (D && D.WORLD_BOSS && D.WORLD_BOSS.luckNeed) || 0.05;
    var dmg = (world.dmg && world.dmg[user]) || 0;
    return dmg >= (world.maxHp || 1) * need;
  };

  root.BossLogic = B;
  if (typeof module !== 'undefined' && module.exports) module.exports = B;
})(typeof window !== 'undefined' ? window : global);
