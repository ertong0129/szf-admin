/**
 * 洪武风云录 — 每帧模拟
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.updatePlayer = function (dt) {
    if (G.hold) return;
    var p = G.player;
    var st = H.stats(p);
    var mx = 0, my = 0;
    if (G.keys.ArrowUp) my -= 1;
    if (G.keys.ArrowDown) my += 1;
    if (G.keys.ArrowLeft) mx -= 1;
    if (G.keys.ArrowRight) mx += 1;
    p._moving = false;
    if (mx || my) {
      p.sit = false;
      G.dest = null;
      G.path = [];
      G.guide = null;
      var len = Math.hypot(mx, my) || 1;
      H.tryMove(p, (mx / len) * st.speed * dt, (my / len) * st.speed * dt);
      p.facing = Math.atan2(my, mx);
      p._moving = true;
    } else if (p.sit) {
      G.dest = null;
      G.path = [];
      p.hp = Math.min(st.maxHp, p.hp + dt * (12 + st.attrs.con * 0.4));
      p.mp = Math.min(st.maxMp, p.mp + dt * (14 + st.attrs.spi * 0.5));
    } else if (G.path && G.path.length) {
      var wp = G.path[0];
      var wx = (wp.x + 0.5) * TILE, wy = (wp.y + 0.5) * TILE;
      if (Math.hypot(p.x - wx, p.y - wy) < 10) G.path.shift();
      else {
        var pa = Math.atan2(wy - p.y, wx - p.x);
        H.tryMove(p, Math.cos(pa) * st.speed * dt, Math.sin(pa) * st.speed * dt);
        p.facing = pa;
        p._moving = true;
      }
    } else if (G.dest) {
      var dd = H.dist(p, G.dest);
      if (dd < 8) {
        G.dest = null;
        H.tickGuideArrive();
      } else {
        var a = H.ang(p, G.dest);
        var ox = p.x, oy = p.y;
        H.tryMove(p, Math.cos(a) * st.speed * dt, Math.sin(a) * st.speed * dt);
        p.facing = a;
        p._moving = true;
        if (Math.hypot(p.x - ox, p.y - oy) < 0.2) {
          G.dest = null;
          H.tickGuideArrive();
        }
      }
    }
    p.atkCd = Math.max(0, p.atkCd - dt);
    Object.keys(p.skillCd).forEach(function (k) { p.skillCd[k] = Math.max(0, p.skillCd[k] - dt); });
    p.buffs = p.buffs.filter(function (b) { b.t -= dt; return b.t > 0; });
    if (p.hp < st.maxHp) p.hp = Math.min(st.maxHp, p.hp + dt * (1.2 + st.attrs.con * 0.05));
    if (p.mp < st.maxMp) p.mp = Math.min(st.maxMp, p.mp + dt * (1.6 + st.attrs.spi * 0.08));
    if (p.target && p.target.hp <= 0) p.target = null;
    if (!p.sit) {
      if (p.target && H.dist(p, p.target) <= st.range) H.playerAttack();
      else if (p.target) H.setDest(p.target.x, p.target.y);
    }
    H.pickupNear();
    G.portals.forEach(function (pt) {
      var px = (pt.x + 0.5) * TILE, py = (pt.y + 0.5) * TILE;
      if (Math.hypot(p.x - px, p.y - py) < 28) {
        if (!pt._cd) {
          pt._cd = 1.2;
          if (pt.to === 'poyang' && G.mapId !== 'poyang') {
            H.travel('capital', 36, 22);
            H.toast('找明军水兵，选择难度进入鄱阳湖大战');
          } else if (H.inInstance() && pt.to === 'capital') {
            H.leaveInstance();
          } else {
            H.travel(pt.to, pt.tx, pt.ty);
          }
        }
      }
      if (pt._cd) pt._cd = Math.max(0, pt._cd - dt);
    });
    if (p.auto) H.updateAuto(dt, st);
    else if (G.guide && G.guide.wantKill && (!p.target || p.target.hp <= 0)) H.guideStep();
    if (p.hp <= 0) H.die();
  }

  H.updateAuto = function (dt, st) {
    var p = G.player;
    if (p.hp < st.maxHp * 0.4) H.usePotion('hp');
    if (p.mp < st.maxMp * 0.25) H.usePotion('mp');
    if (!p.target || p.target.hp <= 0) {
      var best = null, bd = 9999;
      G.entities.forEach(function (e) {
        var d = H.dist(p, e);
        if (d < bd && d < 420) { bd = d; best = e; }
      });
      p.target = best;
    }
    var skills = D.SKILLS[p.cls];
    for (var i = 0; i < skills.length; i++) {
      var sk = skills[i];
      if ((p.skills[sk.id] || 0) > 0 && (p.skillCd[sk.id] || 0) <= 0 && p.mp >= sk.cost) {
        if (sk.kind === 'heal' && p.hp > st.maxHp * 0.55) continue;
        if (sk.kind === 'manaburn' && p.mp > st.maxMp * 0.4) continue;
        if ((sk.kind === 'bolt' || sk.kind === 'melee' || sk.kind === 'nova' || sk.kind === 'blast' || sk.kind === 'pierce' || sk.kind === 'dash' || sk.kind === 'stun') && !p.target) continue;
        H.castSkill(sk);
        break;
      }
    }
  }

  H.updateMonsters = function (dt) {
    if (G.hold) return;
    var p = G.player;
    var st = H.stats(p);
    G.entities.forEach(function (e) {
      if (e.stun > 0) { e.stun -= dt; return; }
      e.atkCd = Math.max(0, e.atkCd - dt);
      if (e.debuff) { e.debuff.t -= dt; if (e.debuff.t <= 0) e.debuff = null; }
      var d = H.dist(e, p);
      var sight = e.boss ? 260 : (e.ranged ? 240 : 170);
      if (d < sight) e.aggro = 3;
      if (e.aggro > 0) {
        e.aggro -= dt;
        var spd = e.speed * (e.debuff && e.debuff.speed ? 1 - e.debuff.speed : 1);
        var melee = e.r + 16;
        var want = e.ranged ? (e.range || 180) : melee;
        if (e.ranged && d < want && d > melee) {
          if (e.atkCd <= 0) {
            var a0 = H.ang(e, p);
            G.projectiles.push({
              x: e.x, y: e.y, vx: Math.cos(a0) * 260, vy: Math.sin(a0) * 260,
              life: 0.9, mul: 1, magic: !!e.magic, skill: null, hit: {},
              foe: true, atk: e.atk, color: '#c8e68a'
            });
            e.atkCd = 1.45;
          }
        } else if (d > want) {
          var a = H.ang(e, p);
          H.tryMove(e, Math.cos(a) * spd * dt, Math.sin(a) * spd * dt);
        } else if (e.atkCd <= 0) {
          var def = e.magic ? st.mdef : st.pdef;
          var dmg = F.calcDamage(e.atk, def, 1, false, H.rand(-0.05, 0.05));
          H.hurtPlayer(dmg);
          e.atkCd = e.boss ? 1.15 : 1.35;
          H.beep(140, 0.04);
        }
      }
    });
  }

  H.updatePet = function (dt) {
    if (G.hold) return;
    var p = G.player;
    if (!p.pet || p.pet.hp <= 0) return;
    H.syncPet(p);
    var pet = p.pet;
    var follow = H.dist(pet, p) > 46;
    if (follow && (!p.target || H.dist(pet, p) > 160)) {
      var a = H.ang(pet, p);
      pet.x += Math.cos(a) * 150 * dt;
      pet.y += Math.sin(a) * 150 * dt;
    }
    pet.atkCd = Math.max(0, pet.atkCd - dt);
    var t = p.target;
    if (t && H.dist(pet, t) < 220) {
      if (H.dist(pet, t) > 28) {
        var b = H.ang(pet, t);
        pet.x += Math.cos(b) * 140 * dt;
        pet.y += Math.sin(b) * 140 * dt;
      } else if (pet.atkCd <= 0) {
        var dmg = Math.max(1, pet.atk - t.level);
        H.hurtMonster(t, dmg, false);
        pet.atkCd = 1.1;
      }
    }
  }

  H.updateProjectiles = function (dt) {
    if (G.hold) return;
    G.projectiles = G.projectiles.filter(function (pr) {
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      if (pr.life <= 0) return false;
      if (pr.foe) {
        var p = G.player;
        if (p && Math.hypot(pr.x - p.x, pr.y - p.y) < 16) {
          var st = H.stats(p);
          var def = pr.magic ? st.mdef : st.pdef;
          var dmg = F.calcDamage(pr.atk || 8, def, 1, false, 0);
          H.hurtPlayer(dmg);
          H.beep(140, 0.04);
          return false;
        }
        return true;
      }
      for (var i = 0; i < G.entities.length; i++) {
        var e = G.entities[i];
        if (pr.hit[e.uid]) continue;
        if (Math.hypot(pr.x - e.x, pr.y - e.y) < e.r + 8) {
          pr.hit[e.uid] = true;
          H.hitTarget(G.player, e, pr.mul, pr.magic, pr.skill);
          if (pr.skill && pr.skill.kind === 'blast') {
            G.entities.forEach(function (o) {
              if (o !== e && H.dist(o, e) < 56) H.hitTarget(G.player, o, pr.mul * 0.7, pr.magic, pr.skill);
            });
          }
          if (!pr.pierce) return false;
        }
      }
      for (var j = 0; j < (G.peers || []).length; j++) {
        var o = G.peers[j];
        if (!o || (o.mapId && o.mapId !== G.mapId)) continue;
        if (pr.hit['p-' + o.user]) continue;
        if (Math.hypot(pr.x - o.x, pr.y - o.y) < 22) {
          pr.hit['p-' + o.user] = true;
          H.hitTarget(G.player, H.asPeerTarget(o), pr.mul, pr.magic, pr.skill);
          if (!pr.pierce) return false;
        }
      }
      return true;
    });
  }

  H.updateEscort = function (dt) {
    if (G.mapId !== 'road' || !G.escort) return;
    var cart = G.escort;
    cart.x += 36 * dt;
    cart.t += dt;
    cart.spawn += dt;
    if (cart.spawn > 6) {
      cart.spawn = 0;
      H.spawnOne('escort', cart.x + H.rand(-30, 30), cart.y + H.rand(-80, 80), 10 + G.player.level);
    }
    G.entities.forEach(function (e) {
      if (e.kind === 'escort' && H.dist(e, cart) < 22 && e.atkCd <= 0) {
        cart.hp -= 8;
        e.atkCd = 1.2;
      }
    });
    if (cart.hp <= 0) {
      H.toast('镖车被劫，任务失败');
      G.escort = null;
      H.travel('capital', 32, 20);
      return;
    }
    if (cart.x > 52 * TILE) {
      G.player.flags.escort_done = true;
      G.player.silver += 80;
      H.addExp(G.player, 140);
      H.toast('军资送达');
      G.escort = null;
      H.questCheck();
      H.travel('capital', 32, 20);
    }
  }

  H.updateFx = function (dt) {
    G.floats = G.floats.filter(function (f) { f.t -= dt; f.y -= 22 * dt; return f.t > 0; });
    G.particles = G.particles.filter(function (p) {
      p.t -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 80 * dt; return p.t > 0;
    });
    if (G.clickFx) G.clickFx.t -= dt;
    if (G.toastT > 0) {
      G.toastT -= dt;
      if (G.toastT <= 0) document.getElementById('toast').style.display = 'none';
    }
  }

})(window.Hongwu);
