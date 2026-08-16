/**
 * 洪武风云录 — 任务、自动寻路、建功立业
 * 挂到 window.Hongwu，运行时互相调用，方便以后按文件扩展。
 */
(function (H) {

  var G = H.G, D = H.D, F = H.F, TILE = H.TILE;
  var canvas = H.canvas, ctx = H.ctx, mini = H.mini, mctx = H.mctx, canvas3d = H.canvas3d;
  var BAG_CAP = H.BAG_CAP, SPAWN = H.SPAWN, SAVE_KEY = H.SAVE_KEY;

  H.currentQuest = function () {
    var p = G.player;
    for (var i = 0; i < D.QUESTS.length; i++) {
      if (p.quests.active.indexOf(D.QUESTS[i].id) >= 0) return D.QUESTS[i];
    }
    return null;
  }

  H.noteKill = function (kind) {
    var q = H.currentQuest();
    if (q && q.kill && q.kill.id === kind) {
      H.pprog(q.id, 1);
      H.questCheck();
    }
    var p = G.player;
    if (p.merit && p.merit.active && p.merit.kill === kind) {
      p.merit.got = (p.merit.got || 0) + 1;
      H.refreshQuestUI();
    }
  }

  H.noteGather = function (id) {
    var q = H.currentQuest();
    if (!q || !q.gather || q.gather.id !== id) return;
    H.questCheck();
  }

  H.pprog = function (id, n) {
    G.player.quests.progress[id] = (G.player.quests.progress[id] || 0) + n;
  }

  H.maybeCompleteTalk = function (npcId) {
    var q = H.currentQuest();
    if (q && q.talk === npcId) H.completeQuest(q);
  }

  H.questCheck = function () {
    var p = G.player;
    var q = H.currentQuest();
    if (!q) return;
    if (q.kill && (p.quests.progress[q.id] || 0) >= q.kill.n) H.completeQuest(q);
    else if (q.gather && H.countItem(p, q.gather.id) >= q.gather.n) H.completeQuest(q);
    else if (q.flag && p.flags[q.flag]) H.completeQuest(q);
  }

  H.completeQuest = function (q) {
    var p = G.player;
    if (p.quests.done.indexOf(q.id) >= 0) return;
    p.quests.active = p.quests.active.filter(function (id) { return id !== q.id; });
    p.quests.done.push(q.id);
    H.addExp(p, q.reward.exp || 0);
    p.silver += q.reward.silver || 0;
    p.gold += q.reward.gold || 0;
    (q.reward.items || []).forEach(function (it) { H.addItem(p, { id: it.id, n: it.n }); });
    H.toast('完成：' + q.name);
    H.log('任务完成：' + q.name);
    if (H.noteAchieve) H.noteAchieve('quest');
    if (G.guide && G.guide.qid === q.id) G.guide = null;
    var idx = D.QUESTS.findIndex(function (x) { return x.id === q.id; });
    if (idx >= 0 && D.QUESTS[idx + 1]) p.quests.active.push(D.QUESTS[idx + 1].id);
    H.refreshQuestUI();
    H.beep(660, 0.1);
  }

  H.nextAcceptQuest = function () {
    var p = G.player;
    if (!p) return null;
    for (var i = 0; i < D.QUESTS.length; i++) {
      var q = D.QUESTS[i];
      if (p.quests.done.indexOf(q.id) >= 0) continue;
      if (p.quests.active.indexOf(q.id) >= 0) continue;
      return q;
    }
    return null;
  }

  H.questProgressText = function (q) {
    if (q.kill) return '（' + (G.player.quests.progress[q.id] || 0) + '/' + q.kill.n + '）';
    if (q.gather) return '（' + H.countItem(G.player, q.gather.id) + '/' + q.gather.n + '）';
    return '';
  }

  H.questLineHtml = function (q) {
    var extra = H.questProgressText(q);
    var icon = '';
    if (q.talk && window.Art && Art.npcIcon) icon = Art.npcIcon(q.talk);
    var bits = [];
    if (q.talk && D.NPCS[q.talk]) {
      bits.push('与 <span class="q-link" data-quest-go="' + q.id + '">' + D.NPCS[q.talk].name + '</span> 交谈');
    }
    if (q.kill && D.MONSTERS[q.kill.id]) {
      bits.push('击杀 <span class="q-link mob" data-quest-go="' + q.id + '">' + D.MONSTERS[q.kill.id].name + '</span>' + extra);
    }
    if (q.gather && D.CONSUMABLES[q.gather.id]) {
      bits.push('采集 <span class="q-link" data-quest-go="' + q.id + '">' + D.CONSUMABLES[q.gather.id].name + '</span>' + extra);
    }
    var mapName = D.MAP_META[q.map] ? D.MAP_META[q.map].name : '';
    if (mapName) {
      bits.push('地点：<span class="q-link" data-quest-go="' + q.id + '">' + mapName + '</span>');
    }
    if (!bits.length) {
      bits.push('<span class="q-link" data-quest-go="' + q.id + '">' + q.text + '</span>');
    }
    return '<div class="q-item">' +
      (icon ? '<img src="' + icon + '" alt="" />' : '') +
      '<div><b>' + q.name + extra + '</b>' + bits.join('<br/>') + '</div></div>';
  }

  H.refreshQuestUI = function () {
    var el = document.getElementById('quest-track');
    if (!el) return;
    var q = H.currentQuest();
    var nxt = H.nextAcceptQuest();
    var html = '';
    html += '<div class="q-sec">当前任务</div>';
    html += q ? H.questLineHtml(q) : '<div class="q-item muted">暂无进行中的任务。</div>';
    html += '<div class="q-sec">可接任务</div>';
    html += nxt ? H.questLineHtml(nxt) : '<div class="q-item muted">暂无可接。可挂机或挑战试炼。</div>';
    if (G.player && G.player.merit && G.player.merit.active) {
      var md = D.MONSTERS[G.player.merit.kill];
      html += '<div class="q-sec">循环任务</div>';
      html += '<div class="q-item"><div><b>建功立业</b>击杀 <span class="q-link mob" data-merit-go="1">' +
        (md ? md.name : '敌军') + '</span>（' + (G.player.merit.got || 0) + '/' + G.player.merit.need + '）</div></div>';
    } else if (G.player && G.player.level >= 10) {
      html += '<div class="q-sec">循环任务</div>';
      html += '<div class="q-item"><div><b>建功立业</b>找京城 <span class="q-link" data-merit-go="1">徐达</span> 领取</div></div>';
    }
    el.innerHTML = html;
  }

  H.questTarget = function (q) {
    if (q.talk && D.NPCS[q.talk]) return { kind: 'npc', map: D.NPCS[q.talk].map, npcId: q.talk };
    if (q.kill) return { kind: 'kill', map: q.map, monster: q.kill.id };
    if (q.gather) return { kind: 'herb', map: q.map, herb: q.gather.id };
    if (q.flag === 'got_pet') return { kind: 'npc', map: 'shennong', npcId: 'xunshou' };
    if (q.flag === 'enhanced') return { kind: 'npc', map: 'capital', npcId: 'bagong' };
    if (q.flag === 'poyang_clear') {
      if (G.mapId === 'poyang') return { kind: 'kill', map: 'poyang', monster: 'lake_boss' };
      return { kind: 'npc', map: 'capital', npcId: 'shuibing' };
    }
    if (q.flag === 'escort_done') return { kind: 'npc', map: 'capital', npcId: 'yabiao' };
    if (q.flag === 'tower5') {
      if (G.mapId === 'tower') return { kind: 'kill', map: 'tower', monster: 'tower' };
      return { kind: 'npc', map: 'capital', npcId: 'shilian' };
    }
    return { kind: 'map', map: q.map };
  }

  H.findNpc = function (id) {
    for (var i = 0; i < G.npcs.length; i++) if (G.npcs[i].id === id) return G.npcs[i];
    return null;
  }

  H.currentQuestNpcId = function () {
    var q = H.currentQuest();
    if (!q) return null;
    var t = H.questTarget(q);
    return t && t.npcId ? t.npcId : null;
  }

  H.npcQuestMark = function (n) {
    if (H.currentQuestNpcId() === n.id) return '?';
    var nxt = H.nextAcceptQuest();
    if (nxt) {
      var t = H.questTarget(nxt);
      if (t && t.npcId === n.id && t.map === G.mapId) return '!';
    }
    if (n.id === 'xuda' && G.player) {
      if (H.meritReady()) return '?';
      if (G.player.level >= 10 && !(G.player.merit && G.player.merit.active)) return '!';
    }
    return '';
  }

  H.stampNpcMarks = function () {
    G.npcs.forEach(function (n) { n.questMark = H.npcQuestMark(n); });
  }

  H.guidedQuest = function () {
    if (!G.guide) return null;
    if (G.guide.qid) {
      for (var i = 0; i < D.QUESTS.length; i++) {
        if (D.QUESTS[i].id === G.guide.qid) return D.QUESTS[i];
      }
      return null;
    }
    return H.currentQuest();
  }

  H.followQuest = function (q) {
    if (H.inInstance()) { H.toast('在副本地图中不能自动寻路'); return; }
    if (!q) q = H.currentQuest();
    if (!q) { H.toast('当前没有任务'); return; }
    G.guide = { qid: q.id };
    H.toast('自动寻路：' + q.name);
    H.log('自动寻路 → ' + q.name);
    H.guideStep();
  }

  H.followMerit = function () {
    if (H.inInstance()) { H.toast('在副本地图中不能自动寻路'); return; }
    var p = G.player;
    if (p.merit && p.merit.active && p.merit.kill) {
      G.guide = { tgt: { kind: 'kill', map: H.meritKillMap(p.merit.kill), monster: p.merit.kill } };
    } else {
      G.guide = { tgt: { kind: 'npc', map: 'capital', npcId: 'xuda' } };
    }
    H.toast('自动寻路：建功立业');
    H.guideStep();
  }

  H.followNpcOnMap = function (npcId) {
    if (H.inInstance()) { H.toast('在副本地图中不能自动寻路'); return; }
    var def = D.NPCS[npcId];
    G.guide = { tgt: { kind: 'npc', map: (def && def.map) || G.mapId, npcId: npcId } };
    H.toast('自动寻路：' + (def ? def.name : '人物'));
    H.guideStep();
  }

  H.meritKillMap = function (kind) {
    if (kind === 'spirit' || kind === 'snake') return 'shennong';
    return 'wild';
  }

  H.guideStep = function () {
    if (!G.guide || !G.player) return;
    var tgt = G.guide.tgt;
    if (!tgt) {
      var q = H.guidedQuest();
      if (!q) { G.guide = null; return; }
      tgt = H.questTarget(q);
    }
    var destMap = tgt.map;
    if (!destMap) { G.guide = null; return; }
    if (G.mapId !== destMap) {
      var route = window.PathFind && PathFind.mapRoute ? PathFind.mapRoute(D.PORTALS, G.mapId, destMap) : null;
      if (!route || !route.length) {
        H.toast('无法到达' + (D.MAP_META[destMap] ? D.MAP_META[destMap].name : ''));
        G.guide = null;
        return;
      }
      var pt = route[0].portal;
      G.guide.wantTalk = null;
      G.guide.wantKill = null;
      G.guide.wantHerb = null;
      G.guide.wantPortal = pt.to;
      H.setDest((pt.x + 0.5) * TILE, (pt.y + 0.5) * TILE);
      return;
    }
    G.guide.wantPortal = null;
    if (tgt.kind === 'npc') {
      var npc = H.findNpc(tgt.npcId);
      if (!npc) { H.toast('目标不在本地图'); return; }
      G.guide.wantTalk = tgt.npcId;
      G.guide.wantKill = null;
      G.guide.wantHerb = null;
      if (H.dist(G.player, npc) < 56) {
        G.guide = null;
        H.talkNpc(npc);
        return;
      }
      H.setDest(npc.x, npc.y);
      return;
    }
    if (tgt.kind === 'kill') {
      G.guide.wantKill = tgt.monster;
      G.guide.wantTalk = null;
      G.guide.wantHerb = null;
      var best = null, bd = 1e9;
      G.entities.forEach(function (e) {
        if (e.kind !== tgt.monster) return;
        var d = H.dist(G.player, e);
        if (d < bd) { bd = d; best = e; }
      });
      if (best) {
        G.player.target = best;
        H.setDest(best.x, best.y);
      } else {
        H.setDest((G.grid[0].length * 0.5) * TILE, (G.grid.length * 0.5) * TILE);
      }
      return;
    }
    if (tgt.kind === 'herb') {
      G.guide.wantHerb = 1;
      G.guide.wantTalk = null;
      G.guide.wantKill = null;
      var hb = null, hd = 1e9;
      G.herbs.forEach(function (h) {
        var d = H.dist(G.player, h);
        if (d < hd) { hd = d; hb = h; }
      });
      if (hb) H.setDest(hb.x, hb.y);
      else H.toast('附近没有可采草药');
      return;
    }
    if (G.grid) H.setDest((G.grid[0].length * 0.5) * TILE, (G.grid.length * 0.5) * TILE);
  }

  H.tickGuideArrive = function () {
    if (!G.guide || G.player._moving) return;
    if (G.guide.qid && !H.guidedQuest()) { G.guide = null; return; }
    if (G.guide.wantTalk) {
      var npc = H.findNpc(G.guide.wantTalk);
      if (npc && H.dist(G.player, npc) < 56) {
        G.guide = null;
        H.talkNpc(npc);
      } else if (npc) H.setDest(npc.x, npc.y);
      return;
    }
    if (G.guide.wantKill || G.guide.wantHerb || G.guide.wantPortal) H.guideStep();
  }

  H.meritReady = function () {
    var p = G.player;
    return !!(p && p.merit && p.merit.active && (p.merit.got || 0) >= (p.merit.need || 1));
  }

  H.takeMerit = function () {
    var p = G.player;
    H.ensureDaily(p);
    if (p.level < 10) { H.toast('10 级后再来领建功立业'); return; }
    if (p.merit.active) { H.toast('先把当前差事做完'); return; }
    var band = F.meritBand(p.level);
    if (!band) { H.toast('当前等级没有建功差事'); return; }
    p.merit.active = true;
    p.merit.kill = band.kill.id;
    p.merit.need = band.kill.n;
    p.merit.got = 0;
    H.toast('建功立业：击杀 ' + D.MONSTERS[band.kill.id].name + ' ×' + band.kill.n);
    H.refreshQuestUI();
    H.closeDialog();
  }

  H.turnMerit = function () {
    var p = G.player;
    if (!H.meritReady()) { H.toast('差事尚未完成'); return; }
    var band = F.meritBand(p.level);
    var exp = F.meritReward(band ? band.exp : 280, p.merit.count);
    var sil = F.meritReward(band ? band.silver : 40, p.merit.count);
    H.addExp(p, exp);
    p.silver += sil;
    p.merit.count += 1;
    p.merit.active = false;
    p.merit.kill = null;
    H.toast('建功立业完成，经验 +' + exp + ' 银两 +' + sil + '（今日第' + p.merit.count + '次）');
    H.log('建功立业 ×' + p.merit.count);
    H.refreshQuestUI();
    H.closeDialog();
  }

})(window.Hongwu);
