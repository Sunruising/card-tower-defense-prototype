// systems/spawn.js —— 虫巢孵化（v6: 血月夜上限 ×2 + 第二虫巢首只 Boss + 血月加成）
function updateNests(dt) {
  // 防御性初始化
  if (S.flags && S.flags.bloodBossSpawned === undefined) S.flags.bloodBossSpawned = false;

  const isBM = !!S.bloodMoonActive;
  const baseCap = nestCurrentBugCap();
  const cap = baseCap * (isBM ? G.bloodMoon.bugCapMul : 1);

  for (const n of S.nests) {
    if (!n.alive) continue;
    if (n.bugCount >= cap) {
      n.spawnTimer = 0;
      continue;
    }
    const itv = nestCurrentSpawnInterval(n);
    if (itv === Infinity) continue;
    n.spawnTimer -= dt;
    if (n.spawnTimer <= 0) {
      // v6 §8: 第二个虫巢首只为血月 Boss（只在血月期间，全血月 1 只）
      const nestIdx = S.nests.indexOf(n);
      const shouldSpawnBoss = isBM && nestIdx === G.bloodMoon.bossNestIndex && S.flags && !S.flags.bloodBossSpawned;
      if (shouldSpawnBoss) {
        const boss = makeBug(n, { bloodBoss: true });
        if (S.phase === 'night') boss.state = 'marching';
        S.flags.bloodBossSpawned = true;
      } else {
        makeBug(n, { bloodMoon: isBM, isBloodMoonNight: isBM });
      }
      n.spawnTimer = itv;
    }
  }
  if (S.scoutTimer > 0) {
    S.scoutTimer -= dt;
    if (S.scoutTimer < 0) S.scoutTimer = 0;
  }
}
// v7: 每晚刷新虫巢由 phase.js 触发 spawnNightlyNest（不在此处处理）
