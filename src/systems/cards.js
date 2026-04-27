// systems/cards.js —— v6: 商店直购 + handStacks 出牌
//
// 顶部商店栏 G.shop 列出 6 张普通卡，点击直购：扣胶 → addCardToHand。
// 卡包来源（战利品 / 血月奖励）走 S.overlay（lootPick3 / lootSingle / bloodMoonReward），
// 在 input.js 中处理点击。
//
// handStack 结构：S.hand[i] = { cardId, count }
// beginPlacement(handIndex) 取最上面一张 → consumeHandStack 后若同堆还有，placementMode 保留实现"粘性放置"。

// ============ 共用：辅助 ============
function weightedPickArr(arr) {
  if (!arr || arr.length === 0) return null;
  let total = 0;
  for (const c of arr) total += c.weight;
  let r = Math.random() * total;
  for (const c of arr) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return arr[arr.length - 1];
}

// ============ v6 商店 ============

function shopUnavailableReason(itemIndex) {
  if (S.paused) return '暂停中';
  if (S.gameOver) return '游戏已结束';
  const it = G.shop[itemIndex];
  if (!it) return '未知商品';
  if (S.glue < it.cost) return `胶质不足（需要 ${it.cost}）`;
  // 上限是堆数。若已有同 id 堆，可继续叠加；否则不让买
  if (S.hand.length >= G.hand.maxSize) {
    const existing = S.hand.find(s => s.cardId === it.id);
    if (!existing) return '手牌堆满';
  }
  return null;
}

function buyFromShop(itemIndex) {
  const reason = shopUnavailableReason(itemIndex);
  if (reason) { showMessage(reason); return; }
  const it = G.shop[itemIndex];
  S.glue -= it.cost;
  addCardToHand(it.id);
  showMessage(`购入：${CARD_DEFS[it.id].name}`);
}

// ============ 打卡 ============

function handIndexUnavailableReason(idx) {
  const stack = S.hand[idx];
  if (!stack) return null;
  if (S.paused) return '暂停中不可打卡';
  if (S.gameOver) return '游戏已结束';
  return null;
}

function skillSlotUnavailableReason() {
  // v5 英雄技能宪法：只在英雄死亡时不可用，删除"出征中"等限制
  if (!S.heroSkillSlot) return '技能槽为空';
  if (S.paused) return '暂停中不可打卡';
  if (S.gameOver) return '游戏已结束';
  if (!heroAlive()) return '英雄已死亡';
  return null;
}

function beginPlacement(handIndex) {
  const stack = S.hand[handIndex];
  if (!stack) return;
  const reason = handIndexUnavailableReason(handIndex);
  if (reason) { showMessage(reason); return; }
  const def = CARD_DEFS[stack.cardId];
  if (!def) return;
  const tt = def.targetType;
  // 兼容老代码（map.js drawPlacementPreview 仍读 pm.card.def）
  const cardShim = { def };
  if (tt === 'ground') {
    S.placementMode = { source: 'hand', handIndex, cardId: stack.cardId, def, card: cardShim, hoverCell: null, fogHovered: false };
  } else if (tt === 'self') {
    applySelfSpellFromHand(handIndex);
  } else if (tt === 'global') {
    applyGlobalSpellFromHand(handIndex);
  } else if (tt === 'enemy') {
    // v6 heal 改为 ground，所以这里只剩 enemy
    S.placementMode = { source: 'hand', handIndex, cardId: stack.cardId, def, card: cardShim, hoverCell: null, fogHovered: false, selectKind: tt };
  }
}

function cancelPlacement() {
  S.placementMode = null;
}

function canPlaceBuildingAt(subtype, cellX, cellY) {
  if (!cellInsideMap(cellX, cellY)) return false;
  if (S.core.x === cellX && S.core.y === cellY) return false;
  for (const n of S.nests) if (n.alive && n.x === cellX && n.y === cellY) return false;
  for (const b of S.buildings) if (!b.dead && b.x === cellX && b.y === cellY) return false;
  for (const bug of S.bugs) {
    if (bug.dead) continue;
    if (Math.round(bug.x) === cellX && Math.round(bug.y) === cellY) return false;
  }
  // v5: 必须在视野内（非 fogged）
  if (typeof isVisible === 'function' && !isVisible(cellX, cellY)) return false;
  return true;
}

function confirmPlacementAt(cellX, cellY) {
  const pm = S.placementMode;
  if (!pm) return;
  const def = pm.def;
  if (!def) return;

  // v6 §1: 法术不允许在迷雾中释放（侦察兵例外）
  if (def.type === 'spell' && def.id !== 'scout') {
    if (typeof isVisible === 'function' && !isVisible(cellX, cellY)) {
      if (typeof showFogBlockedToast === 'function') showFogBlockedToast();
      else showMessage('无法在迷雾中施放');
      return; // 不消耗卡
    }
  }

  if (def.type === 'building') {
    if (!canPlaceBuildingAt(def.subtype, cellX, cellY)) {
      showMessage('不可建造在此格');
      return;
    }
    // v7.1: 探照灯先选位置，再选方向（不立即落地）
    if (def.subtype === 'searchlight') {
      pm.subStep = 'pickDirection';
      pm.pickedCellX = cellX;
      pm.pickedCellY = cellY;
      return;
    }
    makeBuilding(def.subtype, cellX, cellY);
    // v7: 任务事件
    if (typeof taskNotify === 'function') {
      if (def.subtype === 'collector' || def.subtype === 'reinforced_collector') taskNotify('place_collector');
      if (def.subtype === 'tower') taskNotify('place_tower');
    }
    consumeHandStack(pm.handIndex);
    keepPlacingIfStackNonEmpty(pm);
  } else if (def.id === 'firerain') {
    if (!cellInsideMap(cellX, cellY)) { showMessage('超出地图'); return; }
    castFirerain(cellX, cellY);
    consumeHandStack(pm.handIndex);
    keepPlacingIfStackNonEmpty(pm);
  } else if (def.id === 'scout') {
    if (!cellInsideMap(cellX, cellY)) { showMessage('超出地图'); return; }
    spawnScout(S.core.x, S.core.y, cellX, cellY);
    showMessage('侦察兵已派出');
    consumeHandStack(pm.handIndex);
    keepPlacingIfStackNonEmpty(pm);
  } else if (def.id === 'heal') {
    if (!cellInsideMap(cellX, cellY)) { showMessage('超出地图'); return; }
    castHealAt(cellX, cellY);
    consumeHandStack(pm.handIndex);
    keepPlacingIfStackNonEmpty(pm);
  }
}

