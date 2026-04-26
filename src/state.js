// state.js —— GameState 单例 + 重置（v6: handStacks）
window.S = null;
window._nextId = 1;
function nextId() { return window._nextId++; }

function resetState() {
  const cfg = window.G;
  window._nextId = 1;
  const now = performance.now();

  window.S = {
    day: cfg.initial.day,
    phase: cfg.initial.phase,
    phaseTimer: cfg.phaseDurations[cfg.initial.phase],
    paused: false,
    timeScale: 1,                       // v8.2 时间加倍倍数
    glue: cfg.initial.glue,
    tokens: cfg.initial.tokens,
    bloodMoonIn: Math.max(0, cfg.bloodMoonDay - cfg.initial.day),
    bloodMoonActive: false,
    bloodMoonTriggered: false,
    gameOver: false,
    victory: false,
    defeat: false,
    victoryReason: null,

    lateNestsSpawned: false,

    playerState: {
      gems: cfg.initial.gems,
      lifetimeKills: 0,
      giftsCollected: 0,
    },

    core: {
      id: nextId(), kind: 'core',
      x: cfg.core.x, y: cfg.core.y,
      hp: cfg.core.hp, maxHp: cfg.core.maxHp,
      lastCombatAt: 0,                // v5
    },

    hero: {
      id: nextId(), kind: 'hero',
      x: cfg.hero.x, y: cfg.hero.y,
      homeX: cfg.hero.x, homeY: cfg.hero.y,
      hp: cfg.hero.hp, maxHp: cfg.hero.maxHp,
      damage: cfg.hero.damage,
      attackRange: cfg.hero.attackRange,
      attackSpeed: cfg.hero.attackSpeed,
      attackCd: 0,
      state: 'atBase',
      target: null,
      respawnTimer: 0,
      skillCardTimer: cfg.hero.skillCardCD,
      warnRange: cfg.hero.warnRange,
      lastCombatAt: 0,                // v5: 脱战回血计时基准
      // v5 英雄技能宪法：schema 引用（origin 等元数据从 G.heroes.tom.skills.* 读）
      skills: { sweep: cfg.heroes.tom.skills.sweep },
    },

    nests: [],

    buildings: [],
    bugs: [],
    swordsmen: [],
    scouts: [],                       // v5: 侦察兵单位
    gifts: [],
    treasures: [],                    // v8: 探索奖励点

    // v6: hand 改为 stack 数组 [{ cardId, count }]
    hand: [],
    heroSkillSlot: null,                // 启动时立即给 sweep（见 resetState 末尾）

    // v6: 跨阶段 flags（由 phase.js / cards.js 读写）
    flags: {
      bloodMoonAnnounced: false,        // v6: 第 1 次血月预告
      rallyEnabled: false,
      rallyChangeAnnounced: false,
      bloodMoonSurvived: false,         // v7: 撑过血月夜（保留 flag，但 v8 不再用作胜利）
      // v8 新增
      bloodMoonsCompleted: 0,           // 已完成的血月次数
      bloodMoonsAnnounced: {},          // { day: bool } 防止同一日重复 announce
      terminalBossSpawned: false,
      terminalBossKilled: false,        // v8: 击杀 → checkWinLose 触发胜利
    },

    placementMode: null,
    pendingNestClick: null,
    hoveredNestId: null,
    hoveredBuildingId: null,
    hoveredCardIndex: null,
    hoveredShopIndex: null,            // v6: 商店 hover
    hoveredOverlayIndex: null,         // v6: 卡包浮层 hover
    selectedBuildingId: null,
    cameraTargetId: null,
    cameraRingTimer: 0,

    // v6: 卡包/奖励浮层（kind: 'lootPick3' | 'lootSingle' | 'bloodMoonReward'）
    overlay: null,

    // v5: 迷雾
    fogMap: null,                     // 由 initFog() 填充

    scoutTimer: 0,                    // 旧 scout 全图揭虫巢功能（v5 已不再使用，但保留兼容）

    fx: [],
    message: null,

    mouseX: 0, mouseY: 0,
  };

  // v6: 起始手牌按 stack 添加
  for (const id of cfg.fixedStartingHand) addCardToHand(id);

  // v7: 进化因子计数
  S.evo = { kills: 0, nestKills: 0 };

  // v5: 初始化迷雾
  if (typeof initFog === 'function') initFog();

  // v7: 动态生成初始虫巢（在 initFog 之后，使虫巢可落在迷雾里）
  if (typeof generateInitialNests === 'function') {
    const initialList = generateInitialNests();
    for (const n of initialList) S.nests.push(makeInitialNest(n));
  }

  // v7.1: 英雄技能默认可用（开局立即一张 sweep + skillCardTimer 留 0 兜底）
  S.heroSkillSlot = makeCardInstance('sweep');
  S.hero.skillCardTimer = 0;

  // v7.1: 天赋树 state 初始化 + 应用任何已解锁效果（重启后 unlocked=[] 等于不应用）
  S.talents = { points: 0, unlocked: [], killCounter: 0 };
  if (typeof applyAllTalentEffects === 'function') applyAllTalentEffects();

  // v8: 撒探索奖励点（在虫巢生成后避免位置冲突）
  if (typeof generateInitialTreasures === 'function') generateInitialTreasures();
}

function makeInitialNest(n) {
  const isArmored = n.type === NestType.ARMORED;
  const cfg = isArmored ? G.armoredNest : G.nest;
  return {
    id: nextId(), kind: 'nest',
    x: n.x, y: n.y,
    type: n.type || NestType.NORMAL,
    hp: cfg.hp, maxHp: cfg.maxHp,
    state: 'fortified',
    spawnTimer: cfg.spawnIntervals.day,
    bugCount: 0,
    alive: true,
    lastCombatAt: 0,
  };
}

// v6: 兼容旧调用（ai.js 仍用 makeCardInstance('sweep')）。
// 返回 { uid, def } 单卡对象，供 heroSkillSlot 用。
function makeCardInstance(defId) {
  const def = window.CARD_DEFS[defId];
  return { uid: nextId(), def };
}

// ===== v6: handStacks 工具 =====
function addCardToHand(cardId) {
  if (!S || !S.hand) return null;
  // 已有同 id 堆 → 直接 +1
  const existing = S.hand.find(s => s.cardId === cardId);
  if (existing) { existing.count += 1; return existing; }
  // 否则若堆数超上限 → 拒绝
  if (S.hand.length >= G.hand.maxSize) return null;
  const stack = { cardId, count: 1 };
  S.hand.push(stack);
  return stack;
}

function popTopOfStack(stackIndex) {
  if (!S || !S.hand) return null;
  const s = S.hand[stackIndex];
  if (!s) return null;
  s.count -= 1;
  const id = s.cardId;
  if (s.count <= 0) S.hand.splice(stackIndex, 1);
  return id;
}

function handTotalCards() {
  if (!S || !S.hand) return 0;
  return S.hand.reduce((acc, s) => acc + s.count, 0);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// v7: 进化因子（agent B 在 makeBug 调用，应用到 hp/damage）
function currentEvoFactor() {
  if (!G.evolution || !G.evolution.enabled) return 1.0;
  const e = (S && S.evo) || { kills: 0, nestKills: 0 };
  const day = (S && S.day) || 1;
  const f = G.evolution.base
    + e.kills * G.evolution.perKill
    + e.nestKills * G.evolution.perNestKill
    + Math.max(0, day - 1) * G.evolution.perDay;
  return Math.min(G.evolution.cap, f);
}
window.currentEvoFactor = currentEvoFactor;
