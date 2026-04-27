// systems/ai.js —— 虫子 / 剑士 / 英雄 / 建筑 AI

// ===== 通用辅助 =====
function isDeadEntity(e) {
  if (!e) return true;
  if (e.dead) return true;
  if (e.kind === 'core') return S.core.hp <= 0;
  if (e.kind === 'nest') return !e.alive;
  if (e.kind === 'hero') return S.hero.state === 'dead';
  // v8: 侦察兵带 hp，可被打死
  if (e.kind === 'scout') return e.dead || (e.hp !== undefined && e.hp <= 0);
  if (e.hp !== undefined && e.hp <= 0) return true;
  return false;
}

function resolveEntityById(id) {
  if (!id) return null;
  if (S.core.id === id) return S.core;
  if (S.hero.id === id) return heroAlive() ? S.hero : null;
  const n = S.nests.find(n => n.id === id);
  if (n) return n;
  const b = S.buildings.find(b => b.id === id);
  if (b && !b.dead) return b;
  const sw = S.swordsmen.find(s => s.id === id);
  if (sw && !sw.dead) return sw;
  const bug = S.bugs.find(g => g.id === id);
  if (bug && !bug.dead) return bug;
  return null;
}

function findBlockerAt(cellX, cellY) {
  if (S.core.x === cellX && S.core.y === cellY) return S.core;
  for (const b of S.buildings) {
    if (b.dead) continue;
    if (b.targetable === false) continue;          // v6 §3: 减速地刺等不可作为阻挡目标
    if (b.x === cellX && b.y === cellY) return b;
  }
  for (const sw of S.swordsmen) {
    if (sw.dead) continue;
    if (Math.round(sw.x) === cellX && Math.round(sw.y) === cellY) return sw;
  }
  if (heroAlive() && S.hero.state === 'atBase' &&
      Math.round(S.hero.x) === cellX && Math.round(S.hero.y) === cellY) return S.hero;
  return null;
}

function findBugRangeTarget(bug) {
  // v8: 先扫描翻倍范围内是否有 attractsAggro 单位（视野建筑 / 侦察兵） —— 优先锁定
  const aggroMul = (G.aggro && G.aggro.rangeMulWhenAggroVisible) || 2;
  const aggroRange = bug.attackRange * aggroMul;
  let aggroTarget = null, aggroD = Infinity;
  const tryAggro = (t) => {
    if (!t || isDeadEntity(t)) return;
    if (t.targetable === false) return;
    if (!t.attractsAggro) return;
    const d = Math.hypot(t.x - bug.x, t.y - bug.y);
    if (d <= aggroRange && d < aggroD) { aggroD = d; aggroTarget = t; }
  };
  for (const b of S.buildings) tryAggro(b);
  if (S.scouts) for (const sc of S.scouts) tryAggro(sc);
  if (aggroTarget) return aggroTarget;

  // 现有逻辑：常规优先级（剑士 / 英雄 / 建筑 / 核心）
  let best = null, bestD = Infinity;
  const tryT = (t) => {
    if (!t || isDeadEntity(t)) return;
    if (t.targetable === false) return;            // v6 §3: 过滤减速地刺
    const d = Math.hypot(t.x - bug.x, t.y - bug.y);
    if (d <= bug.attackRange && d < bestD) { bestD = d; best = t; }
  };
  for (const sw of S.swordsmen) tryT(sw);
  if (heroAlive() && (S.hero.state === 'atBase' || S.hero.state === 'engage' || S.hero.state === 'fighting')) tryT(S.hero);
  if (best) return best;
  for (const b of S.buildings) tryT(b);
  if (best) return best;
  tryT(S.core);
  return best;
}

// v5: 玩家方寻找虫子 —— 必须在视野内（fogged 格子里的虫子不能被锁定）
function findNearestBugInRange(x, y, range) {
  let best = null, bestD = Infinity;
  for (const bug of S.bugs) {
    if (bug.dead || bug.retreating) continue;
    if (typeof isVisible === 'function' && !isVisible(bug.x, bug.y)) continue;
    const d = Math.hypot(bug.x - x, bug.y - y);
    if (d <= range && d < bestD) { bestD = d; best = bug; }
  }
  return best;
}

