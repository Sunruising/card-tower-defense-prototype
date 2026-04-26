// config.js —— 所有数值配置集中于此。调整数值请改这个文件。

// ----- v4: 类型枚举 -----
window.NestType = {
  NORMAL: 'normal',
  ARMORED: 'armored',
};
window.BugType = {
  NORMAL: 'normal',
  BOSS: 'boss',
  GUARD: 'guard',
  HEAVY: 'heavy',
  BLOOD_BOSS: 'blood_boss',           // v6: 血月 Boss
};

// ----- v5: 迷雾枚举（v6 术语：驱散 = VISIBLE / 点亮 = TEMP_VISIBLE） -----
window.FogState = {
  VISIBLE: 'visible',
  TEMP_VISIBLE: 'temp_visible',
  FOGGED: 'fogged',
};

// ----- v6: 卡牌品质 -----
window.CardRarity = {
  NORMAL: 'normal',
  RARE: 'rare',
  EPIC: 'epic',
};

window.G = {
  // ----- 画面（v7: 21×13, cellSize 40 → canvas 840×616+UI）-----
  mapWidth: 21,
  mapHeight: 13,
  cellSize: 40,
  topBarHeight: 40,
  shopBarHeight: 56,                   // v6: 顶栏下方商店栏（取代 v5 drawBarHeight 44）
  handHeight: 120,
  get canvasWidth() { return this.mapWidth * this.cellSize; },
  get mapPixelHeight() { return this.mapHeight * this.cellSize; },
  get mapTop() { return this.topBarHeight + this.shopBarHeight; },
  get canvasHeight() { return this.topBarHeight + this.shopBarHeight + this.mapPixelHeight + this.handHeight; },
  // 兼容（render/input 老代码会查 drawBarHeight）
  get drawBarHeight() { return this.shopBarHeight; },

  // ----- 颜色 -----
  colors: {
    bg: '#1A1A1A',
    grid: '#333333',
    core: '#4A9EFF',
    coreHealing: '#7CFFB3',            // v6: 核心回血时的 ↑ 颜色
    nest: {
      fortified: '#7F2E9E', preparing: '#B83DD9',
      active: '#E74C3C', weak: '#6B2C7F',
    },
    armoredNest: {
      fortified: '#5C7A99', preparing: '#8FB3D9',
      active: '#C0392B', weak: '#3D5266',
      stroke: '#BDC3C7',
    },
    bug: '#E74C3C',
    bugBoss: '#8B0000',
    bugGuard: '#C0392B',
    bugHeavy: '#7F8C8D',
    bugHeavyStroke: '#ECF0F1',
    bloodBoss: '#7F0014',              // v6
    bloodBossStroke: '#FFD700',
    hero: '#27AE60',
    swordsman: '#52C873',
    scout: '#5DADE2',
    collector: '#F1C40F',
    reinforcedCollector: '#E67E22',
    tower: '#E67E22',
    mageTower: '#9B59B6',
    slowSpike: '#16A085',
    watchtower: '#F39C12',
    barracks: '#3498DB',
    text: '#FFFFFF',
    tooltipBg: 'rgba(0,0,0,0.75)',
    legalTile: 'rgba(39,174,96,0.35)',
    illegalTile: 'rgba(231,76,60,0.35)',
    fogBlocked: 'rgba(220,40,40,0.55)',  // v6: 法术悬停在迷雾时的红色 ✗ 高亮
    rangePreview: 'rgba(230,126,34,0.25)',
    rangePreviewStroke: 'rgba(230,126,34,0.8)',
    attackLine: 'rgba(255,230,100,0.9)',
    heroAttackLine: 'rgba(120,255,140,0.9)',
    bugAttackLine: 'rgba(255,90,90,0.9)',
    firerain: 'rgba(255,140,40,0.55)',
    sweep: 'rgba(255,230,80,0.55)',
    lightning: 'rgba(180,220,255,0.85)',
    heal: 'rgba(120,255,180,0.7)',
    newNestRing: 'rgba(184,61,217,0.9)',
    skillSlot: '#F39C12',
    gift: '#F39C12',
    giftStroke: '#FFD700',
    gemText: '#9B59B6',
    cameraRing: 'rgba(255,255,255,0.85)',
    fogged: 'rgba(0,0,0,0.78)',
    tempFog: 'rgba(0,0,0,0.30)',
    visionRing: 'rgba(255,255,255,0.05)',
    selectTarget: 'rgba(255,235,80,0.6)',
    rallyMark: 'rgba(255,160,40,0.85)',  // v6: 虫子 rallyTarget 标记色
    bloodMoonTint: 'rgba(180,30,30,0.10)', // v6: 血月夜整体暗红色调
    // v6.1
    fogExpose: 'rgba(255,60,60,0.55)',   // 迷雾攻击暴露红色脉冲
    fogExposeStroke: 'rgba(255,40,40,0.85)',
    spikePulse: 'rgba(22,160,133,0.55)', // 减速地刺触发绿色脉冲
    coreAlertExclam: '#FF4040',          // 核心受击红色 ❗
    heroEngageIcon: '#FF6060',           // 英雄 ENGAGE 头顶 ⚔
    giftRibbon: '#E84118',               // v6.1: 礼盒蝴蝶结红色
    giftBoxBody: '#F1C40F',              // 礼盒主体金色
    giftBoxLid: '#F39C12',               // 礼盒盖（深一档）
  },

  // ----- 阶段 -----
  phaseDurations: { day: 90, dusk: 15, night: 75, dawn: 12 },
  phaseOrder: ['day', 'dusk', 'night', 'dawn'],

  // ----- 初始 -----
  initial: {
    day: 1, phase: 'day',
    glue: 40, tokens: 5, gems: 0,
    tokenCap: 10, tokenPerDay: 1,
  },

  survivalDay: 7,

  // ----- 核心（v7: 21x13 中心 (10,6)）-----
  core: { x: 10, y: 6, hp: 100, maxHp: 100 },
  // v6: 核心回血（独立配置，不走 combat.regenPerSec=2）
  coreRegen: {
    outOfCombatDelay: 5,
    regenPerSec: 1,
  },

  // ----- 英雄（v6.1: 巡逻/警戒/追击；v7 起点 (10,7)；v7.1 sweep CD 25s）-----
  hero: {
    x: 10, y: 7,
    hp: 80, maxHp: 80,
    damage: 10,
    attackRange: 2,
    attackSpeed: 1,
    warnRange: 2,
    marchSpeed: 0.7,
    respawnTime: 20,
    skillCardCD: 25,
    patrolRadius: 1,                     // v6.1: 3×3 巡逻（半径 1，含中心 = 9 格）
    patrolIntervalMin: 4,                // v6.1: 每 4-6s 走一格
    patrolIntervalMax: 6,
    patrolSpeed: 0.4,
    visionRadius: 3,                     // v6.1: 视野发现敌人即 ENGAGE
    chaseLimit: 5,                       // v6.1: 离核心 5 格停止追击
  },
  heroes: {
    tom: {
      name: '汤姆',
      skills: {
        sweep: {
          radius: 1.5,
          damage: 30,
          fxDuration: 0.3,
          origin: 'self_centered',
        },
      },
    },
  },

  // ----- 虫巢位置（v7: 不再写死，由 generateInitialNests 在象限里随机选）-----
  initialNests: [],                      // v7: 仅作占位；真实位置由 nest.js generateInitialNests
  lateNests: [],                         // v7: 不再使用 Day 3 写死刷新；改为每晚 spawnNightlyNest
  lateNestDay: 3,                        // v7: 不再使用，但保留字段避免破坏

  // v7 虫巢生成（完全随机 + 距离约束）
  nestGeneration: {
    initialCount: 2,
    nightlyEnabled: true,                     // v7: 每晚刷一个新虫巢
    nightlyMaxNests: 8,                       // 同时存在最多 8 个
    nightlyArmoredChance: 0.25,               // 每晚新巢 25% 几率为钢壳
    nightlyMinDistanceFromCore: 4,
    nightlyMinDistanceFromOtherNest: 4,
    nightlyMinDistanceFromBuilding: 2,
  },

  nest: {
    hp: 80, maxHp: 80,
    dayDamageMul: 0.5,
    dawnDamageMul: 1.5,
    spawnIntervals: { day: 12, dusk: 6, night: 8, dawn: Infinity },
    bloodMoonIntervalMul: 0.5,
    warnRange: 3,
    bugCapByDay: [3, 3, 5, 5, 7, 8, 10],   // v6 §8 Day 5 上限是 7（×2 = 14）
    bugCapMax: 14,
  },
  armoredNest: {
    hp: 160, maxHp: 160,
    dayDamageMul: 0.35,
    dawnDamageMul: 1.2,
    spawnIntervals: { day: 10, dusk: 5, night: 7, dawn: Infinity },
    warnRange: 3,
  },

  // ----- 虫子 -----
  bug: {
    hp: 15, maxHp: 15,
    damage: 5, speed: 0.5,
    attackSpeed: 1, attackRange: 1.2,
    bloodMoonStatMul: 1.3,            // 旧 v3 兼容：血月期间普通虫加成（v6 用 bloodMoon.bugHpMul/bugDamageMul 取代）
    wanderRadius: 2,
    idleWanderSpeed: 0.2,
    glueDrop: 2,
  },
  boss: {
    hp: 80, damage: 10, speed: 0.4, maxHp: 80,
    attackSpeed: 1, attackRange: 1.2,
    sizeMul: 1.7,
    glueDrop: 15,
  },
  guardBug: {
    perNest: 3, wanderRadius: 2, warnRange: 2, glueDrop: 2,
  },
  heavyBug: {
    hp: 35, maxHp: 35, damage: 9, speed: 0.35,
    attackSpeed: 0.8, attackRange: 1.2, glueDrop: 6,
  },

  // v6 血月 Boss
  bloodBoss: {
    hp: 300, maxHp: 300,
    damage: 15,
    speed: 0.3,
    attackSpeed: 1, attackRange: 1.2,
    sizeMul: 2.0,
    glueDrop: 50,
    gemsDrop: 2,
    spawnsLootGift: true,             // 击杀后掉一个战利品包
  },

  // ----- 剑士（v6.1: 巡逻/警戒/追击同英雄）-----
  swordsman: {
    hp: 25, maxHp: 25, damage: 6,
    attackSpeed: 1, speed: 0.5,
    attackRange: 1, warnRange: 2,
    maxDistFromHome: 2,                   // v5: 旧字段（仍兼容）
    patrolRadius: 1,                      // v6.1: 3×3 巡逻
    patrolIntervalMin: 4,
    patrolIntervalMax: 6,
    visionRadius: 3,                      // v6.1: 视野
    chaseLimit: 5,                        // v6.1: 离锚点 5 格停止追击
  },

  // ----- 建筑（v6: slow_spike 不可被攻击 + 5 次次数）-----
  collector: {
    hp: 20, maxHp: 20,
    produceInterval: 4, produceAmount: 1,
  },
  reinforcedCollector: {
    hp: 40, maxHp: 40,
    produceInterval: 2, produceAmount: 1,
    warmupTime: 10,
  },
  tower: {
    hp: 40, maxHp: 40,
    attackRange: 2, attackSpeed: 1, damage: 4,
  },
  mageTower: {
    hp: 35, maxHp: 35,
    attackRange: 2.5, attackSpeed: 0.6, damage: 8,
    splashRadius: 1.0,
  },
  slowSpike: {
    hp: 8, maxHp: 8,
    targetable: false,                  // v6: 虫子目标筛选忽略
    usesLeft: 5,                        // v6: 5 次后自毁
    slowMul: 0.5,
    slowLinger: 1.5,
    triggerRadius: 0.7,
    destroyFxDuration: 0.4,
  },
  watchtower: {
    hp: 25, maxHp: 25,
  },

  // v7.1 探照灯：缓慢锥形永久驱散
  searchlight: {
    hp: 30, maxHp: 30,
    scanInterval: 1.5,                 // 每 1.5s 驱散 1 格
    range: 6,                          // 锥形最远距离
    coneHalfAngleDeg: 45,              // 90° 锥形 = ±45°
    targetable: true,
  },
  barracks: {
    hp: 50, maxHp: 50,
    keepSwordsmen: 2,
    respawnTime: 10,
  },

  // ----- 卡牌 -----
  hand: { maxSize: 10 },                // v6: 上限指"堆数"
  // v6: 起始手牌 3 张
  fixedStartingHand: ['collector', 'collector', 'tower'],

  // v6: 卡牌品质分级
  cardRarity: {
    collector: 'normal',
    reinforced_collector: 'rare',
    tower: 'normal',
    mage_tower: 'rare',
    slow_spike: 'rare',
    watchtower: 'rare',
    searchlight: 'normal',             // v7.1
    barracks: 'normal',
    firerain: 'normal',
    repair: 'normal',
    scout: 'normal',
    heal: 'rare',
    lightning: 'epic',
    recall: 'epic',
    sweep: 'normal',                   // 英雄技能
  },

  // v6: 商店栏（v7.1: 直购 7 张普通卡，含探照灯）
  shop: [
    { id: 'collector',   cost: 15 },
    { id: 'tower',       cost: 25 },
    { id: 'barracks',    cost: 30 },
    { id: 'searchlight', cost: 25 },     // v7.1
    { id: 'firerain',    cost: 20 },
    { id: 'repair',      cost: 18 },
    { id: 'scout',       cost: 25 },
  ],

  // v6: 子卡池仅在战利品 + 血月奖励中使用（不再被卡包按钮调用）
  // v6 战利品包从这里抽稀有/史诗
  lootRarePool: [
    { id: 'mage_tower', weight: 22 },
    { id: 'watchtower', weight: 22 },
    { id: 'reinforced_collector', weight: 22 },
    { id: 'slow_spike', weight: 18 },
    { id: 'heal', weight: 16 },
  ],
  lootEpicPool: [
    { id: 'lightning', weight: 60 },
    { id: 'recall', weight: 40 },
  ],

  // v6: 战利品池（虫巢击破掉落）
  cardLootPools: {
    normal: [
      { weight: 50, kind: 'glue', amount: 30 },
      { weight: 25, kind: 'gems', amount: 1 },
      { weight: 25, kind: 'card_rare', amount: 1 },     // v6: 1 张稀有
    ],
    armored: [
      { weight: 35, kind: 'gems', amount: 3 },
      { weight: 25, kind: 'glue', amount: 60 },
      { weight: 40, kind: 'card_rare3', amount: 3 },    // v6: 3 选 1 稀有
    ],
  },

  // ----- 法术数值 -----
  firerain: { radius: 2, damage: 20 },
  scout: {
    speed: 1.2,
    lifetimeAfterArrive: 30,
  },
  heal: {                                // v6
    amount: 30,
    coreAmount: 15,                      // 同一次治疗术，1 格半径含核心也加 15
    radius: 1,                           // v6: 1 格半径 AOE
  },
  lightning: { damage: 25, range: 6 },
  recall: { },

  // ----- 血月（v6 §8）-----
  bloodMoonDay: 5,
  bloodMoon: {
    triggerPhase: 'dusk',                // 第 5 天傍晚开始
    nightDuration: 120,                  // v6: 夜晚 75 → 120s
    bugCapMul: 2,                        // 每巢虫子上限 ×2
    bugHpMul: 1.3,                       // 虫子 HP +30%
    bugDamageMul: 1.2,                   // 虫子攻击 +20%
    bossNestIndex: 1,                    // 第二个虫巢的虫流中混出 Boss（B/D 分别为 idx 1）
    rewardRareCount: 1,                  // 1 张稀有保底
    rewardEpicChance: 0.3,               // 30% 追加 1 张史诗
  },

  // ----- 虫流虚假化（v6 §9：血月后启用）-----
  rallyPoints: [
    { x: 8,  y: 0 },                     // 北
    { x: 8,  y: 9 },                     // 南
    { x: 15, y: 5 },                     // 东
    { x: 0,  y: 5 },                     // 西
  ],

  // ----- 特效时长（秒）-----
  fx: {
    attackLine: 0.1,
    firerain: 0.3,
    sweep: 0.3,
    lightning: 0.25,
    heal: 0.4,
    fade: 0.2,
    newNestRing: 0.4,
    cameraRing: 0.6,
    spikeBreak: 0.4,                    // v6: 地刺碎裂动画
  },

  // ----- v4 礼盒 + v5 兜底 + v6.1 三件齐发 -----
  gift: {
    pickupRange: 1.0,
    autoOpenDelay: 3,
    lifetime: 60,
    bobAmplitude: 0.12,
    flyDuration: 0.6,                    // v6.1: 卡飞入手牌的动画时长
    valuePopDuration: 0.5,               // v6.1: 顶部胶/宝石数字弹跳时长
  },

  // v6.1: 礼盒固定内容（取代 v6 的 cardLootPools 随机三选一）
  // mode: 'direct' = 卡直接入手；'pick3' = 弹 3 选 1 浮层
  lootContents: {
    normal:    { glue: 30, gems: 1, rareCards: 1, mode: 'direct' },
    armored:   { glue: 30, gems: 2, rareCards: 3, mode: 'pick3'  },
    bloodBoss: { glue: 50, gems: 2, rareCards: 1, mode: 'direct' },
  },

  // ----- 迷雾 -----
  fog: {
    heroVisionRadius: 1,
    heroVisionDuration: 5,
    scoutVisionRadius: 1,
    scoutVisionDuration: 30,
    watchtowerRadius: 3,
    coreVisionRadius: 2,
    fadeDuration: 0.4,
    // v6.1: 迷雾攻击暴露
    exposeDuration: 2.5,                  // 暴露持续时长（秒）
    exposePulseRadius: 0.8,               // 红色脉冲圈半径（格）
    exposePulsePeriod: 0.4,               // 单次脉冲周期（秒）
    spikePulseDuration: 0.45,             // 减速地刺触发的绿色脉冲
  },

  // ----- 镜头 -----
  camera: {
    pulsePeriod: 1.4,
  },

  // ----- 战斗与脱战回血（普通单位） -----
  combat: {
    outOfCombatDelay: 5,
    regenPerSec: 2,
  },

  // ----- v7: 进化因子 -----
  evolution: {
    enabled: true,
    base: 1.0,
    perKill: 0.002,                       // 每杀普通虫 +0.2%
    perHeavyKill: 0.005,                  // 重甲虫 +0.5%
    perBossKill: 0.05,                    // Boss / 血月 Boss +5%
    perNestKill: 0.05,                    // 每杀虫巢 +5%
    perDay: 0.10,                         // 每天 +10%
    cap: 3.0,                             // 上限 ×3
    affects: ['hp', 'damage'],            // 仅影响 hp 和 damage
  },

  // ----- v7: 胜利条件 -----
  winCondition: {
    bloodMoonSurvivalOnly: true,
  },

  // ----- v7.1 天赋树 -----
  talents: {
    pointsPerDay: 1,                    // 每天清晨给 1 点
    pointsPerNestKill: 1,               // 每杀 1 个虫巢 +1 点
    pointsPerKills: { every: 10, points: 1 },  // 每 10 个虫子 +1 点
    defs: [
      { id: 'sharp1', name: '锋利 I', cost: 1,
        description: '英雄基础攻击 +5',
        prereq: null, effect: { heroDamage: 5 } },
      { id: 'sharp2', name: '锋利 II', cost: 2,
        description: '英雄基础攻击再 +8',
        prereq: 'sharp1', effect: { heroDamage: 8 } },
      { id: 'tough1', name: '坚韧 I', cost: 1,
        description: '英雄 maxHp +30 + 满血',
        prereq: null, effect: { heroMaxHp: 30, heroHeal: 30 } },
      { id: 'tough2', name: '坚韧 II', cost: 2,
        description: '英雄 maxHp +50 + 满血',
        prereq: 'tough1', effect: { heroMaxHp: 50, heroHeal: 50 } },
      { id: 'swift', name: '迅捷', cost: 2,
        description: '英雄 attackSpeed +60%',
        prereq: 'sharp1', effect: { heroAttackSpeedMul: 1.6 } },
      { id: 'vision', name: '视野', cost: 1,
        description: '英雄 visionRadius +2',
        prereq: null, effect: { heroVisionRadius: 2 } },
      { id: 'expedition', name: '远征', cost: 1,
        description: '英雄追击半径 +3 / marchSpeed +30%',
        prereq: 'vision', effect: { heroChaseLimit: 3, heroMarchSpeedMul: 1.3 } },
      { id: 'sweep_master', name: '扫击精进', cost: 2,
        description: 'sweep CD -10s + damage +15',
        prereq: 'sharp1', effect: { sweepCdReduce: 10, sweepDamage: 15 } },
      { id: 'nestbane', name: '巢穴克星', cost: 2,
        description: '英雄对虫巢伤害 ×1.5',
        prereq: 'sharp2', effect: { heroVsNestMul: 1.5 } },
    ],
  },
};

// ----- v6 §4: 象限工具（供 ASSERT 与 §9 使用）-----
window.QuadrantUtil = {
  of(x, y) {
    if (x < 8 && y < 5) return 'NW';
    if (x >= 8 && y < 5) return 'NE';
    if (x < 8 && y >= 5) return 'SW';
    return 'SE';
  },
};
