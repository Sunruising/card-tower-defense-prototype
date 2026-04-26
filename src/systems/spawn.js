// systems/spawn.js —— 虫巢孵化（v6: 血月夜上限 ×2 + 第二虫巢首只 Boss + 血月加成）
function updateNests(dt) {
  // 防御性初始化
  if (S.flags && S.flags.bloodBossSpawned === undefined) S.flags.bloodBossSpawned = false;

  const isBM = !!S.bloodMoonActive;
  const baseCap = nestCurrentBugCap();
  const cap = baseCap * (isBM ? G.bloodMoon.bugCapMul : 1);

  // v8: 计算血月 Boss 应在哪个 alive 巢出生（优先 bossNestIndex；若该巢已死则取首个 alive 巢）
  let bossNestId = null;
  if (isBM && S.flags && !S.flags.bloodBossSpawned) {
    const bossIdx = (G.bloodMoon && G.bloodMoon.bossNestIndex != null) ? G.bloodMoon.bossNestIndex : 0;
    let bossNest = S.nests[bossIdx];
    if (!bossNest || !bossNest.alive) bossNest = S.nests.find(n => n.alive);
    if (bossNest) bossNestId = bossNest.id;
  }

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
      // v6 §8 / v8: 指定巢首只为血月 Boss（只在血月期间，全血月 1 只）
      const shouldSpawnBoss = isBM && bossNestId != null && n.id === bossNestId
        && S.flags && !S.flags.bloodBossSpawned;
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