// v5: 脱战回血
// v8.1: 建筑脱战回血走 buildingRegenMul（防御性 —— 当前路径仅 hero / swordsman 调用）
function applyOutOfCombatRegen(unit, dt) {
  if (!unit) return;
  if (unit.hp >= unit.maxHp) return;
  const now = performance.now();
  if (now - (unit.lastCombatAt || 0) < G.combat.outOfCombatDelay * 1000) return;
  let regen = G.combat.regenPerSec;
  if (unit.kind === 'building') {
    regen *= ((S.mul && S.mul.buildingRegenMul) || 1);
  }
  unit.hp = Math.min(unit.maxHp, unit.hp + regen * dt);
}

// v6 §3: 减速地刺触发 —— 每帧扫描，扣使用次数（同虫只扣一次）+ 续期 slow
function applySlowSpikeEffects() {
  const spikes = S.buildings.filter(b => !b.dead && b.type === 'slow_spike');
  if (spikes.length === 0) return;
  const now = performance.now();
  const linger = G.slowSpike.slowLinger * 1000;
  const r = G.slowSpike.triggerRadius;
  for (const sp of spikes) {
    for (const bug of S.bugs) {
      if (bug.dead) continue;
      const d = Math.hypot(bug.x - sp.x, bug.y - sp.y);
      if (d <= r) {
        // v6: 同一只虫子在同一地刺只扣 1 次 usesLeft
        if (typeof consumeSpikeUse === 'function') consumeSpikeUse(sp, bug);
        const expireAt = now + linger;
        if (bug.slowedUntil < expireAt) bug.slowedUntil = expireAt;
      }
    }
  }
}

// v6 §2: 核心脱战回血（速率 1 hp/s，脱战 5s 后启动）
function applyCoreRegen(dt) {
  if (!S || !S.core) return;
  if (S.core.hp >= S.core.maxHp) return;
  const now = performance.now();
  if (now - (S.core.lastCombatAt || 0) < G.coreRegen.outOfCombatDelay * 1000) return;
  S.core.hp = Math.min(S.core.maxHp, S.core.hp + G.coreRegen.regenPerSec * dt);
}

