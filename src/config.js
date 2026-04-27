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
  TERMINAL_BOSS: 'terminal_boss',     // v8: 通关 Boss
  FAST: 'fast',                       // v7: 快速虫
  FLYING: 'flying',                   // v7: 飞行虫
  EXPLODER: 'exploder',               // v7: 自爆虫
};

// v7: 发现点类型
window.DiscoveryType = {
  RESOURCE: 'resource',
  CHEST: 'chest',
  WILD_CAMP: 'wild_camp',
  SLEEPING_NEST: 'sleeping_nest',
  RELIC: 'relic',
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
    // v8
    terminalBoss: '#4A0080',             // 终极 Boss 暗紫
    terminalBossStroke: '#E0B0FF',
    aggroMark: 'rgba(255,80,80,0.85)',   // 仇恨标记
    treasure: '#F39C12',                 // 宝藏箱橙色
    treasureGlow: 'rgba(255,215,0,0.6)',
  },

  // ----- 阶段（v8: 整体时长缩短约 18%）-----
  phaseDurations: { day: 75, dusk: 12, night: 60, dawn: 10 },
  phaseOrder: ['day', 'dusk', 'night', 'dawn'],

  // ----- v8.2 时间加倍（顶栏 ⏩ 按钮 / F 键切换）-----
  timeScales: [1, 2, 3],

  // ----- 初始（v7: 起始胶 40→30）-----
  initial: {
    day: 1, phase: 'day',
    glue: 50, tokens: 5, gems: 0,           // v8.3: 30→50（开局更宽松）
    tokenCap: 10, tokenPerDay: 1,
  },

  // v7: 开局核心北侧 1 格自带免费箭塔（保证教学夜下限）
  freeStartingTower: { dx: 0, dy: -1 },         // 相对核心位置

  survivalDay: 7,

  // ----- 核心（v7: 21x13 中心 (10,6)）-----
  core: { x: 10, y: 6, hp: 100, maxHp: 100 },
  // v6: 核心回血（独立配置，不走 combat.regenPerSec=2）
  coreRegen: {
    outOfCombatDelay: 5,
    regenPerSec: 1,
  },

  // ----- 英雄（v7: 探索能力增强）-----
  hero: {
    x: 10, y: 7,
    hp: 80, maxHp: 80,
    damage: 10,
    attackRange: 2,
    attackSpeed: 1.25,                   // v7: 1.0→1.25（即 0.8s 一次）
    warnRange: 2,
    marchSpeed: 0.7,                     // 出征速度（保留）
    freeMoveSpeed: 1.0,                  // v7: 自由移动速度
    respawnTime: 20,
    skillCardCD: 25,
    patrolRadius: 1,
    patrolIntervalMin: 4,
    patrolIntervalMax: 6,
    patrolSpeed: 0.4,
    visionRadius: 4,                     // v7: 3→4
    exploreVisionBonus: 1,               // v7: 探索状态额外 +1
    exploreRegenPerSec: 3,               // v7: 探索状态回血
    pickupRange: 2.0,                    // v7: 自动拾取范围（覆盖 gift/treasure pickupRange）
    chaseLimit: 5,
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
    nightlyEnabled: true,
    nightlyMaxNests: 8,
    nightlyArmoredChance: 0.25,
    nightlyMinDistanceFromCore: 6,            // v8.3: 4→6（初始虫巢离核心更远）
    nightlyMinDistanceFromOtherNest: 4,
    nightlyMinDistanceFromBuilding: 2,
  },

  nest: {
    hp: 60, maxHp: 60,                        // v8.3: 80→60（初始虫巢更脆，方便英雄打）
    _v7_hp_was: 80,
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

  // ----- 虫子（v7: hp 15→10、dmg 5→4、glueDrop 2→6）-----
  bug: {
    hp: 10, maxHp: 10,
    damage: 4, speed: 0.5,
    attackSpeed: 1, attackRange: 1.2,
    bloodMoonStatMul: 1.3,
    wanderRadius: 2,
    idleWanderSpeed: 0.2,
    glueDrop: 6,
  },
  // v7 新虫子：快速 / 飞行 / 自爆
  fastBug: {
    hp: 6, maxHp: 6,
    damage: 3, speed: 1.0,
    attackSpeed: 1, attackRange: 1.2,
    glueDrop: 4,
  },
  flyingBug: {
    hp: 15, maxHp: 15,
    damage: 5, speed: 0.6,
    attackSpeed: 1, attackRange: 1.2,
    glueDrop: 8,
    flying: true,                       // 寻路无视 blocker（地面建筑/地刺）
  },
  exploderBug: {
    hp: 8, maxHp: 8,
    damage: 0,                          // 普攻不触发；接近自爆
    speed: 0.4,
    attackSpeed: 1, attackRange: 0,
    glueDrop: 10,
    explodeRadius: 1.5,
    explodeDamage: 25,
    triggerProximity: 1.0,              // 接近核心/塔 1 格内触发自爆
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
    attackSpeed: 0.8, attackRange: 1.2, glueDrop: 15,    // v7: 6→15
    physicalDamageReduction: 0.5,                         // v7: 物理减伤 50%
  },

  // v6 血月 Boss（v7: glueDrop 50→80）
  bloodBoss: {
    hp: 300, maxHp: 300,
    damage: 15,
    speed: 0.3,
    attackSpeed: 1, attackRange: 1.2,
    sizeMul: 2.0,
    glueDrop: 80,
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
    produceInterval: 6, produceAmount: 1,            // v7: 4→6（约 0.17/s 接近 0.15）
  },
  reinforcedCollector: {
    hp: 40, maxHp: 40,
    produceInterval: 3, produceAmount: 1,            // v7: 2→3（约 0.33/s 接近 0.3）
    warmupTime: 10,
  },
  tower: {
    hp: 40, maxHp: 40,
    attackRange: 2, attackSpeed: 1, damage: 6,       // v7: 4→6
  },
  mageTower: {
    hp: 35, maxHp: 35,
    attackRange: 2.5, attackSpeed: 0.6, damage: 15,  // v7: 8→15
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
    ancient_wall: 'special',           // v7: 仅发现点获得
    bug_signal: 'special',
    time_glass: 'special',
  },

  // v7: 特殊卡池（rarity = 'special'，仅遗迹/宝箱可获得）
  specialCards: ['ancient_wall', 'bug_signal', 'time_glass'],

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

  // ----- 血月（v8: 多次触发 + 加压）-----
  bloodMoonDay: 5,                       // v8.3: 3→5（首次血月推后）
  bloodMoonDays: [5, 8, 11],             // v8.3: [3,6,9]→[5,8,11]
  winRequiredBloodMoons: 2,              // 撑过 2 次后下一个 dawn 刷终极 Boss
  bloodMoon: {
    triggerPhase: 'dusk',
    nightDuration: 80,                   // v8.3: 95→80
    bugCapMul: 1.8,                      // v8.3: 2.2→1.8（首次血月不爆炸）
    bugHpMul: 1.25,                      // v8.3: 1.4→1.25
    bugDamageMul: 1.2,                   // v8.3: 1.3→1.2
    bossNestIndex: 0,                    // v8: 改为第一个虫巢（避免没第二个）
    rewardRareCount: 1,
    rewardEpicChance: 0.35,
    // v8: 血月夜 dusk 触发时按当前虫巢数刷新加压
    nestRefreshOnDusk: {
      enabled: true,
      minNestsAfter: 3,                  // 刷完后至少有这么多活巢
      eliteAtLeast: 1,                   // 至少 1 个钢壳
      extraIfNoNests: 2,                 // 完全没活巢时额外多刷 2
      eliteChanceWhenFew: 0.6,           // 当前活巢 < minNestsAfter 时新巢钢壳几率
    },
  },

  // v8: 终极 Boss（撑过 winRequiredBloodMoons 次血月后 dawn 刷出）
  terminalBoss: {
    hp: 600, maxHp: 600,
    damage: 25,
    speed: 0.35,
    attackSpeed: 1, attackRange: 1.5,
    sizeMul: 2.5,
    glueDrop: 100,
    gemsDrop: 5,
    spawnAt: 'core_periphery',           // 在核心 4-6 格之外随机点
  },

  // v8: 仇恨机制
  aggro: {
    attractsAggroBuildings: ['watchtower', 'searchlight'],   // 视野建筑
    scoutAttractsAggro: true,                                 // 侦察兵也吸引仇恨
    rangeMulWhenAggroVisible: 2,                              // 视野/警戒范围 ×2
    scoutHp: 8,
    scoutMaxHp: 8,
  },

  // v8: 探索奖励（v8.2: pickupRange 0.8→1.4 + 可点击）
  treasures: {
    enabled: true,
    initialCount: 4,
    minDistanceFromCore: 5,
    minDistanceFromOther: 3,
    pickupRange: 1.4,
    rewardPool: [
      { weight: 40, kind: 'glue', amount: 25 },
      { weight: 25, kind: 'gems', amount: 1 },
      { weight: 20, kind: 'card_rare', amount: 1 },
      { weight: 15, kind: 'glue', amount: 50 },
    ],
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

  // ----- v8.3 防御塔/采胶器升级 -----
  // 每个建筑最多 2 级升级（lvl 0 = 默认；lvl 1/2 = 升级）
  buildingUpgrades: {
    tower: [
      { cost: 30, hpAdd: 20, damageMul: 1.5, attackSpeedMul: 1.0, rangeAdd: 0 },
      { cost: 60, hpAdd: 30, damageMul: 1.5, attackSpeedMul: 1.3, rangeAdd: 0.5 },
    ],
    mage_tower: [
      { cost: 50, hpAdd: 15, damageMul: 1.4, attackSpeedMul: 1.0, splashMul: 1.2 },
      { cost: 90, hpAdd: 25, damageMul: 1.4, attackSpeedMul: 1.3, splashMul: 1.3 },
    ],
    collector: [
      { cost: 25, hpAdd: 15, produceAdd: 1 },
      { cost: 50, hpAdd: 20, produceAdd: 1 },
    ],
    reinforced_collector: [
      { cost: 40, hpAdd: 20, produceAdd: 1 },
      { cost: 80, hpAdd: 30, produceAdd: 2 },
    ],
    barracks: [
      { cost: 40, hpAdd: 30, swordsmanHpMul: 1.3, swordsmanDmgMul: 1.2 },
      { cost: 80, hpAdd: 50, swordsmanHpMul: 1.5, swordsmanDmgMul: 1.5 },
    ],
    watchtower: [
      { cost: 25, hpAdd: 15, radiusAdd: 1 },
      { cost: 50, hpAdd: 20, radiusAdd: 1 },
    ],
    searchlight: [
      { cost: 25, hpAdd: 15, intervalMul: 0.7 },          // 1.5s → 1.05s
      { cost: 50, hpAdd: 20, intervalMul: 0.5 },          // → 0.75s
    ],
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

  // ===== v7 节奏与玩法重塑 =====

  // v7: 每天虫子组成比例（spawn.js makeBug 时按比例选虫种）
  // 教学期 D1 极简、D2 引入快速、D4 飞行、D5+ 自爆
  nightlyEnemyMix: {
    1: { normal: 1.00 },
    2: { normal: 0.85, fast: 0.15 },
    3: { normal: 0.65, fast: 0.20, heavy: 0.15 },
    4: { normal: 0.55, fast: 0.20, heavy: 0.15, flying: 0.10 },
    5: { normal: 0.45, fast: 0.20, heavy: 0.15, flying: 0.15, exploder: 0.05 },
    6: { normal: 0.40, fast: 0.20, heavy: 0.20, flying: 0.15, exploder: 0.05 },
    default: { normal: 0.40, fast: 0.20, heavy: 0.20, flying: 0.15, exploder: 0.05 },
  },

  // v7: 来袭预警（傍晚阶段开始时显示）
  raidWarning: {
    enabled: true,
    precisePrecisionDays: 2,            // Day 1-2 精确（含数量、方向、类型）
    roughPrecisionDays: 4,              // Day 3-4 粗略（方向、约数、主要类型）
    // Day 5+ 仅"规模：大"；血月夜不预警（直接红字）
    durationOnDusk: 15,                 // 与傍晚阶段同步显示
  },

  // v7: 任务系统
  tasks: {
    // 教学期 4 个固定任务（按顺序）
    tutorial: [
      {
        id: 'tut1', title: '放下采胶器',
        description: '把"基础采胶器"打到地图空格上',
        trigger: 'place_collector', count: 1,
        reward: { glue: 10 },
      },
      {
        id: 'tut2', title: '建造箭塔',
        description: '从顶部商店买一座箭塔，放在核心附近',
        trigger: 'place_tower', count: 1,
        reward: { glue: 5 },
      },
      {
        id: 'tut3', title: '英雄首胜',
        description: '让英雄打死一只虫子',
        trigger: 'hero_kill_bug', count: 1,
        reward: { card: 'normal' },
      },
      {
        id: 'tut4', title: '撑过第一夜',
        description: '少量虫子从西方来袭，守住核心',
        trigger: 'survive_first_night', count: 1,
        reward: { gems: 1, card: 'rare' },
        endsTutorial: true,
        endsTutorialMessage: '第一夜过去了。世界还在等你。',
      },
    ],
    // 长线任务（教学结束后激活，最多同时 3 个）
    longRunning: [
      { id: 'explorer', title: '探索者', description: '驱散 30% 地图', trigger: 'fog_revealed_pct', count: 0.3, reward: { glue: 30 } },
      { id: 'scavenger', title: '拾荒者', description: '拾取 5 个发现点', trigger: 'discovery_pickup', count: 5, reward: { card: 'rare' } },
      { id: 'first_blood', title: '第一血', description: '击败 1 个野怪据点', trigger: 'wildcamp_defeated', count: 1, reward: { gems: 1 } },
      { id: 'dawn_strike', title: '黎明袭击', description: '在黎明阶段击破 1 个虫巢', trigger: 'nest_killed_at_dawn', count: 1, reward: { glue: 50, gems: 2 } },
      { id: 'remote_kill', title: '远程奇袭', description: '用闪电击杀重甲虫', trigger: 'lightning_kill_heavy', count: 1, reward: { card: 'rare' } },
      { id: 'gem_collector', title: '收集者', description: '累积 5 颗宝石', trigger: 'gems_total', count: 5, reward: { card: 'special' } },
      { id: 'blood_moon_survivor', title: '血月幸存者', description: '撑过一次血月夜', trigger: 'blood_moon_survived', count: 1, reward: { card: 'epic' } },
      { id: 'purifier', title: '净化者', description: '击败终极 BOSS', trigger: 'terminal_boss_killed', count: 1, reward: { glue: 200 } },
    ],
    activeMaxTutorial: 1,                // 教学期一次只显示 1 个
    activeMaxLongRunning: 3,
  },

  // v7: 5 类迷雾发现点
  discoveryPoints: {
    enabled: true,
    totalCount: 12,                      // 实际 = totalCount + random(0..variance)
    totalCountVariance: 3,
    minDistanceFromCore: 5,
    minDistanceFromOther: 3,
    pickupRange: 1.4,
    typeWeights: {
      resource: 5,
      chest: 3,
      wild_camp: 3,
      sleeping_nest: 1,
      relic: 1,                          // 至少 1 个必现
    },
    minRelics: 1,
    resource: {
      rewards: [
        { weight: 50, kind: 'glue', amount: 20 },
        { weight: 50, kind: 'glue', amount: 30 },
      ],
    },
    chest: {
      openDuration: 0.5,
      rewards: [
        { weight: 30, kind: 'card', rarity: 'normal' },
        { weight: 30, kind: 'card', rarity: 'rare' },
        { weight: 20, kind: 'glue', amount: 50 },
        { weight: 10, kind: 'gems', amount: 1 },
        { weight: 10, kind: 'card', rarity: 'special' },
      ],
    },
    wildCamp: {
      bugCountMin: 2, bugCountMax: 4,
      bugType: 'normal',                 // 据点用普通虫
      passiveAggro: false,               // 不主动攻击玩家
      reward: { glue: 30, card: 'normal' },
      respawnDays: 2,
      revealRadiusOnDefeat: 2,           // 击破后周围 2 格永久驱散
    },
    sleepingNest: {
      awakenOnBloodMoon: true,           // 血月唤醒变正常虫巢
      reward: { lootGift: 'normal', card: 'special' },
    },
    relic: {
      events: [
        { id: 'core_hp', text: '「他们曾在这里筑墙。」核心永久 +50 最大生命', effect: { coreMaxHp: 50 } },
        { id: 'token_perm', text: '「号令仍在。」+1 出征令牌、令牌上限永久 +1', effect: { tokenInstant: 1, tokenCapBonus: 1 } },
        { id: 'special_card', text: '「藏在墙缝里的卡片。」获得一张特殊稀有卡', effect: { addSpecialCard: true } },
        { id: 'collector_buff', text: '「这是采集图纸。」采胶器永久 +30% 产出', effect: { collectorMul: 1.3 } },
      ],
    },
  },

  // ----- v7.1 / v8.1 天赋树（4 大类：英雄 / 公共 / 军事 / 生产）-----
  talents: {
    pointsPerDay: 1,                    // 每天清晨给 1 点
    pointsPerNestKill: 1,               // 每杀 1 个虫巢 +1 点
    pointsPerKills: { every: 15, points: 1 },  // v8.3: 5→15（节奏减半再减半）
    categories: [
      { id: 'hero',       label: '英雄' },
      { id: 'common',     label: '公共' },
      { id: 'military',   label: '军事' },
      { id: 'production', label: '生产' },
    ],
    defs: [
      // ===== 英雄 =====
      { id: 'sharp1', category: 'hero', name: '锋利 I', cost: 1,
        description: '英雄基础伤害 +5',
        prereq: null, effect: { heroDamage: 5 } },
      { id: 'sharp2', category: 'hero', name: '锋利 II', cost: 2,
        description: '英雄基础伤害再 +8',
        prereq: 'sharp1', effect: { heroDamage: 8 } },
      { id: 'tough1', category: 'hero', name: '坚韧 I', cost: 1,
        description: '英雄最大生命 +30，立即回满',
        prereq: null, effect: { heroMaxHp: 30, heroHeal: 30 } },
      { id: 'tough2', category: 'hero', name: '坚韧 II', cost: 2,
        description: '英雄最大生命 +50，立即回满',
        prereq: 'tough1', effect: { heroMaxHp: 50, heroHeal: 50 } },
      { id: 'swift', category: 'hero', name: '迅捷', cost: 2,
        description: '英雄攻速 +60%',
        prereq: 'sharp1', effect: { heroAttackSpeedMul: 1.6 } },
      { id: 'vision', category: 'hero', name: '视野', cost: 1,
        description: '英雄视野半径 +2',
        prereq: null, effect: { heroVisionRadius: 2 } },
      { id: 'expedition', category: 'hero', name: '远征', cost: 1,
        description: '英雄追击半径 +3，行军速度 +30%',
        prereq: 'vision', effect: { heroChaseLimit: 3, heroMarchSpeedMul: 1.3 } },
      { id: 'sweep_master', category: 'hero', name: '扫击精进', cost: 2,
        description: '扫击冷却 −10 秒，伤害 +15',
        prereq: 'sharp1', effect: { sweepCdReduce: 10, sweepDamage: 15 } },
      { id: 'nestbane', category: 'hero', name: '巢穴克星', cost: 2,
        description: '英雄对虫巢伤害 ×1.5',
        prereq: 'sharp2', effect: { heroVsNestMul: 1.5 } },

      // ===== 公共（所有建筑生效）=====
      { id: 'fortify1', category: 'common', name: '坚固结构 I', cost: 2,
        description: '所有建筑最大生命 +20%（含已建）',
        prereq: null, effect: { buildingHpMul: 1.20 } },
      { id: 'fortify2', category: 'common', name: '坚固结构 II', cost: 2,
        description: '所有建筑最大生命再 +20%',
        prereq: 'fortify1', effect: { buildingHpMul: 1.20 } },
      { id: 'rapid_repair', category: 'common', name: '紧急维修', cost: 2,
        description: '所有建筑脱战回血速率 +50%',
        prereq: null, effect: { buildingRegenMul: 1.5 } },
      { id: 'gushing_glue', category: 'common', name: '资源涌泉', cost: 2,
        description: '每天清晨获得 30 胶质',
        prereq: null, effect: { dailyGlueBonus: 30 } },
      { id: 'farsight_grid', category: 'common', name: '远视联防', cost: 1,
        description: '所有攻击型建筑射程 +0.5',
        prereq: null, effect: { towerRangeBonus: 0.5 } },

      // ===== 军事 =====
      { id: 'arrow_master1', category: 'military', name: '箭塔精进 I', cost: 2,
        description: '箭塔伤害 +50%',
        prereq: null, effect: { towerDamageMul: 1.5 } },
      { id: 'arrow_master2', category: 'military', name: '箭塔精进 II', cost: 2,
        description: '箭塔攻速 +50%',
        prereq: 'arrow_master1', effect: { towerAttackSpeedMul: 1.5 } },
      { id: 'barracks_strong', category: 'military', name: '剑士营强化', cost: 2,
        description: '剑士最大生命 +50%、伤害 +30%',
        prereq: null, effect: { swordsmanHpMul: 1.5, swordsmanDamageMul: 1.3 } },
      { id: 'mage_focus', category: 'military', name: '法师精纯', cost: 2,
        description: '法师塔范围 ×1.5、伤害 +30%',
        prereq: null, effect: { mageSplashMul: 1.5, mageDamageMul: 1.3 } },
      { id: 'spike_durable', category: 'military', name: '锐利地刺', cost: 1,
        description: '减速地刺使用次数 5 → 8',
        prereq: null, effect: { spikeUsesBonus: 3 } },

      // ===== 生产 =====
      { id: 'glue_harvest', category: 'production', name: '采胶丰收', cost: 2,
        description: '采胶器单次产出 +1（普通 1 → 2）',
        prereq: null, effect: { collectorProduceBonus: 1 } },
      { id: 'workshop_warm', category: 'production', name: '工坊速热', cost: 1,
        description: '加固采胶器暖机时长 −5 秒',
        prereq: null, effect: { reinforcedWarmupReduce: 5 } },
      { id: 'farsight_tower', category: 'production', name: '望远千里', cost: 2,
        description: '瞭望塔半径 +1（3 → 4）',
        prereq: null, effect: { watchtowerRadiusBonus: 1 } },
      { id: 'lantern_swift', category: 'production', name: '灯火通明', cost: 2,
        description: '探照灯扫描频率 +30%（间隔 1.5s → 1.05s）',
        prereq: null, effect: { searchlightIntervalMul: 0.7 } },
      { id: 'far_scout', category: 'production', name: '远程斥候', cost: 1,
        description: '侦察兵移速 ×1.5、抵达后停留 +10 秒',
        prereq: null, effect: { scoutSpeedMul: 1.5, scoutLifetimeBonus: 10 } },
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
