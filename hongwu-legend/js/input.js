/**
 * 大明传说 — 键鼠输入
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.screenToWorld = function (clientX, clientY) {
    var r = canvas.getBoundingClientRect();
    var sx = clientX - r.left, sy = clientY - r.top;
    if (window.MapTiles && MapTiles.active()) return MapTiles.screenToWorld(sx, sy);
    return { x: sx + G.cam.x, y: sy + G.cam.y };
  }

  H.onPointer = function (ev) {
    if (G.mode !== 'play') return;
    var tiled = window.MapTiles && MapTiles.active();
    var wpos = (!tiled && window.World3D && World3D.enabled)
      ? World3D.pick(ev.clientX, ev.clientY)
      : H.screenToWorld(ev.clientX, ev.clientY);
    if (!wpos) return;
    G.mouse.wx = wpos.x;
    G.mouse.wy = wpos.y;
    var p = G.player;
    if (tiled) {
      var cr = canvas.getBoundingClientRect();
      var cx = ev.clientX - cr.left, cy = ev.clientY - cr.top;
      for (var n = 0; n < G.npcs.length; n++) {
        var ns = MapTiles.worldToScreen(G.npcs[n].x, G.npcs[n].y);
        var z = (window.MapTiles && MapTiles.spriteZoom) ? MapTiles.spriteZoom() : 1;
        if (Math.hypot(cx - ns.x, cy - (ns.y - 66 * z)) < 40 + 36 * z) { H.talkNpc(G.npcs[n]); return; }
      }
    }
    for (var i = 0; i < G.npcs.length; i++) {
      if (H.dist(wpos, G.npcs[i]) < 28) { H.talkNpc(G.npcs[i]); return; }
    }
    var peer = H.findPeerAt(wpos, 32);
    if (peer) {
      p.target = H.asPeerTarget(peer);
      H.closeDialog();
      H.talkPeer(peer);
      return;
    }
    var nearest = null, nd = 40;
    G.entities.forEach(function (e) {
      var d = H.dist(wpos, e);
      if (d < nd) { nd = d; nearest = e; }
    });
    if (nearest) {
      p.target = nearest;
      H.closeDialog();
      return;
    }
    H.setDest(wpos.x, wpos.y);
    p.target = null;
    G.guide = null;
    H.closeDialog();
  }

  H.bindPlayEvents = function () {
    function bindCanvas(el) {
      if (!el) return;
      el.addEventListener('mousedown', H.onPointer);
      el.addEventListener('mousemove', function (ev) {
        var wpos = (!(window.MapTiles && MapTiles.active()) && window.World3D && World3D.enabled)
          ? World3D.pick(ev.clientX, ev.clientY)
          : H.screenToWorld(ev.clientX, ev.clientY);
        if (!wpos) return;
        G.mouse.wx = wpos.x;
        G.mouse.wy = wpos.y;
      });
    }
    bindCanvas(canvas);
    bindCanvas(canvas3d);
    window.addEventListener('keydown', function (ev) {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) {
        if (ev.code === 'Escape') { ev.target.blur(); H.closeMapOverlay(); }
        return;
      }
      if (H.mapOverlayOpen()) {
        if (ev.code === 'Escape' || ev.code === 'KeyM') {
          ev.preventDefault();
          H.closeMapOverlay();
        }
        return;
      }
      G.keys[ev.code] = true;
      if (G.mode !== 'play') return;
      if (ev.code === 'Escape') {
        var anyOpen = document.querySelector('.panel.open') || document.querySelector('#dialog.open');
        H.closePanels();
        H.closeDialog();
        if (!anyOpen) H.openPanel('help');
        return;
      }
      if (ev.code === 'KeyM') { ev.preventDefault(); H.openMapOverlay('current'); return; }
      if (ev.code === 'KeyC') H.openPanel('char');
      if (ev.code === 'KeyB') H.openPanel('bag');
      if (ev.code === 'KeyV') H.openPanel('skills');
      if (ev.code === 'KeyP') H.openPanel('pet');
      if (ev.code === 'KeyE') H.openPanel('forge');
      if (ev.code === 'KeyQ' || ev.code === 'KeyJ') H.openPanel('quest');
      if (ev.code === 'KeyS') { ev.preventDefault(); H.openShop(G.shopKind || 'mall'); }
      if (ev.code === 'KeyD') { ev.preventDefault(); H.toggleSit(); }
      if (ev.code === 'KeyA') { ev.preventDefault(); H.playerAttack(); }
      if (ev.code === 'KeyN' || ev.code === 'Slash') H.openPanel('help');
      if (ev.code === 'KeyF') H.showNearby();
      if (ev.code === 'KeyR') H.openPanel('social');
      if (ev.code === 'KeyL') { ev.preventDefault(); H.openPanel('mail'); }
      if (ev.code === 'KeyY') { ev.preventDefault(); H.openPanel('achieve'); }
      if (ev.code === 'KeyO') { ev.preventDefault(); H.openPanel('rank'); }
      if (ev.code === 'KeyU') { ev.preventDefault(); H.openPanel('daily'); }
      if (ev.code === 'KeyI') { ev.preventDefault(); H.openPanel('vip'); }
      if (ev.code === 'KeyK') {
        ev.preventDefault();
        if (G.stalling) {
          G.stalling = false;
          if (G.player) G.player.sit = false;
          if (window.GameAPI && GameAPI.online) GameAPI.social('stall_close', { server: H.currentServer() });
          H.toast('收摊');
        } else H.openStall();
      }
      if (ev.code === 'KeyG') {
        if (G.player.target && G.player.target.isPeer) {
          G.followUser = G.player.target.user;
          H.toast('跟随 ' + G.player.target.name);
        } else {
          G.followUser = '';
          H.toast('取消跟随');
        }
      }
      if (ev.code === 'KeyH') {
        G.hidePeers = !G.hidePeers;
        H.toast(G.hidePeers ? '隐藏其他玩家' : '显示其他玩家');
      }
      if (ev.code === 'Backquote') { ev.preventDefault(); H.selectNearestMob(); }
      if (ev.code === 'KeyZ') {
        G.player.sit = false;
        G.player.auto = !G.player.auto;
        H.toast(G.player.auto ? '自动打怪已开启' : '自动打怪已关闭');
      }
      if (ev.code === 'Digit7') H.usePotion('hp');
      if (ev.code === 'Digit8') H.usePotion('mp');
      if (ev.code === 'Space') { ev.preventDefault(); H.pickupNear(); }
      var map = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4, Digit6: 5 };
      if (map[ev.code] != null) H.castSkill(D.SKILLS[G.player.cls][map[ev.code]]);
    });
    window.addEventListener('keyup', function (ev) {
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA')) return;
      G.keys[ev.code] = false;
    });

    var sys = document.querySelector('.sys-btns') || document.querySelector('.menu-left');
    if (sys) {
      /* 菜单点击由 #play-screen 统一处理，避免 openPanel 连点两次把面板关掉 */
    }
    var chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var input = document.getElementById('chat-input');
        var text = (input.value || '').trim();
        if (!text) return;
        input.value = '';
        if (window.GameAPI && GameAPI.online) {
          var chan = G.chatChan || 'near';
          var to = G.chatTo || '';
          if (text.charAt(0) === '/' && text.indexOf(' ') > 0) {
            var sp = text.indexOf(' ');
            to = text.slice(1, sp);
            chan = 'whisper';
            text = text.slice(sp + 1);
          }
          GameAPI.social('say', { server: H.currentServer(), text: text, chan: chan, to: to }).catch(function () {
            GameAPI.chatSend(text).catch(function () {});
          });
        } else {
          var cn = H.CHAN_LABEL[G.chatChan || 'near'] || '附近';
          var who = (G.player && G.player.name) || '我';
          H.log('[' + cn + '][' + who + ']：' + text, { raw: true });
        }
      });
    }
    var faceBtn = document.getElementById('btn-chat-face');
    if (faceBtn) {
      faceBtn.addEventListener('click', function (ev) {
        ev.preventDefault();
        var el = document.getElementById('chat-faces');
        if (!el) return;
        el.hidden = !el.hidden;
      });
    }
    document.getElementById('skill-bar').addEventListener('click', function (ev) {
      var slot = ev.target.closest('.skill-slot');
      if (slot) {
        var sk = D.SKILLS[G.player.cls].find(function (s) { return s.id === slot.dataset.skill; });
        H.castSkill(sk);
        return;
      }
      if (ev.target.closest('#slot-hp')) H.usePotion('hp');
      if (ev.target.closest('#slot-mp')) H.usePotion('mp');
      if (ev.target.closest('#slot-pick')) H.pickupNear();
      if (ev.target.closest('#slot-auto')) {
        G.player.sit = false;
        G.player.auto = !G.player.auto;
        H.toast(G.player.auto ? '自动打怪已开启' : '自动打怪已关闭');
      }
    });
    document.getElementById('play-screen').addEventListener('click', function (ev) {
      if (ev.target.dataset.close) H.closePanels();
      var panelEl = ev.target.closest('[data-panel]');
      if (panelEl && panelEl.dataset.panel) H.openPanel(panelEl.dataset.panel);
      var charOpen = ev.target.closest('[data-char-open]');
      if (charOpen && charOpen.dataset.charOpen === 'mount') {
        H.openPanel('char');
        setTimeout(function () {
          var tab = document.querySelector('[data-char-tab="mount"]');
          if (tab) tab.click();
        }, 0);
      }
      var actEl = ev.target.closest('[data-act]');
      if (actEl && actEl.dataset.act === 'tower' && H.enterTower) H.enterTower();
      if (actEl && actEl.dataset.act === 'pagoda' && H.enterPagoda) H.enterPagoda();
      var qtabEl = ev.target.closest('[data-qtab]');
      if (qtabEl && qtabEl.dataset.qtab) {
        var box = document.querySelector('.quest-box');
        if (box) box.setAttribute('data-qtab', qtabEl.dataset.qtab);
        document.querySelectorAll('.quest-tabs span').forEach(function (s) {
          s.classList.toggle('on', s.dataset.qtab === qtabEl.dataset.qtab);
        });
      }
      var dockBtn = ev.target.closest('button');
      if (dockBtn && G.player) {
        if (dockBtn.id === 'btn-auto' || dockBtn.id === 'btn-auto-2' || dockBtn.id === 'btn-auto-mini') {
          G.player.sit = false;
          G.player.auto = !G.player.auto;
          H.toast(G.player.auto ? '自动打怪已开启' : '自动打怪已关闭');
        } else if (dockBtn.id === 'btn-sit') H.toggleSit();
        else if (dockBtn.id === 'btn-mount' || dockBtn.id === 'btn-mount-2') {
          if (G.player.mount && G.player.mount.owned) {
            G.player.mount.riding = !G.player.mount.riding;
            H.toast(G.player.mount.riding ? '上马' : '下马');
          } else {
            H.openPanel('char');
            H.toast('请先获得坐骑');
          }
        } else if (dockBtn.id === 'btn-world-quick') H.openMapOverlay('world');
        else if (dockBtn.id === 'btn-tame') H.openPanel('pet');
        else if (dockBtn.id === 'btn-pick') H.pickupNear();
        else if (dockBtn.id === 'btn-party') H.openPanel('social');
        else if (dockBtn.id === 'btn-arena') {
          H.toast('找京城沐英进入竞技场');
          if (H.followNpcOnMap) {
            G.guide = { tgt: { kind: 'npc', map: 'capital', npcId: 'muying' } };
            if (H.guideStep) H.guideStep();
          }
        } else if (dockBtn.id === 'btn-smith') H.openShop('smith');
        else if (dockBtn.id === 'btn-gm') H.toast('单机无 GM');
        else if (dockBtn.id === 'btn-officer') H.toast('官职请找京城官员');
        else if (dockBtn.id === 'btn-bbs') H.toast('论坛请到明朝互动官网');
        else if (dockBtn.id === 'btn-fold-acts') {
          var side = document.querySelector('.side-right');
          if (side) {
            side.classList.toggle('acts-off');
            dockBtn.textContent = side.classList.contains('acts-off') ? '‹' : '›';
          }
        }
        else if (dockBtn.id === 'btn-save') H.saveNow();
      }
      if (ev.target.dataset.add && G.player.unspentAttr > 0) {
        G.player.added[ev.target.dataset.add] += 1;
        G.player.unspentAttr -= 1;
        H.paintPanel('char');
      }
      if (ev.target.dataset.sk && G.player.unspentSkill > 0) {
        G.player.skills[ev.target.dataset.sk] = (G.player.skills[ev.target.dataset.sk] || 0) + 1;
        G.player.unspentSkill -= 1;
        H.paintPanel('skills');
      }
      if (ev.target.dataset.bag != null) {
        var bi = +ev.target.dataset.bag;
        if (G.netTrade) {
          var it = G.player.bag[bi];
          if (it) {
            if (it.bind) { H.toast('绑定物品不能交易'); return; }
            G.player.bag.splice(bi, 1);
            G.tradeOffer.items.push(it);
            GameAPI.social('trade_put', {
              server: H.currentServer(),
              offer: { items: G.tradeOffer.items, silver: G.tradeOffer.silver }
            }).then(function () { H.paintTrade(); H.paintPanel('bag'); }).catch(function () {});
          }
          return;
        }
        H.useBagItem(bi, false);
      }
      if (ev.target.dataset.en) H.enhanceSlot(ev.target.dataset.en);
      if (ev.target.dataset.so) H.socketSlot(ev.target.dataset.so);
      if (ev.target.dataset.gem) H.inlayGem(ev.target.dataset.gem);
      if (ev.target.dataset.craft != null) H.craftRecipe(+ev.target.dataset.craft);
      if (ev.target.dataset.buy) {
        var price = +ev.target.dataset.price;
        if (!H.paySilver(price, 'preferBind', '银两不足')) return;
        H.addItem(G.player, { id: ev.target.dataset.buy, n: 1, bind: true });
        H.toast('购得绑定物品');
        if (document.getElementById('panel-char') && document.getElementById('panel-char').classList.contains('open')) {
          H.paintPanel('char');
        } else {
          H.openShop(G.shopKind || 'smith');
        }
      }
      if (ev.target.closest && ev.target.closest('[data-quest-go]')) {
        var qid = ev.target.closest('[data-quest-go]').dataset.questGo;
        var qq = D.QUESTS.find(function (x) { return x.id === qid; }) || H.currentQuest();
        H.closePanels();
        H.followQuest(qq);
      }
      if (ev.target.closest && ev.target.closest('[data-merit-go]')) {
        H.closePanels();
        H.followMerit();
      }
      if (ev.target.dataset.charTab) {
        document.querySelectorAll('[data-char-tab]').forEach(function (b) {
          b.classList.toggle('on', b.dataset.charTab === ev.target.dataset.charTab);
        });
        var attr = document.getElementById('char-attr');
        var mt = document.getElementById('char-mount');
        var fs = document.getElementById('char-fashion');
        var of = document.getElementById('char-office');
        if (attr) attr.hidden = ev.target.dataset.charTab !== 'attr';
        if (mt) mt.hidden = ev.target.dataset.charTab !== 'mount';
        if (fs) fs.hidden = ev.target.dataset.charTab !== 'fashion';
        if (of) of.hidden = ev.target.dataset.charTab !== 'office';
      }
      if (ev.target.dataset.mountRide) {
        if (G.player.mount && G.player.mount.owned) {
          G.player.mount.riding = !G.player.mount.riding;
          H.toast(G.player.mount.riding ? '上马' : '下马');
          H.paintPanel('char');
        }
      }
      if (ev.target.dataset.mountUp) H.upgradeMount();
      if (ev.target.dataset.mountEn) H.enhanceMountSlot(ev.target.dataset.mountEn);
      if (ev.target.dataset.bagExpand) H.expandBag();
      if (ev.target.dataset.petWash) H.washPet();
      if (ev.target.dataset.petInsight) H.insightPet();
      if (ev.target.dataset.petTrain) H.trainPet();
      if (ev.target.dataset.petBook) H.teachPetSkill();
      if (ev.target.dataset.recolor) H.recolorSlot(ev.target.dataset.recolor);
      if (ev.target.dataset.fashion) H.setFashion(ev.target.dataset.fashion);
      if (ev.target.dataset.mail != null) H.readMail(+ev.target.dataset.mail);
      if (ev.target.dataset.mailDel != null) {
        G.player.mail.splice(+ev.target.dataset.mailDel, 1);
        H.paintMail();
      }
      if (ev.target.dataset.panelPaint) H.paintPanel(ev.target.dataset.panelPaint);
      if (ev.target.dataset.rankTab) H.paintRank(ev.target.dataset.rankTab);
      if (ev.target.dataset.chueTake) H.takeDailyChue();
      if (ev.target.dataset.wbClaim && H.claimWorldBoss) H.claimWorldBoss(ev.target.dataset.wbClaim);
      if (ev.target.dataset.wbGo) {
        H.closePanels();
        H.ensureBossState();
        var wm = G.bossState && G.bossState.world && G.bossState.world.map;
        if (wm && H.worldJump) H.worldJump(wm);
      }
      if (ev.target.dataset.buyGold) H.buyGoldItem(ev.target.dataset.buyGold);
      if (ev.target.dataset.recharge) H.rechargePack(ev.target.dataset.recharge);
      if (ev.target.dataset.vipGift) H.claimVipGift();
      if (ev.target.dataset.ybBuy) H.bankYuanbao('buy', +ev.target.dataset.ybBuy);
      if (ev.target.dataset.ybSell) H.bankYuanbao('sell', +ev.target.dataset.ybSell);
      if (ev.target.dataset.shopPay) {
        G.shopPay = ev.target.dataset.shopPay;
        H.openShop('mall');
      }
      if (ev.target.dataset.face) {
        var inp = document.getElementById('chat-input');
        if (inp) {
          inp.value += '[' + ':' + ev.target.dataset.face + ':]';
          inp.focus();
        }
        var faces = document.getElementById('chat-faces');
        if (faces) faces.hidden = true;
      }
      if (ev.target.dataset.lookStall) H.lookStall(ev.target.dataset.lookStall);
      if (ev.target.dataset.tradeLock) H.doSocial('trade_lock', '');
      if (ev.target.dataset.tradeOk) H.doSocial('trade_ok', '');
      if (ev.target.dataset.tradeCancel) H.doSocial('trade_cancel', '');
      if (ev.target.dataset.invAccept) {
        var inv = (G.pendingInvites || [])[+ev.target.dataset.invAccept];
        if (inv) {
          var op = inv.kind === 'party' ? 'party_accept' : inv.kind === 'clan' ? 'clan_accept' : inv.kind === 'trade' ? 'trade_accept' : 'friend_add';
          H.doSocial(op, inv.from);
          G.pendingInvites.splice(+ev.target.dataset.invAccept, 1);
        }
      }
      if (ev.target.dataset.clanCreate) {
        var nm = window.prompt('宗族名称', '洪武');
        if (nm) H.doSocial('clan_create', '', { name: nm });
      }
      if (ev.target.dataset.partyLeave) H.doSocial('party_leave', '');
      if (ev.target.dataset.clanLeave) H.doSocial('clan_leave', '');
      if (ev.target.dataset.chan) {
        G.chatChan = ev.target.dataset.chan;
        document.querySelectorAll('.chat-tabs span').forEach(function (s) {
          s.classList.toggle('on', s.dataset.chan === G.chatChan);
        });
        if (H.syncChatChan) H.syncChatChan();
      }
      var whIn = ev.target.closest && ev.target.closest('[data-wh-in]');
      if (whIn) H.stashIn(+whIn.dataset.whIn);
      var whOut = ev.target.closest && ev.target.closest('[data-wh-out]');
      if (whOut) H.stashOut(+whOut.dataset.whOut);
      if (ev.target.dataset.whUnlock != null) H.unlockWarehouse(+ev.target.dataset.whUnlock);
      if (ev.target.dataset.whTab != null && ev.target.dataset.whUnlock == null) {
        G.whTab = +ev.target.dataset.whTab;
        H.paintWarehouse();
      }
      if (ev.target.id === 'btn-feed') {
        if (H.takeItem(G.player, 'feed', 1) && G.player.pet) {
          G.player.pet.hp = Math.min(G.player.pet.maxHp, G.player.pet.hp + 60);
          H.toast('灵宠进食');
          H.paintPanel('pet');
        } else H.toast('没有口粮');
      }
    });
    document.getElementById('play-screen').addEventListener('contextmenu', function (ev) {
      var cell = ev.target.closest('[data-bag]');
      if (cell) {
        ev.preventDefault();
        H.useBagItem(+cell.dataset.bag, true);
      }
    });
    document.getElementById('dialog').addEventListener('click', function (ev) {
      if (ev.target.dataset.bye) H.closeDialog();
      if (ev.target.dataset.soc) {
        H.doSocial(ev.target.dataset.soc, ev.target.dataset.who);
        H.closeDialog();
      }
      if (ev.target.dataset.whisper) {
        G.chatChan = 'whisper';
        G.chatTo = ev.target.dataset.whisper;
        document.querySelectorAll('.chat-tabs span').forEach(function (s) {
          s.classList.toggle('on', s.dataset.chan === 'whisper');
        });
        if (H.syncChatChan) H.syncChatChan();
        H.toast('密聊 ' + G.chatTo + '，输入内容回车。或 /账号 内容');
        H.closeDialog();
        var inp = document.getElementById('chat-input');
        if (inp) inp.focus();
      }
      if (ev.target.dataset.follow) {
        G.followUser = ev.target.dataset.follow;
        H.toast('跟随中');
        H.closeDialog();
      }
      if (ev.target.dataset.lookStall) H.lookStall(ev.target.dataset.lookStall);
      if (ev.target.dataset.stallBuy) {
        H.doSocial('stall_buy', ev.target.dataset.stallBuy, { idx: +ev.target.dataset.idx });
        H.closeDialog();
      }
      if (ev.target.dataset.openshop) { H.closeDialog(); H.openShop(ev.target.dataset.openshop); }
      if (ev.target.dataset.openforge) { H.closeDialog(); H.openPanel('forge'); }
      if (ev.target.dataset.openwh) { H.closeDialog(); H.openPanel('warehouse'); }
      if (ev.target.dataset.openskills) { H.closeDialog(); H.openPanel('skills'); }
      if (ev.target.dataset.npcTravel) H.npcTravel(ev.target.dataset.npcTravel);
      if (ev.target.dataset.bank) { H.bankExchange(ev.target.dataset.bank); H.closeDialog(); }
      if (ev.target.dataset.ybBuy) H.bankYuanbao('buy', +ev.target.dataset.ybBuy);
      if (ev.target.dataset.ybSell) H.bankYuanbao('sell', +ev.target.dataset.ybSell);
      if (ev.target.dataset.merit === 'take') H.takeMerit();
      if (ev.target.dataset.merit === 'turn') H.turnMerit();
      if (ev.target.dataset.merit === 'hint') {
        var m = G.player.merit;
        var nm = D.MONSTERS[m.kill];
        H.toast('还差 ' + Math.max(0, m.need - (m.got || 0)) + ' 只' + (nm ? nm.name : ''));
      }
      if (ev.target.dataset.escort) H.startEscort();
      if (ev.target.dataset.openTower) { H.closeDialog(); H.openTowerSelect(); }
      if (ev.target.dataset.towerAuto) { H.closeDialog(); H.enterTower(G.player.towerUnlock || 1, true); }
      if (ev.target.dataset.towerFloor) H.enterTower(+ev.target.dataset.towerFloor, false);
      if (ev.target.dataset.poyangDiff) H.enterPoyang(ev.target.dataset.poyangDiff);
      if (ev.target.dataset.leaveInstance) { H.closeDialog(); H.leaveInstance(); }
      if (ev.target.dataset.buypet) {
        if (!H.paySilver(80, 'preferBind', '银两不足')) return;
        H.grantPet();
        H.closeDialog();
      }
      if (ev.target.dataset.enterFish) H.enterFish();
      if (ev.target.dataset.enterTreasure) H.enterTreasure();
      if (ev.target.dataset.enterArena) H.enterArena();
      if (ev.target.dataset.enterMentor) H.enterMentor();
      if (ev.target.dataset.enterJingxin) H.enterJingxin();
      if (ev.target.dataset.enterPalace) H.enterPalace();
      if (ev.target.dataset.enterPagoda) H.enterPagoda();
      if (ev.target.dataset.mentor) H.claimMentor(ev.target.dataset.mentor);
      if (ev.target.dataset.openMarket) { H.closeDialog(); H.paintMarket(); }
      if (ev.target.dataset.openOffice) { H.closeDialog(); H.openPanel('char'); }
      if (ev.target.dataset.openFlowerRank) { H.closeDialog(); H.openPanel('rank'); if (H.paintRank) H.paintRank('flower'); }
      if (ev.target.dataset.chueTake) H.takeDailyChue();
      if (ev.target.dataset.flower) { H.sendFlower(ev.target.dataset.flower); H.closeDialog(); }
    });
    var shopBtn = document.getElementById('btn-shop');
    if (shopBtn) {
      shopBtn.addEventListener('click', function () { H.openShop('mall'); });
    }
    if (mini) {
      mini.addEventListener('mousedown', function (ev) {
        if (G.mode !== 'play' || !G.grid || !G.player) return;
        var r = mini.getBoundingClientRect();
        var gx = ((ev.clientX - r.left) / r.width) * G.grid[0].length;
        var gy = ((ev.clientY - r.top) / r.height) * G.grid.length;
        G.guide = null;
        G.player.target = null;
        H.setDest((gx + 0.5) * TILE, (gy + 0.5) * TILE);
      });
    }
    var btnWorld = document.getElementById('btn-world-map');
    if (btnWorld) btnWorld.addEventListener('click', function () { H.openMapOverlay('current'); });
    var pkBtn = document.getElementById('pk-mode');
    if (pkBtn) pkBtn.addEventListener('click', H.cyclePkMode);
    var overlay = document.getElementById('map-overlay');
    if (overlay) {
      overlay.addEventListener('click', function (ev) {
        if (ev.target === overlay || (ev.target.closest && ev.target.closest('[data-close-map]'))) {
          H.closeMapOverlay();
          return;
        }
        var tab = ev.target.closest && ev.target.closest('[data-map-tab]');
        if (tab) H.showMapTab(tab.dataset.mapTab);
        var side = ev.target.closest && ev.target.closest('[data-side-tab]');
        if (side) {
          G.mapSideTab = side.dataset.sideTab;
          H.applyMapSideTab();
          return;
        }
        var npcBtn = ev.target.closest && ev.target.closest('[data-map-npc]');
        if (npcBtn) H.followNpcOnMap(npcBtn.dataset.mapNpc);
        var ptBtn = ev.target.closest && ev.target.closest('[data-map-portal]');
        if (ptBtn && G.portals[+ptBtn.dataset.mapPortal]) {
          var pt = G.portals[+ptBtn.dataset.mapPortal];
          G.guide = null;
          H.usePortal(pt);
          return;
        }
        var nation = ev.target.closest && ev.target.closest('[data-nation-go]');
        if (nation) H.worldJump(nation.dataset.nationGo);
        var pin = ev.target.closest && ev.target.closest('[data-world-go]');
        if (pin) H.worldRegionGo(pin.dataset.worldGo);
        if (ev.target.id === 'btn-map-tele' || (ev.target.closest && ev.target.closest('#btn-map-tele'))) {
          H.mapTeleport();
        }
      });
    }
    var regionCanvas = document.getElementById('region-canvas');
    if (regionCanvas) {
      regionCanvas.addEventListener('mousedown', H.clickRegionCanvas);
      regionCanvas.addEventListener('mousemove', H.hoverRegionCanvas);
    }
    var coordForm = document.getElementById('map-coord-form');
    if (coordForm) {
      coordForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var x = parseInt(document.getElementById('map-cx').value, 10);
        var y = parseInt(document.getElementById('map-cy').value, 10);
        if (isNaN(x) || isNaN(y)) {
          H.toast('请输入坐标 X、Y');
          return;
        }
        H.pathToCoord(x, y);
      });
    }
    document.getElementById('btn-revive').addEventListener('click', H.revive);
    var hereBtn = document.getElementById('btn-revive-here');
    if (hereBtn) hereBtn.addEventListener('click', H.reviveHere);
    var leaveBtn = document.getElementById('btn-leave-instance');
    if (leaveBtn) leaveBtn.addEventListener('click', H.leaveInstance);
    var floorEl = document.getElementById('floor-clear');
    if (floorEl) {
      floorEl.addEventListener('click', function (ev) {
        var act = ev.target.dataset.floor;
        if (act === 'continue') H.continueTower();
        if (act === 'rest' || act === 'leave') H.leaveInstance();
      });
    }
  }

})(window.Hongwu);