// ===== 虫子 =====
function updateBugs(dt) {
  applySlowSpikeEffects();

  for (const bug of S.bugs) {
    if (bug.dead) continue;
    const speedNow = bugCurrentSpeed(bug);

    if (bug.retreating) {
      const dx = bug.x - S.core.x;
      const dy = bug.y - S.core.y;
      const dl = Math.hypot(dx, dy) || 1;
      bug.x += (dx / dl) * (speedNow + 0.3) * dt;
      bug.y += (dy / dl) * (speedNow + 0.3) * dt;
      if (bug.x < -1 || bug.x > G.mapWidth + 1 ||
          bug.y < -1 || bug.y > G.mapHeight + 1) killBug(bug);
      continue;
    }

    bug.attackCd = Math.max(0, bug.attackCd - dt);

    if (bug.state === 'guarding') {
      const nest = S.nests.find(n => n.id === bug.guardNestId);
      if (heroAlive() && (S.hero.state === 'atBase' || S.hero.state === 'engage' || S.hero.state === 'fighting' || S.hero.state === 'marching' || S.hero.state === 'returning')) {
        const dh = Math.hypot(S.hero.x - bug.x, S.hero.y - bug.y);
        if (dh <= G.guardBug.warnRange) {
          bug.state = 'attacking';
          bug.target = S.hero;
          continue;
        }
      }
      bug.wanderTimer -= dt;
      if (bug.wanderTimer <= 0) {
        bug.wanderDx = (Math.random() - 0.5);
        bug.wanderDy = (Math.random() - 0.5);
        bug.wanderTimer = 1 + Math.random();
      }
      const wl = Math.hypot(bug.wanderDx, bug.wanderDy) || 1;
      bug.x += (bug.wanderDx / wl) * (G.bug.idleWanderSpeed * 1.6) * dt;
      bug.y += (bug.wanderDy / wl) * (G.bug.idleWanderSpeed * 1.6) * dt;
      if (nest) {
        const ddx = bug.x - nest.x;
        const ddy = bug.y - nest.y;
        const dd = Math.hypot(ddx, ddy);
        if (dd > G.guardBug.wanderRadius) {
          bug.x = nest.x + (ddx / dd) * G.guardBug.wanderRadius;
          bug.y = nest.y + (ddy / dd) * G.guardBug.wanderRadius;
        }
      }
      continue;
    }

    if (bug.state === 'idle') {
      const nest = S.nests.find(n => n.id === bug.nestId);
      if (heroAlive() && (S.hero.state === 'atBase' || S.hero.state === 'engage' || S.hero.state === 'fighting')) {
        const ref = nest || bug;
        const dh = Math.hypot(S.hero.x - ref.x, S.hero.y - ref.y);
        if (dh <= G.nest.warnRange) {
          bug.state = 'attacking';
          bug.target = S.hero;
        }
      }
      bug.wanderTimer -= dt;
      if (bug.wanderTimer <= 0) {
        bug.wanderDx = (Math.random() - 0.5);
        bug.wanderDy = (Math.random() - 0.5);
        bug.wanderTimer = 1 + Math.random();
      }
      const wl = Math.hypot(bug.wanderDx, bug.wanderDy) || 1;
      bug.x += (bug.wanderDx / wl) * G.bug.idleWanderSpeed * dt;
      bug.y += (bug.wanderDy / wl) * G.bug.idleWanderSpeed * dt;
      if (nest) {
        const ddx = bug.x - nest.x;
        const ddy = bug.y - nest.y;
        const dd = Math.hypot(ddx, ddy);
        if (dd > G.bug.wanderRadius) {
          bug.x = nest.x + (ddx / dd) * G.bug.wanderRadius;
          bug.y = nest.y + (ddy / dd) * G.bug.wanderRadius;
        }
      }
      continue;
    }

    if (bug.state === 'marching') {
      // v6 §9: 若有 rallyTarget，先朝集结点走，到达后清空切核心
      if (bug.rallyTarget) {
        const rdx = bug.rallyTarget.x - bug.x;
        const rdy = bug.rallyTarget.y - bug.y;
        const rdl = Math.hypot(rdx, rdy);
        if (rdl < 0.3) {
          bug.rallyTarget = null;
        } else {
          bug.x += (rdx / rdl) * speedNow * dt;
          bug.y += (rdy / rdl) * speedNow * dt;
          continue;
        }
      }
      // v7: 自爆虫接近核心 / 建筑 / 英雄 时触发自爆
      if (bug.isExploder && !bug.exploded) {
        const tp = (G.exploderBug && G.exploderBug.triggerProximity) || 1.0;
        let trigger = false;
        if (S.core && Math.hypot(S.core.x - bug.x, S.core.y - bug.y) <= tp) trigger = true;
        if (!trigger && S.buildings) {
          for (const b of S.buildings) {
            if (b.dead) continue;
            if (b.targetable === false) continue;     // 减速地刺等不算
            if (Math.hypot(b.x - bug.x, b.y - bug.y) <= tp) { trigger = true; break; }
          }
        }
        if (!trigger && heroAlive()
            && Math.hypot(S.hero.x - bug.x, S.hero.y - bug.y) <= tp) {
          trigger = true;
        }
        if (trigger) {
          if (typeof explodeBug === 'function') explodeBug(bug);
          continue;
        }
      }
      const t = findBugRangeTarget(bug);
      if (t) { bug.target = t; bug.state = 'attacking'; continue; }
      const dx = S.core.x - bug.x;
      const dy = S.core.y - bug.y;
      const dl = Math.hypot(dx, dy) || 1;
      const step = speedNow * dt;
      const nx = bug.x + (dx / dl) * step;
      const ny = bug.y + (dy / dl) * step;
      // v7: 飞行虫无视 blocker，直接穿越
      const blocker = bug.flying ? null : findBlockerAt(Math.round(nx), Math.round(ny));
      if (blocker && blocker !== bug) {
        bug.target = blocker;
        bug.state = 'attacking';
      } else {
        bug.x = nx; bug.y = ny;
      }
      continue;
    }

    if (bug.state === 'attacking') {
      const t = bug.target;
      if (!t || isDeadEntity(t)) {
        bug.target = null;
        if (bug.isGuard) bug.state = 'guarding';
        else bug.state = (S.phase === 'night') ? 'marching' : 'idle';
        continue;
      }
      if (bug.isGuard) {
        const d2 = Math.hypot(t.x - bug.x, t.y - bug.y);
        if (d2 > G.guardBug.warnRange + 0.5) {
          bug.target = null;
          bug.state = 'guarding';
          continue;
        }
      }
      const d = Math.hypot(t.x - bug.x, t.y - bug.y);
      if (d > bug.attackRange) {
        const dx = t.x - bug.x;
        const dy = t.y - bug.y;
        const dl = Math.hypot(dx, dy) || 1;
        let nx = bug.x + (dx / dl) * speedNow * dt;
        let ny = bug.y + (dy / dl) * speedNow * dt;
        if (bug.isGuard) {
          const nest = S.nests.find(n => n.id === bug.guardNestId);
          if (nest) {
            const dd = Math.hypot(nx - nest.x, ny - nest.y);
            if (dd > G.guardBug.wanderRadius) {
              nx = nest.x + (nx - nest.x) / dd * G.guardBug.wanderRadius;
              ny = nest.y + (ny - nest.y) / dd * G.guardBug.wanderRadius;
            }
          }
        }
        bug.x = nx; bug.y = ny;
      } else {
        if (bug.attackCd <= 0) {
          dealDamage(bug, t, bug.damage);
          addAttackFx(bug, t, 'bug');
          bug.attackCd = 1 / bug.attackSpeed;
        }
      }
    }
  }
  S.bugs = S.bugs.filter(b => !b.dead);
}

