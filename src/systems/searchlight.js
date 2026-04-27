// systems/searchlight.js —— v7.1 探照灯锥形慢速永久驱散
//
// 每 scanInterval 秒，每盏探照灯：
//   1. 收集自身位置朝 b.direction 的 90° 锥形内、所有距离 <= range 的格子
//   2. 过滤已驱散（VISIBLE）的格子
//   3. 按"距核心距离"升序排序
//   4. 取最近的一格 → revealPermanent(cx, cy, 0, b.fogOwnerId)
//
// 锥形判定：
//   right: dx > 0 && |dy| <= dx
//   left:  dx < 0 && |dy| <= -dx
//   down:  dy > 0 && |dx| <= dy
//   up:    dy < 0 && |dx| <= -dy
// 中心格（dx=dy=0）算自身位置，不需要再驱散

function _searchlightConeCells(b) {
  const out = [];
  const range = G.searchlight.range;
  const dir = b.direction || 'right';
  for (let dy = -range; dy <= range; dy++) {
    for (let dx = -range; dx <= range; dx++) {
      if (dx === 0 && dy === 0) continue;
      const dist = Math.hypot(dx, dy);
      if (dist > range) continue;
      let ok = false;
      if (dir === 'right') ok = (dx > 0 && Math.abs(dy) <= dx);
      else if (dir === 'left') ok = (dx < 0 && Math.abs(dy) <= -dx);
      else if (dir === 'down') ok = (dy > 0 && Math.abs(dx) <= dy);
      else if (dir === 'up') ok = (dy < 0 && Math.abs(dx) <= -dy);
      if (!ok) continue;
      const x = b.x + dx, y = b.y + dy;
      if (x < 0 || y < 0 || x >= G.mapWidth || y >= G.mapHeight) continue;
      out.push({ x, y, distFromCore: Math.hypot(x - S.core.x, y - S.core.y) });
    }
  }
  return out;
}

function updateSearchlights(dt) {
  if (!S.buildings) return;
  for (const b of S.buildings) {
    if (b.dead || b.type !== 'searchlight') continue;
    // v8.1 天赋 + v8.3 升级 intervalMul
    const intervalMul = ((S.mul && S.mul.searchlightIntervalMul) || 1) * (b.intervalMul || 1);
    const interval = G.searchlight.scanInterval * intervalMul;
    if (b.scanTimer === undefined) b.scanTimer = interval;
    b.scanTimer -= dt;
    if (b.scanTimer > 0) continue;
    b.scanTimer = interval;
    // 收集锥形内的格子
    const cells = _searchlightConeCells(b);
    if (cells.length === 0) continue;
    // 过滤已是 VISIBLE 的（永久驱散过 ownerCount > 0）
    const fogged = [];
    for (const c of cells) {
      if (typeof fogStateAt === 'function') {
        if (fogStateAt(c.x, c.y) !== FogState.VISIBLE) fogged.push(c);
      } else {
        fogged.push(c);
      }
    }
    if (fogged.length === 0) continue;
    // 按距核心升序（每帧重排：玩家可能堵建筑/驱散区变化，必须每次都重新算）
    fogged.sort((a, b1) => a.distFromCore - b1.distFromCore);
    const target = fogged[0];
    if (typeof revealPermanent === 'function') {
      revealPermanent(target.x, target.y, 0, b.fogOwnerId);
    }
  }
}

if (typeof window !== 'undefined') window.updateSearchlights = updateSearchlights;
