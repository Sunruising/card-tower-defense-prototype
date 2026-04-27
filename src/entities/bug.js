// entities/bug.js —— 虫子（普通、血月、Boss、v3 守卫、v4 重甲、v5 减速、v6 血月 Boss + rallyTarget、v7 fast/flying/exploder）
function makeBug(nest, opts = {}) {
  const isBoss = !!opts.boss;
  const isGuard = !!opts.guard;
  const isHeavy = !!opts.heavy;
  const isBloodBoss = !!opts.bloodBoss;
  const isTerminalBoss = !!opts.terminalBoss;     // v8
  const isFast = !!opts.fast;                     // v7
  const isFlying = !!opts.flying;                 // v7
  const isExploder = !!opts.exploder;             // v7
  const bloodMoon = !!opts.bloodMoon;
  const isBloodMoonNight = !!opts.isBloodMoonNight;

  let cfg, bugType;
  if (isTerminalBoss) { cfg = G.terminalBoss; bugType = BugType.TERMINAL_BOSS; }
  else if (isBloodBoss) { cfg = G.bloodBoss; bugType = BugType.BLOOD_BOSS; }
  else if (isBoss) { cfg = G.boss; bugType = BugType.BOSS; }
  else if (isHeavy) { cfg = G.heavyBug; bugType = BugType.HEAVY; }
  else if (isFlying) { cfg = G.flyingBug; bugType = BugType.FLYING; }       // v7
  else if (isFast) { cfg = G.fastBug; bugType = BugType.FAST; }             // v7
  else if (isExploder) { cfg = G.exploderBug; bugType = BugType.EXPLODER; } // v7
  else { cfg = G.bug; bugType = isGuard ? BugType.GUARD : BugType.NORMAL; }

  // v6 §8: 血月夜对普通虫的 hp/dmg 加成（不影响特殊虫种）
  const bm = isBloodMoonNight && !isBoss && !isHeavy && !isGuard && !isBloodBoss && !isTerminalBoss
    && !isFast && !isFlying && !isExploder;
  let hp = cfg.hp;
  let damage = cfg.damage;
  if (bm) {
    hp *= G.bloodMoon.bugHpMul;
    damage *= G.bloodMoon.bugDamageMul;
  }
  // v7: 进化因子（不影响 boss / heavy / bloodBoss / guard 的基础数值之上的"再叠加"，
  //     但 cap=3.0 已经控制了上限）
  const evo = (typeof currentEvoFactor === 'function') ? currentEvoFactor() : 1.0;
  hp *= evo;
  damage *= evo;
  const speed = cfg.speed;

  const ox = nest.x + (Math.random() * 2 - 1);
  const oy = nest.y + (Math.random() * 2 - 1);

  let initialState;
  if (isGuard) initialState = 'guarding';
  else if (S.phase === 'night') initialState = 'marching';
  else initialState = 'idle';

  const bug = {
    id: nextId(), kind: 'bug',
    x: ox, y: oy,
    hp, maxHp: hp,
    damage,
    speed,
    bugType,
    isBoss,
    isGuard,
    isHeavy,
    isBloodBoss,                      // v6
    isTerminalBoss,                   // v8
    isFast,                           // v7
    isFlying,                         // v7
    isExploder,                       // v7
    flying: !!cfg.flying,             // v7: 飞行虫寻路标志（无视 blocker）
    exploded: false,                  // v7: 自爆触发标志
    bloodBuffed: bm,                  // v6: 血月加成普通虫的视觉标记
    guardNestId: isGuard ? nest.id : null,
    attackSpeed: cfg.attackSpeed,
    attackRange: cfg.attackRange,
    attackCd: 0,
    nestId: nest.id,
    state: initialState,
    target: null,
    wanderDx: (Math.random() - 0.5),
    wanderDy: (Math.random() - 0.5),
    wanderTimer: 2,
    lastCombatAt: 0,                  // v5
    slowedUntil: 0,                   // v5: 减速效果（performance.now() 毫秒）
    rallyTarget: null,                // v6 §9: 集结点，到达后切核心
  };

  // v6 §9: 血月后启用虫流虚假化 —— 出生时随机分配 4 个集结点之一（不影响守卫）
  if (!isGuard && S.flags && S.flags.rallyEnabled && Array.isArray(G.rallyPoints) && G.rallyPoints.length > 0) {
    const rp = G.rallyPoints[Math.floor(Math.random() * G.rallyPoints.length)];
    bug.rallyTarget = { x: rp.x, y: rp.y };
  }

  S.bugs.push(bug);
  if (!isGuard) nest.bugCount++;
  return bug;
}

