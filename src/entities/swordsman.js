// entities/swordsman.js
function makeSwordsman(barracks, x, y) {
  const cfg = G.swordsman;
  // v8.1 天赋乘数 × v8.3 兵营升级乘数
  const swHpMul = ((S.mul && S.mul.swordsmanHpMul) || 1) * ((barracks && barracks.swordsmanHpMul) || 1);
  const swDmgMul = ((S.mul && S.mul.swordsmanDamageMul) || 1) * ((barracks && barracks.swordsmanDmgMul) || 1);
  const sw = {
    id: nextId(), kind: 'swordsman',
    x: x, y: y,
    hp: cfg.hp * swHpMul, maxHp: cfg.maxHp * swHpMul,
    damage: cfg.damage * swDmgMul,
    speed: cfg.speed,
    attackSpeed: cfg.attackSpeed,
    attackRange: cfg.attackRange,
    warnRange: cfg.warnRange,
    attackCd: 0,
    homeX: barracks ? barracks.x : x,
    homeY: barracks ? barracks.y : y,
    barracksId: barracks ? barracks.id : null,
    state: 'idle',
    target: null,
    wanderTimer: 1,
    wanderDx: 0,
    wanderDy: 0,
    lastCombatAt: 0,                     // v5
    // v6.1: 3×3 巡逻状态
    patrolTimer: 0,
    patrolTargetX: barracks ? barracks.x : x,
    patrolTargetY: barracks ? barracks.y : y,
  };
  S.swordsmen.push(sw);
  return sw;
}

function isFreeSwordsman(sw) {
  if (!sw.barracksId) return true;
  const b = S.buildings.find(b => b.id === sw.barracksId);
  return !b;
}

function updateSwordsmanHome(sw) {
  if (isFreeSwordsman(sw)) {
    sw.homeX = S.core.x;
    sw.homeY = S.core.y;
  } else {
    const b = S.buildings.find(b => b.id === sw.barracksId);
    if (b) { sw.homeX = b.x; sw.homeY = b.y; }
  }
}

// v6.1: 剑士距离锚点（兵营或核心）
function swordsmanDistFromHome(sw) {
  return Math.hypot(sw.x - sw.homeX, sw.y - sw.homeY);
}