// v6: select-target 模式（仅闪电；治疗术已改 ground）
function applyTargetSelectAt(cellX, cellY) {
  const pm = S.placementMode;
  if (!pm || !pm.selectKind) return false;
  const def = pm.def;
  if (!def) return false;

  if (pm.selectKind === 'enemy') {
    // 找点击格上的虫子
    const bug = S.bugs.find(g => !g.dead && Math.round(g.x) === cellX && Math.round(g.y) === cellY);
    if (!bug) { showMessage('请选择敌方虫子'); return false; }
    // v6 §1: 闪电对迷雾中的虫子无效（虫子若在迷雾里也看不见，但保险检查）
    if (def.id === 'lightning') {
      if (typeof isVisible === 'function' && !isVisible(cellX, cellY)) {
        if (typeof showFogBlockedToast === 'function') showFogBlockedToast();
        else showMessage('无法在迷雾中施放');
        return false;
      }
      addLightningFx(S.core.x, S.core.y, bug.x, bug.y);
      bug.hp -= G.lightning.damage;
      if (bug.hp <= 0) killBug(bug);
      consumeHandStack(pm.handIndex);
      keepPlacingIfStackNonEmpty(pm);
      return true;
    }
  }
  return false;
}

function consumeHandStack(idx) {
  popTopOfStack(idx);
}

// v7.1: 探照灯方向选择确认
function confirmSearchlightDirection(dir) {
  const pm = S.placementMode;
  if (!pm || pm.subStep !== 'pickDirection') return;
  if (!['up', 'down', 'left', 'right'].includes(dir)) return;
  makeBuilding('searchlight', pm.pickedCellX, pm.pickedCellY, { direction: dir });
  showMessage('探照灯已部署（方向：' + ({ up: '上', down: '下', left: '左', right: '右' }[dir]) + '）');
  consumeHandStack(pm.handIndex);
  // 退出 pickDirection 子模式
  if (S.placementMode) {
    S.placementMode.subStep = null;
    S.placementMode.pickedCellX = null;
    S.placementMode.pickedCellY = null;
  }
  keepPlacingIfStackNonEmpty(pm);
}

function keepPlacingIfStackNonEmpty(pm) {
  const stack = S.hand[pm.handIndex];
  if (stack && stack.count > 0 && stack.cardId === pm.cardId) {
    // 同堆继续 — placementMode 保留
    return;
  }
  S.placementMode = null;
}

function applySelfSpellFromHand(handIndex) {
  const stack = S.hand[handIndex];
  if (!stack) return;
  const def = CARD_DEFS[stack.cardId];
  if (def.id === 'sweep') {
    if (!heroAlive()) { showMessage('英雄已死亡'); return; }
    castSweep();
    consumeHandStack(handIndex);
  }
}

function applyGlobalSpellFromHand(handIndex) {
  const stack = S.hand[handIndex];
  if (!stack) return;
  const def = CARD_DEFS[stack.cardId];
  if (def.id === 'repair') {
    for (const b of S.buildings) if (!b.dead) b.hp = b.maxHp;
    showMessage('建筑修复完毕');
  } else if (def.id === 'recall') {
    if (!heroAlive()) { showMessage('英雄已死亡'); return; }
    S.hero.state = 'returning';
    S.hero.target = null;
    showMessage('英雄正在召回');
  }
  consumeHandStack(handIndex);
}

// v5: 使用技能槽里的扫击（self_centered）
function useHeroSkillSlot() {
  const reason = skillSlotUnavailableReason();
  if (reason) { showMessage(reason); return; }
  castSweep();
  S.heroSkillSlot = null;
  S.hero.skillCardTimer = S.hero.skillCardCD || G.hero.skillCardCD;
}

function castFirerain(cx, cy) {
  addFirerainFx(cx, cy);
  for (const bug of S.bugs) {
    if (bug.dead) continue;
    const d = Math.hypot(bug.x - cx, bug.y - cy);
    if (d <= G.firerain.radius) {
      bug.hp -= G.firerain.damage;
      if (bug.hp <= 0) killBug(bug);
    }
  }
}

function castSweep() {
  const sweep = G.heroes.tom.skills.sweep;
  const h = S.hero;
  // v7.1: 扫击精进天赋 → 伤害额外加成
  const dmg = sweep.damage + (S.heroSweepDamageBonus || 0);
  addSweepFx(h.x, h.y, sweep.radius);
  for (const bug of S.bugs) {
    if (bug.dead) continue;
    const d = Math.hypot(bug.x - h.x, bug.y - h.y);
    if (d <= sweep.radius) {
      bug.hp -= dmg;
      if (bug.hp <= 0) killBug(bug);
    }
  }
}

// v6: 雾中施放反馈 toast（兼容名）
function showFogBlockedToast() {
  showMessage('无法在迷雾中施放');
}