// ===== 剑士 =====
// v6.1: 状态机锚点 = sw.homeX/homeY（兵营或核心）
// idle = IDLE_PATROL（3×3 巡逻），chasing/attacking = ENGAGE（5 格追击限），returning = 回锚点
function updateSwordsmen(dt) {
  const alertWindow = 0.8 * 1000;
  const now = performance.now();
  const coreUnderAttack = (S.flags && S.flags.coreUnderAttackAt > 0
    && (now - S.flags.coreUnderAttackAt) < alertWindow
    && S.flags.coreLastAttackerPos);

  for (const sw of S.swordsmen) {
    if (sw.dead) continue;
    updateSwordsmanHome(sw);
    sw.attackCd = Math.max(0, sw.attackCd - dt);

    if (sw.target) {
      if (isDeadEntity(sw.target)) sw.target = null;
    }

    // v6.1: 兵营/核心受击响应（仅 idle/returning 阶段触发）
    if (coreUnderAttack && !sw.target && (sw.state === 'idle' || sw.state === 'returning')) {
      const ap = S.flags.coreLastAttackerPos;
      // 优先尝试在 last attacker pos 附近找实体
      let enemy = S.bugs.find(b => !b.dead && !b.retreating && Math.hypot(b.x - ap.x, b.y - ap.y) < 1.5);
      // 边界：若攻击者已离开 last pos —— 走视野搜索作为兜底
      if (!enemy) {
        enemy = findNearestBugInRange(sw.x, sw.y, G.swordsman.visionRadius + 1);
      }
      if (enemy) {
        sw.target = enemy;
        sw.state = 'chasing';
        sw.lastCombatAt = now;
      }
    }

    // v6.1: 视野内敌人 → ENGAGE（视野半径 = G.swordsman.visionRadius）
    if ((sw.state === 'idle' || sw.state === 'returning') && !sw.target) {
      const enemy = findNearestBugInRange(sw.x, sw.y, G.swordsman.visionRadius);
      if (enemy) {
        sw.target = enemy;
        sw.state = 'chasing';
      }
    }

    if (sw.state === 'idle') {
      // v6.1 巡逻：homeX/homeY 周围 3×3 内每 4-6s 走一格随机邻格
      sw.patrolTimer -= dt;
      if (sw.patrolTimer <= 0) {
        sw.patrolTargetX = sw.homeX + Math.floor(Math.random() * 3) - 1;
        sw.patrolTargetY = sw.homeY + Math.floor(Math.random() * 3) - 1;
        sw.patrolTimer = G.swordsman.patrolIntervalMin
          + Math.random() * (G.swordsman.patrolIntervalMax - G.swordsman.patrolIntervalMin);
      }
      const tx = sw.patrolTargetX !== undefined ? sw.patrolTargetX : sw.homeX;
      const ty = sw.patrolTargetY !== undefined ? sw.patrolTargetY : sw.homeY;
      const dx = tx - sw.x, dy = ty - sw.y;
      const dl = Math.hypot(dx, dy);
      if (dl > 0.15) {
        sw.x += (dx / dl) * sw.speed * 0.5 * dt;
        sw.y += (dy / dl) * sw.speed * 0.5 * dt;
      }
      applyOutOfCombatRegen(sw, dt);
    } else if (sw.state === 'chasing') {
      if (!sw.target) { sw.state = 'returning'; continue; }
      const t = sw.target;
      const d = Math.hypot(t.x - sw.x, t.y - sw.y);
      const dh = swordsmanDistFromHome(sw);
      // v6.1: 追击半径改为 chaseLimit（5 格）
      if (dh > G.swordsman.chaseLimit) {
        sw.target = null; sw.state = 'returning'; continue;
      }
      if (d <= sw.attackRange) {
        sw.state = 'attacking';
      } else {
        const dx = t.x - sw.x;
        const dy = t.y - sw.y;
        const dl = Math.hypot(dx, dy) || 1;
        sw.x += (dx / dl) * sw.speed * dt;
        sw.y += (dy / dl) * sw.speed * dt;
      }
    } else if (sw.state === 'attacking') {
      const t = sw.target;
      if (!t || isDeadEntity(t)) { sw.state = 'returning'; sw.target = null; continue; }
      const d = Math.hypot(t.x - sw.x, t.y - sw.y);
      if (d > sw.attackRange + 0.3) {
        sw.state = 'chasing'; continue;
      }
      if (sw.attackCd <= 0) {
        dealDamage(sw, t, sw.damage);
        addAttackFx(sw, t, 'ally');
        sw.attackCd = 1 / sw.attackSpeed;
      }
    } else if (sw.state === 'returning') {
      const dx = sw.homeX - sw.x;
      const dy = sw.homeY - sw.y;
      const dl = Math.hypot(dx, dy);
      if (dl < 0.4) { sw.state = 'idle'; }
      else {
        sw.x += (dx / dl) * sw.speed * dt;
        sw.y += (dy / dl) * sw.speed * dt;
      }
    }
  }

  const toRemove = S.swordsmen.filter(s => s.dead);
  for (const sw of toRemove) {
    if (sw.barracksId) {
      const b = S.buildings.find(bb => bb.id === sw.barracksId);
      if (b && !b.dead) b.respawnQueue.push(G.barracks.respawnTime);
    }
  }
  S.swordsmen = S.swordsmen.filter(s => !s.dead);
}

