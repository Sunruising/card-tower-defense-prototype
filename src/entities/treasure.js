// entities/treasure.js —— v8 探索奖励
//
// 开局在地图上撒 G.treasures.initialCount 个宝藏点（远离核心 + 互相分散）。
// 玩家单位（hero / swordsman / scout）走到 pickupRange 内自动拾取。
// 拾取后按 G.treasures.rewardPool 加权随机一档奖励。

function generateInitialTreasures() {
  if (!G.treasures || !G.treasures.enabled) return;
  const cfg = G.treasures;
  S.treasures = [];
  let attempts = 0;
  while (S.treasures.length < cfg.initialCount && attempts < 200) {
    attempts++;
    const x = Math.floor(Math.random() * G.mapWidth);
    const y = Math.floor(Math.random() * G.mapHeight);
    if (Math.hypot(x - G.core.x, y - G.core.y) < cfg.minDistanceFromCore) continue;
    // 不与虫巢 / 建筑同格
    if (S.nests && S.nests.find(n => n.alive && n.x === x && n.y === y)) continue;
    if (S.buildings && S.buildings.find(b => !b.dead && b.x === x && b.y === y)) continue;
    // 互距
    let tooClose = false;
    for (const t of S.treasures) {
      if (Math.hypot(t.x - x, t.y - y) < cfg.minDistanceFromOther) { tooClose = true; break; }
    }
    if (tooClose) continue;
    S.treasures.push({
      id: nextId(),
      kind: 'treasure',
      x, y,
      bobPhase: Math.random() * Math.PI * 2,
      pickedUp: false,
    });
  }
}

// v8.2: 玩家点击宝箱直接拾取（与礼盒机制对齐）
function onClickTreasure(t) {
  if (!t || t.pickedUp) return;
  if (typeof isVisible === 'function' && !isVisible(t.x, t.y)) {
    if (typeof showMessage === 'function') showMessage('看不到迷雾里的宝箱');
    return;
  }
  pickupTreasure(t);
}
window.onClickTreasure = onClickTreasure;

function updateTreasures(dt) {
  if (!S.treasures || S.treasures.length === 0) return;
  for (const t of S.treasures) {
    if (t.pickedUp) continue;
    t.bobPhase += dt * 2;
    // 检查玩家单位（hero / swordsman / scout）是否在 pickupRange 内
    const r = (G.treasures && G.treasures.pickupRange) || 0.8;
    let pickerPos = null;
    if (typeof heroAlive === 'function' && heroAlive()
        && Math.hypot(S.hero.x - t.x, S.hero.y - t.y) <= r) {
      pickerPos = { x: S.hero.x, y: S.hero.y };
    }
    if (!pickerPos && S.swordsmen) {
      for (const sw of S.swordsmen) {
        if (sw.dead) continue;
        if (Math.hypot(sw.x - t.x, sw.y - t.y) <= r) { pickerPos = { x: sw.x, y: sw.y }; break; }
      }
    }
    if (!pickerPos && S.scouts) {
      for (const sc of S.scouts) {
        if (sc.dead) continue;
        if (Math.hypot(sc.x - t.x, sc.y - t.y) <= r) { pickerPos = { x: sc.x, y: sc.y }; break; }
      }
    }
    if (pickerPos) pickupTreasure(t);
  }
  S.treasures = S.treasures.filter(t => !t.pickedUp);
}

function pickupTreasure(t) {
  if (t.pickedUp) return;
  t.pickedUp = true;
  const cfg = G.treasures;
  const reward = (typeof weightedPickArr === 'function') ? weightedPickArr(cfg.rewardPool) : cfg.rewardPool[0];
  if (!reward) return;
  let label = '';
  if (reward.kind === 'glue') {
    S.glue += reward.amount;
    label = '+' + reward.amount + ' 胶';
  } else if (reward.kind === 'gems') {
    if (S.playerState) S.playerState.gems = (S.playerState.gems || 0) + reward.amount;
    label = '+' + reward.amount + ' 💎';
  } else if (reward.kind === 'card_rare') {
    const pick = (typeof weightedPickArr === 'function' && G.lootRarePool)
      ? weightedPickArr(G.lootRarePool) : null;
    if (pick && typeof addCardToHand === 'function') {
      addCardToHand(pick.id);
      const def = (typeof CARD_DEFS !== 'undefined') ? CARD_DEFS[pick.id] : null;
      label = '稀有卡：' + (def ? def.name : pick.id);
    } else {
      S.glue += 30;
      label = '+30 胶（卡满）';
    }
  }
  if (typeof showMessage === 'function') showMessage('拾取宝藏：' + label);
  if (typeof spawnFloatingText === 'function') spawnFloatingText(t.x, t.y, label, 'loot');
}

window.generateInitialTreasures = generateInitialTreasures;
window.updateTreasures = updateTreasures;
window.pickupTreasure = pickupTreasure;
