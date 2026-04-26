// systems/fog.js —— v5 迷雾系统
//
// 数据结构：
//   S.fogMap = {
//     cells: cells[y][x] = {
//       ownerCount: number,            // > 0 表示永久揭雾（VISIBLE）
//       tempExpireAt: number (ms),     // > now → TEMP_VISIBLE
//     },
//     ownersMap: { [ownerId]: Array<{x,y}> }   // 每个永久揭雾源的 owned cells
//   }
//
// API:
//   initFog()                          —— 在 resetState 末尾调用
//   isVisible(x, y)                    —— VISIBLE 或 TEMP_VISIBLE 都算 true
//   fogStateAt(x, y) → FogState
//   revealPermanent(x, y, r, ownerId)
//   removePermanent(ownerId)           —— 含连通性回滚（保留与主区相连部分）
//   revealTemp(x, y, r, durationSec)
//   updateFog(dt)                      —— 主循环每帧调一次（目前仅作为 hook，时间走 performance.now）

const FOG_CORE_OWNER = 'core_main_zone';

function initFog() {
  const W = G.mapWidth, H = G.mapHeight;
  const cells = new Array(H);
  for (let y = 0; y < H; y++) {
    cells[y] = new Array(W);
    for (let x = 0; x < W; x++) {
      cells[y][x] = { ownerCount: 0, tempExpireAt: 0 };
    }
  }
  S.fogMap = { cells, ownersMap: {}, exposes: [] };
  // 主区：核心永久揭雾
  revealPermanent(G.core.x, G.core.y, G.fog.coreVisionRadius, FOG_CORE_OWNER);
}

function inMap(x, y) {
  return x >= 0 && y >= 0 && x < G.mapWidth && y < G.mapHeight;
}

function fogCell(x, y) {
  if (!inMap(x, y)) return null;
  return S.fogMap.cells[y][x];
}

function isVisible(x, y) {
  // 单位用浮点坐标 → 取最近格
  const cx = Math.round(x), cy = Math.round(y);
  return fogStateAt(cx, cy) !== FogState.FOGGED;
}

function fogStateAt(x, y) {
  const c = fogCell(x, y);
  if (!c) return FogState.FOGGED;
  if (c.ownerCount > 0) return FogState.VISIBLE;
  if (c.tempExpireAt > performance.now()) return FogState.TEMP_VISIBLE;
  return FogState.FOGGED;
}

// 圆形半径内的格子（含中心）
function cellsInRadius(cx, cy, r) {
  const out = [];
  const ri = Math.ceil(r);
  for (let dy = -ri; dy <= ri; dy++) {
    for (let dx = -ri; dx <= ri; dx++) {
      const x = cx + dx, y = cy + dy;
      if (!inMap(x, y)) continue;
      if (Math.hypot(dx, dy) <= r + 0.001) out.push({ x, y });
    }
  }
  return out;
}

function revealPermanent(cx, cy, r, ownerId) {
  if (!S.fogMap) return;
  const owned = cellsInRadius(cx, cy, r);
  for (const { x, y } of owned) {
    S.fogMap.cells[y][x].ownerCount += 1;
  }
  S.fogMap.ownersMap[ownerId] = owned;
}

function removePermanent(ownerId) {
  if (!S.fogMap) return;
  const owned = S.fogMap.ownersMap[ownerId];
  if (!owned) return;
  for (const { x, y } of owned) {
    const c = S.fogMap.cells[y][x];
    c.ownerCount = Math.max(0, c.ownerCount - 1);
  }
  delete S.fogMap.ownersMap[ownerId];
  // "保留与主区相连部分"：连通性回滚
  // 当前实现：每个 owner 独立扣除自己贡献。主区（core）owner 永远存在，永远不会被 removePermanent 调用。
  // 因此凡是与主区相连且仍被任意 owner 覆盖的格子，自然保持 VISIBLE。
  // 已经掉到 ownerCount=0 的格子若距核心很远，会回到 FOGGED；这与"保留与主区相连"的需求一致。
}

function revealTemp(cx, cy, r, durationSec) {
  if (!S.fogMap) return;
  const expireAt = performance.now() + durationSec * 1000;
  for (const { x, y } of cellsInRadius(cx, cy, r)) {
    const c = S.fogMap.cells[y][x];
    if (c.tempExpireAt < expireAt) c.tempExpireAt = expireAt;
  }
}

function updateFog(/* dt */) {
  // tempExpireAt 用绝对时间，自然过期；保留 hook 以备未来扩展（如雾的扩散动画）。
  // v6.1 §3: 清理过期的 expose 记录（map.js 渲染红圈时按时间窗口画脉冲）
  if (!S.fogMap || !S.fogMap.exposes) return;
  const now = performance.now();
  S.fogMap.exposes = S.fogMap.exposes.filter(e => e.endsAt > now);
}

// v6.1 §3: 攻击暴露 —— 单格点亮 + 维护红圈渲染所需的 exposes 数组
function illuminateTile(cx, cy, durationSec) {
  if (!S.fogMap) return;
  if (!inMap(cx, cy)) return;
  // 暴露 = TEMP_VISIBLE + 红圈视觉（exposes 数组单独维护）
  revealTemp(cx, cy, 0, durationSec);     // 半径 0 = 仅本格点亮
  if (!S.fogMap.exposes) S.fogMap.exposes = [];
  const now = performance.now();
  const endsAt = now + durationSec * 1000;
  // 同格已有 → 重置 endsAt 与 startedAt（让红圈脉冲从头跑）；否则新增
  const existing = S.fogMap.exposes.find(e => e.x === cx && e.y === cy);
  if (existing) {
    existing.endsAt = Math.max(existing.endsAt, endsAt);
    existing.startedAt = now;
  } else {
    S.fogMap.exposes.push({ x: cx, y: cy, startedAt: now, endsAt });
  }
}

// 暴露给其它模块（buildings/scout/hero）
window.fogModule = {
  initFog, isVisible, fogStateAt,
  revealPermanent, removePermanent, revealTemp,
  illuminateTile,
  updateFog, FOG_CORE_OWNER,
};
window.illuminateTile = illuminateTile;