// ===== 英雄 =====
// v6.1 状态机：
//   atBase  = IDLE_PATROL（核心 3×3 巡逻；视野 / 核心警报触发 ENGAGE）
//   engage  = ENGAGE（追击 + 攻击；超出 chaseLimit=5 回 atBase）
//   marching/fighting/returning = 出征系列（保留 v5 命名 / 行为，不响应核心警报）
//   dead    = DEAD
function updateHero(dt) {
  const h = S.hero;

  if (h.state === 'dead') {
    h.respawnTimer -= dt;
    if (h.respawnTimer <= 0) respawnHero();
    return;
  }

  h.attackCd = Math.max(0, h.attackCd - dt);

  // v5 英雄过雾揭雾
  if (typeof revealTemp === 'function') {
    revealTemp(Math.round(h.x), Math.round(h.y), G.fog.heroVisionRadius, G.fog.heroVisionDuration);
  }

  // v5 英雄技能宪法：CD 永远倒数
  if (S.heroSkillSlot) {
    h.skillCardTimer = Math.max(h.skillCardTimer - dt, 0);
  } else {
    h.skillCardTimer -= dt;
    if (h.skillCardTimer <= 0) {
      S.heroSkillSlot = makeCardInstance('sweep');
      h.skillCardTimer = S.hero.skillCardCD || G.hero.skillCardCD;
    }
  }

  // v7: 探索状态判断（基地 3×3 外）
  h.exploreState = (typeof heroInExploreState === 'function') ? heroInExploreState() : false;

  // === v6.1: 出征状态保留 v5 行为，不响应核心警报 ===
  if (h.state === 'marching' || h.state === 'fighting' || h.state === 'returning') {
    updateHeroOutOfBaseLegacy(dt);
    return;
  }

  // v7: 自由移动状态
  if (h.state === 'free') {
    if (!h.freeMoveTarget) { h.state = 'atBase'; return; }
    const tx = h.freeMoveTarget.x;
    const ty = h.freeMoveTarget.y;
    const dx = tx - h.x;
    const dy = ty - h.y;
    const d = Math.hypot(dx, dy);
    // 路上遇到敌人自动战斗
    const enemy = findNearestBugInRange(h.x, h.y, G.hero.visionRadius + (S.hero.visionRadiusBonus || 0));
    if (enemy) {
      const ed = Math.hypot(enemy.x - h.x, enemy.y - h.y);
      if (ed <= h.attackRange && h.attackCd <= 0) {
        dealDamage(h, enemy, h.damage);
        addAttackFx(h, enemy, 'hero');
        h.attackCd = 1 / h.attackSpeed;
      } else if (ed <= h.attackRange) {
        // 在射程，等待 CD
      } else {
        // 朝敌人移动而不是目标点
        const edx = enemy.x - h.x, edy = enemy.y - h.y;
        const edl = Math.hypot(edx, edy) || 1;
        const speed = (G.hero.freeMoveSpeed || 1.0);
        h.x += (edx / edl) * speed * dt;
        h.y += (edy / edl) * speed * dt;
      }
    } else {
      // 朝目标点走
      if (d < 0.15) {
        // 抵达
        h.state = 'atBase';
        h.freeMoveTarget = null;
      } else {
        const speed = (G.hero.freeMoveSpeed || 1.0) * (h.marchSpeedMul || 1);
        h.x += (dx / d) * speed * dt;
        h.y += (dy / d) * speed * dt;
      }
    }
    // 探索状态额外回血 + 视野（视野通过 exploreVisionBonus 加）
    if (h.exploreState && h.hp < h.maxHp) {
      h.hp = Math.min(h.maxHp, h.hp + (G.hero.exploreRegenPerSec || 3) * dt);
    }
    // 揭雾（hero 路过自动点亮）
    if (typeof revealTemp === 'function') {
      revealTemp(Math.round(h.x), Math.round(h.y), G.fog.heroVisionRadius, G.fog.heroVisionDuration);
    }
    return;
  }

  // === v6.1: atBase / engage 状态机 ===

  // 1) 核心受击响应（仅 atBase 阶段触发）—— 0.8s 警报窗口
  const coreAlertWindow = 0.8 * 1000;
  const now = performance.now();
  if (h.state === 'atBase' && S.flags && S.flags.coreUnderAttackAt > 0
      && (now - S.flags.coreUnderAttackAt) < coreAlertWindow
      && S.flags.coreLastAttackerPos) {
    h.state = 'engage';
    h.engageTarget = null;            // 让寻敌阶段挑当前最近敌人
    h.lastCombatAt = now;
  }

  // 2) atBase: 视野内敌人 → ENGAGE（视野半径 = G.hero.visionRadius）
  if (h.state === 'atBase') {
    const enemy = findNearestBugInRange(h.x, h.y, G.hero.visionRadius + (S.hero.visionRadiusBonus || 0));
    if (enemy) {
      h.state = 'engage';
      h.engageTarget = enemy.id || null;
      h.lastCombatAt = now;
    }
  }

  // 3) engage: 选目标 + 攻击 / 追击
  if (h.state === 'engage') {
    // 当前 engageTarget 还活着 → 用之；否则找新的（视野略大一点保证 sticky）
    let target = h.engageTarget ? S.bugs.find(b => b.id === h.engageTarget && !b.dead && !b.retreating) : null;
    if (!target) target = findNearestBugInRange(h.x, h.y, G.hero.visionRadius + (S.hero.visionRadiusBonus || 0) + 1);

    // 边界：核心警报触发但 last attacker pos 已无敌人 / 攻击者离开 —— 走视野搜索兜底
    // 若仍无目标且离核心远 → 回 atBase；否则即使无目标也回 atBase（自动复位）
    if (!target) {
      h.state = 'atBase';
      h.engageTarget = null;
    } else {
      h.engageTarget = target.id || null;
      const d = Math.hypot(target.x - h.x, target.y - h.y);
      if (heroDistFromCore() > (G.hero.chaseLimit + (S.hero.chaseLimitBonus || 0))) {
        // 超出追击限 → 放弃 + 回核心
        h.state = 'atBase';
        h.engageTarget = null;
      } else if (d <= h.attackRange) {
        if (h.attackCd <= 0) {
          dealDamage(h, target, h.damage);
          addAttackFx(h, target, 'hero');
          h.attackCd = 1 / h.attackSpeed;
        }
      } else {
        // 接近目标
        const dx = target.x - h.x;
        const dy = target.y - h.y;
        const dl = Math.hypot(dx, dy) || 1;
        h.x += (dx / dl) * G.hero.marchSpeed * (S.hero.marchSpeedMul || 1) * dt;
        h.y += (dy / dl) * G.hero.marchSpeed * (S.hero.marchSpeedMul || 1) * dt;
      }
      return;
    }
  }

  // 4) atBase 巡逻：核心 3×3 内每 4-6s 走一格随机邻格
  if (h.state === 'atBase') {
    if (h.patrolTimer === undefined) h.patrolTimer = 0;
    h.patrolTimer -= dt;
    if (h.patrolTimer <= 0) {
      // 3×3 中心为核心：dx/dy ∈ {-1, 0, 1}
      const px = S.core.x + Math.floor(Math.random() * 3) - 1;
      const py = S.core.y + Math.floor(Math.random() * 3) - 1;
      h.patrolTargetX = px;
      h.patrolTargetY = py;
      h.patrolTimer = G.hero.patrolIntervalMin
        + Math.random() * (G.hero.patrolIntervalMax - G.hero.patrolIntervalMin);
    }
    const tx = h.patrolTargetX !== undefined ? h.patrolTargetX : S.core.x;
    const ty = h.patrolTargetY !== undefined ? h.patrolTargetY : S.core.y;
    const ddx = tx - h.x;
    const ddy = ty - h.y;
    const ddl = Math.hypot(ddx, ddy);
    if (ddl > 0.15) {
      h.x += (ddx / ddl) * G.hero.patrolSpeed * dt;
      h.y += (ddy / ddl) * G.hero.patrolSpeed * dt;
    }
    applyOutOfCombatRegen(h, dt);
  }
}

