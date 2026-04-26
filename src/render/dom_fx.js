// render/dom_fx.js —— v4 DOM 特效层
// 击杀飘字 / 夜晚来袭告示 / 开场叙事 全部用纯 CSS animation。
//
// 坐标系：
//   传入 (cellX, cellY) 是地图格子坐标
//   px = cellX * cellSize + cellSize/2
//   py = G.mapTop + cellY * cellSize + cellSize/2
// stage 容器尺寸与 canvas backing 像素一致（main.js 中 setupStageSize()）

function fxLayer() { return document.getElementById('fx-layer'); }
function noticeLayer() { return document.getElementById('notice-layer'); }
function introLayer() { return document.getElementById('intro-layer'); }

function cellToStagePx(cellX, cellY) {
  const px = cellX * G.cellSize + G.cellSize / 2;
  const py = G.mapTop + cellY * G.cellSize + G.cellSize / 2;
  return { px, py };
}

function spawnFloatingText(cellX, cellY, text, cls) {
  const layer = fxLayer();
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'float-text ' + (cls || 'kill');
  el.textContent = text;
  const { px, py } = cellToStagePx(cellX, cellY);
  el.style.left = px + 'px';
  el.style.top = py + 'px';
  layer.appendChild(el);
  // 自动清理（与 keyframes 时长对齐：0.9s / 1.2s 都覆盖）
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1400);
}

function showNightNotice(text, kind) {
  const layer = noticeLayer();
  if (!layer) return;
  // 同时只显示一条，旧的提前移除
  while (layer.firstChild) layer.removeChild(layer.firstChild);
  const el = document.createElement('div');
  el.className = 'notice ' + (kind || '');
  el.textContent = text;
  layer.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2300);
}

function hideIntroNarrative() {
  const el = introLayer();
  if (!el) return;
  el.classList.add('fade-out');
  setTimeout(() => { if (el && el.parentNode) el.style.display = 'none'; }, 500);
}

// v6 §8: 血月预告（dusk 进入时全屏中央红字）
function showBloodMoonComing() {
  const layer = noticeLayer();
  if (!layer) return;
  while (layer.firstChild) layer.removeChild(layer.firstChild);
  const el = document.createElement('div');
  el.className = 'notice night blood-moon-coming';
  el.textContent = '血月将至';
  // inline 兜底样式（独立于 style.css）
  el.style.color = '#FF3030';
  el.style.fontSize = '36px';
  el.style.letterSpacing = '6px';
  el.style.textShadow = '0 2px 0 #000, 0 0 20px rgba(255,40,40,0.95)';
  layer.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2300);
}

// v6 §8: 血月幸存（dawn 收尾时弹）
function showBloodMoonSurvived() {
  const layer = noticeLayer();
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'notice dawn blood-moon-survived';
  el.textContent = '你撑住了第一次血月';
  el.style.color = '#FFD0D0';
  el.style.fontSize = '28px';
  el.style.letterSpacing = '4px';
  el.style.textShadow = '0 2px 0 #000, 0 0 16px rgba(255,80,80,0.85)';
  layer.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 2500);
}

// v6 §9: 血月后第一个白天，提示虫流虚假化（仅一次）
function showRallyChangeNotice() {
  const layer = noticeLayer();
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'notice dawn rally-change';
  el.textContent = '虫子的行进路线变了。';
  el.style.color = '#FFB060';
  el.style.fontSize = '22px';
  el.style.letterSpacing = '3px';
  el.style.textShadow = '0 2px 0 #000, 0 0 14px rgba(255,160,40,0.85)';
  layer.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 3000);
}

// =====================================================================
// v6.1 礼盒补完
// =====================================================================

// 飞卡入手牌（视觉占位：从礼盒位置 → 手牌区中央，translate + scale + 淡出）
function flyCardToHand(fromCellX, fromCellY, cardId) {
  const layer = fxLayer();
  if (!layer) return;
  const def = (typeof CARD_DEFS !== 'undefined') ? CARD_DEFS[cardId]
            : (window.CARD_DEFS ? window.CARD_DEFS[cardId] : null);
  const name = def ? def.name : cardId;
  const startPx = fromCellX * G.cellSize + G.cellSize / 2;
  const startPy = G.mapTop + fromCellY * G.cellSize + G.cellSize / 2;
  // 终点：手牌区中央
  const endPx = G.canvasWidth / 2;
  const endPy = G.mapTop + G.mapPixelHeight + G.handHeight / 2;

  const el = document.createElement('div');
  el.className = 'fly-card';
  el.textContent = name;
  // inline 兜底样式，确保独立于 style.css 也可见
  el.style.position = 'absolute';
  el.style.left = startPx + 'px';
  el.style.top = startPy + 'px';
  el.style.transform = 'translate(-50%, -50%) scale(1)';
  el.style.padding = '6px 10px';
  el.style.background = 'rgba(40,40,40,0.92)';
  el.style.border = '2px solid #5DADE2';
  el.style.borderRadius = '6px';
  el.style.color = '#FFF';
  el.style.font = 'bold 12px sans-serif';
  el.style.whiteSpace = 'nowrap';
  el.style.pointerEvents = 'none';
  el.style.zIndex = '50';
  el.style.opacity = '1';
  const flyDur = (G.gift && G.gift.flyDuration) || 0.6;
  el.style.transition = `transform ${flyDur}s cubic-bezier(0.5, 0.05, 0.4, 1), opacity 0.3s ease-out`;
  layer.appendChild(el);

  // rAF 后启动动画
  requestAnimationFrame(() => {
    const dx = endPx - startPx;
    const dy = endPy - startPy;
    el.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.3)`;
    setTimeout(() => { el.style.opacity = '0'; }, flyDur * 1000 - 100);
  });
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, flyDur * 1000 + 350);
}

// 顶栏数字弹跳：gift.js 调用 bumpStat('glue'/'gems') 触发
function bumpStat(key) {
  if (typeof S === 'undefined' || !S) return;
  if (!S.statBumps) S.statBumps = {};
  S.statBumps[key] = (G.gift && G.gift.valuePopDuration) || 0.5;
}

// 每帧自减（main.js gameLoop 调）
function tickStatBumps(dt) {
  if (typeof S === 'undefined' || !S || !S.statBumps) return;
  for (const k of Object.keys(S.statBumps)) {
    S.statBumps[k] = Math.max(0, S.statBumps[k] - dt);
    if (S.statBumps[k] === 0) delete S.statBumps[k];
  }
}

// 占位 stub：核心受击红色 ❗（实际渲染由 map.js 做，此处仅设 flag）
// agent C 在 combat.js 已直接 set S.flags.coreUnderAttackAt；
// agent B 调本函数时这里同步一次，确保未定义函数不会报错。
function showCoreUnderAttack() {
  if (typeof S === 'undefined' || !S) return;
  if (!S.flags) S.flags = {};
  S.flags.coreUnderAttackAt = performance.now();
}
