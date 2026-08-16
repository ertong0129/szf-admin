/**
 * 大明传说 — 信件、传奇目标、日常、明朝贵族、元宝、官职、时装、师徒、宠物洗灵
 * 对照 MingGame.swf 界面文案落地，挂到 window.Hongwu。
 */
(function (H) {
  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;

  H.ensureLife = function (p) {
    if (!p) return;
    H.ensureVip(p);
    H.ensureDaily(p);
    p.bagExpand = p.bagExpand || 0;
    p.mail = p.mail || [];
    p.achieve = p.achieve || {};
    p.kills = p.kills || 0;
    p.charm = p.charm || 0;
    p.intimate = p.intimate || {};
    p.officeId = p.officeId || 'none';
    p.fashionId = p.fashionId || 'plain';
    p.medalId = p.medalId || '';
    p.mentor = p.mentor || { master: '', pupil: '', moral: 0 };
    p.arenaScore = p.arenaScore || 0;
    p.daily = p.daily || { day: '', chue: null, yibao: 0, wine: 0, act: 0, actClaimed: false, vipGift: false };
    var day = H.dungeonDay();
    if (p.daily.day !== day) {
      p.daily = { day: day, chue: null, yibao: 0, wine: 0, act: 0, actClaimed: false, vipGift: false };
    }
    p.daily.act = p.daily.act || 0;
    if (!p.mail.length) {
      H.pushMail(p, '系统', '欢迎来到大明传说', '测试号可用 demo / 123456。钱庄可兑元宝。I 看明朝贵族。L 信件，Y 传奇目标。', true);
    }
    H.refreshOffice(p, true);
    H.ensureVip(p);
    p.wbClaim = p.wbClaim || { day: '', first: false, last: false, rank: false, luck: false, top3: false };
    if (p.wbClaim.day !== day) p.wbClaim = { day: day, first: false, last: false, rank: false, luck: false, top3: false };
  };

  H.bossWho = function () {
    return (window.GameAPI && GameAPI.user) || (G.player && G.player.name) || '我';
  };

  H.ensureBossState = function () {
    var B = window.BossLogic;
    if (!B) return null;
    if (!G.bossState) {
      try { G.bossState = JSON.parse(localStorage.getItem('hongwu-boss-state') || 'null'); } catch (err) { G.bossState = null; }
    }
    G.bossState = B.ensureWorld(G.bossState || { field: {}, world: null }, D, F);
    return G.bossState;
  };

  H.persistBossState = function () {
    try { localStorage.setItem('hongwu-boss-state', JSON.stringify(G.bossState || {})); } catch (err) { /* ignore */ }
  };

  H.pullBossState = function (done) {
    H.ensureBossState();
    if (!window.GameAPI || !GameAPI.online || !GameAPI.bosses) {
      if (done) done();
      return;
    }
    GameAPI.bosses().then(function (j) {
      if (j && j.bosses) G.bossState = j.bosses;
      H.persistBossState();
      if (done) done();
    }).catch(function () { if (done) done(); });
  };

  H.onFieldBossKill = function (e) {
    var B = window.BossLogic;
    if (!B || !e.fieldId) return;
    H.ensureBossState();
    B.markFieldDead(G.bossState, e.fieldId);
    H.persistBossState();
    var def = B.fieldDef(D, e.fieldId);
    H.toast(e.name + '已倒下，约 ' + ((def && def.respawnH) || 2) + ' 时辰后刷新');
    if (window.GameAPI && GameAPI.online && GameAPI.bossOp) {
      GameAPI.bossOp('field_kill', { id: e.fieldId }).catch(function () {});
    }
  };

  H.onWorldBossHit = function (e, dmg) {
    var B = window.BossLogic;
    H.ensureBossState();
    var r = B.hitWorld(G.bossState, H.bossWho(), dmg, (G.player && G.player.nation) || 'ming');
    if (r.ok && r.world) {
      e.hp = r.world.hp;
      e.maxHp = r.world.maxHp;
    }
    H.persistBossState();
    if (window.GameAPI && GameAPI.online && GameAPI.bossOp) {
      GameAPI.bossOp('world_hit', { dmg: dmg, nation: (G.player && G.player.nation) || 'ming', name: H.bossWho() }).then(function (j) {
        if (j && j.world) {
          G.bossState.world = j.world;
          e.hp = j.world.hp;
          e.maxHp = j.world.maxHp;
          H.persistBossState();
        }
      }).catch(function () {});
    }
  };

  H.onWorldBossKill = function (e) {
    var w = G.bossState && G.bossState.world;
    var nation = w && w.nation === 'yuan' ? '北元' : '大明';
    H.log('世界 BOSS 已击毙。最后一刀所在阵营为归属国：' + nation);
    H.toast('世界 BOSS 已击毙，打开 U 日常领奖');
    H.pushMail(G.player, '世界 BOSS', '已被击毙', '请各路英雄打开日常面板领取伤害榜与幸运奖。归属国：' + nation, true);
    H.persistBossState();
  };

  H.claimWorldBoss = function (kind) {
    var B = window.BossLogic;
    var p = G.player;
    H.ensureLife(p);
    H.ensureBossState();
    var w = G.bossState && G.bossState.world;
    if (!w || !w.dead) { H.toast('今日世界 BOSS 尚未击毙'); return; }
    var me = H.bossWho();
    var c = p.wbClaim;
    if (kind === 'first') {
      if (w.first !== me) { H.toast('第一刀不是你'); return; }
      if (c.first) { H.toast('已领取'); return; }
      c.first = true;
      H.addItem(p, { id: 'zodiac', n: 1, bind: true });
      H.addExp(p, 200);
      H.toast('领取第一刀奖励：生肖残页');
    } else if (kind === 'last') {
      if (w.last !== me) { H.toast('最后一刀不是你'); return; }
      if (c.last) { H.toast('已领取'); return; }
      c.last = true;
      H.addItem(p, { id: 'zodiac', n: 1, bind: true });
      H.addSilver(p, 200, true);
      H.toast('领取最后一刀奖励。归属国：' + (w.nation === 'yuan' ? '北元' : '大明'));
    } else if (kind === 'rank') {
      var rank = B.rankOf(w, me);
      if (!B.rankReward(rank, D)) { H.toast('你的名次不在领奖名单（1/2/3/5/8/11/15/19）'); return; }
      if (c.rank) { H.toast('已领取'); return; }
      c.rank = true;
      H.addItem(p, { id: 'socket', n: 1, bind: true });
      p.bindGold = (p.bindGold || 0) + Math.max(1, 6 - Math.min(5, rank));
      H.toast('领取第 ' + rank + ' 名奖励');
    } else if (kind === 'top3') {
      var r2 = B.rankOf(w, me);
      if (r2 < 1 || r2 > 3) { H.toast('伤害前三才能领神器礼包'); return; }
      if (c.top3) { H.toast('已领取'); return; }
      c.top3 = true;
      H.addItem(p, { id: 'boss_pack', n: 1, bind: true });
      H.toast('领取神器礼包');
    } else if (kind === 'luck') {
      if (!B.luckOk(w, me, D)) { H.toast('造成伤害不足，无法抽奖'); return; }
      if (c.luck) { H.toast('已抽过'); return; }
      c.luck = true;
      var silver = H.irand(80, 240);
      H.addSilver(p, silver, true);
      H.addExp(p, 120);
      H.toast('幸运抽奖：绑定银两 +' + silver);
    }
    H.saveSilent();
    if (H.paintDaily) H.paintDaily();
  };

  H.bagCap = function (p) {
    var v = H.vipBonus(p);
    return (H.BAG_CAP || 36) + ((p && p.bagExpand) || 0) * 12 + (v.bag || 0);
  };

  H.vipLevel = function (p) {
    return F.vipLevel((p && p.vipExp) || 0);
  };

  H.vipBonus = function (p) {
    var list = D.VIP || [];
    var lv = H.vipLevel(p);
    return list[lv] || list[0] || { lv: 0, name: '白身', energy: 0, bag: 0, dungeon: 0, exp: 0, sit: 0, revive: 1, gift: 0, shopOff: 0, wh: 0 };
  };

  H.energyMax = function (p) {
    return (D.ENERGY_MAX || 4000) + (H.vipBonus(p).energy || 0);
  };

  H.dungeonDaily = function (id) {
    var spec = D.INSTANCES[id] || {};
    return (spec.daily || 0) + (H.vipBonus(G.player).dungeon || 0);
  };

  H.ensureVip = function (p) {
    if (!p) return;
    p.gold = p.gold || 0;
    p.bindGold = p.bindGold || 0;
    p.vipExp = p.vipExp || 0;
    p.rechargeFirst = p.rechargeFirst || {};
    var v = H.vipBonus(p);
    if (p.warehouse) {
      var want = 1 + (v.wh || 0);
      if (p.warehouse.tabs < want) p.warehouse.tabs = Math.min((D.WAREHOUSE && D.WAREHOUSE.maxTabs) || 4, want);
    }
  };

  H.addYuanbao = function (n, bind, creditVip) {
    var p = G.player;
    if (!p || !n) return;
    H.ensureVip(p);
    if (bind) p.bindGold += n;
    else {
      p.gold += n;
      if (creditVip) {
        var old = H.vipLevel(p);
        p.vipExp += n;
        var now = H.vipLevel(p);
        if (now > old) {
          var row = H.vipBonus(p);
          H.toast('明朝贵族升至 ' + row.name);
          H.pushMail(p, '明朝贵族', '贵族进阶', '累计充值元宝已达 ' + p.vipExp + '，现为 ' + row.name + '。', true);
          H.log('明朝贵族：' + row.name);
        }
      }
    }
  };

  H.spendYuanbao = function (n) {
    var p = G.player;
    H.ensureVip(p);
    n = n || 0;
    if (n <= 0) return true;
    if ((p.bindGold + p.gold) < n) {
      H.toast('你的元宝不足');
      return false;
    }
    var fromBind = Math.min(p.bindGold, n);
    p.bindGold -= fromBind;
    n -= fromBind;
    if (n > 0) p.gold -= n;
    if (fromBind) H.log('优先使用绑定元宝 ×' + fromBind);
    return true;
  };

  H.goldPrice = function (gold) {
    var off = H.vipBonus(G.player).shopOff || 0;
    return Math.max(1, Math.ceil((gold || 1) * (1 - off)));
  };

  H.buyGoldItem = function (id) {
    var p = G.player;
    var row = null;
    (D.SHOPS.gold || []).forEach(function (s) { if (s.id === id) row = s; });
    if (!row) return;
    var cost = H.goldPrice(row.gold);
    if (!H.spendYuanbao(cost)) return;
    H.addItem(p, { id: id, n: 1, bind: true });
    H.toast('购得 ' + D.CONSUMABLES[id].name + '（' + cost + ' 元宝）');
    H.paintVip();
    if (document.getElementById('panel-shop') && document.getElementById('panel-shop').classList.contains('open')) {
      H.openShop('mall');
    }
  };

  H.bankYuanbao = function (dir, n) {
    var p = G.player;
    H.ensureVip(p);
    n = Math.max(1, n || 1);
    if (dir === 'buy') {
      var cost = F.yuanbaoBuyCost(n);
      if (!H.paySilver(cost, 'unbind', '不绑定银两不足 ' + cost)) return;
      H.addYuanbao(n, false, true);
      H.toast('成功购买元宝 ×' + n);
    } else {
      if (p.gold < n) { H.toast('不绑定元宝不足'); return; }
      p.gold -= n;
      H.addSilver(p, F.yuanbaoSellGain(n), false);
      H.toast('成功出售元宝 ×' + n + '，得银 ' + F.yuanbaoSellGain(n));
    }
    H.closeDialog();
  };

  H.rechargePack = function (id) {
    var p = G.player;
    var pack = null;
    (D.RECHARGE_PACKS || []).forEach(function (x) { if (x.id === id) pack = x; });
    if (!pack) return;
    if (!H.paySilver(pack.silver, 'unbind', '不绑定银两不足 ' + pack.silver)) return;
    H.addYuanbao(pack.gold, false, true);
    if (!p.rechargeFirst[id] && pack.firstBonus) {
      p.rechargeFirst[id] = true;
      H.addYuanbao(pack.firstBonus, true, false);
      H.pushMail(p, '明朝贵族', '首次充值加赠', pack.name + ' 首次加赠绑定元宝 ' + pack.firstBonus + '。', true);
    }
    H.toast('获得元宝 ' + pack.gold);
    H.paintVip();
  };

  H.claimVipGift = function () {
    var p = G.player;
    H.ensureLife(p);
    var v = H.vipBonus(p);
    if (v.lv < 1) { H.toast('成为明朝贵族后可领取每日礼包'); return; }
    if (p.daily.vipGift) { H.toast('今日贵族礼包已领取'); return; }
    p.daily.vipGift = true;
    H.addYuanbao(v.gift, true, false);
    H.addExp(p, 40 + v.lv * 12);
    H.addSilver(p, 20 * v.lv, true);
    H.pushMail(p, '明朝贵族', '每日礼包', v.name + ' 礼包：绑定元宝 ' + v.gift + '。', true);
    H.toast('领取贵族每日礼包');
    H.paintVip();
  };

  H.paintVip = function () {
    var el = document.getElementById('panel-vip');
    if (!el) return;
    var p = G.player;
    H.ensureLife(p);
    var v = H.vipBonus(p);
    var nextNeed = F.VIP_NEED[v.lv + 1];
    var prog = nextNeed == null ? '已满阶' : ('再累计 ' + (nextNeed - p.vipExp) + ' 不绑定元宝升至 ' + ((D.VIP[v.lv + 1] && D.VIP[v.lv + 1].name) || ''));
    var giftBtn = p.daily.vipGift
      ? '<p>今日礼包已领取。</p>'
      : '<button class="btn" data-vip-gift="1">领取每日礼包</button>';
    var packs = (D.RECHARGE_PACKS || []).map(function (pk) {
      var first = p.rechargeFirst[pk.id] ? '' : '　首次加赠绑定 ' + pk.firstBonus;
      return '<div class="stat-line"><span>' + pk.name + '　' + pk.silver + ' 两' + first +
        '</span><button class="btn" data-recharge="' + pk.id + '">兑入</button></div>';
    }).join('');
    var goods = (D.SHOPS.gold || []).map(function (s) {
      var cost = H.goldPrice(s.gold);
      return '<div class="stat-line"><span>' + D.CONSUMABLES[s.id].name + '　' + cost + ' 元宝</span>' +
        '<button class="btn" data-buy-gold="' + s.id + '">购</button></div>';
    }).join('');
    el.innerHTML = H.header('明朝贵族', 'vip') +
      '<p>不绑定元宝 <b>' + p.gold + '</b>　绑定元宝 <b>' + p.bindGold + '</b></p>' +
      '<p>当前 ' + v.name + '（贵族 ' + v.lv + '）　累计 ' + p.vipExp + '</p>' +
      '<p style="color:#b8a57a;margin:6px 0">' + prog + '</p>' +
      '<p style="color:#b8a57a">精力 +' + v.energy + '　背包 +' + v.bag + '　副本次数 +' + v.dungeon +
      '　经验 +' + Math.floor(v.exp * 100) + '%　商城折扣 ' + Math.floor(v.shopOff * 100) + '%</p>' +
      '<h4 style="color:#d4af37;margin:10px 0 4px">每日礼包</h4>' + giftBtn +
      '<h4 style="color:#d4af37;margin:12px 0 4px">银两兑元宝</h4>' +
      '<p style="color:#b8a57a;margin-bottom:6px">局域网无真实充值。钱庄与下列档位用银两兑不绑定元宝，计入贵族。</p>' + packs +
      '<p style="margin:8px 0">零买：' +
      '<button class="btn ghost" data-yb-buy="1">买 1</button> ' +
      '<button class="btn ghost" data-yb-buy="10">买 10</button> ' +
      '<button class="btn ghost" data-yb-sell="1">卖 1</button></p>' +
      '<h4 style="color:#d4af37;margin:12px 0 4px">元宝商城</h4>' +
      '<p style="color:#b8a57a">优先使用绑定元宝。</p>' + goods;
  };

  H.pushMail = function (p, from, title, body, unread) {
    p.mail = p.mail || [];
    p.mail.unshift({
      id: H.uid(), from: from, title: title, body: body,
      unread: unread !== false, t: Date.now()
    });
    if (p.mail.length > 24) p.mail.pop();
  };

  H.officeOf = function (p) {
    var list = D.OFFICES || [];
    var best = list[0];
    list.forEach(function (o) {
      if (p.level >= o.min) best = o;
    });
    return best;
  };

  H.refreshOffice = function (p, silent) {
    var o = H.officeOf(p);
    if (p.officeId !== o.id) {
      p.officeId = o.id;
      if (!silent) {
        H.toast('授官：' + o.name);
        H.pushMail(p, '吏部', '官职变动', '即日起任 ' + o.name + '。', true);
      }
    }
  };

  H.officeBonus = function (p) {
    var id = (p && p.officeId) || 'none';
    var list = D.OFFICES || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return { hp: 0, patk: 0, pdef: 0 };
  };

  H.noteAchieve = function (kind, n) {
    var p = G.player;
    if (!p || !D.ACHIEVE) return;
    H.ensureLife(p);
    if (kind === 'kill') p.kills = (p.kills || 0) + (n || 1);
    D.ACHIEVE.forEach(function (a) {
      if (p.achieve[a.id]) return;
      var ok = false;
      if (a.kind === 'level') ok = p.level >= a.n;
      else if (a.kind === 'star') {
        ok = D.SLOTS.some(function (s) { return p.equip[s.id] && p.equip[s.id].stars >= a.n; });
      } else if (a.kind === 'socket') {
        ok = D.SLOTS.some(function (s) { return p.equip[s.id] && (p.equip[s.id].sockets || 0) >= a.n; });
      } else if (a.kind === 'gem') ok = !!p.flags.gemmed;
      else if (a.kind === 'pet') ok = !!p.pet;
      else if (a.kind === 'wash') ok = !!p.flags.washed;
      else if (a.kind === 'mount') ok = !!(p.mount && p.mount.owned);
      else if (a.kind === 'quest') ok = (p.quests.done || []).length >= a.n;
      else if (a.kind === 'kill') ok = (p.kills || 0) >= a.n;
      else if (a.kind === 'mail') ok = !!p.flags.readMail;
      if (a.kind === kind || ok) {
        if (!ok) return;
        p.achieve[a.id] = true;
        H.addExp(p, a.exp || 0);
        H.addSilver(p, a.silver || 0, true);
        H.pushMail(p, '传奇目标', a.name, a.desc + '。奖励经验 ' + a.exp + '、银两 ' + a.silver + '。', true);
        H.toast('成就：' + a.name);
        H.log('传奇目标完成：' + a.name);
      }
    });
  };

  H.takeDailyChue = function () {
    var p = G.player;
    H.ensureLife(p);
    if (p.daily.chue && p.daily.chue.active) { H.toast('今日除恶令尚未交还'); return; }
    if (p.daily.chue && p.daily.chue.done) { H.toast('今日除恶令已完成'); return; }
    var band = (D.DAILY_KILL || []).filter(function (b) { return p.level >= b.min && p.level <= b.max; })[0]
      || D.DAILY_KILL[0];
    p.daily.chue = { active: true, done: false, kill: band.kill, need: band.n, got: 0, exp: band.exp, silver: band.silver };
    var nm = D.MONSTERS[band.kill] ? D.MONSTERS[band.kill].name : band.kill;
    H.toast('除恶令：击杀 ' + band.n + ' 只' + nm);
    H.closeDialog();
  };

  H.noteDailyKill = function (kind) {
    var p = G.player;
    if (!p || !p.daily || !p.daily.chue || !p.daily.chue.active) return;
    if (p.daily.chue.kill !== kind) return;
    p.daily.chue.got = (p.daily.chue.got || 0) + 1;
    if (p.daily.chue.got >= p.daily.chue.need) {
      p.daily.chue.active = false;
      p.daily.chue.done = true;
      H.addExp(p, p.daily.chue.exp);
      H.addSilver(p, p.daily.chue.silver, true);
      H.pushMail(p, '除恶令', '今日除恶完成', '经验 +' + p.daily.chue.exp + '，银两 +' + p.daily.chue.silver, true);
      H.toast('除恶令完成');
      H.addActivity(25);
    }
  };

  H.collectYibao = function () {
    var p = G.player;
    H.ensureLife(p);
    if (p.daily.yibao >= 5) { H.toast('今日异宝已采尽'); return false; }
    if (!H.addItem(p, { id: 'yibao', n: 1, bind: true })) return false;
    p.daily.yibao += 1;
    H.addExp(p, 40);
    H.addSilver(p, 12, true);
    H.toast('采集天降异宝（' + p.daily.yibao + '/5）');
    H.addActivity(8);
    return true;
  };

  H.expandBag = function () {
    var p = G.player;
    H.ensureLife(p);
    if (p.bagExpand >= 4) { H.toast('你的扩展背包已经升到最高级'); return; }
    var cost = F.bagExpandCost(p.bagExpand);
    var useToken = H.countItem(p, 'bag_token') > 0;
    if (useToken) H.takeItem(p, 'bag_token', 1);
    else {
      if (!H.paySilver(cost, 'preferBind', '银两不足 ' + cost + '，或使用背包扩展符')) return;
    }
    p.bagExpand += 1;
    H.toast('扩展背包 +12，容量 ' + H.bagCap(p));
    H.paintPanel('bag');
  };

  H.washPet = function () {
    var p = G.player;
    if (!p.pet) { H.toast('请先选择需要洗灵的宠物'); return; }
    if (!H.takeItem(p, 'wash_dan', 1) && !H.takeItem(p, 'pet_stone', 2)) {
      if (!H.spendYuanbao(8)) {
        H.toast('缺少洗灵丹（或宠物灵石×2 / 8 元宝）'); return;
      }
      H.toast('使用绑定元宝进行洗灵');
    }
    var rng = F.petWashRange();
    var v = H.irand(rng.min, rng.max);
    p.pet.apt = v;
    p.pet.atkMul = 0.8 + (v - rng.min) / (rng.max - rng.min) * 0.7;
    H.syncPet(p);
    p.flags.washed = true;
    H.noteAchieve('wash');
    H.toast('宠物洗灵成功了　资质 ' + v);
    H.paintPanel('pet');
  };

  H.insightPet = function () {
    var p = G.player;
    if (!p.pet) { H.toast('请先选择需要提悟的宠物'); return; }
    if (!H.takeItem(p, 'insight_dan', 1)) {
      if (!H.spendYuanbao(10)) { H.toast('缺少提悟丹（或 10 元宝）'); return; }
    }
    p.pet.insight = p.pet.insight || 0;
    if (Math.random() < F.petInsightChance(p.pet.insight)) {
      p.pet.insight += 1;
      p.pet.hpMul = (p.pet.hpMul || 1) + 0.04;
      H.syncPet(p);
      H.toast('您的宠物提悟成功了　悟性 ' + p.pet.insight);
    } else H.toast('提悟失败了');
    H.paintPanel('pet');
  };

  H.trainPet = function () {
    var p = G.player;
    if (!p.pet) { H.toast('没有出战灵宠'); return; }
    if (!H.takeItem(p, 'train_pai', 1)) { H.toast('缺少训练牌'); return; }
    p.pet.star = (p.pet.star || 0) + 1;
    p.pet.atkMul = (p.pet.atkMul || 1) + 0.05;
    H.syncPet(p);
    H.toast('训练星级 ' + p.pet.star);
    H.paintPanel('pet');
  };

  H.teachPetSkill = function () {
    var p = G.player;
    if (!p.pet) { H.toast('没有灵宠'); return; }
    if (!H.takeItem(p, 'pet_book', 1)) { H.toast('缺少技能书'); return; }
    p.pet.skills = (p.pet.skills || 0) + 1;
    p.pet.atkMul = (p.pet.atkMul || 1) + 0.08;
    H.syncPet(p);
    H.toast('灵宠学会一式，所学技能数量 ' + p.pet.skills);
    H.paintPanel('pet');
  };

  H.setFashion = function (id) {
    var p = G.player;
    var f = (D.FASHIONS || []).filter(function (x) { return x.id === id; })[0];
    if (!f) return;
    if (p.level < f.min) { H.toast(f.min + ' 级解锁'); return; }
    p.fashionId = id;
    H.toast('换装：' + f.name);
    H.paintPanel('char');
  };

  H.sendFlower = function (who) {
    var p = G.player;
    if (!H.takeItem(p, 'flower', 1)) { H.toast('没有玫瑰花'); return; }
    p.charm = (p.charm || 0) + 1;
    p.intimate[who] = (p.intimate[who] || 0) + 2;
    if (window.GameAPI && GameAPI.online) {
      GameAPI.social('say', { server: H.currentServer(), text: '赠花给 ' + who, chan: 'world' }).catch(function () {});
    }
    H.toast('赠花成功，魅力 +1　与 ' + who + ' 亲密度 ' + p.intimate[who]);
    H.addActivity(5);
  };

  H.claimMentor = function (as) {
    var p = G.player;
    H.ensureLife(p);
    if (as === 'master') {
      if (p.level < 15) { H.toast('15 级方可收徒'); return; }
      p.mentor.want = 'master';
      p.mentor.pupil = p.mentor.pupil || '记名弟子';
      H.toast('已挂出收徒。点其他玩家邀其拜师。单机可进师徒同心副本。');
    } else {
      if (p.level > 20) { H.toast('过了拜师年纪，可去收徒'); return; }
      p.mentor.want = 'pupil';
      p.mentor.master = p.mentor.master || '李梦阳';
      H.toast('已求师。点高等级玩家拜师。单机以李梦阳为师，可进同心副本。');
    }
    H.closeDialog();
  };

  H.nearCampfire = function () {
    if (!G.fires) return false;
    var p = G.player;
    for (var i = 0; i < G.fires.length; i++) {
      if (H.dist(p, G.fires[i]) < 56) return true;
    }
    return false;
  };

  H.tickSitLife = function (dt) {
    var p = G.player;
    if (!p || !p.sit) return;
    if (!H.nearCampfire()) return;
    p._sitAcc = (p._sitAcc || 0) + dt;
    if (p._sitAcc < 2.2) return;
    p._sitAcc = 0;
    var party = !!(G.netParty && G.netParty.members && G.netParty.members.length > 1);
    var xp = F.sitFireXp(p.level, party);
    var sitB = H.vipBonus(p).sit || 0;
    if (sitB) xp = Math.floor(xp * (1 + sitB));
    if (H.countItem(p, 'wine') > 0 && (p.daily.wine || 0) < 20) {
      H.takeItem(p, 'wine', 1);
      p.daily.wine = (p.daily.wine || 0) + 1;
      xp = Math.floor(xp * 1.8);
      H.addActivity(1);
    }
    H.addExp(p, xp);
    H.floatText(p.x, p.y - 22, '+' + xp, '#ffe7a0');
  };

  H.paintMail = function () {
    var p = G.player;
    H.ensureLife(p);
    var rows = p.mail.map(function (m, i) {
      return '<div class="stat-line"><span>' + (m.unread ? '● ' : '') + m.title +
        '<br/><small style="color:#b8a57a">' + m.from + '</small></span>' +
        '<button class="btn ghost" data-mail="' + i + '">阅</button></div>';
    }).join('') || '<p>你当前没有信件</p>';
    document.getElementById('panel-mail').innerHTML = H.header('信件', 'mail') +
      '<p style="color:#b8a57a;margin-bottom:8px">奖励通过邮件发送。信件最长保存 24 封。</p>' + rows;
  };

  H.readMail = function (i) {
    var p = G.player;
    var m = p.mail[i];
    if (!m) return;
    m.unread = false;
    p.flags.readMail = true;
    H.noteAchieve('mail');
    document.getElementById('panel-mail').innerHTML = H.header('信件', 'mail') +
      '<p><b>' + m.title + '</b></p><p style="color:#b8a57a">来自 ' + m.from + '</p>' +
      '<p style="margin:10px 0;line-height:1.6">' + m.body + '</p>' +
      '<button class="btn" data-panel-paint="mail">返回列表</button> ' +
      '<button class="btn ghost" data-mail-del="' + i + '">删除</button>';
  };

  H.paintAchieve = function () {
    var p = G.player;
    H.ensureLife(p);
    var done = 0;
    var rows = (D.ACHIEVE || []).map(function (a) {
      var ok = !!p.achieve[a.id];
      if (ok) done++;
      return '<div class="stat-line"><span>' + a.name + '<br/><small style="color:#b8a57a">' + a.desc +
        '</small></span><span>' + (ok ? '已获得成就' : '未完成') + '</span></div>';
    }).join('');
    document.getElementById('panel-achieve').innerHTML = H.header('传奇目标', 'achieve') +
      '<p style="color:#b8a57a;margin-bottom:8px">当前成就值 ' + done + '/' + (D.ACHIEVE || []).length +
      '。完成目标后奖励经邮件发放。</p>' +
      '<div class="medal-bg"></div>' + rows;
  };

  H.addActivity = function (n) {
    var p = G.player;
    if (!p) return;
    H.ensureLife(p);
    p.daily.act = (p.daily.act || 0) + (n || 0);
    if (p.daily.act > 100) p.daily.act = 100;
    if (p.daily.act >= 100 && !p.daily.actClaimed) {
      p.daily.actClaimed = true;
      H.addExp(p, 200);
      H.addSilver(p, 80, true);
      H.pushMail(p, '日常', '活跃度奖励', '今日活跃度已满。奖励经验 200、银两 80，已通过邮件告知。', true);
      H.toast('今日活跃度已满，奖励发到信件');
    }
  };

  H.paintChatFaces = function () {
    var el = document.getElementById('chat-faces');
    if (!el) return;
    el.innerHTML = (D.CHAT_FACES || []).map(function (f) {
      return '<img src="' + f.src + '" alt="' + f.tag + '" title="' + f.tag + '" data-face="' + f.id + '" />';
    }).join('');
  };

  H.paintRank = function (tab) {
    var p = G.player;
    if (tab) G.rankTab = tab;
    G.rankTab = G.rankTab || 'level';
    var list = [{ name: p.name, level: p.level, cls: p.cls, user: 'me', score: p.arenaScore || 0, charm: p.charm || 0 }];
    (G.peers || []).forEach(function (o) {
      list.push({ name: o.name, level: o.level || 1, cls: o.cls, user: o.user, score: 0, charm: 0 });
    });
    if (G.rankTab === 'arena') list.sort(function (a, b) { return b.score - a.score; });
    else if (G.rankTab === 'flower') list.sort(function (a, b) { return b.charm - a.charm; });
    else list.sort(function (a, b) { return b.level - a.level; });
    var rows = list.map(function (o, i) {
      var c = D.CLASSES[o.cls];
      var extra = G.rankTab === 'arena' ? ('积分 ' + (o.score || 0))
        : (G.rankTab === 'flower' ? ('魅力 ' + (o.charm || 0)) : (o.level + ' 级'));
      return '<div class="stat-line"><span>' + (i + 1) + '. ' + o.name +
        '</span><span>' + (c ? c.name : '') + '　' + extra + '</span></div>';
    }).join('');
    document.getElementById('panel-rank').innerHTML = H.header('排行', 'rank') +
      '<div class="rank-tabs">' +
      '<button type="button" class="' + (G.rankTab === 'level' ? 'on' : '') + '" data-rank-tab="level">等级</button>' +
      '<button type="button" class="' + (G.rankTab === 'arena' ? 'on' : '') + '" data-rank-tab="arena">竞技</button>' +
      '<button type="button" class="' + (G.rankTab === 'flower' ? 'on' : '') + '" data-rank-tab="flower">鲜花</button></div>' +
      '<p style="color:#b8a57a;margin-bottom:8px">局域网榜。每日鲜花榜奖励通过邮件发放。</p>' + rows +
      '<p style="margin-top:8px">竞技积分 ' + (p.arenaScore || 0) + '　魅力 ' + (p.charm || 0) + '</p>';
  };

  H.paintDaily = function () {
    var p = G.player;
    H.ensureLife(p);
    var ch = p.daily.chue;
    var chHtml = !ch
      ? '<button class="btn" data-chue-take="1">领取除恶令</button>'
      : ch.done
        ? '<p>今日除恶令已完成。</p>'
        : '<p>击杀 ' + (D.MONSTERS[ch.kill] ? D.MONSTERS[ch.kill].name : '') + '　' + (ch.got || 0) + '/' + ch.need + '</p>';
    document.getElementById('panel-daily').innerHTML = H.header('日常', 'daily') +
      '<h4 style="color:#d4af37;margin:8px 0 4px">活跃度</h4>' +
      '<p>今日活跃度 ' + (p.daily.act || 0) + '/100。除恶、异宝、副本、押镖、赠花、篝火饮酒可提升。</p>' +
      '<h4 style="color:#d4af37;margin:12px 0 4px">明朝贵族</h4>' +
      '<p>' + H.vipBonus(p).name + '　礼包 ' + (p.daily.vipGift ? '已领' : '未领') +
      '　<button class="btn ghost" data-panel="vip">打开贵族</button></p>' +
      '<h4 style="color:#d4af37;margin:12px 0 4px">除恶令</h4>' + chHtml +
      '<h4 style="color:#d4af37;margin:12px 0 4px">天降异宝</h4>' +
      '<p>京城采集异宝 ' + (p.daily.yibao || 0) + '/5。每天京城刷新。</p>' +
      '<h4 style="color:#d4af37;margin:12px 0 4px">篝火打坐</h4>' +
      '<p>太平村与京城篝火旁打坐（D）。有烧酒则加倍，今日已饮 ' + (p.daily.wine || 0) + '/20。</p>' +
      '<h4 style="color:#d4af37;margin:12px 0 4px">每日副本</h4>' +
      '<p>鄱阳湖 ' + ((p.dungeon && p.dungeon.poyang) || 0) + '/' + (D.INSTANCES.poyang.daily || 10) +
      '　英雄副本 ' + ((p.dungeon && p.dungeon.tower) || 0) + '/' + (D.INSTANCES.tower.daily || 10) +
      '　捕鱼儿海 ' + ((p.dungeon && p.dungeon.fish) || 0) + '/' + (D.INSTANCES.fish.daily || 5) +
      '　大明宝藏 ' + ((p.dungeon && p.dungeon.treasure) || 0) + '/' + (D.INSTANCES.treasure.daily || 3) +
      '　师徒同心 ' + ((p.dungeon && p.dungeon.mentor) || 0) + '/' + ((D.INSTANCES.mentor && D.INSTANCES.mentor.daily) || 3) +
      '　步步惊心 ' + ((p.dungeon && p.dungeon.jingxin) || 0) + '/' + ((D.INSTANCES.jingxin && D.INSTANCES.jingxin.daily) || 3) +
      '　深宫谍影 ' + ((p.dungeon && p.dungeon.palace) || 0) + '/' + ((D.INSTANCES.palace && D.INSTANCES.palace.daily) || 3) +
      '　开封铁塔 ' + ((p.dungeon && p.dungeon.pagoda) || 0) + '/' + ((D.INSTANCES.pagoda && D.INSTANCES.pagoda.daily) || 5) + '</p>' +
      H.worldBossDailyHtml();
  };

  H.worldBossDailyHtml = function () {
    var B = window.BossLogic;
    H.ensureBossState();
    var w = G.bossState && G.bossState.world;
    var mapName = (w && D.MAP_META[w.map] && D.MAP_META[w.map].name) || '浙东';
    var html = '<h4 style="color:#d4af37;margin:12px 0 4px">世界 BOSS</h4>';
    if (!w) return html + '<p>正在读取…</p>';
    html += '<p>今日世界将出现在 <b>' + mapName + '</b>。' +
      (w.dead ? '已被击毙，请各路英雄前往领奖。' : '请各路英雄前往缉拿。') + '</p>';
    if (w.dead) {
      html += '<p>最后一刀所在阵营为归属国：' + (w.nation === 'yuan' ? '北元' : '大明') + '</p>';
      var ranks = B.rankList(w).slice(0, 8).map(function (r, i) {
        return (i + 1) + '. ' + r.user + '　伤害 ' + r.dmg;
      }).join('<br>');
      html += '<p>我的伤害排名：' + (B.rankOf(w, H.bossWho()) || '未上榜') + '</p>';
      html += '<p style="color:#b8a57a">' + (ranks || '暂无伤害记录') + '</p>';
      html += '<p><button class="btn ghost" data-wb-claim="first">第一刀</button> ' +
        '<button class="btn ghost" data-wb-claim="last">最后一刀</button> ' +
        '<button class="btn ghost" data-wb-claim="rank">排名奖</button> ' +
        '<button class="btn ghost" data-wb-claim="top3">前三礼包</button> ' +
        '<button class="btn" data-wb-claim="luck">幸运抽奖</button></p>';
    } else {
      html += '<p>剩余气血 ' + Math.floor(w.hp) + ' / ' + Math.floor(w.maxHp) +
        '　<button class="btn ghost" data-wb-go="1">寻路前往</button></p>';
    }
    html += '<h4 style="color:#d4af37;margin:12px 0 4px">野外 BOSS</h4><p>';
    html += (D.FIELD_BOSSES || []).map(function (b) {
      var alive = B.fieldAlive(G.bossState, b);
      var mn = D.MONSTERS[b.monster];
      var mp = D.MAP_META[b.map];
      return (mn ? mn.name : b.id) + ' · ' + (mp ? mp.name : b.map) +
        ' Lv.' + (mn ? mn.level : '?') + '　' + (alive ? '在场' : '冷却中') +
        '（' + b.respawnH + ' 时）';
    }).join('<br>') + '</p>';
    return html;
  };

  H.paintMarket = function () {
    var html = H.header('交易市场', 'shop') +
      '<p style="color:#b8a57a;margin-bottom:8px">市场交易为玩家自发行为。分类对照原作：装备 / 技能书 / 药品 / 灵石 / 坐骑宠物 / 杂货。</p>';
    (D.MARKET_CATS || []).forEach(function (cat) {
      html += '<h4 style="color:#d4af37;margin:8px 0 4px">' + cat.name +
        (cat.sub ? '　<small>' + cat.sub + '</small>' : '') + '</h4>';
      (cat.ids || []).forEach(function (id) {
        var c = D.CONSUMABLES[id];
        if (!c) return;
        var price = cat.price || 20;
        (D.SHOPS.mall || []).forEach(function (s) { if (s.id === id) price = s.price; });
        html += '<div class="stat-line"><span>' + c.name + '　' + price + ' 两</span>' +
          '<button class="btn" data-buy="' + id + '" data-price="' + price + '">购</button></div>';
      });
      if (cat.hint) html += '<p style="color:#b8a57a">' + cat.hint + '</p>';
    });
    var stalls = (G.peers || []).filter(function (o) { return o.stall; });
    html += '<h4 style="color:#d4af37;margin:12px 0 4px">当前摊位</h4>' +
      (stalls.map(function (o) {
        return '<div class="stat-line"><span>' + o.name + '　' + (o.stall.title || '摊') +
          '</span><button class="btn ghost" data-look-stall="' + o.user + '">看摊</button></div>';
      }).join('') || '<p>暂无摆摊</p>');
    var el = document.getElementById('panel-shop');
    el.classList.add('open');
    el.innerHTML = html;
  };

  H.enterFish = function () {
    if (!H.canEnterDungeon('fish')) return;
    H.useDungeon('fish');
    G.instance = { id: 'fish', left: D.INSTANCES.fish.duration };
    H.closeDialog();
    H.travel('fish', 6, 18);
    H.log('进入捕鱼儿海。宠物灵石可从本副本获得。');
    H.addActivity(10);
  };

  H.enterTreasure = function () {
    if (!H.canEnterDungeon('treasure')) return;
    H.useDungeon('treasure');
    G.instance = { id: 'treasure', left: D.INSTANCES.treasure.duration, score: 0 };
    H.closeDialog();
    H.travel('treasure', 6, 12);
    H.log('进入大明宝藏地图。采集宝箱、击退守卫。');
    H.addActivity(10);
  };

  H.enterArena = function () {
    if (!H.canEnterDungeon('arena')) return;
    H.useDungeon('arena');
    G.instance = { id: 'arena' };
    H.closeDialog();
    H.travel('arena', 8, 12);
    H.log('加载竞技场。挑战校场教头或与同场玩家切磋。');
    H.addActivity(6);
  };

  H.enterMentor = function () {
    var p = G.player;
    H.ensureLife(p);
    if (!(p.mentor && (p.mentor.master || p.mentor.pupil || p.mentor.want))) {
      H.toast('请先在李梦阳处拜师或收徒');
      return;
    }
    if (!H.canEnterDungeon('mentor')) return;
    H.useDungeon('mentor');
    G.instance = { id: 'mentor', left: D.INSTANCES.mentor.duration };
    H.closeDialog();
    H.travel('mentor', 8, 12);
    H.log('进入师徒同心副本。击败场中敌人即可。');
    H.addActivity(12);
  };

  H.settleTreasure = function () {
    var p = G.player;
    var n = H.countItem(p, 'treasure_pt');
    if (n > 0) {
      H.takeItem(p, 'treasure_pt', n);
      var xp = n * 35, sl = n * 18;
      H.addExp(p, xp);
      H.addSilver(p, sl, true);
      H.pushMail(p, '大明宝藏', '宝藏结算', '积分 ' + n + '，经验 +' + xp + '，银两 +' + sl, true);
      H.toast('宝藏积分结算 ' + n);
    }
  };

})(window.Hongwu);
