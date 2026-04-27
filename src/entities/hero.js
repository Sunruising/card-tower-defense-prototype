// entities/hero.js
function heroAlive() { return S.hero.state !== 'dead'; }

function heroIsBusy() {
  // v7: free 移动算"自由"不算 busy（玩家随时可中断）
  return ['marching', 'fighting', 'returning'].includes(S.hero.state);
}

// v7: 英雄自由移动 —— 由 input.js 调用
function heroStartFreeMove(targetX, targetY) {
  if (!heroAlive()) return;
  // 出征中不响应自由移动（玩家自己用召回令）
  if (heroIsBusy()) return;
  S.hero.state = 'free';
  S.hero.freeMoveTarget = { x: targetX, y: targetY };
  S.hero.target = null;
}

function heroRecallToBase() {
  if (!heroAlive()) return;
  if (heroIsBusy()) return;
  S.hero.state = 'atBase';
  S.hero.freeMoveTarget = null;
  S.hero.target = null;
}

// v7: 是否处于探索状态（基地 3×3 外）
function heroInExploreState() {
  if (!heroAlive()) return false;
  const dx = Math.abs(S.hero.x - S.core.x);
  const dy = Math.abs(S.hero.y - S.core.y);
  return Math.max(dx, dy) > 1.5;
}

function killHero() {
  S.hero.state = 'dead';
  S.hero.hp = 0;
  S.hero.target = null;
  S.hero.respawnTimer = G.hero.respawnTime;
  S.hero.skillCardTimer = S.hero.skillCardCD || G.hero.skillCardCD;
}

function respawnHero() {
  S.hero.x = G.core.x;
  S.hero.y = G.core.y + 1;
  S.hero.homeX = S.hero.x;
  S.hero.homeY = S.hero.y;
  S.hero.hp = S.hero.maxHp;
  S.hero.state = 'atBase';
  S.hero.target = null;
  // v7.1: 复活立即给 sweep（不再等 CD），避免复活后 25s 的真空期
  S.heroSkillSlot = makeCardInstance('sweep');
  S.hero.skillCardTimer = 0;
}

function heroStartMarch(nest) {
  S.hero.state = 'marching';
  S.hero.target = nest.id;
}

// v6.1: 英雄状态判定 —— IDLE_PATROL = atBase, ENGAGE = engage
function heroIsPatrolling() {
  return S.hero.state === 'atBase' || S.hero.state === 'engage';
}

// v6.1: 英雄距离核心（用于追击半径限制）
function heroDistFromCore() {
  return Math.hypot(S.hero.x - S.core.x, S.hero.y - S.core.y);
}