// v6.1: 抽取 v5 的 marching / fighting / returning 出征逻辑
function updateHeroOutOfBaseLegacy(dt) {
  const h = S.hero;
  if (h.state === 'marching') {
    const nest = S.nests.find(n => n.id === h.target);
    if (!nest || !nest.alive) { h.state = 'returning'; return; }
    const dx = nest.x - h.x, dy = nest.y - h.y;
    const dl = Math.hypot(dx, dy) || 1;
    if (dl <= 1.2) { h.state = 'fighting'; return; }
    h.x += (dx / dl) * G.hero.marchSpeed * (S.hero.marchSpeedMul || 1) * dt;
    h.y += (dy / dl) * G.hero.marchSpeed * (S.hero.marchSpeedMul || 1) * dt;
  } else if (h.state === 'fighting') {
    const nest = S.nests.find(n => n.id === h.target);
    if (!nest || !nest.alive) { h.state = 'returning'; return; }
    const d = Math.hypot(nest.x - h.x, nest.y - h.y);
    if (d > 1.5) { h.state = 'marching'; return; }
    const nearBug = findNearestBugInRange(h.x, h.y, h.attackRange);
    if (h.attackCd <= 0) {
      if (nearBug) {
        dealDamage(h, nearBug, h.damage);
        addAttackFx(h, nearBug, 'hero');
      } else {
        // v7.1: 巢穴克星天赋 → vsNestMul 加成
        damageNest(nest, h.damage * (h.vsNestMul || 1));
        addAttackFx(h, nest, 'hero');
        h.lastCombatAt = performance.now();
      }
      h.attackCd = 1 / h.attackSpeed;
    }
  } else if (h.state === 'returning') {
    const dx = G.core.x - h.x;
    const dy = (G.core.y + 1) - h.y;
    const dl = Math.hypot(dx, dy);
    if (dl < 0.3) {
      h.state = 'atBase';
      h.homeX = G.core.x;
      h.homeY = G.core.y + 1;
      h.target = null;
      return;
    }
    h.x += (dx / dl) * G.hero.marchSpeed * (S.hero.marchSpeedMul || 1) * dt;
    h.y += (dy / dl) * G.hero.marchSpeed * (S.hero.marchSpeedMul || 1) * dt;
  }
}

