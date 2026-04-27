// entities/nest.js —— 虫巢（v7: 位置随机 + 每晚刷新）
function nestCfg(nest) {
  return nest.type === NestType.ARMORED ? G.armoredNest : G.nest;
}

function damageNest(nest, amount) {
  if (!nest.alive) return;
  const cfg = nestCfg(nest);
  let mul = 1;
  if (S.phase === 'day' || S.phase === 'dusk') mul = cfg.dayDamageMul;
  else if (S.phase === 'dawn') mul = cfg.dawnDamageMul;
  nest.hp -= amount * mul;
  if (nest.hp <= 0) {
    nest.hp = 0;
    nest.alive = false;
    onNestDestroyed(nest);
  }
}

// v7: 虫巢被击破 —— 进化计数 + 礼盒 + 飘字
function onNestDestroyed(nest) {
  // v7 进化计数
  if (S.evo) S.evo.nestKills++;
  // 礼盒（v6.1 已统一接口 spawnGift(opts)）
  spawnGift(nest);
  if (typeof spawnFloatingText === 'function') {
    spawnFloatingText(nest.x, nest.y, '虫巢击破!', 'kill-big');
  }
  // v7.1 天赋点：每杀 1 个虫巢 +1
  if (typeof earnTalentPoints === 'function') earnTalentPoints('nestKill', 1);
  // v7: 黎明击破虫巢任务
  if (typeof taskNotify === 'function' && S.phase === 'dawn') {
    taskNotify('nest_killed_at_dawn');
  }
}

function nestCurrentSpawnInterval(nest) {
  const base = nestCfg(nest).spawnIntervals[S.phase];
  if (base === Infinity) return Infinity;
  if (S.bloodMoonActive && S.phase === 'night') {
    return base * G.nest.bloodMoonIntervalMul;
  }
  return base;
}

// v4: 每巢虫子上限按当前 day 查表（写死表）
function nestCurrentBugCap() {
  const arr = G.nest.bugCapByDay;
  const idx = Math.min(S.day - 1, arr.length - 1);
  return arr[Math.max(0, idx)];
}

function aliveNests() {
  return S.nests.filter(n => n.alive);
}

// v7: 已废弃。第 3 天写死位置改为每晚 spawnNightlyNest（在 phase.js night 阶段触发）
function spawnLateNestsIfDue() {
  // NO-OP
}

// v7: 在地图任意位置随机选格 —— 受距离约束（核心 / 其它虫巢 / 建筑）
// 已废弃象限版 randomCellInQuadrant，但保留同名 export 以防外部 caller，签名忽略象限参数
function randomCellAnywhere(opts) {
  opts = opts || {};
  const cfg = G.nestGeneration;
  const minDistCore = opts.minDistCore != null ? opts.minDistCore : cfg.nightlyMinDistanceFromCore;
  const minDistNest = opts.minDistNest != null ? opts.minDistNest : cfg.nightlyMinDistanceFromOtherNest;
  const minDistBuilding = opts.minDistBuilding != null ? opts.minDistBuilding : cfg.nightlyMinDistanceFromBuilding;
  const excludePos = opts.exclude || [];
  for (let attempt = 0; attempt < 60; attempt++) {
    const x = Math.floor(Math.random() * G.mapWidth);
    const y = Math.floor(Math.random() * G.mapHeight);
    // 距核心
    if (Math.hypot(x - G.core.x, y - G.core.y) < minDistCore) continue;
    // 不与现有虫巢/建筑同格
    if (S.nests && S.nests.find(n => n.alive && n.x === x && n.y === y)) continue;
    if (S.buildings && S.buildings.find(b => !b.dead && b.x === x && b.y === y)) continue;
    // 距其它虫巢
    if (S.nests && S.nests.some(n => n.alive && Math.hypot(n.x - x, n.y - y) < minDistNest)) continue;
    // 距已加入 result 的（开局批量生成时用）
    if (excludePos.some(p => Math.hypot(p.x - x, p.y - y) < minDistNest)) continue;
    // 距建筑
    if (S.buildings && S.buildings.some(b => !b.dead && Math.hypot(b.x - x, b.y - y) < minDistBuilding)) continue;
    return { x, y };
  }
  return null;
}

// 兼容旧名（未来如果有人按象限召唤可仍调用）
function randomCellInQuadrant(_q) { return randomCellAnywhere(); }

// v7: 开局生成初始虫巢（完全随机 + 距离约束）
function generateInitialNests() {
  const cfg = G.nestGeneration;
  const result = [];
  for (let i = 0; i < cfg.initialCount; i++) {
    const pos = randomCellAnywhere({ exclude: result });
    if (pos) result.push({ x: pos.x, y: pos.y, type: 'normal' });
  }
  return result;
}

