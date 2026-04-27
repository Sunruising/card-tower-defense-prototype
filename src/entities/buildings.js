// entities/buildings.js —— v5: 7 种建筑工厂
//   collector / reinforced_collector / tower / mage_tower / slow_spike / watchtower / barracks
//   v7.1: + searchlight 探照灯（缓慢锥形永久驱散）
function makeBuilding(type, x, y, opts) {
  opts = opts || {};
  const cfg = G[buildingCfgKey(type)];
  const buildingHpMul = (S.mul && S.mul.buildingHpMul) || 1;
  const b = {
    id: nextId(), kind: 'building',
    type,
    x, y,
    hp: cfg.hp * buildingHpMul,
    maxHp: cfg.maxHp * buildingHpMul,
    lastCombatAt: 0,             // v5
  };
  if (type === 'collector') {
    b.produceTimer = G.collector.produceInterval;
  } else if (type === 'reinforced_collector') {
    b.produceTimer = G.reinforcedCollector.produceInterval;
    // v8.1: reinforcedWarmupReduce 累减暖机时长（不低于 0）
    b.warmupTimer = Math.max(0, G.reinforcedCollector.warmupTime - ((S.mul && S.mul.reinforcedWarmupReduce) || 0));
  } else if (type === 'tower') {
    b.attackCd = 0;
  } else if (type === 'mage_tower') {
    b.attackCd = 0;
  } else if (type === 'slow_spike') {
    // v6 §3: 不可被攻击 + 5 次使用次数
    b.targetable = G.slowSpike.targetable;       // false
    // v8.1: spikeUsesBonus 累加到 usesLeft
    b.usesLeft = G.slowSpike.usesLeft + ((S.mul && S.mul.spikeUsesBonus) || 0);
    b.usedOnBugs = new Set();                     // 同一只虫子在同一地刺只扣 1 次
  } else if (type === 'watchtower') {
    // v5: 建造立即永久揭雾
    // v8.1: watchtowerRadiusBonus 累加到揭雾半径
    if (typeof revealPermanent === 'function') {
      revealPermanent(x, y, G.fog.watchtowerRadius + ((S.mul && S.mul.watchtowerRadiusBonus) || 0), 'watchtower#' + b.id);
    }
    // v8: 视野单位吸引仇恨
    b.attractsAggro = true;
  } else if (type === 'barracks') {
    b.respawnQueue = [];
    for (let i = 0; i < G.barracks.keepSwordsmen; i++) {
      makeSwordsman(b, b.x + (Math.random() * 1.2 - 0.6), b.y + (Math.random() * 1.2 - 0.6));
    }
  } else if (type === 'searchlight') {
    b.direction = opts.direction || 'right';
    b.scanTimer = G.searchlight.scanInterval * ((S.mul && S.mul.searchlightIntervalMul) || 1);
    b.targetable = G.searchlight.targetable;
    b.fogOwnerId = 'searchlight#' + b.id;
    b.attractsAggro = true;
  } else if (type === 'stone_wall') {
    // v7.1: 阻挡寻路（飞行虫无视）—— 不主动攻击
    b.blocksPath = true;
  } else if (type === 'outpost') {
    // v7.1: 远程低伤 + 永久驱散 3×3 + 优先飞行虫
    b.attackCd = 0;
    if (typeof revealPermanent === 'function') {
      revealPermanent(x, y, G.outpost.revealRadius, 'outpost#' + b.id);
    }
    b.fogOwnerId = 'outpost#' + b.id;
    b.attractsAggro = true;            // 视野建筑同样吸引仇恨
  } else if (type === 'repair_station') {
    // v7.1: 周围 3×3 玩家建筑每秒回血 +2
    b.healTimer = G.repairStation.healInterval;
  } else if (type === 'supply_station') {
    // v7.1: 夜后 +5 胶（结算由 phase.js 处理）
    b.supplyBonusBase = G.supplyStation.nightEndBonus;
  }
  // v8.3: 升级等级初始化为 0
  b.upgradeLevel = 0;
  S.buildings.push(b);
  return b;
}

// v8.3: 升级建筑（消耗胶质，按 G.buildingUpgrades[type] 应用增量）
function upgradeBuilding(b) {
  if (!b || b.dead) return false;
  const ladder = G.buildingUpgrades && G.buildingUpgrades[b.type];
  if (!ladder) { if (typeof showMessage === 'function') showMessage('该建筑无升级'); return false; }
  const lvl = b.upgradeLevel || 0;
  if (lvl >= ladder.length) { if (typeof showMessage === 'function') showMessage('已满级'); return false; }
  const up = ladder[lvl];
  if (S.glue < up.cost) { if (typeof showMessage === 'function') showMessage('胶质不足（需 ' + up.cost + '）'); return false; }
  S.glue -= up.cost;
  b.upgradeLevel = lvl + 1;
  // 应用效果
  if (up.hpAdd) {
    b.maxHp += up.hpAdd;
    b.hp += up.hpAdd;     // 升级时回这部分血
  }
  if (up.damageMul) b.damageMul = (b.damageMul || 1) * up.damageMul;
  if (up.attackSpeedMul) b.attackSpeedMul = (b.attackSpeedMul || 1) * up.attackSpeedMul;
  if (up.rangeAdd) b.rangeBonus = (b.rangeBonus || 0) + up.rangeAdd;
  if (up.splashMul) b.splashMul = (b.splashMul || 1) * up.splashMul;
  if (up.produceAdd) b.produceBonus = (b.produceBonus || 0) + up.produceAdd;
  if (up.intervalMul) b.intervalMul = (b.intervalMul || 1) * up.intervalMul;
  if (up.radiusAdd && b.type === 'watchtower' && typeof revealPermanent === 'function') {
    revealPermanent(b.x, b.y, (G.fog.watchtowerRadius + (S.mul && S.mul.watchtowerRadiusBonus || 0)) + b.radiusBonus + up.radiusAdd, 'watchtower#' + b.id);
    b.radiusBonus = (b.radiusBonus || 0) + up.radiusAdd;
  }
  if (up.swordsmanHpMul) b.swordsmanHpMul = (b.swordsmanHpMul || 1) * up.swordsmanHpMul;
  if (up.swordsmanDmgMul) b.swordsmanDmgMul = (b.swordsmanDmgMul || 1) * up.swordsmanDmgMul;
  if (typeof showMessage === 'function') showMessage('升级成功 → Lv.' + b.upgradeLevel);
  if (typeof spawnFloatingText === 'function') spawnFloatingText(b.x, b.y, '升级 Lv.' + b.upgradeLevel, 'loot');
  return true;
}

