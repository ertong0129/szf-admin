/**
 * 大明传说 — 角色、属性、物品、坐骑、仓库、灵宠
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.bagCap = function (p) {
    var extra = 0;
    if (H.vipBonus) extra = (H.vipBonus(p).bag || 0);
    return (H.BAG_CAP || 36) + ((p && p.bagExpand) || 0) * 12 + extra;
  };

  H.emptyEquip = function () {
    var e = {};
    D.SLOTS.forEach(function (s) { e[s.id] = null; });
    return e;
  }

  H.makePlayer = function (name, cls) {
    var c = D.CLASSES[cls];
    var p = {
      name: name || '无名',
      cls: cls,
      level: 1,
      exp: 0,
      x: SPAWN.x,
      y: SPAWN.y,
      facing: 0,
      hp: 1,
      mp: 1,
      added: { str: 0, int: 0, agi: 0, spi: 0, con: 0 },
      unspentAttr: 0,
      unspentSkill: 1,
      skills: {},
      skillCd: {},
      equip: H.emptyEquip(),
      bag: [],
      silver: 40,
      gold: 0,
      bindGold: 5,
      vipExp: 0,
      rechargeFirst: {},
      pet: null,
      quests: { active: ['q1'], done: [], progress: {} },
      flags: {},
      buffs: [],
      auto: false,
      sit: false,
      pkMode: 'peace',
      energy: D.ENERGY_MAX || 4000,
      target: null,
      atkCd: 0,
      gatherCd: 0,
      towerUnlock: 1,
      dungeon: { day: '', poyang: 0, tower: 0 },
      warehouse: { tabs: 1, items: [[], [], [], []] },
      mount: { owned: false, riding: false, rarity: 'white' },
      merit: { day: '', count: 0, active: false, kill: null, need: 0, got: 0 },
      nation: G.selectedNation || 'ming',
      pkValue: 0
    };
    D.SKILLS[cls].forEach(function (s) {
      if (s.unlock <= 1) p.skills[s.id] = 1;
    });
    H.giveStarterGear(p);
    H.addItem(p, { id: 'hp1', n: 5 });
    H.addItem(p, { id: 'mp1', n: 3 });
    H.addItem(p, { id: 'scroll', n: 2 });
    var st = H.stats(p);
    p.hp = st.maxHp;
    p.mp = st.maxMp;
    return p;
  }

  H.giveStarterGear = function (p) {
    D.SLOTS.forEach(function (s) {
      p.equip[s.id] = H.rollEquip(s.id, 1, 'white', p.cls);
    });
  }

  H.rawAttrs = function (p) {
    var c = D.CLASSES[p.cls];
    var a = { str: c.base.str, int: c.base.int, agi: c.base.agi, spi: c.base.spi, con: c.base.con };
    Object.keys(p.added).forEach(function (k) { a[k] += p.added[k]; });
    H.eachEquip(p, function (it) {
      ['str', 'int', 'agi', 'spi', 'con'].forEach(function (k) {
        if (it.stats[k]) a[k] += it.stats[k];
      });
      (it.gems || []).forEach(function (g) {
        if (a[g.kind] != null) a[g.kind] += F.gemStat(g.kind, g.grade);
      });
    });
    return a;
  }

  H.eachEquip = function (p, fn) {
    D.SLOTS.forEach(function (s) {
      if (p.equip[s.id]) fn(p.equip[s.id], s.id);
    });
  }

  H.stats = function (p) {
    var c = D.CLASSES[p.cls];
    var attrs = H.rawAttrs(p);
    var d = F.attrDerive(attrs);
    var extra = { patk: 0, matk: 0, pdef: 0, mdef: 0, hp: 0, mp: 0, aspd: 0, crit: 0, speed: 0 };
    H.eachEquip(p, function (it) {
      Object.keys(extra).forEach(function (k) {
        if (it.stats[k]) extra[k] += it.stats[k];
      });
      (it.gems || []).forEach(function (g) {
        if (extra[g.kind] != null) extra[g.kind] += F.gemStat(g.kind, g.grade);
      });
    });
    var bpatk = 0, bmatk = 0, bpdef = 0, bmdef = 0, bspd = 0;
    p.buffs.forEach(function (b) {
      if (b.patk) bpatk += b.patk;
      if (b.matk) bmatk += b.matk;
      if (b.pdef) bpdef += b.pdef;
      if (b.mdef) bmdef += b.mdef;
      if (b.speed) bspd += b.speed;
    });
    var off = H.officeBonus ? H.officeBonus(p) : { hp: 0, patk: 0, pdef: 0 };
    var maxHp = Math.floor(c.baseHp + d.hp + extra.hp + p.level * 18 + (off.hp || 0));
    var maxMp = Math.floor(c.baseMp + d.mp + extra.mp + p.level * 6);
    return {
      attrs: attrs,
      maxHp: maxHp,
      maxMp: maxMp,
      patk: Math.floor((d.patk + extra.patk) * (1 + bpatk) + (off.patk || 0)),
      matk: Math.floor((d.matk + extra.matk) * (1 + bmatk)),
      pdef: Math.floor((d.pdef + extra.pdef) * (1 + bpdef) + (off.pdef || 0)),
      mdef: Math.floor((d.mdef + extra.mdef) * (1 + bmdef)),
      aspd: 0.85 + d.aspd + extra.aspd,
      crit: 0.05 + d.crit + extra.crit,
      speed: c.speed * (1 + extra.speed + bspd) * H.mountMul(p),
      range: c.range
    };
  }

  H.mountMul = function (p) {
    if (!p || !p.mount || !p.mount.owned || !p.mount.riding) return 1;
    return F.mountSpeedMul ? F.mountSpeedMul(p.mount.rarity) : 1.15;
  }

  H.grantMount = function (p, silent) {
    if (!p) return;
    p.mount = p.mount || { owned: false, riding: false, rarity: 'white' };
    if (p.mount.owned) return;
    if (p.level < (D.MOUNT_LEVEL || 18)) return;
    p.mount.owned = true;
    p.mount.rarity = p.mount.rarity || 'white';
    if (!silent) {
      H.toast('系统赠送坐骑，可在角色面板骑乘');
      H.log('获得坐骑（白）');
      if (H.noteAchieve) H.noteAchieve('mount');
    }
  }

  H.addExp = function (p, n) {
    if (H.vipBonus) {
      var vb = H.vipBonus(p);
      if (vb && vb.exp) n = Math.floor(n * (1 + vb.exp));
    }
    p.exp += n;
    var up = 0;
    while (p.exp >= F.xpToNext(p.level) && p.level < 60) {
      p.exp -= F.xpToNext(p.level);
      p.level += 1;
      p.unspentAttr += 5;
      p.unspentSkill += 1;
      var st = H.stats(p);
      p.hp = st.maxHp;
      p.mp = st.maxMp;
      up += 1;
      D.SKILLS[p.cls].forEach(function (s) {
        if (s.unlock === p.level && p.skills[s.id] == null) p.skills[s.id] = 0;
      });
    }
    if (up) {
      H.toast('升至 ' + p.level + ' 级');
      H.log('境界提升：' + p.level + ' 级');
      H.beep(520, 0.08);
      H.grantMount(p, false);
      if (H.refreshOffice) H.refreshOffice(p, false);
      if (H.noteAchieve) H.noteAchieve('level');
    }
  }

  H.rollEquip = function (slot, level, rarity, cls) {
    rarity = rarity || F.rollRarity(null, Math.max(0, level - 6));
    var names = D.EQUIP_NAMES[slot];
    var nm;
    if (slot === 'weapon') {
      var arr = names[cls] || names.warrior;
      nm = arr[H.clamp(Math.floor((level - 1) / 8), 0, arr.length - 1)];
    } else {
      nm = names[H.clamp(Math.floor((level - 1) / 8), 0, names.length - 1)];
    }
    var base = D.EQUIP_BASE[slot];
    var st = {};
    Object.keys(base).forEach(function (k) {
      var v = base[k];
      if (k === 'crit' || k === 'speed') st[k] = +(v * (F.RARITY_MULT[rarity] || 1) * (0.8 + level * 0.03)).toFixed(3);
      else st[k] = F.scaleEquipStat(v, level, rarity, 0);
    });
    if (slot === 'weapon' && cls === 'wanderer') { st.matk = Math.floor(st.matk * 1.15); st.patk = Math.floor(st.patk * 0.45); }
    if (slot === 'weapon' && cls === 'healer') { st.matk = Math.floor(st.matk * 1.1); st.patk = Math.floor(st.patk * 0.4); }
    return {
      uid: H.uid(), type: 'equip', slot: slot, name: nm, rarity: rarity, level: level,
      stars: 0, sockets: 0, gems: [], stats: st
    };
  }

  H.itemName = function (it) {
    if (it.type === 'equip') {
      return (it.stars ? '+' + it.stars + ' ' : '') + it.name;
    }
    var c = D.CONSUMABLES[it.id];
    if (c) return c.name;
    if (it.type === 'gem') return it.name + '·' + it.grade + '级';
    return it.name || it.id;
  }

  H.addItem = function (p, item) {
    if (item.type === 'equip' || item.type === 'gem') {
      if (p.bag.length >= H.bagCap(p)) { H.toast('背包已满'); return false; }
      p.bag.push(item);
      return true;
    }
    var found = p.bag.find(function (x) { return x.id === item.id && x.type !== 'equip' && x.type !== 'gem'; });
    if (found) { found.n = (found.n || 1) + (item.n || 1); return true; }
    if (p.bag.length >= H.bagCap(p)) { H.toast('背包已满'); return false; }
    var proto = D.CONSUMABLES[item.id];
    p.bag.push(Object.assign({ n: item.n || 1, type: proto ? proto.kind : 'item' }, proto || item, { id: item.id }));
    return true;
  }

  H.takeItem = function (p, id, n) {
    n = n || 1;
    for (var i = 0; i < p.bag.length; i++) {
      var it = p.bag[i];
      if (it.id === id && it.type !== 'equip') {
        if ((it.n || 1) < n) return false;
        it.n -= n;
        if (it.n <= 0) p.bag.splice(i, 1);
        return true;
      }
    }
    return false;
  }

  H.countItem = function (p, id) {
    var n = 0;
    p.bag.forEach(function (it) {
      if (it.id === id) n += it.n || 1;
    });
    return n;
  }

  H.usePotion = function (kind) {
    var p = G.player;
    var st = H.stats(p);
    var order = kind === 'hp' ? ['hp2', 'hp1'] : ['mp2', 'mp1'];
    for (var i = 0; i < order.length; i++) {
      if (H.countItem(p, order[i]) > 0) {
        H.takeItem(p, order[i], 1);
        if (kind === 'hp') {
          var h = F.potionHeal(order[i] === 'hp2' ? 2 : 1, st.maxHp);
          p.hp = Math.min(st.maxHp, p.hp + h);
          H.floatText(p.x, p.y - 16, '+' + h, '#7dff9a');
        } else {
          var m = F.potionHeal(order[i] === 'mp2' ? 2 : 1, st.maxMp);
          p.mp = Math.min(st.maxMp, p.mp + m);
          H.floatText(p.x, p.y - 16, '+' + m, '#7ec8ff');
        }
        return true;
      }
    }
    return false;
  }

  H.grantPet = function () {
    var p = G.player;
    if (p.pet) return;
    var def = D.PETS[H.irand(0, D.PETS.length - 1)];
    p.pet = {
      id: def.id, name: def.name, color: def.color, magic: !!def.magic,
      level: 1, exp: 0, atkMul: def.atk, hpMul: def.hp,
      hp: 80, maxHp: 80, x: p.x - 20, y: p.y, atkCd: 0,
      apt: 1200, insight: 0, star: 0, skills: 0
    };
    H.syncPet(p);
    p.flags.got_pet = true;
    H.toast('灵宠结缘：' + def.name);
    H.log('收服灵宠 ' + def.name);
    H.questCheck();
    if (H.noteAchieve) H.noteAchieve('pet');
  }

  H.syncPet = function (p) {
    if (!p.pet) return;
    var st = H.stats(p);
    p.pet.maxHp = Math.floor((70 + p.level * 22) * p.pet.hpMul);
    if (p.pet.hp > p.pet.maxHp) p.pet.hp = p.pet.maxHp;
    p.pet.atk = Math.floor(((st.patk + st.matk) * 0.28 + p.level * 2) * p.pet.atkMul);
  }

  H.ensureDaily = function (p) {
    if (!p) return;
    H.ensureDungeon(p);
    var day = H.dungeonDay();
    p.energy = p.energy == null ? (H.energyMax ? H.energyMax(p) : (D.ENERGY_MAX || 4000)) : p.energy;
    p.warehouse = p.warehouse || { tabs: 1, items: [[], [], [], []] };
    if (!p.warehouse.items) p.warehouse.items = [[], [], [], []];
    while (p.warehouse.items.length < 4) p.warehouse.items.push([]);
    p.mount = p.mount || { owned: false, riding: false, rarity: 'white' };
    p.merit = p.merit || { day: '', count: 0, active: false, kill: null, need: 0, got: 0 };
    if (p.merit.day !== day) {
      p.merit.day = day;
      p.merit.count = 0;
    }
    if (p._energyDay !== day) {
      p._energyDay = day;
      p.energy = H.energyMax ? H.energyMax(p) : (D.ENERGY_MAX || 4000);
    }
    H.grantMount(p, true);
  }

  H.bankExchange = function (dir) {
    var p = G.player;
    var rate = (D.BANK && D.BANK.silverPerNote) || 500;
    if (dir === 'to') {
      if (p.silver < rate) { H.toast('银两不足 ' + rate); return; }
      p.silver -= rate;
      H.addItem(p, { id: 'yinpiao', n: 1 });
      H.toast('兑得五锭银票');
    } else {
      if (H.countItem(p, 'yinpiao') < 1) { H.toast('没有银票'); return; }
      H.takeItem(p, 'yinpiao', 1);
      p.silver += rate;
      H.toast('兑回 ' + rate + ' 两');
    }
  }

  H.stashIn = function (i) {
    var p = G.player;
    H.ensureDaily(p);
    var it = p.bag[i];
    if (!it) return;
    var tab = p.warehouse.items[G.whTab || 0];
    var cap = (D.WAREHOUSE && D.WAREHOUSE.cap) || 36;
    if (tab.length >= cap) { H.toast('本仓库已满'); return; }
    p.bag.splice(i, 1);
    tab.push(it);
    H.paintWarehouse();
  }

  H.stashOut = function (i) {
    var p = G.player;
    H.ensureDaily(p);
    var tab = p.warehouse.items[G.whTab || 0];
    var it = tab[i];
    if (!it) return;
    if (!H.addItem(p, it)) return;
    tab.splice(i, 1);
    H.paintWarehouse();
  }

  H.unlockWarehouse = function (i) {
    var p = G.player;
    var spec = D.WAREHOUSE || { maxTabs: 4, unlock: [0, 200, 500, 1000] };
    if (i !== p.warehouse.tabs) { H.toast('请先开通上一仓'); return; }
    if (i >= spec.maxTabs) return;
    var cost = spec.unlock[i] || 0;
    if (p.silver < cost) { H.toast('银两不足'); return; }
    p.silver -= cost;
    p.warehouse.tabs += 1;
    G.whTab = i;
    H.toast('开通仓库' + (i + 1));
    H.paintWarehouse();
  }

  H.toggleSit = function () {
    var p = G.player;
    if (!p) return;
    p.sit = !p.sit;
    if (p.sit) {
      p.auto = false;
      p.target = null;
      G.dest = null;
      G.path = [];
      G.guide = null;
      H.toast('开始打坐');
    } else H.toast('起身');
  }

  H.upgradeMount = function () {
    var p = G.player;
    if (!p.mount || !p.mount.owned) return;
    var ch = F.mountUpgradeChance(p.mount.rarity);
    if (!ch) { H.toast('坐骑已是橙色'); return; }
    if (H.countItem(p, 'mount_token') < 1) { H.toast('没有坐骑提速牌'); return; }
    H.takeItem(p, 'mount_token', 1);
    if (Math.random() < ch) {
      var order = F.RARITY;
      var idx = order.indexOf(p.mount.rarity);
      p.mount.rarity = order[Math.min(order.length - 1, idx + 1)];
      H.toast('提速成功：' + D.RARITY_NAME[p.mount.rarity]);
    } else H.toast('提速失败');
    H.paintPanel('char');
  }

  H.useBagItem = function (index, discard) {
    var p = G.player;
    var it = p.bag[index];
    if (!it) return;
    if (discard) {
      p.bag.splice(index, 1);
      H.toast('弃去 ' + H.itemName(it));
      H.paintPanel('bag');
      return;
    }
    if (it.type === 'equip') {
      var old = p.equip[it.slot];
      p.equip[it.slot] = it;
      p.bag.splice(index, 1);
      if (old) p.bag.push(old);
      H.toast('装备 ' + H.itemName(it));
    } else if (it.potion === 'hp') {
      H.takeItem(p, it.id, 1);
      var st = H.stats(p);
      var h = F.potionHeal(it.tier || 1, st.maxHp);
      p.hp = Math.min(st.maxHp, p.hp + h);
    } else if (it.potion === 'mp') {
      H.takeItem(p, it.id, 1);
      var st2 = H.stats(p);
      var m = F.potionHeal(it.tier || 1, st2.maxMp);
      p.mp = Math.min(st2.maxMp, p.mp + m);
    } else if (it.id === 'badge') {
      H.takeItem(p, 'badge', 1);
      H.addExp(p, 80);
      H.toast('缴上腰牌，经验 +80');
    } else if (it.id === 'hero_pack' || it.kind === 'pack') {
      H.takeItem(p, it.id, 1);
      if (Math.random() < 0.45) {
        var gdef = D.GEMS[H.irand(0, D.GEMS.length - 1)];
        H.addItem(p, { uid: H.uid(), type: 'gem', id: gdef.id, name: gdef.name, kind: gdef.kind, grade: 1 });
        H.toast('打开英雄礼包：' + gdef.name);
      } else if (Math.random() < 0.5) {
        H.addItem(p, { id: 'stone', n: 2 });
        H.toast('打开英雄礼包：强化石×2');
      } else {
        H.addItem(p, { id: 'hp2', n: 2 });
        H.toast('打开英雄礼包：大型金创药×2');
      }
    } else if (it.id === 'skill_book') {
      H.takeItem(p, 'skill_book', 1);
      p.unspentSkill += 1;
      H.toast('领悟技能点 +1');
    } else if (it.id === 'pet_book') {
      H.teachPetSkill();
    } else if (it.id === 'wash_dan') {
      H.washPet();
    } else if (it.id === 'insight_dan') {
      H.insightPet();
    } else if (it.id === 'train_pai') {
      H.trainPet();
    } else if (it.id === 'bag_token') {
      H.expandBag();
    } else if (it.id === 'yibao') {
      H.takeItem(p, 'yibao', 1);
      H.addExp(p, 50);
      p.silver += 15;
      H.toast('献上异宝');
    } else if (it.id === 'pet_stone') {
      H.takeItem(p, 'pet_stone', 1);
      if (p.pet) { p.pet.hp = Math.min(p.pet.maxHp, p.pet.hp + 40); H.toast('灵石饲喂'); }
      else H.toast('收好宠物灵石，可当洗灵材料');
    } else if (it.id === 'wine') {
      H.toast('篝火旁打坐时会自动饮用');
    } else if (it.id === 'flower') {
      H.toast('点其他玩家可赠花');
    } else if (it.kind === 'feed' || it.id === 'feed') {
      if (!p.pet) { H.toast('没有灵宠'); return; }
      H.takeItem(p, 'feed', 1);
      p.pet.hp = Math.min(p.pet.maxHp, p.pet.hp + 60);
      H.toast('灵宠进食');
    } else {
      H.toast(H.itemName(it));
    }
    H.paintPanel('bag');
  }

  H.enhanceSlot = function (slot) {
    var p = G.player;
    var it = p.equip[slot];
    if (!it) return;
    if (it.stars >= 10) { H.toast('已至满星'); return; }
    var cost = F.enhanceCost(it.stars, it.level);
    if (p.silver < cost) { H.toast('银两不足 ' + cost); return; }
    if (!H.takeItem(p, 'stone', 1)) { H.toast('缺少强化石'); return; }
    p.silver -= cost;
    if (Math.random() < F.enhanceChance(it.stars)) {
      it.stars += 1;
      Object.keys(it.stats).forEach(function (k) {
        if (k === 'crit' || k === 'speed') it.stats[k] = +(it.stats[k] * 1.08).toFixed(3);
        else it.stats[k] = Math.floor(it.stats[k] * 1.08);
      });
      H.toast(H.itemName(it) + ' 升星成功');
      p.flags.enhanced = true;
      H.questCheck();
      if (H.noteAchieve) H.noteAchieve('star');
    } else {
      H.toast('炉火不稳，升星失败');
    }
    H.paintPanel('forge');
  }

  H.socketSlot = function (slot) {
    var p = G.player;
    var it = p.equip[slot];
    if (!it) return;
    if (it.sockets >= 3) { H.toast('孔位已满'); return; }
    var cost = F.socketCost(it.sockets);
    if (p.silver < cost) { H.toast('银两不足'); return; }
    if (!H.takeItem(p, 'socket', 1)) { H.toast('缺少开孔符'); return; }
    p.silver -= cost;
    it.sockets += 1;
    H.toast('开孔成功');
    if (H.noteAchieve) H.noteAchieve('socket');
    H.paintPanel('forge');
  }

  H.inlayGem = function (uid) {
    var p = G.player;
    var it = p.equip.weapon;
    if (!it) return;
    if ((it.gems || []).length >= (it.sockets || 0)) { H.toast('先开孔'); return; }
    var idx = p.bag.findIndex(function (x) { return x.uid === uid; });
    if (idx < 0) return;
    var gem = p.bag.splice(idx, 1)[0];
    it.gems = it.gems || [];
    it.gems.push(gem);
    p.flags.gemmed = true;
    if (H.noteAchieve) H.noteAchieve('gem');
    H.toast('镶入 ' + H.itemName(gem));
    H.paintPanel('forge');
  }

  H.recolorSlot = function (slot) {
    var p = G.player;
    var it = p.equip[slot];
    if (!it) return;
    var ch = F.recolorChance(it.rarity);
    if (!ch) { H.toast('已是橙色，无法再提色'); return; }
    var fodder = -1;
    for (var i = 0; i < p.bag.length; i++) {
      if (p.bag[i].type === 'equip') { fodder = i; break; }
    }
    if (fodder < 0) { H.toast('背包需一件淘汰装备作提色材料'); return; }
    p.bag.splice(fodder, 1);
    if (Math.random() < ch) {
      var order = F.RARITY;
      var idx = order.indexOf(it.rarity);
      it.rarity = order[Math.min(order.length - 1, idx + 1)];
      H.toast('提色成功：' + (D.RARITY_NAME[it.rarity] || it.rarity));
    } else H.toast('提色失败');
    H.paintPanel('forge');
  }

  H.craftRecipe = function (i) {
    var p = G.player;
    var r = D.RECIPES[i];
    var keys = Object.keys(r.ins);
    for (var k = 0; k < keys.length; k++) {
      if (H.countItem(p, keys[k]) < r.ins[keys[k]]) { H.toast('材料不足'); return; }
    }
    keys.forEach(function (id) { H.takeItem(p, id, r.ins[id]); });
    H.addItem(p, { id: r.out.id, n: r.out.n });
    H.toast('炼成 ' + D.CONSUMABLES[r.out.id].name);
    H.paintPanel('forge');
  }

})(window.Hongwu);
