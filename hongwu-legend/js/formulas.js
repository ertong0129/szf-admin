/**
 * 洪武风云录 — 战斗与养成公式（浏览器 / Node 共用）
 */
(function (root) {
  var F = {};

  F.RARITY = ['white', 'green', 'blue', 'purple', 'orange'];
  F.RARITY_MULT = { white: 1, green: 1.18, blue: 1.4, purple: 1.72, orange: 2.15 };
  F.RARITY_WEIGHT = [46, 28, 16, 8, 2];

  F.xpToNext = function (level) {
    return Math.floor(70 * Math.pow(level, 1.52) + 40);
  };

  F.totalXpToLevel = function (level) {
    var sum = 0;
    for (var i = 1; i < level; i++) sum += F.xpToNext(i);
    return sum;
  };

  /* 对照 91wan 资料「属性加点」：力+1 外攻+2 生命+2；智+1.3 内攻 +3 内力；
     敏+1 外防 +1.5 内防 +0.2 攻速；精+2 生命 +2 内力；体+25 生命 +1 重击。
     医仙主精神，单机另给精神少量内攻，避免治疗职业打不动。 */
  F.attrDerive = function (attrs) {
    var str = attrs.str || 0;
    var intel = attrs.int || 0;
    var agi = attrs.agi || 0;
    var spi = attrs.spi || 0;
    var con = attrs.con || 0;
    return {
      patk: str * 2,
      matk: intel * 1.3 + spi * 0.35,
      pdef: agi * 1,
      mdef: agi * 1.5,
      hp: con * 25 + str * 2 + spi * 2,
      mp: intel * 3 + spi * 2,
      aspd: agi * 0.002,
      crit: con * 0.01
    };
  };

  F.ENERGY_MAX = 4000;

  F.mountSpeedMul = function (rarity) {
    var t = { white: 1.15, green: 1.22, blue: 1.32, purple: 1.44, orange: 1.58 };
    return t[rarity] || 1.15;
  };

  F.mountUpgradeChance = function (rarity) {
    var t = { white: 0.7, green: 0.55, blue: 0.4, purple: 0.25 };
    return t[rarity] == null ? 0 : t[rarity];
  };

  F.meritBand = function (level) {
    var bands = [
      { min: 10, max: 19, exp: 280, silver: 40, kill: { id: 'boar', n: 6 } },
      { min: 20, max: 29, exp: 491, silver: 50, kill: { id: 'wolf', n: 8 } },
      { min: 30, max: 39, exp: 832, silver: 70, kill: { id: 'bandit', n: 8 } },
      { min: 40, max: 49, exp: 1210, silver: 90, kill: { id: 'snake', n: 8 } },
      { min: 50, max: 59, exp: 1617, silver: 110, kill: { id: 'spirit', n: 6 } },
      { min: 60, max: 80, exp: 2049, silver: 130, kill: { id: 'spirit', n: 8 } }
    ];
    for (var i = 0; i < bands.length; i++) {
      if (level >= bands[i].min && level <= bands[i].max) return bands[i];
    }
    return null;
  };

  F.meritReward = function (base, count) {
    var n = Math.max(0, Math.min(9, count | 0));
    return Math.floor(base * (1 + n * 0.08));
  };

  F.clamp = function (n, min, max) {
    return Math.max(min, Math.min(max, n));
  };

  F.calcDamage = function (atk, def, multiplier, isCrit, variance) {
    var raw = atk * (multiplier || 1) - def * 0.45;
    raw = Math.max(1, raw);
    if (typeof variance === 'number') raw *= 1 + variance;
    if (isCrit) raw *= 1.6;
    return Math.max(1, Math.floor(raw));
  };

  F.critRoll = function (critChance, rng) {
    var r = rng ? rng() : Math.random();
    return r < F.clamp(critChance, 0, 0.65);
  };

  F.enhanceChance = function (stars) {
    var table = [1, 0.95, 0.88, 0.78, 0.66, 0.52, 0.4, 0.28, 0.18, 0.1];
    return table[F.clamp(stars, 0, 9)] || 0.08;
  };

  F.enhanceCost = function (stars, itemLevel) {
    return Math.floor((18 + stars * 22) * (1 + itemLevel / 20));
  };

  F.socketCost = function (holes) {
    return 40 + holes * 55;
  };

  F.gemStat = function (kind, grade) {
    var g = F.clamp(grade, 1, 6);
    var table = {
      patk: 4, matk: 4, pdef: 5, mdef: 5,
      str: 2, int: 2, agi: 2, spi: 2, con: 2,
      hp: 30, crit: 0.008
    };
    return (table[kind] || 2) * g;
  };

  F.rollRarity = function (rng, luck) {
    var weights = F.RARITY_WEIGHT.slice();
    var bonus = luck || 0;
    weights[3] += bonus * 0.6;
    weights[4] += bonus * 0.25;
    var total = 0;
    for (var i = 0; i < weights.length; i++) total += weights[i];
    var roll = (rng ? rng() : Math.random()) * total;
    var acc = 0;
    for (var j = 0; j < weights.length; j++) {
      acc += weights[j];
      if (roll <= acc) return F.RARITY[j];
    }
    return 'white';
  };

  F.scaleEquipStat = function (base, itemLevel, rarity, stars) {
    var rm = F.RARITY_MULT[rarity] || 1;
    var sm = 1 + (stars || 0) * 0.08;
    return Math.max(1, Math.floor(base * (0.7 + itemLevel * 0.18) * rm * sm));
  };

  F.monsterHp = function (level, isBoss) {
    var hp = 40 + level * 28 + Math.pow(level, 1.25) * 6;
    return Math.floor(hp * (isBoss ? 8 : 1));
  };

  F.monsterAtk = function (level, isBoss) {
    return Math.floor((6 + level * 2.2) * (isBoss ? 1.8 : 1));
  };

  F.killXp = function (playerLevel, monsterLevel, isBoss) {
    var diff = monsterLevel - playerLevel;
    var mult = 1;
    if (diff >= 8) mult = 1.55;
    else if (diff >= 4) mult = 1.3;
    else if (diff <= -8) mult = 0.35;
    else if (diff <= -4) mult = 0.6;
    var base = 12 + monsterLevel * 4;
    return Math.floor(base * mult * (isBoss ? 6 : 1));
  };

  F.potionHeal = function (tier, maxHp) {
    if (tier === 1) return Math.floor(maxHp * 0.28 + 40);
    if (tier === 2) return Math.floor(maxHp * 0.45 + 80);
    return Math.floor(maxHp * 0.7 + 120);
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = F;
  }
  root.Formulas = F;
})(typeof window !== 'undefined' ? window : global);
