// entities/bug.js —— 虫子（普通、血月、Boss、v3 守卫、v4 重甲、v5 减速、v6 血月 Boss + rallyTarget）
function makeBug(nest, opts = {}) {
  const isBoss = !!opts.boss;
  const isGuard = !!opts.guard;
  const isHeavy = !!opts.heavy;
  const isBloodBoss = !!opts.bloodBoss;
  const bloodMoon = !!opts.bloodMoon;
  const isBloodMoonNight = !!opts.isBloodMoonNight;

  let cfg, bugType;
  if (isBloodBoss) { cfg = G.bloodBoss; bugType = BugType.BLOOD_BOSS; }
  else if (isBoss) { cfg = G.boss; bugType = BugType.BOSS; }
  else if (isHeavy) { cfg = G.heavyBug; bugType = BugType.HEAVY; }
  else { cfg = G.bug; bugType = isGuard ? BugType.GUARD : BugType.NORMAL; }

  // v6 §8: 血月夜对普通虫的 hp/dmg 加成（不影响 boss/heavy/guard/bloodBoss）
  const bm = isBloodMoonNight && !isBoss && !isHeavy && !isGuard && !isBloodBoss;
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
    if (bug.isBloodBoss) drop = G.bloodBoss.glueDrop;
    else if (bug.isBoss) drop = G.boss.glueDrop;
    else if (bug.isHeavy) drop = G.heavyBug.glueDrop;
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

    if (typeof spawnFloatingText === 'function') {
      let label, cls;
      if (bug.isBloodBoss) { label = 'BLOOD BOSS!'; cls = 'kill-big'; }
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
}

// v5: 当前移速（应用减速）
function bugCurrentSpeed(bug) {
  if (bug.slowedUntil > performance.now()) {
    return bug.speed * G.slowSpike.slowMul;
  }
  return bug.speed;
}