function killBug(bug) {
  if (!bug.isGuard) {
    const nest = S.nests.find(n => n.id === bug.nestId);
    if (nest) nest.bugCount = Math.max(0, nest.bugCount - 1);
  }
  bug.dead = true;

  if (!bug.retreating && !bug.silentRemove) {
    let drop;
    if (bug.isTerminalBoss) drop = G.terminalBoss.glueDrop;
    else if (bug.isBloodBoss) drop = G.bloodBoss.glueDrop;
    else if (bug.isBoss) drop = G.boss.glueDrop;
    else if (bug.isHeavy) drop = G.heavyBug.glueDrop;
    else if (bug.isFlying) drop = G.flyingBug.glueDrop;       // v7
    else if (bug.isFast) drop = G.fastBug.glueDrop;           // v7
    else if (bug.isExploder) drop = G.exploderBug.glueDrop;   // v7
    else if (bug.isGuard) drop = G.guardBug.glueDrop;
    else drop = G.bug.glueDrop;
    S.glue += drop;
    S.fx.push({
      type: 'glueDrop',
      x: bug.x, y: bug.y,
      amount: drop,
      timer: 0.8,
      duration: 0.8,
    });

    // v6: 血月 Boss 额外掉宝石 + 战利品包
    if (bug.isBloodBoss) {
      if (S.playerState) S.playerState.gems += G.bloodBoss.gemsDrop;
      if (G.bloodBoss.spawnsLootGift && typeof spawnGift === 'function') {
        spawnGift({ x: bug.x, y: bug.y, type: 'armored' });
      }
    }

    // v8: 终极 Boss 击破 → 掉胶 + 宝石 + 标记胜利 flag
    if (bug.isTerminalBoss) {
      if (S.playerState) S.playerState.gems += G.terminalBoss.gemsDrop;
      if (S.flags) S.flags.terminalBossKilled = true;
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(bug.x, bug.y, '终极 BOSS 击破！', 'kill-big');
      }
    }

    if (typeof spawnFloatingText === 'function') {
      let label, cls;
      if (bug.isTerminalBoss) { label = 'TERMINAL BOSS!'; cls = 'kill-big'; }
      else if (bug.isBloodBoss) { label = 'BLOOD BOSS!'; cls = 'kill-big'; }
      else if (bug.isBoss) { label = 'BOSS!'; cls = 'kill-big'; }
      else if (bug.isHeavy) { label = '重甲虫!'; cls = 'kill-heavy'; }
      else { label = '+' + drop; cls = 'kill'; }
      spawnFloatingText(bug.x, bug.y, label, cls);
    }
    if (S.playerState) S.playerState.lifetimeKills++;
  }

  // v7: 进化因子计数
  if (S.evo) {
    if (bug.isBloodBoss || bug.isBoss) S.evo.kills += 10;
    else if (bug.isHeavy) S.evo.kills += 3;
    else if (!bug.isGuard) S.evo.kills += 1;
    // 守卫虫不计（强制黎明清场不算玩家击杀）
  }

  // v7.1 天赋点：普通击杀计数（守卫/silentRemove/retreating 不计）
  if (typeof earnTalentPoints === 'function' && !bug.isGuard && !bug.silentRemove && !bug.retreating) {
    earnTalentPoints('kill', 1);
  }

  // v7: 任务事件 —— 英雄击杀虫子（hero_kill_bug）
  if (typeof taskNotify === 'function' && !bug.isGuard && !bug.silentRemove && !bug.retreating) {
    // 简化：任何虫子被击杀都触发（教学期 tut3 要求"英雄打死一只虫子"，玩家在白天会自然完成）
    taskNotify('hero_kill_bug', { bug });
  }
  // v7: 终极 BOSS 击杀任务
  if (bug.isTerminalBoss && typeof taskNotify === 'function') {
    taskNotify('terminal_boss_killed');
  }
}

// v5: 当前移速（应用减速）
function bugCurrentSpeed(bug) {
  if (bug.slowedUntil > performance.now()) {
    return bug.speed * G.slowSpike.slowMul;
  }
  return bug.speed;
}

// v7: 重甲虫物理减伤 50%（dealDamage 路径生效；魔法直伤 bug.hp -= dmg 不走此路径）
function applyHeavyReduction(bug, amount) {
  if (bug && bug.isHeavy && G.heavyBug && G.heavyBug.physicalDamageReduction) {
    return amount * (1 - G.heavyBug.physicalDamageReduction);
  }
  return amount;
}
window.applyHeavyReduction = applyHeavyReduction;

