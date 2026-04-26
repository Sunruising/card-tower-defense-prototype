// systems/input.js —— 鼠标键盘输入（v6: 商店栏 + 卡包浮层）
function screenToCell(mx, my) {
  const cellX = Math.floor(mx / G.cellSize);
  const cellY = Math.floor((my - G.mapTop) / G.cellSize);
  return { x: cellX, y: cellY };
}

function isOverMap(mx, my) {
  return my >= G.mapTop && my < G.mapTop + G.mapPixelHeight && mx >= 0 && mx < G.canvasWidth;
}
function isOverTopBar(my) { return my < G.topBarHeight; }
function isOverShopBar(my) { return my >= G.topBarHeight && my < G.mapTop; }
// 兼容旧名（如有外部引用）
function isOverDrawBar(my) { return isOverShopBar(my); }
function isOverHand(my) { return my >= G.mapTop + G.mapPixelHeight; }

// v6: 商店栏 6 个按钮
function shopBarRects() {
  const rects = [];
  const items = G.shop || [];
  if (items.length === 0) return rects;
  const h = G.shopBarHeight - 10;
  const totalGap = (items.length - 1) * 6;
  const sideMargin = 8;
  const totalAvail = G.canvasWidth - sideMargin * 2 - totalGap;
  const btnW = Math.floor(totalAvail / items.length);
  const startX = sideMargin;
  const y = G.topBarHeight + 5;
  for (let i = 0; i < items.length; i++) {
    rects.push({
      x: startX + i * (btnW + 6),
      y, w: btnW, h, itemIndex: i,
    });
  }
  return rects;
}

// v6: 战利品 3 选 1 卡片位置（lootPick3）
function lootOverlayRects() {
  if (!S.overlay) return [];
  if (S.overlay.kind !== 'lootPick3') return [];
  const picks = S.overlay.picks || [];
  const rects = [];
  const w = 110, h = 160, gap = 18;
  const totalW = picks.length * w + Math.max(0, picks.length - 1) * gap;
  const startX = (G.canvasWidth - totalW) / 2;
  const y = G.mapTop + (G.mapPixelHeight - h) / 2;
  for (let i = 0; i < picks.length; i++) {
    rects.push({ x: startX + i * (w + gap), y, w, h, cardId: picks[i] });
  }
  return rects;
}

// v6: 单卡浮层"确认"按钮（lootSingle 或 bloodMoonReward）
function lootRewardConfirmRect() {
  const w = 140, h = 38;
  const x = (G.canvasWidth - w) / 2;
  const y = G.mapTop + G.mapPixelHeight - 60;
  return { x, y, w, h };
}

// v6: bloodMoonReward 浮层中两张卡的位置
function bloodMoonRewardCardRects() {
  if (!S.overlay || S.overlay.kind !== 'bloodMoonReward') return [];
  const rects = [];
  const hasEpic = !!S.overlay.epic;
  const w = 110, h = 160, gap = 24;
  const cards = hasEpic ? 2 : 1;
  const totalW = cards * w + Math.max(0, cards - 1) * gap;
  const startX = (G.canvasWidth - totalW) / 2;
  const y = G.mapTop + (G.mapPixelHeight - h) / 2 - 10;
  rects.push({ x: startX, y, w, h, cardId: S.overlay.rare, role: 'rare' });
  if (hasEpic) {
    rects.push({ x: startX + (w + gap), y, w, h, cardId: S.overlay.epic, role: 'epic' });
  }
  return rects;
}

function overlayDismissRect() {
  // 覆盖层右上角"关闭"按钮（lootPick3 用）
  const w = 100, h = 28;
  return { x: G.canvasWidth - w - 16, y: G.mapTop + 16, w, h };
}

function handCardRects() {
  const rects = [];
  const max = G.hand.maxSize;
  const cardW = 54, cardH = 96, gap = 4;
  const skillSlotW = 74;
  const skillGap = 12;
  const totalW = max * cardW + (max - 1) * gap + skillGap + skillSlotW;
  const startX = (G.canvasWidth - totalW) / 2;
  const y = G.mapTop + G.mapPixelHeight + 10;
  for (let i = 0; i < max; i++) {
    rects.push({
      x: startX + i * (cardW + gap),
      y, w: cardW, h: cardH,
      index: i,
    });
  }
  return rects;
}

function skillSlotRect() {
  const max = G.hand.maxSize;
  const cardW = 54, cardH = 96, gap = 4;
  const skillSlotW = 74;
  const skillGap = 12;
  const totalW = max * cardW + (max - 1) * gap + skillGap + skillSlotW;
  const startX = (G.canvasWidth - totalW) / 2;
  const y = G.mapTop + G.mapPixelHeight + 10;
  const x = startX + max * cardW + (max - 1) * gap + skillGap;
  return { x, y, w: skillSlotW, h: cardH };
}