// v7: 每晚刷新一座虫巢（夜晚开始时由 phase.js 调用）
function spawnNightlyNest() {
  const cfg = G.nestGeneration;
  if (!cfg.nightlyEnabled) return null;
  const aliveCount = S.nests.filter(n => n.alive).length;
  if (aliveCount >= cfg.nightlyMaxNests) return null;
  const pos = randomCellAnywhere();
  if (!pos) return null;
  const isArmored = Math.random() < cfg.nightlyArmoredChance;
  const type = isArmored ? NestType.ARMORED : NestType.NORMAL;
  const ncfg = isArmored ? G.armoredNest : G.nest;
  const n = {
    id: nextId(), kind: 'nest',
    x: pos.x, y: pos.y, type,
    hp: ncfg.hp, maxHp: ncfg.maxHp,
    state: 'fortified',
    spawnTimer: ncfg.spawnIntervals.day,
    bugCount: 0,
    alive: true,
    lastCombatAt: 0,
  };
  S.nests.push(n);
  S.fx.push({
    type: 'newNestRing',
    x: n.x, y: n.y,
    timer: G.fx.newNestRing,
    duration: G.fx.newNestRing,
  });
  // v8.2: 新刷虫巢立即孵满虫子（避免刚刷就被秒）
  fillNestToCap(n);
  showMessage(`新虫巢出现：${isArmored ? '钢壳' : '普通'}（已满兵）`);
  return n;
}

// v8: 血月 dusk 触发时的智能补刷虫巢
function spawnBloodMoonNests() {
  const cfg = G.bloodMoon && G.bloodMoon.nestRefreshOnDusk;
  if (!cfg || !cfg.enabled) return [];
  const aliveNow = S.nests.filter(n => n.alive).length;
  // 计算应刷数量
  let toSpawn = Math.max(0, (cfg.minNestsAfter || 3) - aliveNow);
  if (aliveNow === 0) toSpawn += (cfg.extraIfNoNests || 2);
  if (toSpawn === 0) toSpawn = 1;       // 至少刷 1 个（保证压力）
  // 收集已确定要刷的（用于做 elite 计数）
  const result = [];
  let eliteSpawned = 0;
  for (let i = 0; i < toSpawn; i++) {
    const pos = randomCellAnywhere({ exclude: result });
    if (!pos) continue;
    // 决定是否钢壳：剩余指标里若 elite 不够 → 强制；否则按 eliteChanceWhenFew 概率
    const stillNeedElite = (eliteSpawned < (cfg.eliteAtLeast || 1));
    const remaining = toSpawn - i;
    let isArmored;
    if (stillNeedElite && remaining <= ((cfg.eliteAtLeast || 1) - eliteSpawned)) {
      isArmored = true;                  // 必须 elite
    } else if (stillNeedElite || aliveNow < (cfg.minNestsAfter || 3)) {
      isArmored = Math.random() < (cfg.eliteChanceWhenFew || 0.6);
    } else {
      isArmored = Math.random() < 0.3;
    }
    if (isArmored) eliteSpawned++;
    const ncfg = isArmored ? G.armoredNest : G.nest;
    const n = {
      id: nextId(), kind: 'nest',
      x: pos.x, y: pos.y,
      type: isArmored ? NestType.ARMORED : NestType.NORMAL,
      hp: ncfg.hp, maxHp: ncfg.maxHp,
      state: 'fortified',
      spawnTimer: ncfg.spawnIntervals.day * 0.5,    // 血月期间孵化更快
      bugCount: 0,
      alive: true,
      lastCombatAt: 0,
    };
    S.nests.push(n);
    result.push(n);
    S.fx.push({
      type: 'newNestRing',
      x: n.x, y: n.y,
      timer: G.fx.newNestRing,
      duration: G.fx.newNestRing,
    });
    // v8.2: 血月刷的虫巢立即孵满
    fillNestToCap(n);
  }
  if (result.length > 0) {
    showMessage(`血月刷新 ${result.length} 座虫巢（${eliteSpawned} 钢壳，已满兵）`);
  }
  return result;
}

// v8.2: 新虫巢刷出后立即孵化到 cap，避免刚刷就被秒
function fillNestToCap(nest) {
  if (!nest || !nest.alive) return;
  const baseCap = (typeof nestCurrentBugCap === 'function') ? nestCurrentBugCap() : 5;
  const cap = baseCap * (S.bloodMoonActive ? (G.bloodMoon.bugCapMul || 2) : 1);
  let safetyLimit = 30;       // 防止逻辑错误导致死循环
  while (nest.alive && nest.bugCount < cap && safetyLimit-- > 0) {
    if (typeof makeBug !== 'function') break;
    makeBug(nest, {
      bloodMoon: !!S.bloodMoonActive,
      isBloodMoonNight: !!S.bloodMoonActive,
    });
  }
}
window.fillNestToCap = fillNestToCap;

// 暴露给 state.js / phase.js
window.generateInitialNests = generateInitialNests;
window.randomCellAnywhere = randomCellAnywhere;
window.randomCellInQuadrant = randomCellInQuadrant;     // 兼容旧名
window.spawnNightlyNest = spawnNightlyNest;
window.spawnBloodMoonNests = spawnBloodMoonNests;
