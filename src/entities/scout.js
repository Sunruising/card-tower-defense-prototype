// entities/scout.js —— v5 侦察兵单位
//
// 流程：
//   1) 玩家打 scout 卡（targetType='ground'） → 选目标格
//   2) spawnScout(coreX, coreY, targetX, targetY)
//   3) updateScouts(dt)：朝目标移动；每帧 revealTemp 当前位置周围 1 格 30s
//   4) 抵达目标 → 进入 'observing' 状态，停留 lifetimeAfterArrive 秒
//   5) 时间到自我销毁

function spawnScout(sx, sy, tx, ty) {
  const sc = {
    id: nextId(), kind: 'scout',
    x: sx, y: sy,
    targetX: tx, targetY: ty,
    state: 'moving',
    lifeTimer: 0,                      // observing 状态下累加
  };
  S.scouts.push(sc);
  return sc;
}

function updateScouts(dt) {
  if (!S.scouts || S.scouts.length === 0) return;
  for (const sc of S.scouts) {
    if (sc.dead) continue;

    // 每帧揭雾（沿途和抵达后都刷新）
    revealTemp(Math.round(sc.x), Math.round(sc.y), G.fog.scoutVisionRadius, G.fog.scoutVisionDuration);

    if (sc.state === 'moving') {
      const dx = sc.targetX - sc.x;
      const dy = sc.targetY - sc.y;
      const d = Math.hypot(dx, dy);
      if (d < 0.15) {
        sc.state = 'observing';
        sc.lifeTimer = 0;
        sc.x = sc.targetX;
        sc.y = sc.targetY;
      } else {
        sc.x += (dx / d) * G.scout.speed * dt;
        sc.y += (dy / d) * G.scout.speed * dt;
      }
    } else if (sc.state === 'observing') {
      sc.lifeTimer += dt;
      if (sc.lifeTimer >= G.scout.lifetimeAfterArrive) {
        sc.dead = true;
      }
    }
  }
  S.scouts = S.scouts.filter(sc => !sc.dead);
}