function pauseBtnRect() { return { x: G.canvasWidth - 80, y: 5, w: 70, h: 30 }; }

// v7.1: 顶栏天赋按钮（在暂停按钮左边）
function talentBtnRect() { return { x: G.canvasWidth - 170, y: 5, w: 80, h: 30 }; }

// v7.1: 探照灯方向按钮（围绕选定的 cell，4 方向圆形按钮）
function searchlightDirectionRects() {
  const pm = S.placementMode;
  if (!pm || pm.subStep !== 'pickDirection') return [];
  const cx = pm.pickedCellX * G.cellSize + G.cellSize / 2;
  const cy = G.mapTop + pm.pickedCellY * G.cellSize + G.cellSize / 2;
  const off = G.cellSize * 1.4;
  const r = 18;
  return [
    { x: cx - r,         y: cy - off - r, w: 2*r, h: 2*r, dir: 'up' },
    { x: cx - r,         y: cy + off - r, w: 2*r, h: 2*r, dir: 'down' },
    { x: cx - off - r,   y: cy - r,       w: 2*r, h: 2*r, dir: 'left' },
    { x: cx + off - r,   y: cy - r,       w: 2*r, h: 2*r, dir: 'right' },
  ];
}

// v7.1: 天赋面板内每个节点 rect
function talentNodeRects() {
  if (!S.overlay || S.overlay.kind !== 'talents') return [];
  const defs = (G.talents && G.talents.defs) || [];
  const rects = [];
  const cols = 3, w = 200, h = 90, gap = 14;
  const totalW = cols * w + (cols - 1) * gap;
  const totalH = Math.ceil(defs.length / cols) * h + (Math.ceil(defs.length / cols) - 1) * gap;
  const startX = (G.canvasWidth - totalW) / 2;
  const startY = G.mapTop + (G.mapPixelHeight - totalH) / 2 + 10;
  for (let i = 0; i < defs.length; i++) {
    const col = i % cols, row = Math.floor(i / cols);
    rects.push({
      x: startX + col * (w + gap),
      y: startY + row * (h + gap),
      w, h, talentId: defs[i].id,
    });
  }
  return rects;
}

function talentPanelCloseBtnRect() {
  const w = 100, h = 32;
  return { x: G.canvasWidth - w - 16, y: G.mapTop + 16, w, h };
}

function confirmDialogRects() {
  const w = 320, h = 130;
  const x = (G.canvasWidth - w) / 2;
  const y = G.mapTop + (G.mapPixelHeight - h) / 2;
  return {
    box: { x, y, w, h },
    yes: { x: x + 40, y: y + 80, w: 100, h: 32 },
    no: { x: x + 180, y: y + 80, w: 100, h: 32 },
  };
}

function restartBtnRect() {
  const w = 180, h = 40;
  const x = (G.canvasWidth - w) / 2;
  const y = G.mapTop + G.mapPixelHeight / 2 + 100;
  return { x, y, w, h };
}

function pointInRect(mx, my, r) {
  return mx >= r.x && mx < r.x + r.w && my >= r.y && my < r.y + r.h;
}

// v6: 浮层关闭/领取（rare 必入手；epic 若有也入手）
function dismissBloodMoonReward() {
  if (!S.overlay || S.overlay.kind !== 'bloodMoonReward') return;
  const ov = S.overlay;
  if (ov.rare) addCardToHand(ov.rare);
  if (ov.epic) addCardToHand(ov.epic);
  if (S.flags) S.flags.bloodMoonAnnounced = true;
  S.overlay = null;
  showMessage('已领取血月奖励');
}

function dismissLootSingle() {
  if (!S.overlay || S.overlay.kind !== 'lootSingle') return;
  if (S.overlay.cardId) addCardToHand(S.overlay.cardId);
  S.overlay = null;
}

function pickLootCard(cardId) {
  if (!S.overlay || S.overlay.kind !== 'lootPick3') return;
  if (cardId) addCardToHand(cardId);
  S.overlay = null;
}

