// systems/talents.js —— v7.1 核心天赋树
//
// 数据：G.talents.defs（9 个节点 + cost / prereq / effect）
// 状态：S.talents = { points, unlocked: Array<id>, killCounter }
// 流程：
//   - earnTalentPoints(reason, amount) —— 累加（reason='kill'/'nestKill'/'day'/'manual'）
//   - canUnlockTalent(id) —— 检查 cost、prereq、未解锁
//   - unlockTalent(id) —— 扣点 + push unlocked + applyAllTalentEffects 重计算 hero baseline
//   - applyAllTalentEffects() —— 从 G.hero / G.heroes.tom.skills.sweep 的 baseline 重算 S.hero 字段，叠加所有已 unlocked 的 effect
//   - talentDef(id), isUnlocked(id), unlockedTalents() —— 查询用

function ensureTalentState() {
  if (!S) return;
  if (!S.talents) S.talents = { points: 0, unlocked: [], killCounter: 0 };
  if (!S.talents.unlocked) S.talents.unlocked = [];
  if (S.talents.killCounter === undefined) S.talents.killCounter = 0;
}

function talentDef(id) {
  return (G.talents && G.talents.defs) ? G.talents.defs.find(d => d.id === id) : null;
}

function isUnlocked(id) {
  ensureTalentState();
  return S.talents.unlocked.includes(id);
}

function unlockedTalents() {
  ensureTalentState();
  return S.talents.unlocked.slice();
}

function canUnlockTalent(id) {
  ensureTalentState();
  const d = talentDef(id);
  if (!d) return { ok: false, reason: '未知天赋' };
  if (isUnlocked(id)) return { ok: false, reason: '已解锁' };
  if (d.prereq && !isUnlocked(d.prereq)) {
    const p = talentDef(d.prereq);
    return { ok: false, reason: '需先解锁：' + (p ? p.name : d.prereq) };
  }
  if (S.talents.points < d.cost) return { ok: false, reason: '天赋点不足' };
  return { ok: true };
}

function unlockTalent(id) {
  const chk = canUnlockTalent(id);
  if (!chk.ok) {
    if (typeof showMessage === 'function') showMessage(chk.reason);
    return false;
  }
  const d = talentDef(id);
  S.talents.points -= d.cost;
  S.talents.unlocked.push(id);
  applyAllTalentEffects();
  if (typeof showMessage === 'function') showMessage('解锁：' + d.name);
  if (typeof spawnFloatingText === 'function' && S.core) {
    spawnFloatingText(S.core.x, S.core.y, '天赋解锁', 'loot');
  }
  return true;
}

function earnTalentPoints(reason, amount) {
  ensureTalentState();
  if (reason === 'kill') {
    S.talents.killCounter += amount;
    const every = (G.talents.pointsPerKills && G.talents.pointsPerKills.every) || 10;
    const per = (G.talents.pointsPerKills && G.talents.pointsPerKills.points) || 1;
    while (S.talents.killCounter >= every) {
      S.talents.killCounter -= every;
      S.talents.points += per;
      if (typeof showMessage === 'function') showMessage('天赋点 +' + per + '（击杀）');
    }
  } else if (reason === 'nestKill') {
    const gain = (G.talents.pointsPerNestKill || 1) * amount;
    S.talents.points += gain;
    if (typeof showMessage === 'function') showMessage('天赋点 +' + gain + '（虫巢）');
  } else if (reason === 'day') {
    const gain = (G.talents.pointsPerDay || 1) * amount;
    S.talents.points += gain;
    if (typeof showMessage === 'function') showMessage('天赋点 +' + gain + '（清晨）');
  } else if (reason === 'manual') {
    S.talents.points += amount;
  }
}

// 把所有已解锁天赋的 effect 应用到 S.hero baseline + sweep baseline
// 调用时机：unlockTalent 后；resetState 末尾（兜底，重启时 unlocked=[] 不影响）
function applyAllTalentEffects() {
  if (!S || !S.hero) return;
  // 1) 先把 S.hero 的可被天赋影响的字段重置回 G.hero baseline
  S.hero.maxHp = G.hero.maxHp;
  // hp 不强制重置（保留当前血量）；除非天赋有 heroHeal 才加血
  S.hero.damage = G.hero.damage;
  S.hero.attackSpeed = G.hero.attackSpeed;
  S.hero.attackRange = G.hero.attackRange;
  S.hero.vsNestMul = 1;
  // visionRadius / chaseLimit 用动态字段（ai.js 读 G.hero.visionRadius / chaseLimit；天赋叠加后我们在 hero 上加 visionRadiusBonus / chaseLimitBonus）
  S.hero.visionRadiusBonus = 0;
  S.hero.chaseLimitBonus = 0;
  S.hero.marchSpeedMul = 1;
  // sweep 单独：每次重置回 G 默认
  S.heroSweepDamageBonus = 0;
  S.hero.skillCardCD = G.hero.skillCardCD;     // 重置 sweep CD baseline

  // 2) 遍历已解锁天赋，叠加 effect
  ensureTalentState();
  let totalHeal = 0;
  for (const id of S.talents.unlocked) {
    const d = talentDef(id);
    if (!d || !d.effect) continue;
    const e = d.effect;
    if (e.heroDamage) S.hero.damage += e.heroDamage;
    if (e.heroMaxHp) {
      S.hero.maxHp += e.heroMaxHp;
    }
    if (e.heroHeal) totalHeal += e.heroHeal;
    if (e.heroAttackSpeedMul) S.hero.attackSpeed *= e.heroAttackSpeedMul;
    if (e.heroVisionRadius) S.hero.visionRadiusBonus += e.heroVisionRadius;
    if (e.heroChaseLimit) S.hero.chaseLimitBonus += e.heroChaseLimit;
    if (e.heroMarchSpeedMul) S.hero.marchSpeedMul *= e.heroMarchSpeedMul;
    if (e.heroVsNestMul) S.hero.vsNestMul = (S.hero.vsNestMul || 1) * e.heroVsNestMul;
    if (e.sweepCdReduce) S.hero.skillCardCD = Math.max(5, S.hero.skillCardCD - e.sweepCdReduce);
    if (e.sweepDamage) S.heroSweepDamageBonus = (S.heroSweepDamageBonus || 0) + e.sweepDamage;
  }
  // 应用一次性回血（仅 unlock 当下，避免每帧重复回血）
  if (totalHeal > 0) {
    S.hero.hp = Math.min(S.hero.maxHp, S.hero.hp + totalHeal);
  }
}

// 暴露
window.ensureTalentState = ensureTalentState;
window.talentDef = talentDef;
window.isUnlocked = isUnlocked;
window.unlockedTalents = unlockedTalents;
window.canUnlockTalent = canUnlockTalent;
window.unlockTalent = unlockTalent;
window.earnTalentPoints = earnTalentPoints;
window.applyAllTalentEffects = applyAllTalentEffects;
