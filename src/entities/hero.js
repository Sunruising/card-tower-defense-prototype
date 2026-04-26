// entities/hero.js
function heroAlive() { return S.hero.state !== 'dead'; }

function heroIsBusy() {
  return ['marching', 'fighting', 'returning'].includes(S.hero.state);
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
