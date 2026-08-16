/**
 * 洪武风云录 — 原创内容数据
 * 玩法结构致敬旧页游 ARPG，文案、数值与系统均为重写。
 */
(function (root) {
  var D = {};

  D.GAME_TITLE = '洪武风云录';
  D.GAME_SUB = '页游即时战斗单机志';

  D.CLASSES = {
    warrior: {
      id: 'warrior',
      name: '战士',
      weapon: '刀剑',
      color: '#c23b2a',
      accent: '#ffd29a',
      desc: '刀剑近身，血厚防高，永远站在队伍最前。主加力量或体质。',
      tip: '全力输出或铁壁承伤，鄱阳水寨的可靠前锋。',
      primary: 'str',
      secondary: 'con',
      base: { str: 8, int: 2, agi: 4, spi: 2, con: 8 },
      baseHp: 160,
      baseMp: 40,
      range: 46,
      speed: 128
    },
    archer: {
      id: 'archer',
      name: '射手',
      weapon: '弓矢',
      color: '#3d8b4a',
      accent: '#d6f5c8',
      desc: '百步穿杨，远程点杀。主加力量与敏捷。',
      tip: '风筝与暴击是本色。先手放技能，再靠走位保命。',
      primary: 'str',
      secondary: 'agi',
      base: { str: 7, int: 2, agi: 8, spi: 2, con: 5 },
      baseHp: 120,
      baseMp: 50,
      range: 168,
      speed: 136
    },
    wanderer: {
      id: 'wanderer',
      name: '侠客',
      weapon: '折扇',
      color: '#6b3fa0',
      accent: '#e8d4ff',
      desc: '扇走内劲，行踪不定，爆发极高。主加智力。',
      tip: '玻璃大炮。点穴控场，打完就撤。',
      primary: 'int',
      secondary: 'agi',
      base: { str: 3, int: 9, agi: 6, spi: 4, con: 4 },
      baseHp: 105,
      baseMp: 70,
      range: 92,
      speed: 142
    },
    healer: {
      id: 'healer',
      name: '医仙',
      weapon: '药杖',
      color: '#2a8f8a',
      accent: '#c8fff6',
      desc: '杖起回春，救死扶伤。主加精神。',
      tip: '续航之王。先保命再磨血，单人副本也很稳。',
      primary: 'spi',
      secondary: 'int',
      base: { str: 2, int: 6, agi: 3, spi: 9, con: 6 },
      baseHp: 130,
      baseMp: 90,
      range: 140,
      speed: 124
    }
  };

  D.ATTR_LABEL = {
    str: '力量', int: '智力', agi: '敏捷', spi: '精神', con: '体质'
  };

  D.SKILLS = {
    warrior: [
      { id: 'w1', name: '破阵斩', key: '1', unlock: 1, cost: 8, cd: 2.2, range: 54, kind: 'melee', mul: 1.35, desc: '向前劈砍，对单体造成外功伤害。' },
      { id: 'w2', name: '追魂击', key: '2', unlock: 4, cost: 14, cd: 6, range: 110, kind: 'dash', mul: 1.55, desc: '短距离冲锋并重创目标。' },
      { id: 'w3', name: '雷霆一击', key: '3', unlock: 8, cost: 18, cd: 8, range: 58, kind: 'melee', mul: 2.1, desc: '蓄力重劈，高额单体伤害。' },
      { id: 'w4', name: '旋风刃', key: '4', unlock: 12, cost: 22, cd: 10, range: 78, kind: 'nova', mul: 1.25, desc: '环身挥砍，打击周围敌人。' },
      { id: 'w5', name: '血战', key: '5', unlock: 16, cost: 16, cd: 16, range: 0, kind: 'buff', buff: { patk: 0.18, dur: 10 }, desc: '短时间内提升外功攻击。' },
      { id: 'w6', name: '铁骨', key: '6', unlock: 20, cost: 20, cd: 18, range: 0, kind: 'heal', heal: 0.22, desc: '稳住气息，回复部分生命。' }
    ],
    archer: [
      { id: 'a1', name: '追风箭', key: '1', unlock: 1, cost: 7, cd: 1.8, range: 190, kind: 'bolt', mul: 1.2, desc: '快速射出一支外功箭矢。' },
      { id: 'a2', name: '穿云矢', key: '2', unlock: 4, cost: 12, cd: 5, range: 210, kind: 'pierce', mul: 1.15, desc: '穿透直线上的多个敌人。' },
      { id: 'a3', name: '爆裂矢', key: '3', unlock: 8, cost: 18, cd: 8, range: 190, kind: 'blast', mul: 1.4, desc: '命中后爆炸，波及周围。' },
      { id: 'a4', name: '凝神狙击', key: '4', unlock: 12, cost: 20, cd: 11, range: 220, kind: 'bolt', mul: 2.2, crit: 0.25, desc: '高暴击的蓄力一箭。' },
      { id: 'a5', name: '破甲', key: '5', unlock: 16, cost: 14, cd: 12, range: 190, kind: 'debuff', debuff: { pdef: 0.2, dur: 8 }, desc: '降低目标外防。' },
      { id: 'a6', name: '轻身', key: '6', unlock: 20, cost: 12, cd: 16, range: 0, kind: 'buff', buff: { speed: 0.28, dur: 8 }, desc: '提升移动与走位能力。' }
    ],
    wanderer: [
      { id: 'x1', name: '落雁扇', key: '1', unlock: 1, cost: 9, cd: 2, range: 120, kind: 'bolt', magic: true, mul: 1.3, desc: '以内劲扇出一道气刃。' },
      { id: 'x2', name: '劈空掌', key: '2', unlock: 4, cost: 14, cd: 5.5, range: 80, kind: 'melee', magic: true, mul: 1.7, desc: '近身爆发内功掌劲。' },
      { id: 'x3', name: '风沙卷', key: '3', unlock: 8, cost: 20, cd: 9, range: 90, kind: 'nova', magic: true, mul: 1.2, desc: '扬起风沙，群攻周围。' },
      { id: 'x4', name: '点穴', key: '4', unlock: 12, cost: 16, cd: 12, range: 110, kind: 'stun', magic: true, mul: 0.7, stun: 1.6, desc: '定身目标片刻。' },
      { id: 'x5', name: '灵智', key: '5', unlock: 16, cost: 16, cd: 16, range: 0, kind: 'buff', buff: { matk: 0.2, dur: 10 }, desc: '短时间提升内功攻击。' },
      { id: 'x6', name: '移形', key: '6', unlock: 20, cost: 18, cd: 14, range: 0, kind: 'blink', desc: '向鼠标方向短距离闪身。' }
    ],
    healer: [
      { id: 'h1', name: '灵击', key: '1', unlock: 1, cost: 8, cd: 1.9, range: 160, kind: 'bolt', magic: true, mul: 1.15, desc: '以药杖激出内劲弹。' },
      { id: 'h2', name: '回春', key: '2', unlock: 4, cost: 14, cd: 5, range: 0, kind: 'heal', heal: 0.32, desc: '为自己回复大量生命。' },
      { id: 'h3', name: '困咒', key: '3', unlock: 8, cost: 12, cd: 8, range: 160, kind: 'debuff', magic: true, mul: 0.6, debuff: { speed: 0.35, dur: 5 }, desc: '减缓目标行动。' },
      { id: 'h4', name: '护体', key: '4', unlock: 12, cost: 18, cd: 14, range: 0, kind: 'buff', buff: { pdef: 0.22, mdef: 0.22, dur: 9 }, desc: '提升内外防御。' },
      { id: 'h5', name: '群疗', key: '5', unlock: 16, cost: 22, cd: 12, range: 0, kind: 'heal', heal: 0.2, pet: true, desc: '同时治疗自己与灵宠。' },
      { id: 'h6', name: '回灵', key: '6', unlock: 20, cost: 10, cd: 20, range: 0, kind: 'manaburn', mana: 0.25, desc: '凝神回复内力。' }
    ]
  };

  D.SLOTS = [
    { id: 'weapon', name: '武器' },
    { id: 'helm', name: '头盔' },
    { id: 'armor', name: '铠甲' },
    { id: 'boots', name: '靴履' },
    { id: 'necklace', name: '项链' },
    { id: 'ring', name: '戒指' },
    { id: 'belt', name: '腰带' }
  ];

  D.EQUIP_NAMES = {
    weapon: {
      warrior: ['朴刀', '精铁刀', '龙雀刀', '破军斩'],
      archer: ['桑木弓', '硬角弓', '追风弓', '落日弩'],
      wanderer: ['竹骨扇', '铁骨扇', '星澜扇', '惊鸿扇'],
      healer: ['青木杖', '茯苓杖', '回春杖', '玉衡杖']
    },
    helm: ['布巾', '皮盔', '铁盔', '鎏金盔'],
    armor: ['粗布衣', '软甲', '锁子甲', '绯云袍'],
    boots: ['草履', '行军靴', '疾风靴', '云踏'],
    necklace: ['绳结坠', '青玉佩', '寒铁链', '镇国坠'],
    ring: ['铜环', '兽骨戒', '星砂戒', '龙纹戒'],
    belt: ['麻绳带', '皮腰带', '镶铜带', '麒麟带']
  };

  D.EQUIP_BASE = {
    weapon: { patk: 8, matk: 8 },
    helm: { pdef: 4, mdef: 3, hp: 18 },
    armor: { pdef: 7, mdef: 5, hp: 32 },
    boots: { pdef: 3, speed: 0.03, agi: 1 },
    necklace: { crit: 0.01, patk: 2, matk: 2 },
    ring: { patk: 3, matk: 3, crit: 0.008 },
    belt: { hp: 24, pdef: 3, con: 1 }
  };

  D.GEMS = [
    { id: 'gem_patk', name: '外攻石', kind: 'patk', slotHint: '武器 / 戒指' },
    { id: 'gem_matk', name: '内攻石', kind: 'matk', slotHint: '武器 / 项链' },
    { id: 'gem_pdef', name: '外防石', kind: 'pdef', slotHint: '铠甲 / 盔' },
    { id: 'gem_mdef', name: '内防石', kind: 'mdef', slotHint: '铠甲 / 腰带' },
    { id: 'gem_str', name: '力量石', kind: 'str', slotHint: '任意' },
    { id: 'gem_int', name: '智力石', kind: 'int', slotHint: '任意' },
    { id: 'gem_agi', name: '敏捷石', kind: 'agi', slotHint: '任意' },
    { id: 'gem_spi', name: '精神石', kind: 'spi', slotHint: '任意' },
    { id: 'gem_con', name: '体质石', kind: 'con', slotHint: '任意' },
    { id: 'gem_crit', name: '暴击石', kind: 'crit', slotHint: '武器 / 项链' }
  ];

  D.CONSUMABLES = {
    herb_wu: { id: 'herb_wu', name: '乌风草', kind: 'herb', desc: '野外采集。五株可炼大型金创药。' },
    herb_san: { id: 'herb_san', name: '三七', kind: 'herb', desc: '五株可炼中型金创药。' },
    herb_ling: { id: 'herb_ling', name: '回灵草', kind: 'herb', desc: '五株可炼大型内力药。' },
    herb_fu: { id: 'herb_fu', name: '茯苓', kind: 'herb', desc: '五株可炼中型内力药。' },
    hp1: { id: 'hp1', name: '中型金创药', kind: 'potion', potion: 'hp', tier: 1, desc: '回复中量生命。' },
    hp2: { id: 'hp2', name: '大型金创药', kind: 'potion', potion: 'hp', tier: 2, desc: '回复大量生命。' },
    mp1: { id: 'mp1', name: '中型内力药', kind: 'potion', potion: 'mp', tier: 1, desc: '回复中量内力。' },
    mp2: { id: 'mp2', name: '大型内力药', kind: 'potion', potion: 'mp', tier: 2, desc: '回复大量内力。' },
    stone: { id: 'stone', name: '强化石', kind: 'mat', desc: '百工炉升星消耗。' },
    socket: { id: 'socket', name: '开孔符', kind: 'mat', desc: '为装备开孔。' },
    feed: { id: 'feed', name: '灵兽口粮', kind: 'feed', desc: '喂食出战灵宠，回复其生命。' },
    badge: { id: 'badge', name: '腰牌', kind: 'mat', desc: '鄱阳湖缴获。使用可换经验。' },
    hero_pack: { id: 'hero_pack', name: '英雄礼包', kind: 'pack', desc: '通关礼包。打开可得灵石或药水。' },
    scroll: { id: 'scroll', name: '传送卷', kind: 'mat', desc: '世界地图点地名可消耗一张瞬移。没有则自动寻路。' },
    mount_token: { id: 'mount_token', name: '坐骑提速牌', kind: 'mat', desc: '角色面板坐骑页提升坐骑速度，不一定成功。' },
    yinpiao: { id: 'yinpiao', name: '五锭银票', kind: 'mat', desc: '钱庄兑换。500 两银子 = 1 张，可再兑回银两。' }
  };

  D.RECIPES = [
    { ins: { herb_san: 5 }, out: { id: 'hp1', n: 1 } },
    { ins: { herb_wu: 5 }, out: { id: 'hp2', n: 1 } },
    { ins: { herb_fu: 5 }, out: { id: 'mp1', n: 1 } },
    { ins: { herb_ling: 5 }, out: { id: 'mp2', n: 1 } }
  ];

  D.PETS = [
    { id: 'wolf', name: '青狼', color: '#6d7b8a', atk: 1.05, hp: 1.1, desc: '性烈，外攻出色。' },
    { id: 'crane', name: '玄鹤', color: '#cfd8e6', atk: 0.95, hp: 0.95, magic: true, desc: '灵秀，偏内攻。' },
    { id: 'fox', name: '火狸', color: '#d4652f', atk: 1.15, hp: 0.85, desc: '敏捷暴起，攻击偏高。' },
    { id: 'ape', name: '石猿', color: '#8a6a4a', atk: 0.9, hp: 1.35, desc: '皮糙肉厚，能抗能打。' }
  ];

  D.MONSTERS = {
    boar: { id: 'boar', name: '山野猪', color: '#7a4a2a', level: 2, radius: 12, speed: 58, loot: ['herb_san', 'hp1'] },
    wolf: { id: 'wolf', name: '灰鬃狼', color: '#5a5a62', level: 5, radius: 12, speed: 78, loot: ['herb_wu', 'stone'] },
    bandit: { id: 'bandit', name: '流寇', color: '#8a3030', level: 8, radius: 11, speed: 86, loot: ['stone', 'hp1'] },
    snake: { id: 'snake', name: '谷底锦蛇', color: '#2f6b3a', level: 7, radius: 10, speed: 90, loot: ['herb_ling', 'herb_fu'] },
    spirit: { id: 'spirit', name: '山魈', color: '#4a3a6a', level: 11, radius: 12, speed: 80, magic: true, loot: ['socket', 'gem'] },
    sailor: { id: 'sailor', name: '刀兵', color: '#2a4a6a', level: 10, radius: 12, speed: 82, loot: ['stone', 'hp1'] },
    xianfeng: { id: 'xianfeng', name: '先锋', color: '#3a3a6a', level: 12, radius: 12, speed: 90, loot: ['stone', 'hp2'] },
    gongshou: { id: 'gongshou', name: '弓手', color: '#3a5a4a', level: 11, radius: 11, speed: 64, ranged: true, range: 200, loot: ['mp1', 'socket'] },
    fujiang: { id: 'fujiang', name: '副将', color: '#4a2040', level: 14, radius: 16, speed: 78, elite: true, loot: ['badge', 'stone', 'hp2'] },
    cannon: { id: 'cannon', name: '水寨炮手', color: '#3a5a4a', level: 16, radius: 12, speed: 70, ranged: true, range: 180, loot: ['socket', 'mp2'] },
    escort: { id: 'escort', name: '劫镖贼', color: '#6a2020', level: 12, radius: 11, speed: 96, loot: ['stone'] },
    tower: { id: 'tower', name: '本关守将', color: '#4a4a8a', level: 10, radius: 12, speed: 88, loot: ['stone', 'gem'] },
    boar_boss: { id: 'boar_boss', name: '獠牙王', color: '#4a2010', level: 6, radius: 18, speed: 64, boss: true, loot: ['stone', 'socket'] },
    lake_boss: { id: 'lake_boss', name: '张定边', color: '#102040', level: 18, radius: 20, speed: 70, boss: true, loot: ['badge', 'stone', 'socket', 'gem'] },
    world_boss: { id: 'world_boss', name: '残元先锋', color: '#3a1020', level: 22, radius: 22, speed: 76, boss: true, loot: ['gem', 'socket'] }
  };

  D.QUESTS = [
    { id: 'q1', name: '初入洪武', talk: 'cunzheng', map: 'taiping', text: '与太平村村正交谈，问明身在何处。', reward: { exp: 40, silver: 20 } },
    { id: 'q2', name: '村外野猪', kill: { id: 'boar', n: 6 }, map: 'wild', text: '前往野猪林，清除 6 头山野猪。', reward: { exp: 90, silver: 40, items: [{ id: 'hp1', n: 3 }] } },
    { id: 'q3', name: '采药济世', gather: { id: 'herb_san', n: 5 }, map: 'wild', text: '采集 5 株三七，交给村中备用。', reward: { exp: 80, silver: 30, items: [{ id: 'hp1', n: 2 }] } },
    { id: 'q4', name: '灵兽结缘', flag: 'got_pet', map: 'shennong', text: '前往神农谷，收服一只灵宠。', reward: { exp: 120, silver: 50, items: [{ id: 'feed', n: 5 }] } },
    { id: 'q5', name: '进京述职', talk: 'chefu', map: 'taiping', text: '找太平村车夫，进入应天京城，再拜见百工炉师傅。', reward: { exp: 100, silver: 60 } },
    { id: 'q6', name: '百工初试', flag: 'enhanced', map: 'capital', text: '在百工炉将任意装备升星一次。', reward: { exp: 110, silver: 80, items: [{ id: 'stone', n: 3 }] } },
    { id: 'q7', name: '鄱阳水患', flag: 'poyang_clear', map: 'capital', text: '找京城明军水兵，进入鄱阳湖大战，击败张定边。', reward: { exp: 220, silver: 160, items: [{ id: 'hp2', n: 3 }] } },
    { id: 'q8', name: '护送军资', flag: 'escort_done', map: 'capital', text: '从京城护送军资到边城方向。', reward: { exp: 180, silver: 140 } },
    { id: 'q9', name: '英雄试炼', flag: 'tower5', map: 'capital', text: '找大明英雄副本传送人，至少通过第 5 关。', reward: { exp: 260, silver: 200, items: [{ id: 'socket', n: 2 }] } },
    { id: 'q10', name: '残元余烬', kill: { id: 'world_boss', n: 1 }, map: 'wild', text: '野猪林深处出现残元先锋，将其击溃。', reward: { exp: 400, silver: 300, gold: 2 } }
  ];

  D.NPCS = {
    cunzheng: { id: 'cunzheng', name: '村正', title: '太平村知事', map: 'taiping', lines: ['洪武元年，太平村刚从兵火里喘过气来。', '村外野猪成灾，壮丁又被征去守江。你若肯出手，全村感激。'] },
    chefu: { id: 'chefu', name: '车夫', title: '太平车夫', map: 'taiping', travel: 'capital:8:30', lines: ['要进京，坐我这车。应天城里徐达、百工炉、明军水兵都在。'] },
    tiesmith: { id: 'tiesmith', name: '铁匠', title: '装备锻造师', map: 'taiping', shop: 'smith', lines: ['刀钝了就来找我。京城师傅的手艺更地道。'] },
    yaopu: { id: 'yaopu', name: '王翠翘', title: '杂货商人', map: 'taiping', shop: 'drug', lines: ['草药能炼药。路边的乌风草、三七别浪费。'] },
    shanshan: { id: 'shanshan', name: '姗姗', title: '仓库管理员', map: 'taiping', warehouse: true, lines: ['第一个仓库免费。东西多了就寄我这儿，最多开四仓。'] },
    qianzhuang: { id: 'qianzhuang', name: '钱庄老板', title: '钱庄', map: 'taiping', bank: true, lines: ['银子兑成银票更稳妥。五百两一张五锭银票。'] },
    zhangsanfeng: { id: 'zhangsanfeng', name: '张三丰', title: '技能大师', map: 'taiping', skills: true, lines: ['打开技能界面（V），点亮武学、分配技能点。'] },
    xiaoliu: { id: 'xiaoliu', name: '受伤的小六', title: '村民', map: 'taiping', lines: ['野猪林的獠牙太狠。你若去清剿，也算帮了村里。'] },
    xunyang: { id: 'xunyang', name: '宠物驯养师', title: '驯养', map: 'taiping', lines: ['幼兽要去神农谷找驯兽师。村里只能问问路。'] },
    xunshou: { id: 'xunshou', name: '驯兽师', title: '神农谷', map: 'shennong', lines: ['神农谷灵气重，奇兽出没。击败山魈，或能收服灵宠。'] },
    jingche: { id: 'jingche', name: '车夫', title: '京城车夫', map: 'capital', travel: 'taiping:24:4', lines: ['要回太平村，我送你一程。'] },
    xuda: { id: 'xuda', name: '徐达', title: '将军', map: 'capital', merit: true, lines: ['建功立业，每日可来领差事。前十次赏银逐次增加。'] },
    bagong: { id: 'bagong', name: '百工炉师傅', title: '天工炉', map: 'capital', forge: true, lines: ['炉火取《天工开物》之意。升星、开孔、镶石、炼药，都在这一炉。'] },
    yabiao: { id: 'yabiao', name: '押镖官', title: '兵部押镖', map: 'capital', escort: true, lines: ['军资要送往边城方向。路上有劫镖的，护住车，银子少不了你。'] },
    shilian: { id: 'shilian', name: '英雄副本传送人', title: '大明英雄副本', map: 'capital', tower: true, lines: ['大明英雄副本按关挑战。通关可暂停休息，下次从下一关继续。副本内不能地图跳转。'] },
    shuibing: { id: 'shuibing', name: '明军水兵', title: '鄱阳湖大战', map: 'capital', poyang: true, lines: ['陈友谅部骁将张定边往来冲突。选个难度进湖，半个时辰内了结。副本内可原地复活，不能传送。'] },
    lishizhen: { id: 'lishizhen', name: '李时珍', title: '医生', map: 'capital', shop: 'drug', lines: ['金创药、内力药，伤病时别硬扛。'] },
    yiyi: { id: 'yiyi', name: '依依', title: '仓库管理员', map: 'capital', warehouse: true, lines: ['京城仓库。第一仓免费，后面开仓要银两。'] },
    shenwansan: { id: 'shenwansan', name: '沈万三', title: '钱庄老板', map: 'capital', bank: true, lines: ['银子兑银票，银票再兑回银子。钱庄的老规矩。'] },
    jineng: { id: 'jineng', name: '技能大师', title: '武学', map: 'capital', skills: true, lines: ['V 打开技能。有技能点就点亮、升级。'] },
    chuansong: { id: 'chuansong', name: '水军都头', title: '离开副本', map: 'poyang', lines: ['湖上杀声未歇。要走，从我这儿离开副本。'] }
  };

  D.SHOPS = {
    smith: [
      { id: 'stone', price: 25 },
      { id: 'socket', price: 60 },
      { id: 'hp1', price: 12 },
      { id: 'mp1', price: 12 }
    ],
    drug: [
      { id: 'hp1', price: 10 },
      { id: 'hp2', price: 22 },
      { id: 'mp1', price: 10 },
      { id: 'mp2', price: 22 },
      { id: 'feed', price: 8 },
      { id: 'scroll', price: 30 }
    ],
    mall: [
      { id: 'scroll', price: 30 },
      { id: 'mount_token', price: 40 },
      { id: 'hp1', price: 12 },
      { id: 'mp1', price: 12 }
    ]
  };

  D.BANK = { silverPerNote: 500 };
  D.ENERGY_MAX = 4000;
  D.MOUNT_LEVEL = 18;
  D.WAREHOUSE = { cap: 36, maxTabs: 4, unlock: [0, 200, 500, 1000] };

  D.WORLD_NODES = [
    { id: 'capital', name: '应天京城', left: '50%', top: '46%', tx: 20, ty: 20, desc: '主城' },
    { id: 'taiping', name: '太平村', left: '56%', top: '58%', tx: 24, ty: 17, desc: '新手村' },
    { id: 'wild', name: '野猪林', left: '68%', top: '48%', tx: 24, ty: 18, desc: '练级' },
    { id: 'shennong', name: '神农谷', left: '36%', top: '36%', tx: 24, ty: 18, desc: '灵宠' },
    { id: 'poyang', name: '鄱阳湖', left: '76%', top: '70%', tx: 8, ty: 18, desc: '副本入口在京城水兵' }
  ];

  D.INSTANCES = {
    poyang: {
      name: '鄱阳湖大战',
      daily: 10,
      minLevel: 6,
      duration: 1800,
      revive: 'here',
      teleport: false,
      hideQuest: true,
      diffs: [
        { id: 'recruit', name: '新兵', lv: 8 },
        { id: 'normal', name: '普通', lv: 12 },
        { id: 'hero', name: '英雄', lv: 16 }
      ]
    },
    tower: {
      name: '大明英雄副本',
      daily: 10,
      minLevel: 6,
      floors: 10,
      autoCost: 5,
      revive: 'entrance',
      teleport: false,
      hideQuest: true
    },
    road: {
      name: '官道押镖',
      revive: 'entrance',
      teleport: false,
      hideQuest: true
    }
  };

  D.PK_MODES = [
    { id: 'peace', name: '和平' },
    { id: 'all', name: '全体' },
    { id: 'nation', name: '国家' },
    { id: 'party', name: '组队' },
    { id: 'clan', name: '宗族' },
    { id: 'karma', name: '善恶' }
  ];

  D.MAP_META = {
    taiping: { name: '太平村', safe: true, music: 'village', tint: [0.12, 0.16, 0.08] },
    wild: { name: '野猪林', safe: false, tint: [0.08, 0.14, 0.06] },
    shennong: { name: '神农谷', safe: false, tint: [0.06, 0.12, 0.1] },
    poyang: { name: '鄱阳湖大战', safe: false, instance: true, tint: [0.04, 0.08, 0.14] },
    capital: { name: '应天京城', safe: true, tint: [0.14, 0.1, 0.06] },
    tower: { name: '大明英雄副本', safe: false, instance: true, tint: [0.08, 0.06, 0.12] },
    road: { name: '官道押镖', safe: false, instance: true, tint: [0.12, 0.12, 0.06] }
  };

  D.PORTALS = {
    taiping: [
      { x: 47, y: 18, to: 'wild', tx: 3, ty: 18, label: '野猪林' },
      { x: 24, y: 2, to: 'capital', tx: 8, ty: 30, label: '应天' }
    ],
    wild: [
      { x: 1, y: 18, to: 'taiping', tx: 45, ty: 18, label: '太平村' },
      { x: 24, y: 1, to: 'shennong', tx: 24, ty: 32, label: '神农谷' },
      { x: 47, y: 30, to: 'poyang', tx: 4, ty: 18, label: '鄱阳湖' }
    ],
    shennong: [
      { x: 24, y: 34, to: 'wild', tx: 24, ty: 3, label: '野猪林' }
    ],
    poyang: [
      { x: 2, y: 18, to: 'capital', tx: 36, ty: 22, label: '离开副本' }
    ],
    capital: [
      { x: 8, y: 33, to: 'taiping', tx: 24, ty: 4, label: '太平村' }
    ],
    tower: [
      { x: 12, y: 22, to: 'capital', tx: 40, ty: 14, label: '离开副本' }
    ],
    road: [
      { x: 2, y: 10, to: 'capital', tx: 20, ty: 20, label: '放弃押镖' }
    ]
  };

  D.RARITY_NAME = { white: '凡品', green: '良品', blue: '精品', purple: '珍品', orange: '传说' };
  D.RARITY_COLOR = { white: '#d8d0c4', green: '#6fdf7a', blue: '#6cb6ff', purple: '#c089ff', orange: '#ffb347' };

  D.HELP = [
    '快捷键对照 91wan 资料：C 角色　B 背包　V 技能　Q 任务　E 天工炉　M 地图　Z 挂机　S 商店　D 打坐　Esc 关窗/系统。',
    '空格拾取，A 攻击选中，~ 选最近怪物，1–6 技能，7 金创药，8 内力药。方向键点地行走（原作为点地）。',
    '区域地图：深蓝自己、黄 NPC、淡蓝出口。世界地图点地名自动寻路；有传送卷则瞬移。副本内不能跳转。',
    '精力上限 4000，杀 1 怪耗 1。精力为 0 时经验为 1 且不掉落，每日 0 点重置。角色面板可查看。',
    '18 级系统送坐骑。C 面板「坐骑」可骑乘、用提速牌升色（白→橙）。',
    '仓库找姗姗（太平）或依依（京城）。第一仓免费，最多四仓。钱庄兑银票：500 两一张。',
    '京城徐达「建功立业」循环任务，10 级起可接，前 10 次奖励递增。',
    '局域网联机：朋友用浏览器打开同一地址，各自注册后选同一服务器。点其他玩家可组队、交易、加好友、密聊、跟随、PK。',
    'R 社交（好友/队伍/宗族/邀请），K 摆摊，G 跟随选中玩家，H 隐藏玩家。聊天：附近/世界/队伍/宗族，/账号 密聊。',
    'PK 六模式对其他玩家生效。安全区不能打人。红名不能坐车夫；PK≥18 红名，≥30 死亡入狱回村。',
    '点右侧任务追踪绿名可自动寻路。挂机（Z）自动寻敌、放技能、吃药、拾取。',
    '副本：京城明军水兵进鄱阳湖大战；英雄副本传送人按关挑战。资料来源：91wan 明朝传奇游戏资料站。'
  ];

  root.GameData = D;
  if (typeof module !== 'undefined' && module.exports) module.exports = D;
})(typeof window !== 'undefined' ? window : global);