// ===== 建筑 =====
function updateBuildings(dt) {
  for (const b of S.buildings) {
    if (b.dead) continue;
    if (b.type === 'collector') {
      b.produceTimer -= dt;
      if (b.produceTimer <= 0) {
        // v8.1: collectorProduceBonus 累加到产出
        S.glue += G.collector.produceAmount + ((S.mul && S.mul.collectorProduceBonus) || 0);
        b.produceTimer = G.collector.produceInterval;
      }
    } else if (b.type === 'reinforced_collector') {
      // v5: 暖机期间不产出
      if (b.warmupTimer > 0) {
        b.warmupTimer -= dt;
      } else {
        b.produceTimer -= dt;
        if (b.produceTimer <= 0) {
          // v8.1: collectorProduceBonus 同步加到强化采集器
          S.glue += G.reinforcedCollector.produceAmount + ((S.mul && S.mul.collectorProduceBonus) || 0);
          b.produceTimer = G.reinforcedCollector.produceInterval;
        }
      }
    } else if (b.type === 'tower') {
      b.attackCd = Math.max(0, b.attackCd - dt);
      // v8.1: towerRangeBonus / towerDamageMul / towerAttackSpeedMul
      const towerRange = G.tower.attackRange + ((S.mul && S.mul.towerRangeBonus) || 0);
      const enemy = findNearestBugInRange(b.x, b.y, towerRange);
      if (enemy && b.attackCd <= 0) {
        dealDamage(b, enemy, G.tower.damage * ((S.mul && S.mul.towerDamageMul) || 1));
        addAttackFx(b, enemy, 'ally');
        b.attackCd = 1 / (G.tower.attackSpeed * ((S.mul && S.mul.towerAttackSpeedMul) || 1));
      }
    } else if (b.type === 'mage_tower') {
      // v5: AOE 攻击
      b.attackCd = Math.max(0, b.attackCd - dt);
      // v8.1: 法师塔射程同样吃 towerRangeBonus；splash / damage 走专属 mul
      const mageRange = G.mageTower.attackRange + ((S.mul && S.mul.towerRangeBonus) || 0);
      const enemy = findNearestBugInRange(b.x, b.y, mageRange);
      if (enemy && b.attackCd <= 0) {
        addAttackFx(b, enemy, 'ally');
        const splashR = G.mageTower.splashRadius * ((S.mul && S.mul.mageSplashMul) || 1);
        const dmg = G.mageTower.damage * ((S.mul && S.mul.mageDamageMul) || 1);
        addMageBlastFx(enemy.x, enemy.y, splashR);
        for (const bug of S.bugs) {
          if (bug.dead) continue;
          const d = Math.hypot(bug.x - enemy.x, bug.y - enemy.y);
          if (d <= splashR) {
            bug.hp -= dmg;
            b.lastCombatAt = performance.now();
            bug.lastCombatAt = performance.now();
            if (bug.hp <= 0) killBug(bug);
          }
        }
        b.attackCd = 1 / G.mageTower.attackSpeed;
      }
    } else if (b.type === 'slow_spike') {
      // 被动 effect 由 applySlowSpikeEffects 处理
    } else if (b.type === 'watchtower') {
      // 揭雾在 makeBuilding 时一次性 reveal，无需更新
    } else if (b.type === 'barracks') {
      for (let i = b.respawnQueue.length - 1; i >= 0; i--) {
        b.respawnQueue[i] -= dt;
        if (b.respawnQueue[i] <= 0) {
          b.respawnQueue.splice(i, 1);
          makeSwordsman(b, b.x + (Math.random() * 1.2 - 0.6), b.y + (Math.random() * 1.2 - 0.6));
        }
      }
    }
  }

  // 处理 watchtower 死亡时的 fog 回滚（killBuilding 已处理）
  S.buildings = S.buildings.filter(b => !b.dead);
}
