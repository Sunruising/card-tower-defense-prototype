// systems/combat.js —— 伤害 & 特效发起 & 胜负判定
function dealDamage(attacker, target, amount) {
  if (!target || isDeadEntity(target)) return;
  // v5: 双向更新 lastCombatAt
  const now = performance.now();
  if (attacker && 'lastCombatAt' in attacker) attacker.lastCombatAt = now;
  if (target && 'lastCombatAt' in target) target.lastCombatAt = now;

  // v6.1 §3: 敌方（虫子）在迷雾里发起攻击 → 该格暴露 exposeDuration 秒
  if (attacker && attacker.kind === 'bug') {
    if (typeof isVisible === 'function' && typeof illuminateTile === 'function') {
      // 仅当 attacker 当前所在格不可见时才点亮（已可见的格子无需 expose）
      if (!isVisible(attacker.x, attacker.y)) {
        const cx = Math.round(attacker.x);
        const cy = Math.round(attacker.y);
        illuminateTile(cx, cy, G.fog.exposeDuration);
      }
      // 攻击轨迹弧（无论攻击者是否在迷雾里都给一个短暂视觉提示，effects.js 渲染）
      S.fx.push({
        type: 'fogAttackArc',
        x1: attacker.x, y1: attacker.y,
        x2: target.x, y2: target.y,
        timer: 0.3, duration: 0.3,
      });
    }
  }

  // v6.1 §2: 核心被攻击 → 写 flags 给英雄/剑士 AI 用（map.js 渲染红色感叹号）
  if (target.kind === 'core' && attacker) {
    if (!S.flags) S.flags = {};
    S.flags.coreUnderAttackAt = now;
    S.flags.coreLastAttackerPos = { x: attacker.x, y: attacker.y };
  }

  if (target.kind === 'core') {
    damageCore(amount);
    return;
  }
  if (target.kind === 'nest') {
    damageNest(target, amount);
    // v8.2: 虫巢受击 → 加速孵化（每次受击让下一只虫子最多 1.5s 内孵出，仍受 bugCount cap 限制）
    if (target.alive) {
      if (target.spawnTimer > 1.5) target.spawnTimer = 1.5;
      // 受击越狠（越接近死亡），孵化越紧迫
      const hpFrac = target.hp / target.maxHp;
      if (hpFrac < 0.5 && target.spawnTimer > 0.8) target.spawnTimer = 0.8;
      if (hpFrac < 0.25 && target.spawnTimer > 0.3) target.spawnTimer = 0.3;
    }
    return;
  }
  if (target.kind === 'hero') {
    target.hp -= amount;
    if (target.hp <= 0) killHero();
    return;
  }
  if (target.kind === 'bug') {
    // v7: 重甲虫物理减伤 50%（仅普通伤害链；法师塔/闪电直接 bug.hp -=，绕过此处）
    const finalAmt = (typeof applyHeavyReduction === 'function') ? applyHeavyReduction(target, amount) : amount;
    target.hp -= finalAmt;
    if (target.hp <= 0) killBug(target);
    return;
  }
  if (target.kind === 'swordsman') {
    target.hp -= amount;
    if (target.hp <= 0) { target.dead = true; target.hp = 0; }
    return;
  }
  // v8: 侦察兵可被攻击（agent B 给 scout 加 hp/maxHp/dead）
  if (target.kind === 'scout') {
    target.hp -= amount;
    if (target.hp <= 0) target.dead = true;
    return;
  }
  if (target.kind === 'building') {
    if (target.targetable === false) return;   // v6 §3: slow_spike 等免疫所有伤害
    target.hp -= amount;
    if (target.hp <= 0) killBuilding(target);
    return;
  }
}

// v6: 治疗术 1 格 AOE
function healEntity(target, amount) {
  if (!target) return;
  if (target.kind === 'core') { healCore(amount); return; }
  if (target.hp >= target.maxHp) return;
  target.hp = Math.min(target.maxHp, target.hp + amount);
}

function castHealAt(cx, cy) {
  // 视觉
  if (typeof addHealFx === 'function') addHealFx(cx, cy);
  const r = G.heal.radius;
  let healed = false;
  // 单位（建筑）：1 格半径内全部 +amount
  for (const b of S.buildings) {
    if (b.dead) continue;
    if (Math.hypot(b.x - cx, b.y - cy) <= r) { healEntity(b, G.heal.amount); healed = true; }
  }
  // 核心：1 格半径含核心则 +coreAmount
  if (Math.hypot(S.core.x - cx, S.core.y - cy) <= r) {
    healEntity(S.core, G.heal.coreAmount); healed = true;
  }
  return healed;
}

function addAttackFx(src, tgt, kind) {
  S.fx.push({
    type: 'line',
    x1: src.x, y1: src.y,
    x2: tgt.x, y2: tgt.y,
    timer: G.fx.attackLine,
    kind,
  });
}

function addFirerainFx(cx, cy) {
  S.fx.push({ type: 'firerain', x: cx, y: cy, r: G.firerain.radius, timer: G.fx.firerain });
}

function addSweepFx(cx, cy, radius) {
  S.fx.push({ type: 'sweep', x: cx, y: cy, r: radius, timer: G.fx.sweep });
}

// v5 新法术 fx
function addLightningFx(sx, sy, tx, ty) {
  S.fx.push({ type: 'lightning', x1: sx, y1: sy, x2: tx, y2: ty, timer: G.fx.lightning });
}
function addHealFx(cx, cy) {
  S.fx.push({ type: 'heal', x: cx, y: cy, timer: G.fx.heal });
}
// v5 法师塔 splash
function addMageBlastFx(cx, cy, r) {
  S.fx.push({ type: 'mageBlast', x: cx, y: cy, r, timer: 0.25 });
}

function updateFx(dt) {
  for (const f of S.fx) f.timer -= dt;
  S.fx = S.fx.filter(f => f.timer > 0);
}

// v6.1 §3: 减速地刺触发时调用 → 绿色脉冲（push fx 给 effects.js 渲染）
function pushSpikePulseFx(cx, cy) {
  S.fx.push({
    type: 'spikePulse',
    x: cx, y: cy,
    timer: G.fog.spikePulseDuration,
    duration: G.fog.spikePulseDuration,
  });
}
window.pushSpikePulseFx = pushSpikePulseFx;

function checkWinLose() {
  if (S.gameOver) return;

  // 失败：核心 hp 0
  if (S.core.hp <= 0) {
    S.defeat = true;
    S.gameOver = true;
    if (typeof onGameEnd === 'function') onGameEnd();
    return;
  }

  // v8: 击杀终极 Boss = 胜利（删除 v7 的 bloodMoonSurvived 单次胜利）
  // 等浮层（奖励包等）关闭后才触发，避免遮挡 UI
  if (S.flags && S.flags.terminalBossKilled && !S.overlay) {
    S.victory = true;
    S.gameOver = true;
    S.victoryReason = 'killed_terminal_boss';
    if (typeof onGameEnd === 'function') onGameEnd();
    return;
  }
}