function bindInput(canvas) {
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  canvas.addEventListener('mousemove', e => {
    const { mx, my } = getMouse(canvas, e);
    S.mouseX = mx; S.mouseY = my;
    S.hoveredCardIndex = null;
    S.hoveredNestId = null;
    S.hoveredBuildingId = null;
    S.hoveredShopIndex = null;
    S.hoveredOverlayIndex = null;

    // v6: 浮层 hover
    if (S.overlay) {
      if (S.overlay.kind === 'lootPick3') {
        const rects = lootOverlayRects();
        for (let i = 0; i < rects.length; i++) {
          if (pointInRect(mx, my, rects[i])) { S.hoveredOverlayIndex = i; break; }
        }
      }
      return;
    }

    if (isOverShopBar(my)) {
      for (const r of shopBarRects()) {
        if (pointInRect(mx, my, r)) { S.hoveredShopIndex = r.itemIndex; break; }
      }
      return;
    }

    if (isOverHand(my)) {
      const rects = handCardRects();
      for (const r of rects) {
        if (r.index < S.hand.length && pointInRect(mx, my, r)) {
          S.hoveredCardIndex = r.index; return;
        }
      }
      if (pointInRect(mx, my, skillSlotRect())) S.hoveredCardIndex = 'skill';
      return;
    }

    if (isOverMap(mx, my)) {
      const c = screenToCell(mx, my);
      if (S.placementMode) {
        S.placementMode.hoverCell = c;
        // v6 §1: 法术悬停在迷雾格 → fogHovered = true（仅非侦察兵法术）
        const def = S.placementMode.def;
        if (def && def.type === 'spell' && def.id !== 'scout') {
          if (typeof isVisible === 'function' && cellInsideMap(c.x, c.y)) {
            S.placementMode.fogHovered = !isVisible(c.x, c.y);
          } else {
            S.placementMode.fogHovered = false;
          }
        } else {
          S.placementMode.fogHovered = false;
        }
      }
      for (const n of S.nests) {
        if (n.alive && n.x === c.x && n.y === c.y) { S.hoveredNestId = n.id; break; }
      }
      for (const b of S.buildings) {
        if (!b.dead && b.x === c.x && b.y === c.y) { S.hoveredBuildingId = b.id; break; }
      }
    }
  });

  canvas.addEventListener('mousedown', e => {
    const { mx, my } = getMouse(canvas, e);
    const rightClick = (e.button === 2);

    if (S.gameOver) {
      if (!rightClick && pointInRect(mx, my, restartBtnRect())) resetState();
      return;
    }

    // v6: 卡包/奖励浮层最高优先级
    if (S.overlay) {
      // v7.1 天赋面板 — 允许右键 / 关闭按钮关闭，节点点击解锁
      if (S.overlay.kind === 'talents') {
        if (rightClick) { S.overlay = null; return; }
        if (pointInRect(mx, my, talentPanelCloseBtnRect())) { S.overlay = null; return; }
        for (const r of talentNodeRects()) {
          if (pointInRect(mx, my, r)) {
            if (typeof unlockTalent === 'function') unlockTalent(r.talentId);
            return;
          }
        }
        return;
      }
      if (rightClick) return; // 不允许直接关闭奖励
      if (S.overlay.kind === 'lootPick3') {
        // 必须选一张
        for (const r of lootOverlayRects()) {
          if (pointInRect(mx, my, r)) { pickLootCard(r.cardId); return; }
        }
        return;
      }
      if (S.overlay.kind === 'lootSingle') {
        // 点确认或任意位置都领取
        if (pointInRect(mx, my, lootRewardConfirmRect())) { dismissLootSingle(); return; }
        // 留作"任意位置确认"
        dismissLootSingle();
        return;
      }
      if (S.overlay.kind === 'bloodMoonReward') {
        if (pointInRect(mx, my, lootRewardConfirmRect())) { dismissBloodMoonReward(); return; }
        return;
      }
      return;
    }

    if (S.pendingNestClick) {
      const r = confirmDialogRects();
      if (!rightClick && pointInRect(mx, my, r.yes)) { confirmMarch(); return; }
      if (!rightClick && pointInRect(mx, my, r.no)) { S.pendingNestClick = null; return; }
      if (rightClick) { S.pendingNestClick = null; return; }
      return;
    }

    if (rightClick) {
      if (S.placementMode) { cancelPlacement(); return; }
      if (isOverMap(mx, my)) {
        const c = screenToCell(mx, my);
        const b = S.buildings.find(b => !b.dead && b.x === c.x && b.y === c.y);
        if (b) { removeBuilding(b); showMessage('已拆除（不返还胶质）'); return; }
      }
      return;
    }

    if (isOverTopBar(my)) {
      if (pointInRect(mx, my, pauseBtnRect())) S.paused = !S.paused;
      // v7.1: 天赋按钮
      if (pointInRect(mx, my, talentBtnRect())) {
        S.overlay = { kind: 'talents' };
      }
      return;
    }

    if (isOverShopBar(my)) {
      for (const r of shopBarRects()) {
        if (pointInRect(mx, my, r)) { buyFromShop(r.itemIndex); return; }
      }
      return;
    }

    if (isOverHand(my)) {
      const rects = handCardRects();
      for (const r of rects) {
        if (r.index < S.hand.length && pointInRect(mx, my, r)) {
          beginPlacement(r.index);
          return;
        }
      }
      if (pointInRect(mx, my, skillSlotRect())) { useHeroSkillSlot(); return; }
      return;
    }

    if (isOverMap(mx, my)) {
      const c = screenToCell(mx, my);

      // v7.1: 探照灯方向选择子模式优先级最高
      if (S.placementMode && S.placementMode.subStep === 'pickDirection') {
        for (const r of searchlightDirectionRects()) {
          if (pointInRect(mx, my, r)) {
            if (typeof confirmSearchlightDirection === 'function') confirmSearchlightDirection(r.dir);
            return;
          }
        }
        // 点其它地方不取消（玩家必须选方向；右键 / ESC 才取消）
        return;
      }

      // v5: 礼盒点击拾取（优先级高于其它）
      const gift = S.gifts && S.gifts.find(g => !g.pickedUp && !g.expired
                                                && Math.round(g.x) === c.x && Math.round(g.y) === c.y);
      if (gift) { onClickGift(gift); return; }

      // v6: target-select 模式（仅 lightning）
      if (S.placementMode && S.placementMode.selectKind) {
        applyTargetSelectAt(c.x, c.y);
        return;
      }

      if (S.placementMode) { confirmPlacementAt(c.x, c.y); return; }

      // 单击英雄 → 镜头聚焦
      if (heroAlive() && Math.round(S.hero.x) === c.x && Math.round(S.hero.y) === c.y) {
        focusCameraOn(S.hero.id);
        return;
      }

      const nest = S.nests.find(n => n.alive && n.x === c.x && n.y === c.y);
      if (nest) {
        focusCameraOn(nest.id);
        const reason = marchUnavailableReason();
        if (reason) { showMessage(reason); return; }
        S.pendingNestClick = { nestId: nest.id };
        return;
      }

      const b = S.buildings.find(b => !b.dead && b.x === c.x && b.y === c.y);
      if (b) { S.selectedBuildingId = b.id; return; }
      S.selectedBuildingId = null;
    }
  });

  window.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!S.gameOver) S.paused = !S.paused;
      return;
    }
    if (e.code === 'Escape') {
      // v7.1: ESC 可关闭天赋面板
      if (S.overlay && S.overlay.kind === 'talents') { S.overlay = null; return; }
      if (S.overlay) return;
      if (S.placementMode) cancelPlacement();
      else if (S.pendingNestClick) S.pendingNestClick = null;
      return;
    }
    // v7.1: 数字键 1-9, 0 激活手牌堆（1=第 0 堆, 0=第 9 堆）
    if (!S.gameOver && !S.paused && !S.overlay) {
      let idx = -1;
      if (e.key >= '1' && e.key <= '9') idx = parseInt(e.key, 10) - 1;
      else if (e.key === '0') idx = 9;
      if (idx >= 0 && idx < S.hand.length) {
        e.preventDefault();
        // 若已在 placement 模式 — 切换到该堆
        if (S.placementMode) cancelPlacement();
        beginPlacement(idx);
        return;
      }
    }
    // v7.1: T 键打开/关闭天赋面板
    if (e.key === 't' || e.key === 'T') {
      if (S.overlay && S.overlay.kind === 'talents') S.overlay = null;
      else if (!S.overlay && !S.gameOver) S.overlay = { kind: 'talents' };
      return;
    }
  });
}

