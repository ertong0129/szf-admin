(function () {
  const STAGE = { w: 1000, h: 600, worldH: 532 };
  const KEY = 'mccq_save_v1';

  const $ = (id) => document.getElementById(id);
  const canvas = $('world');
  const ctx = canvas.getContext('2d');
  const radar = $('radar').getContext('2d');
  const face = $('face').getContext('2d');

  let CATALOG = null;
  let images = {};
  let state = null;
  let mapObj = null;
  let npcs = [];
  let mobs = [];
  let drops = [];
  let target = null;
  let path = null;
  let last = 0;
  let toastTimer = 0;
  let atkCd = 0;

  const SKILLS = {
    warrior: ['斩击', '狂澜', '破甲', '战吼', '旋风', '无双'],
    archer: ['连射', '穿透', '冰矢', '爆裂', '陷阱', '万箭'],
    wanderer: ['扇舞', '气刃', '迷踪', '爆气', '连打', '天翔'],
    healer: ['灵弹', '治疗', '群疗', '净化', '护体', '甘霖']
  };

  function toast(msg) {
    $('toast').textContent = msg;
    toastTimer = 2.2;
  }

  function fitStage() {
    const box = $('letterbox');
    const s = $('stage');
    const k = Math.min(box.clientWidth / STAGE.w, box.clientHeight / STAGE.h);
    s.style.transform = 'scale(' + k + ')';
  }
  window.addEventListener('resize', fitStage);

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  async function preload() {
    const list = {
      taiping: 'assets/map/xin_shou_cun.jpg',
      hengjian: 'assets/map/heng_jian_shan.jpg',
      shennong: 'assets/map/shen_nong_jia.jpg',
      capital: 'assets/map/jing_cheng.jpg',
      kaifeng: 'assets/map/kai_feng.jpg',
      boyang: 'assets/map/po_yang_hu.jpg',
      world: 'assets/map/world.jpg',
      country: 'assets/map/country.jpg'
    };
    for (const [k, src] of Object.entries(list)) images[k] = await loadImage(src);
    for (const m of CATALOG.maps) {
      for (const n of m.npcs) {
        if (n.icon && !images[n.icon]) {
          images[n.icon] = await loadImage('assets/npc/' + n.icon + '.png');
        }
      }
    }
  }

  function defaultRole(cls, name, sex) {
    const hp = cls === 'warrior' ? 180 : cls === 'healer' ? 140 : 150;
    return {
      name: name || '少侠',
      cls: cls,
      sex: sex,
      lv: 1,
      exp: 0,
      next: 80,
      hp: hp,
      hpMax: hp,
      mp: 80,
      mpMax: 80,
      atk: cls === 'archer' ? 16 : 18,
      def: 4,
      gold: 200,
      bindGold: 50,
      points: 5,
      str: 5, intel: 5, agi: 5, spi: 5, vit: 5,
      map: 'taiping',
      x: 50, y: 70,
      quest: '1',
      bag: [
        { id: 'hp1', name: '金创药', n: 10, kind: 'hp' },
        { id: 'mp1', name: '回气散', n: 8, kind: 'mp' }
      ],
      weapon: cls === 'archer' ? '木弓' : cls === 'healer' ? '青木杖' : cls === 'wanderer' ? '纸扇' : '铁刀',
      pet: null,
      idle: false
    };
  }

  function save() {
    localStorage.setItem(KEY, JSON.stringify(state));
  }

  function loadSave() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); }
    catch (e) { return null; }
  }

  function findMap(id) {
    return CATALOG.maps.find((m) => m.id === id) || CATALOG.maps[0];
  }

  function findQuest(id) {
    return CATALOG.quests.find((q) => q.id === String(id));
  }

  function enterMap(id, x, y) {
    mapObj = findMap(id);
    state.map = mapObj.id;
    state.x = x != null ? x : Math.floor(mapObj.w / 2);
    state.y = y != null ? y : Math.floor(mapObj.h / 2);
    npcs = mapObj.npcs.map((n) => Object.assign({}, n));
    mobs = [];
    mapObj.spawns.forEach((s, i) => {
      for (let k = 0; k < 3; k++) {
        mobs.push({
          id: s.kind + '-' + i + '-' + k,
          name: s.name,
          x: s.x + (k - 1) * 3,
          y: s.y + (k === 2 ? 2 : 0),
          hp: 30 + state.lv * 8,
          hpMax: 30 + state.lv * 8,
          atk: 6 + state.lv
        });
      }
    });
    $('mapName').textContent = mapObj.name;
    path = null;
    target = null;
    save();
  }

  function tileToScreen(tx, ty) {
    const padX = 20, padY = 20;
    const bw = STAGE.w - 200, bh = STAGE.worldH - 40;
    return {
      x: padX + (tx / mapObj.w) * bw,
      y: padY + (ty / mapObj.h) * bh
    };
  }

  function screenToTile(sx, sy) {
    const padX = 20, padY = 20;
    const bw = STAGE.w - 200, bh = STAGE.worldH - 40;
    return {
      x: Math.max(1, Math.min(mapObj.w - 1, Math.round(((sx - padX) / bw) * mapObj.w))),
      y: Math.max(1, Math.min(mapObj.h - 1, Math.round(((sy - padY) / bh) * mapObj.h)))
    };
  }

  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function drawFace() {
    face.clearRect(0, 0, 54, 54);
    face.fillStyle = state.sex === 'f' ? '#d9a07a' : '#c48a58';
    face.beginPath();
    face.arc(27, 24, 16, 0, Math.PI * 2);
    face.fill();
    face.fillStyle = '#2a1810';
    face.fillRect(14, 8, 26, 10);
    face.fillStyle = '#3a2014';
    face.fillRect(18, 36, 18, 14);
  }

  function drawWorld() {
    ctx.fillStyle = '#152010';
    ctx.fillRect(0, 0, STAGE.w, STAGE.worldH);
    const img = images[mapObj.id];
    if (img) {
      ctx.drawImage(img, 20, 20, STAGE.w - 200, STAGE.worldH - 40);
    }
    npcs.forEach((n) => {
      const p = tileToScreen(n.x, n.y);
      const ic = images[n.icon];
      if (ic) ctx.drawImage(ic, p.x - 18, p.y - 40, 36, 48);
      else {
        ctx.fillStyle = '#d4b36a';
        ctx.fillRect(p.x - 8, p.y - 20, 16, 24);
      }
      ctx.fillStyle = '#ffe9a8';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.name, p.x, p.y + 14);
      const q = findQuest(state.quest);
      if (q && q.talks.some((t) => t.npcId === n.id)) {
        ctx.fillStyle = '#ffec4a';
        ctx.fillText('!', p.x, p.y - 44);
      }
    });
    mobs.forEach((m) => {
      const p = tileToScreen(m.x, m.y);
      ctx.fillStyle = '#6b2a1a';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 10, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2d2a0';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(m.name, p.x, p.y - 12);
      ctx.fillStyle = '#400';
      ctx.fillRect(p.x - 12, p.y + 8, 24, 3);
      ctx.fillStyle = '#c33';
      ctx.fillRect(p.x - 12, p.y + 8, 24 * (m.hp / m.hpMax), 3);
    });
    drops.forEach((d) => {
      const p = tileToScreen(d.x, d.y);
      ctx.fillStyle = '#e6c36a';
      ctx.fillRect(p.x - 4, p.y - 4, 8, 8);
    });
    const me = tileToScreen(state.x, state.y);
    ctx.fillStyle = 'rgba(255,220,80,.35)';
    ctx.beginPath();
    ctx.arc(me.x, me.y + 6, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state.cls === 'healer' ? '#8ad' : state.cls === 'archer' ? '#8c6' : '#d66';
    ctx.beginPath();
    ctx.moveTo(me.x, me.y - 22);
    ctx.lineTo(me.x + 10, me.y + 8);
    ctx.lineTo(me.x - 10, me.y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff4c8';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.name, me.x, me.y - 26);

    radar.clearRect(0, 0, 120, 90);
    if (img) radar.drawImage(img, 0, 0, 120, 90);
    radar.fillStyle = '#e33';
    radar.beginPath();
    radar.arc((state.x / mapObj.w) * 120, (state.y / mapObj.h) * 90, 3, 0, Math.PI * 2);
    radar.fill();
  }

  function refreshHud() {
    $('nameLabel').textContent = state.name;
    const cls = CATALOG.classes.find((c) => c.id === state.cls);
    $('lvLabel').textContent = state.lv + '级 ' + (cls ? cls.name : '');
    $('hpBar').style.width = (100 * state.hp / state.hpMax) + '%';
    $('mpBar').style.width = (100 * state.mp / state.mpMax) + '%';
    $('expBar').style.width = (100 * state.exp / state.next) + '%';
    $('hpTxt').textContent = state.hp + '/' + state.hpMax;
    $('mpTxt').textContent = state.mp + '/' + state.mpMax;
    const q = findQuest(state.quest);
    $('questTitle').textContent = q ? q.name : '暂无功业';
    $('questDesc').textContent = q ? q.desc : '四处逛逛，熟悉大明江山。';
    $('idleBtn').textContent = state.idle ? '停' : '挂';
    drawFace();
  }

  function gainExp(n) {
    state.exp += n;
    while (state.exp >= state.next) {
      state.exp -= state.next;
      state.lv += 1;
      state.next = Math.floor(state.next * 1.35);
      state.hpMax += 18;
      state.mpMax += 8;
      state.atk += 2;
      state.hp = state.hpMax;
      state.points += 5;
      toast(state.name + ' 升到 ' + state.lv + ' 级');
    }
  }

  function addItem(name, kind) {
    const hit = state.bag.find((i) => i.name === name);
    if (hit) hit.n += 1;
    else state.bag.push({ id: name, name: name, n: 1, kind: kind || 'misc' });
  }

  function attack(mob, skillMul) {
    if (atkCd > 0 && (skillMul || 1) <= 1) return;
    atkCd = 0.55;
    const dmg = Math.max(1, Math.floor(state.atk * (skillMul || 1) - mob.atk * 0.1 + Math.random() * 6));
    mob.hp -= dmg;
    toast(mob.name + ' -' + dmg);
    if (mob.hp <= 0) {
      mobs = mobs.filter((m) => m !== mob);
      gainExp(12 + state.lv);
      state.gold += 3;
      if (Math.random() < 0.35) {
        drops.push({ x: mob.x, y: mob.y, name: Math.random() < 0.5 ? '金创药' : '兽皮' });
      }
      if (target === mob) target = null;
    } else {
      const back = Math.max(1, mob.atk - state.def);
      state.hp = Math.max(0, state.hp - back);
      if (state.hp <= 0) {
        state.hp = 1;
        state.idle = false;
        toast('你重伤倒下，被村民救回');
        enterMap('taiping', 50, 70);
      }
    }
  }

  function useSkill(i) {
    const names = SKILLS[state.cls] || SKILLS.warrior;
    const cost = 8 + i * 3;
    if (state.mp < cost) { toast('内力不足'); return; }
    state.mp -= cost;
    if (state.cls === 'healer' && (i === 1 || i === 2 || i === 5)) {
      const heal = 20 + i * 8 + state.intel;
      state.hp = Math.min(state.hpMax, state.hp + heal);
      toast(names[i] + ' 回复 ' + heal);
      return;
    }
    if (!target || !mobs.includes(target)) {
      target = nearestMob();
    }
    if (target) attack(target, 1.2 + i * 0.25);
  }

  function nearestMob() {
    let best = null, d = 99;
    mobs.forEach((m) => {
      const k = dist(state, m);
      if (k < d) { d = k; best = m; }
    });
    return best;
  }

  function openDialog(npc) {
    $('dialog').classList.remove('hidden');
    $('dlgName').textContent = npc.name;
    $('dlgText').textContent = npc.say || '……';
    const faceImg = images[npc.icon];
    $('dlgFace').src = faceImg ? faceImg.src : 'assets/ui/headBG.png';
    const acts = $('dlgActs');
    acts.innerHTML = '';
    const q = findQuest(state.quest);
    const talk = q && q.talks.find((t) => t.npcId === npc.id);
    if (talk) {
      const b = document.createElement('button');
      b.textContent = '交付功业';
      b.onclick = () => completeQuest(npc, talk);
      acts.appendChild(b);
    }
    if (npc.name === '车夫') {
      CATALOG.maps.forEach((m) => {
        const b = document.createElement('button');
        b.textContent = '去' + m.name;
        b.onclick = () => { hideDialog(); enterMap(m.id); toast('车夫送你到' + m.name); };
        acts.appendChild(b);
      });
    }
    const close = document.createElement('button');
    close.textContent = '离开';
    close.onclick = hideDialog;
    acts.appendChild(close);
  }

  function hideDialog() { $('dialog').classList.add('hidden'); }

  function completeQuest(npc, talk) {
    const q = findQuest(state.quest);
    if (!q) return;
    $('dlgText').textContent = (talk.lines && talk.lines[0]) || npc.say;
    gainExp(q.exp || 20);
    state.gold += 10;
    addItem('功业奖励', 'misc');
    toast('完成：' + q.name);
    state.quest = q.next || String(Number(q.id) + 1);
    if (!findQuest(state.quest)) state.quest = q.id;
    refreshHud();
    save();
  }

  function showPanel(kind) {
    $('panel').classList.remove('hidden');
    const body = $('panelBody');
    const title = { role: '角色', pack: '背包', skill: '武功', pet: '灵宠', forge: '天工炉', social: '打坐', shop: '商城', map: '地图' }[kind];
    $('panelTitle').textContent = title;
    if (kind === 'role') {
      body.innerHTML = '<p>' + state.name + ' · ' + state.lv + '级</p><p>力' + state.str + ' 智' + state.intel + ' 敏' + state.agi + ' 精' + state.spi + ' 体' + state.vit + '</p><p>可分配点数：' + state.points + '</p><p>武器：' + state.weapon + '</p><p>银两 ' + state.gold + ' / 绑定 ' + state.bindGold + '</p>';
      ['str', 'intel', 'agi', 'spi', 'vit'].forEach((k) => {
        const b = document.createElement('button');
        b.textContent = '+ ' + k;
        b.onclick = () => {
          if (state.points <= 0) return;
          state.points -= 1; state[k] += 1;
          if (k === 'vit' || k === 'str') { state.hpMax += 8; state.hp += 8; }
          if (k === 'intel' || k === 'spi') { state.mpMax += 6; state.mp += 6; }
          if (k === 'str' || k === 'agi') state.atk += 1;
          showPanel('role'); refreshHud(); save();
        };
        body.appendChild(b);
      });
    } else if (kind === 'pack') {
      body.innerHTML = '<div class="item-grid"></div>';
      const grid = body.firstChild;
      for (let i = 0; i < 24; i++) {
        const it = state.bag[i];
        const s = document.createElement('div');
        s.className = 'slot';
        s.textContent = it ? it.name + '×' + it.n : '';
        s.onclick = () => {
          if (!it) return;
          if (it.kind === 'hp') { state.hp = Math.min(state.hpMax, state.hp + 40); it.n -= 1; toast('气血回复'); }
          if (it.kind === 'mp') { state.mp = Math.min(state.mpMax, state.mp + 30); it.n -= 1; toast('内力回复'); }
          if (it.n <= 0) state.bag.splice(i, 1);
          showPanel('pack'); refreshHud(); save();
        };
        grid.appendChild(s);
      }
    } else if (kind === 'skill') {
      body.innerHTML = '<p>1-6 键释放。医仙 2/3/6 为治疗。</p>';
      (SKILLS[state.cls] || []).forEach((n, i) => {
        const p = document.createElement('p');
        p.textContent = (i + 1) + '. ' + n;
        body.appendChild(p);
      });
    } else if (kind === 'pet') {
      body.innerHTML = state.pet
        ? '<p>随行：' + state.pet + '</p>'
        : '<p>去神农架找宠物驯养师请一只灵宠。</p>';
      const b = document.createElement('button');
      b.textContent = '请一只黄犬';
      b.onclick = () => { state.pet = '黄犬'; toast('黄犬随行'); showPanel('pet'); save(); };
      body.appendChild(b);
    } else if (kind === 'forge') {
      body.innerHTML = '<p>天工炉：消耗银两提升武器。</p>';
      const b = document.createElement('button');
      b.textContent = '强化武器（50 银）';
      b.onclick = () => {
        if (state.gold < 50) { toast('银两不足'); return; }
        state.gold -= 50; state.atk += 3; toast('兵器更锋利了'); refreshHud(); save();
      };
      body.appendChild(b);
    } else if (kind === 'shop') {
      body.innerHTML = '<p>商城货物均为绑定。</p>';
      [['金创药', 20, 'hp'], ['回气散', 20, 'mp']].forEach((row) => {
        const b = document.createElement('button');
        b.textContent = row[0] + ' ' + row[1] + '银';
        b.onclick = () => {
          if (state.gold < row[1]) { toast('银两不足'); return; }
          state.gold -= row[1]; addItem(row[0], row[2]); toast('购得' + row[0]); save();
        };
        body.appendChild(b);
      });
    } else if (kind === 'map') {
      body.innerHTML = '<div class="map-layer"></div><div class="map-list"></div>';
      const img = document.createElement('img');
      img.src = 'assets/map/world.jpg';
      body.querySelector('.map-layer').appendChild(img);
      CATALOG.maps.forEach((m) => {
        const b = document.createElement('button');
        b.textContent = '传送 · ' + m.name;
        b.onclick = () => { hidePanel(); enterMap(m.id); toast('瞬移到' + m.name); };
        body.querySelector('.map-list').appendChild(b);
      });
    } else if (kind === 'social') {
      body.innerHTML = '<p>打坐中缓慢回血回蓝。再点关闭。</p>';
      state.idle = false;
    }
  }

  function hidePanel() { $('panel').classList.add('hidden'); }

  function onClick(ev) {
    const r = canvas.getBoundingClientRect();
    const scale = r.width / STAGE.w;
    const x = (ev.clientX - r.left) / scale;
    const y = (ev.clientY - r.top) / scale;
    const t = screenToTile(x, y);
    const npc = npcs.find((n) => dist(n, t) <= 4);
    if (npc) { path = { x: npc.x, y: npc.y, npc: npc }; return; }
    const mob = mobs.find((m) => dist(m, t) <= 4);
    if (mob) { target = mob; path = { x: mob.x, y: mob.y }; return; }
    const drop = drops.find((d) => dist(d, t) <= 3);
    if (drop && dist(state, drop) < 4) {
      addItem(drop.name, drop.name === '金创药' ? 'hp' : 'misc');
      drops = drops.filter((d) => d !== drop);
      toast('拾取 ' + drop.name);
      return;
    }
    path = t;
  }

  function tick(dt) {
    if (atkCd > 0) atkCd -= dt;
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) $('toast').textContent = '';
    }
    if (path) {
      const dx = path.x - state.x, dy = path.y - state.y;
      const d = Math.hypot(dx, dy);
      const spd = 18 * dt;
      if (d <= spd) {
        state.x = path.x; state.y = path.y;
        if (path.npc && dist(state, path.npc) < 3) openDialog(path.npc);
        path = null;
      } else {
        state.x += dx / d * spd;
        state.y += dy / d * spd;
      }
    }
    if (state.idle) {
      state.hp = Math.min(state.hpMax, state.hp + 8 * dt);
      state.mp = Math.min(state.mpMax, state.mp + 6 * dt);
      if (!target || !mobs.includes(target)) target = nearestMob();
      if (target && dist(state, target) > 2.5) path = { x: target.x, y: target.y };
      else if (target) attack(target, 1);
    }
    if (target && mobs.includes(target) && dist(state, target) <= 2.8 && !state.idle && !path) {
      attack(target, 1);
    }
    npcs.forEach((n) => {
      if (n.name === '宠物驯养师' && dist(state, n) < 2 && !state.pet) {
        /* offer via dialog */
      }
    });
    refreshHud();
    drawWorld();
  }

  function loop(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0.016);
    last = ts;
    if (state && mapObj) tick(dt);
    requestAnimationFrame(loop);
  }

  function bind() {
    canvas.addEventListener('click', onClick);
    $('idleBtn').onclick = () => { state.idle = !state.idle; toast(state.idle ? '开始挂机' : '停止挂机'); };
    $('shopBtn').onclick = () => showPanel('shop');
    $('mapBtn').onclick = () => showPanel('map');
    $('panelClose').onclick = hidePanel;
    document.querySelectorAll('#menus img[data-panel]').forEach((el) => {
      el.onclick = () => showPanel(el.getAttribute('data-panel'));
    });
    window.addEventListener('keydown', (e) => {
      if (!state || $('create').classList.contains('hidden') === false) return;
      const k = e.key.toLowerCase();
      if (k === 'z') { state.idle = !state.idle; toast(state.idle ? '开始挂机' : '停止挂机'); }
      if (k === 'c') showPanel('role');
      if (k === 'b') showPanel('pack');
      if (k === 'v') showPanel('skill');
      if (k === 'p') showPanel('pet');
      if (k === 'e') showPanel('forge');
      if (k === 'm') showPanel('map');
      if (k === 'f') {
        const drop = drops.find((d) => dist(state, d) < 4);
        if (drop) { addItem(drop.name, drop.name === '金创药' ? 'hp' : 'misc'); drops = drops.filter((d) => d !== drop); toast('拾取'); }
      }
      if (k === 'q' || k === 'r') {
        const pot = state.bag.find((i) => i.kind === (k === 'q' ? 'hp' : 'mp') && i.n > 0);
        if (pot) {
          if (pot.kind === 'hp') state.hp = Math.min(state.hpMax, state.hp + 40);
          else state.mp = Math.min(state.mpMax, state.mp + 30);
          pot.n -= 1;
        }
      }
      if (k === 'escape') { hidePanel(); hideDialog(); }
      const n = Number(k);
      if (n >= 1 && n <= 6) useSkill(n - 1);
      const dir = { arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1], arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0] }[k];
      if (dir) {
        path = {
          x: Math.max(1, Math.min(mapObj.w - 1, state.x + dir[0] * 3)),
          y: Math.max(1, Math.min(mapObj.h - 1, state.y + dir[1] * 3))
        };
      }
    });
    $('questBox').onclick = () => {
      const q = findQuest(state.quest);
      if (!q || !q.talks.length) return;
      const id = q.talks[0].npcId;
      let npc = npcs.find((n) => n.id === id);
      if (npc) path = { x: npc.x, y: npc.y, npc: npc };
      else {
        const dest = CATALOG.maps.find((m) => m.npcs.some((n) => n.id === id));
        if (dest) {
          enterMap(dest.id);
          npc = npcs.find((n) => n.id === id);
          if (npc) path = { x: npc.x, y: npc.y, npc: npc };
        }
      }
    };
  }

  function startPlay() {
    $('create').classList.add('hidden');
    $('hud').classList.remove('hidden');
    const skills = $('skills');
    skills.innerHTML = '';
    (SKILLS[state.cls] || SKILLS.warrior).forEach((n, i) => {
      const d = document.createElement('div');
      d.className = 'sk';
      d.textContent = (i + 1) + n;
      d.onclick = () => useSkill(i);
      skills.appendChild(d);
    });
    enterMap(state.map, state.x, state.y);
    refreshHud();
  }

  function showCreate() {
    $('create').classList.remove('hidden');
    $('hud').classList.add('hidden');
    const box = $('classes');
    box.innerHTML = '';
    let pick = 'warrior';
    CATALOG.classes.forEach((c) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.innerHTML = '<b>' + c.name + '</b><br>' + c.desc;
      if (c.id === pick) b.classList.add('on');
      b.onclick = () => {
        pick = c.id;
        [...box.children].forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
      };
      box.appendChild(b);
    });
    $('createBtn').onclick = () => {
      const name = $('rname').value.trim() || '少侠';
      const sex = document.querySelector('input[name=sex]:checked').value;
      state = defaultRole(pick, name, sex);
      save();
      startPlay();
    };
  }

  async function main() {
    fitStage();
    CATALOG = await fetch('data/catalog.json').then((r) => r.json());
    await preload();
    bind();
    requestAnimationFrame(loop);
    const saved = loadSave();
    if (saved && saved.name) {
      state = saved;
      startPlay();
    } else {
      showCreate();
    }
  }

  main().catch((err) => {
    document.body.innerHTML = '<p style="padding:20px">加载失败：' + err.message + '</p>';
  });
})();