// v8.3: 查询升级信息
function getUpgradeInfo(b) {
  if (!b) return null;
  const ladder = G.buildingUpgrades && G.buildingUpgrades[b.type];
  if (!ladder) return null;
  const lvl = b.upgradeLevel || 0;
  const next = ladder[lvl];
  return { level: lvl, maxLevel: ladder.length, next };
}

window.upgradeBuilding = upgradeBuilding;
window.getUpgradeInfo = getUpgradeInfo;

// v7.1: 由 placement 子流程或外部调用以更改方向
function setSearchlightDirection(b, dir) {
  if (!b || b.type !== 'searchlight') return;
  if (!['up','down','left','right'].includes(dir)) return;
  b.direction = dir;
}
if (typeof window !== 'undefined') window.setSearchlightDirection = setSearchlightDirection;

function buildingCfgKey(type) {
  // type → G 字段名（多数同名，少数 camelCase）
  const map = {
    // 旧采集器（v7.1 已废弃，但保留 cfgKey 兜底以防外部触发）
    collector: 'collector',
    reinforced_collector: 'reinforcedCollector',
    tower: 'tower',
    mage_tower: 'mageTower',
    slow_spike: 'slowSpike',
    watchtower: 'watchtower',
    barracks: 'barracks',
    searchlight: 'searchlight',
    // v7.1 工事
    stone_wall: 'stoneWall',
    outpost: 'outpost',
    repair_station: 'repairStation',
    supply_station: 'supplyStation',
  };
  return map[type] || type;
}

function killBuilding(b) {
  b.dead = true;
  // v5: 瞭望塔毁灭时回滚揭雾（保留与主区相连部分）
  if (b.type === 'watchtower' && typeof removePermanent === 'function') {
    removePermanent('watchtower#' + b.id);
  }
  // v7.1: 哨所毁灭时回滚揭雾（与瞭望塔同处理）
  if (b.type === 'outpost' && typeof removePermanent === 'function') {
    removePermanent('outpost#' + b.id);
  }
  // v8: 探照灯被毁/拆除时不回滚 fog —— 已驱散的格子永久保留为 visible
  // owner key 仍存在于 fog 的 ownersMap 中，那些格子的 ownerCount 不会减；
  // 即使建筑实例没了，格子仍属于该 owner，永久 visible（"废弃 owner 但不主动撤销"）。
  // 长期运行 ownersMap 会积累，接受这个轻量泄漏。
  // —— v7.1 的 removePermanent(b.fogOwnerId) 已删除。
}

function removeBuilding(b) {
  // 手动拆除
  killBuilding(b);
}

// v6 §3: 减速地刺触发一次使用，扣次数；同一虫子只扣一次；usesLeft <= 0 自毁 + 碎裂 fx
function consumeSpikeUse(spike, bug) {
  if (!spike || spike.dead) return;
  if (spike.type !== 'slow_spike') return;
  if (!bug || bug.id == null) return;
  if (!spike.usedOnBugs) spike.usedOnBugs = new Set();
  if (spike.usedOnBugs.has(bug.id)) return;       // 已扣过，不重复
  spike.usedOnBugs.add(bug.id);
  spike.usesLeft = (spike.usesLeft || 0) - 1;
  // v6.1 §3: 触发减速 → 该格绿色脉冲（区别于红色"暴露"）
  if (typeof pushSpikePulseFx === 'function') pushSpikePulseFx(spike.x, spike.y);
  if (spike.usesLeft <= 0) {
    killBuilding(spike);
    if (S && S.fx) {
      S.fx.push({
        type: 'spikeBreak',
        x: spike.x, y: spike.y,
        timer: G.fx.spikeBreak,
        duration: G.fx.spikeBreak,
      });
    }
  }
}

function isBlocker(x, y) {
  if (S.core.x === x && S.core.y === y) return 'core';
  for (const n of S.nests) if (n.alive && n.x === x && n.y === y) return 'nest';
  for (const b of S.buildings) if (!b.dead && b.x === x && b.y === y) return 'building';
  return null;
}

function cellHasEnemyUnit(x, y) {
  for (const bug of S.bugs) {
    if (bug.dead) continue;
    if (Math.floor(bug.x) === x && Math.floor(bug.y) === y) return true;
  }
  return false;
}

function cellInsideMap(x, y) {
  return x >= 0 && x < G.mapWidth && y >= 0 && y < G.mapHeight;
}