function getMouse(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  return {
    mx: (e.clientX - rect.left) * (canvas.width / rect.width),
    my: (e.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function marchUnavailableReason() {
  if (S.tokens <= 0) return '令牌不足';
  if (!heroAlive()) return '英雄已死亡';
  if (heroIsBusy()) return '英雄已出征';
  return null;
}

function confirmMarch() {
  if (!S.pendingNestClick) return;
  const nest = S.nests.find(n => n.id === S.pendingNestClick.nestId);
  S.pendingNestClick = null;
  if (!nest || !nest.alive) return;
  const reason = marchUnavailableReason();
  if (reason) { showMessage(reason); return; }
  S.tokens -= 1;
  heroStartMarch(nest);
  showMessage('英雄出征！');
}

// v4 镜头/焦点跟随
function focusCameraOn(entityId) {
  if (!entityId) return;
  S.cameraTargetId = entityId;
  S.cameraRingTimer = G.fx.cameraRing;
}

function cameraTargetPos() {
  if (!S.cameraTargetId) return null;
  if (S.cameraTargetId === S.hero.id && heroAlive()) {
    return { x: S.hero.x, y: S.hero.y, kind: 'hero' };
  }
  const nest = S.nests.find(n => n.id === S.cameraTargetId && n.alive);
  if (nest) return { x: nest.x, y: nest.y, kind: 'nest' };
  return null;
}