// v7: 自爆虫触发 —— 范围内对核心/建筑/英雄/剑士造成爆炸伤害
function explodeBug(bug) {
  if (!bug || bug.exploded || bug.dead) return;
  bug.exploded = true;
  const r = G.exploderBug.explodeRadius;
  const dmg = G.exploderBug.explodeDamage;
  // 推爆炸 fx 到 S.explosions（drawExplosions 渲染）
  if (S.explosions) {
    S.explosions.push({ x: bug.x, y: bug.y, age: 0, duration: 0.4, radius: r });
  }
  // 范围内伤害（用 dealDamage 走标准伤害链）
  if (typeof dealDamage === 'function') {
    if (S.core && Math.hypot(S.core.x - bug.x, S.core.y - bug.y) <= r) {
      dealDamage(bug, S.core, dmg);
    }
    if (S.buildings) {
      for (const b of S.buildings) {
        if (b.dead) continue;
        if (Math.hypot(b.x - bug.x, b.y - bug.y) <= r) {
          dealDamage(bug, b, dmg);
        }
      }
    }
    if (typeof heroAlive === 'function' && heroAlive()
        && Math.hypot(S.hero.x - bug.x, S.hero.y - bug.y) <= r) {
      dealDamage(bug, S.hero, dmg);
    }
    if (S.swordsmen) {
      for (const sw of S.swordsmen) {
        if (sw.dead) continue;
        if (Math.hypot(sw.x - bug.x, sw.y - bug.y) <= r) {
          dealDamage(bug, sw, dmg);
        }
      }
    }
  }
  // 自爆虫自己死
  killBug(bug);
}
window.explodeBug = explodeBug;

// v8: 在地图核心 4-6 格之外刷出终极 Boss（不通过任何虫巢）
function spawnTerminalBoss() {
  if (S.flags && S.flags.terminalBossSpawned) return null;
  // 在核心 4-6 格之外随机位置
  let pos = null;
  for (let attempt = 0; attempt < 60; attempt++) {
    const x = Math.floor(Math.random() * G.mapWidth);
    const y = Math.floor(Math.random() * G.mapHeight);
    const d = Math.hypot(x - S.core.x, y - S.core.y);
    if (d < 4 || d > 6) continue;
    pos = { x, y }; break;
  }
  if (!pos) {
    // 兜底：核心右上 5 格
    pos = {
      x: Math.min(G.mapWidth - 1, Math.max(0, S.core.x + 5)),
      y: Math.max(0, Math.min(G.mapHeight - 1, S.core.y - 3)),
    };
  }
  const cfg = G.terminalBoss;
  const bug = {
    id: nextId(), kind: 'bug',
    x: pos.x, y: pos.y,
    hp: cfg.hp, maxHp: cfg.maxHp,
    damage: cfg.damage,
    speed: cfg.speed,
    bugType: BugType.TERMINAL_BOSS,
    isBoss: false, isGuard: false, isHeavy: false,
    isBloodBoss: false, isTerminalBoss: true,
    isFast: false, isFlying: false, isExploder: false,    // v7
    flying: false, exploded: false,                       // v7
    bloodBuffed: false,
    guardNestId: null,
    attackSpeed: cfg.attackSpeed,
    attackRange: cfg.attackRange,
    attackCd: 0,
    nestId: -1,
    state: 'marching',
    target: null,
    wanderDx: 0, wanderDy: 0, wanderTimer: 2,
    lastCombatAt: 0, slowedUntil: 0,
    rallyTarget: null,                // 终极 Boss 不集结，直奔核心
  };
  S.bugs.push(bug);
  if (S.flags) S.flags.terminalBossSpawned = true;
  // 永久驱散周围视野，给玩家明确目标（围一圈 1 格驱散）
  if (typeof illuminateTile === 'function') {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const tx = Math.round(pos.x) + dx;
        const ty = Math.round(pos.y) + dy;
        if (tx < 0 || ty < 0 || tx >= G.mapWidth || ty >= G.mapHeight) continue;
        // 极长 expose（用大数模拟"永久"）
        illuminateTile(tx, ty, 9999);
      }
    }
  }
  // 视觉提示：在 Boss 出生点放一个新虫巢出现的环
  S.fx.push({
    type: 'newNestRing',
    x: pos.x, y: pos.y,
    timer: G.fx.newNestRing,
    duration: G.fx.newNestRing,
  });
  if (typeof showNightNotice === 'function') {
    showNightNotice('终极 BOSS 已现身！', 'night');
  }
  showMessage('终极 BOSS 在地图上出现，击败它即可获胜！');
  return bug;
}

window.spawnTerminalBoss = spawnTerminalBoss;
