/**
 * 大明传说 — 战斗、掉落、死亡、PK
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.floatText = function (x, y, text, color) {
    G.floats.push({ x: x, y: y, text: text, color: color || '#fff', t: 0.9 });
  }

  H.burst = function (x, y, color, n) {
    n = n || 8;
    for (var i = 0; i < n; i++) {
      G.particles.push({
        x: x, y: y, vx: H.rand(-70, 70), vy: H.rand(-90, 20),
        color: color, t: H.rand(0.25, 0.55)
      });
    }
  }

  H.beep = function (freq, dur) {
    try {
      if (!G.ac) G.ac = new (window.AudioContext || window.webkitAudioContext)();
      var o = G.ac.createOscillator();
      var g = G.ac.createGain();
      o.frequency.value = freq;
      o.type = 'square';
      g.gain.value = 0.03;
      o.connect(g); g.connect(G.ac.destination);
      o.start();
      o.stop(G.ac.currentTime + (dur || 0.05));
    } catch (e) { /* ignore */ }
  }

  H.hurtMonster = function (e, dmg, crit) {
    e.aggro = 4;
    H.floatText(e.x, e.y - 18, (crit ? '暴 ' : '') + dmg, crit ? '#ffd36a' : '#ffe8c8');
    H.burst(e.x, e.y, e.color, crit ? 14 : 7);
    if (e.worldBoss && H.onWorldBossHit) {
      H.onWorldBossHit(e, dmg);
    } else {
      e.hp -= dmg;
    }
    if (e.hp <= 0) H.killMonster(e);
  }

  H.killMonster = function (e) {
    var p = G.player;
    H.ensureDaily(p);
    var tired = (p.energy || 0) <= 0;
    if (!tired) p.energy = Math.max(0, (p.energy || 0) - 1);
    var xp = tired ? 1 : F.killXp(p.level, e.level, e.boss);
    H.addExp(p, xp);
    var sil = tired ? 0 : H.irand(2, 6 + e.level);
    if (e.boss && !tired) sil *= 8;
    p.silver += sil;
    H.log('击败 ' + e.name + '，经验 +' + xp + (tired ? '（精力耗尽）' : ' 银两 +' + sil));
    if (!tired) H.dropLoot(e);
    else H.toast('精力耗尽：经验为 1，无掉落');
    H.noteKill(e.kind);
    if (H.noteDailyKill) H.noteDailyKill(e.kind);
    if (H.noteAchieve) H.noteAchieve('kill');
    if (e.kind === 'chenyouliang') { p.flags.chen_dead = true; H.questCheck(); }
    if (e.kind === 'lake_boss') { p.flags.poyang_clear = true; H.questCheck(); }
    if (e.fieldId && H.onFieldBossKill) H.onFieldBossKill(e);
    if (e.worldBoss && H.onWorldBossKill) H.onWorldBossKill(e);
    if (e.kind === 'spirit' && !p.pet && Math.random() < 0.45) H.grantPet();
    if (e.kind === 'spirit' && !p.pet) {
      /* extra chance already handled */
    }
    if (G.mapId === 'shennong' && !p.pet && e.kind === 'spirit') {
      if (!p.flags.pet_hint) { H.toast('山魈气息未散，再寻一只或可结缘'); p.flags.pet_hint = true; }
    }
    G.entities = G.entities.filter(function (x) { return x !== e; });
    if (p.target === e) p.target = null;
    if (G.mapId === 'tower') H.onTowerKill();
    if (G.mapId === 'arena' && e.kind === 'coach') {
      p.arenaScore = (p.arenaScore || 0) + 8;
      H.toast('竞技积分 +8');
    }
    var meta = D.MAP_META[G.mapId];
    if (meta && !meta.instance && !meta.safe && !e.boss && !e.fieldBoss && !e.worldBoss) {
      if (G.entities.filter(function (x) { return !x.boss; }).length < 8) {
        H.spawnPack(e.kind, 1, e.level);
      }
    }
  }

  H.dropLoot = function (e) {
    var p = G.player;
    if (e.boss && F.lootByLevelGap && Math.random() > F.lootByLevelGap(p.level, e.level)) {
      H.toast('等级差过大，本次几乎没有掉落');
      return;
    }
    if (Math.random() < (e.boss || e.elite ? 0.95 : 0.28)) {
      var eq = H.rollEquip(D.SLOTS[H.irand(0, D.SLOTS.length - 1)].id, e.level, null, p.cls);
      G.drops.push({ x: e.x + H.rand(-12, 12), y: e.y + H.rand(-12, 12), item: eq });
    }
    var def = D.MONSTERS[e.kind];
    (def.loot || []).forEach(function (id) {
      if (id === 'gem') {
          if (Math.random() < (e.boss || e.elite ? 0.7 : 0.12)) {
          var gdef = D.GEMS[H.irand(0, D.GEMS.length - 1)];
          G.drops.push({
            x: e.x + H.rand(-10, 10), y: e.y + H.rand(-10, 10),
            item: { uid: H.uid(), type: 'gem', id: gdef.id, name: gdef.name, kind: gdef.kind, grade: H.clamp(1 + Math.floor(e.level / 8), 1, 6) }
          });
        }
      } else if (Math.random() < (e.boss || e.elite ? 0.8 : 0.22)) {
        G.drops.push({ x: e.x + H.rand(-10, 10), y: e.y + H.rand(-10, 10), item: { id: id, n: 1 } });
      }
    });
  }

  H.pickupNear = function () {
    var p = G.player;
    G.drops = G.drops.filter(function (d) {
      if (H.dist(p, d) < 36) {
        if (H.addItem(p, d.item)) {
          H.log('获得 ' + H.itemName(d.item));
          return false;
        }
      }
      return true;
    });
    G.herbs = G.herbs.filter(function (h) {
      if (H.dist(p, h) < 32) {
        if (h.yibao || h.id === 'yibao') {
          if (H.collectYibao) {
            if (!H.collectYibao()) return true;
          } else H.addItem(p, { id: h.id, n: 1 });
        } else {
          H.addItem(p, { id: h.id, n: 1 });
          H.log('采集 ' + ((D.CONSUMABLES[h.id] && D.CONSUMABLES[h.id].name) || h.id));
          H.noteGather(h.id);
        }
        if (G.guide && G.guide.wantHerb) H.guideStep();
        return false;
      }
      return true;
    });
  }

  H.playerAttack = function () {
    var p = G.player;
    if (!p.target || p.atkCd > 0) return;
    p.sit = false;
    var st = H.stats(p);
    if (H.dist(p, p.target) > st.range + 8) return;
    p.facing = H.ang(p, p.target);
    var magic = p.cls === 'wanderer' || p.cls === 'healer';
    var atk = magic ? st.matk : st.patk;
    var def = magic ? 0 : p.target.level * 1.2;
    var crit = F.critRoll(st.crit);
    var dmg = F.calcDamage(atk, def, 1, crit, H.rand(-0.08, 0.08));
    if (p.target.isPeer) {
      H.hitPeer(p.target, dmg, crit);
    } else {
      H.hurtMonster(p.target, dmg, crit);
    }
    p.atkCd = 1 / Math.max(0.45, st.aspd);
    H.beep(220, 0.03);
  }

  H.castSkill = function (sk) {
    var p = G.player;
    if (!sk) return;
    p.sit = false;
    var lv = p.skills[sk.id] || 0;
    if (lv <= 0) { H.toast('尚未领悟'); return; }
    if ((p.skillCd[sk.id] || 0) > 0) return;
    var st = H.stats(p);
    if (p.mp < sk.cost) { H.toast('内力不足'); return; }
    var mul = sk.mul ? sk.mul + (lv - 1) * 0.08 : 1;
    var magic = !!sk.magic || p.cls === 'wanderer' || (p.cls === 'healer' && sk.kind !== 'heal');
    p.mp -= sk.cost;
    p.skillCd[sk.id] = sk.cd * Math.max(0.55, 1 - lv * 0.03);
    p.facing = p.target ? H.ang(p, p.target) : p.facing;

    if (sk.kind === 'heal') {
      var h = Math.floor(st.maxHp * (sk.heal || 0.2) * (1 + lv * 0.06));
      p.hp = Math.min(st.maxHp, p.hp + h);
      H.floatText(p.x, p.y - 20, '+' + h, '#7dff9a');
      if (sk.pet && p.pet) {
        p.pet.hp = Math.min(p.pet.maxHp, p.pet.hp + Math.floor(h * 0.8));
      }
    } else if (sk.kind === 'manaburn') {
      var r = Math.floor(st.maxMp * (sk.mana || 0.2));
      p.mp = Math.min(st.maxMp, p.mp + r + sk.cost);
      H.floatText(p.x, p.y - 20, '+' + r + ' 内', '#7ec8ff');
    } else if (sk.kind === 'buff') {
      p.buffs.push(Object.assign({ t: sk.buff.dur }, sk.buff));
      H.toast(sk.name + ' 生效');
    } else if (sk.kind === 'blink') {
      var a = Math.atan2(G.mouse.wy - p.y, G.mouse.wx - p.x);
      H.tryMove(p, Math.cos(a) * 110, Math.sin(a) * 110);
    } else if (sk.kind === 'dash' && p.target) {
      var dsh = H.ang(p, p.target);
      H.tryMove(p, Math.cos(dsh) * 80, Math.sin(dsh) * 80);
      H.hitTarget(p, p.target, mul, magic, sk);
    } else if (sk.kind === 'nova') {
      G.entities.forEach(function (e) {
        if (H.dist(p, e) <= (sk.range || 80)) H.hitTarget(p, e, mul, magic, sk);
      });
      (G.peers || []).forEach(function (o) {
        if (H.dist(p, o) <= (sk.range || 80)) H.hitTarget(p, H.asPeerTarget(o), mul, magic, sk);
      });
      H.burst(p.x, p.y, D.CLASSES[p.cls].color, 18);
    } else if (sk.kind === 'pierce') {
      H.fireBolt(p, sk, mul, magic, true);
    } else if (sk.kind === 'blast' || sk.kind === 'bolt' || sk.kind === 'stun' || sk.kind === 'debuff') {
      if (sk.kind === 'melee') {
        if (p.target && H.dist(p, p.target) <= (sk.range || 50)) H.hitTarget(p, p.target, mul, magic, sk);
      } else {
        H.fireBolt(p, sk, mul, magic, false);
      }
    } else if (sk.kind === 'melee') {
      if (p.target && H.dist(p, p.target) <= (sk.range || 54) + 10) H.hitTarget(p, p.target, mul, magic, sk);
      else H.toast('距离不够');
    }
    H.beep(330, 0.04);
  }

  H.fireBolt = function (p, sk, mul, magic, pierce) {
    var aim = p.target || { x: G.mouse.wx, y: G.mouse.wy };
    var a = H.ang(p, aim);
    G.projectiles.push({
      x: p.x, y: p.y, vx: Math.cos(a) * 320, vy: Math.sin(a) * 320,
      life: 0.9, r: 5, from: 'player', mul: mul, magic: magic, skill: sk,
      pierce: pierce, hit: {}, color: D.CLASSES[p.cls].accent
    });
  }

  H.hitTarget = function (p, e, mul, magic, sk) {
    var st = H.stats(p);
    var atk = magic ? st.matk : st.patk;
    var crit = F.critRoll(st.crit + (sk && sk.crit ? sk.crit : 0));
    var dmg = F.calcDamage(atk, e.level != null ? e.level : 1, mul, crit, H.rand(-0.05, 0.05));
    if (e.isPeer) {
      H.hitPeer(e, dmg, crit);
      return;
    }
    if (sk && sk.stun) e.stun = Math.max(e.stun, sk.stun);
    if (sk && sk.debuff) e.debuff = Object.assign({ t: sk.debuff.dur }, sk.debuff);
    H.hurtMonster(e, dmg, crit);
  }

  H.selectNearestMob = function () {
    var p = G.player;
    var best = null, bd = 1e9;
    G.entities.forEach(function (e) {
      var d = H.dist(p, e);
      if (d < bd) { bd = d; best = e; }
    });
    if (best) {
      p.target = best;
      p.sit = false;
      H.toast('选中 ' + best.name);
    } else H.toast('附近没有可攻击目标');
  }

  H.hurtPlayer = function (dmg) {
    var p = G.player;
    p.hp -= dmg;
    if (G.mapId === 'tower') G.towerDmg = (G.towerDmg || 0) + dmg;
    H.floatText(p.x, p.y - 18, '-' + dmg, '#ff8a7a');
  }

  H.die = function () {
    var p = G.player;
    p.auto = false;
    var spec = D.INSTANCES[G.mapId];
    var title = document.getElementById('death-title');
    var text = document.getElementById('death-text');
    var btn = document.getElementById('btn-revive');
    var hereBtn = document.getElementById('btn-revive-here');
    if (hereBtn) hereBtn.hidden = true;
    if (spec && spec.revive === 'here') {
      G.deathKind = 'here';
      if (title) title.textContent = '身受重创';
      if (text) text.textContent = '副本地图内可以原地复活，角色死亡不掉落物品。';
      if (btn) btn.textContent = '立即在原地复活';
    } else if (spec && spec.revive === 'entrance') {
      G.deathKind = 'entrance';
      if (title) title.textContent = '挑战失败';
      if (text) text.textContent = '副本地图内无法原地复活。返回入口后，已开通关卡仍保留。';
      if (btn) btn.textContent = '返回入口';
    } else {
      G.deathKind = 'village';
      p.silver = Math.max(0, Math.floor(p.silver * ((p.pkValue || 0) >= 18 ? 0.75 : 0.9)));
      if ((p.pkValue || 0) >= 30) {
        if (title) title.textContent = '入狱示众';
        if (text) text.textContent = 'PK 值过高，复活后押回太平村。';
      } else if ((p.pkValue || 0) >= 18) {
        if (title) title.textContent = '红名身死';
        if (text) text.textContent = '红名死亡掉落加重，银两折损更多。';
      } else {
        if (title) title.textContent = '身死道消';
        if (text) text.textContent = '银两略有折损，将在太平村回魂。';
      }
      if (btn) btn.textContent = '回 村 再 战';
      if (hereBtn) {
        hereBtn.hidden = false;
        var cost = F.reviveHereCost(p.level);
    if (H.vipBonus) cost = Math.floor(cost * (H.vipBonus(p).revive || 1));
        hereBtn.textContent = '原地健康复活（' + cost + ' 两）';
      }
    }
    document.getElementById('death').classList.add('open');
  }

  H.revive = function () {
    document.getElementById('death').classList.remove('open');
    var p = G.player;
    var st = H.stats(p);
    p.hp = st.maxHp;
    p.mp = st.maxMp;
    p.target = null;
    if (G.deathKind === 'here') {
      H.toast('成功原地复活');
      return;
    }
    if (G.deathKind === 'entrance') {
      H.leaveInstance();
      return;
    }
    H.travel('taiping', 24, 17);
  }

  H.reviveHere = function () {
    var p = G.player;
    var cost = F.reviveHereCost(p.level);
    if (H.vipBonus) cost = Math.floor(cost * (H.vipBonus(p).revive || 1));
    if (p.silver < cost) { H.toast('银两不足，无法原地复活'); return; }
    p.silver -= cost;
    G.deathKind = 'here';
    H.revive();
    H.toast('原地健康复活');
  }

  H.cyclePkMode = function () {
    if (!G.player) return;
    var list = D.PK_MODES || [];
    if (!list.length) return;
    var i = 0;
    for (; i < list.length; i++) if (list[i].id === G.player.pkMode) break;
    if (i >= list.length) i = 0;
    var next = list[(i + 1) % list.length];
    G.player.pkMode = next.id;
    H.toast('PK 模式：' + next.name);
    H.refreshPkMode();
  }

  H.refreshPkMode = function () {
    var btn = document.getElementById('pk-mode');
    if (!btn || !G.player) return;
    var mode = (D.PK_MODES || []).filter(function (m) { return m.id === G.player.pkMode; })[0] || D.PK_MODES[0];
    btn.textContent = mode.name;
    btn.classList.toggle('all', mode.id === 'all');
    btn.classList.toggle('karma', mode.id === 'karma');
    btn.classList.toggle('nation', mode.id === 'nation');
    btn.classList.toggle('party', mode.id === 'party');
    btn.classList.toggle('clan', mode.id === 'clan');
  }

})(window.Hongwu);
