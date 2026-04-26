// entities/gift.js —— v6.1 礼盒（三件齐发：胶质 + 宝石 + 稀有卡）
//
// 流程：
//   1) 虫巢/Boss 死亡 → spawnGift(opts)，记下 nestType / lootKind + autoOpenAt = now + 3s
//   2) updateGifts(dt)：
//        - 接触触发：英雄 1 格内自动拾取
//        - 兜底触发：超过 autoOpenAt 自动 pickup（即使无人在场）
//        - 过期清理：超过 lifetime 删除
//   3) onClickGift(g)：玩家点击礼盒，立即拾取
//   4) 拾取走统一入口 pickupGift → grantFullLoot：
//        a) +胶质（顶栏弹跳 + 飘字）
//        b) +宝石（顶栏弹跳 + 飘字）
//        c) 稀有卡：mode === 'direct' 直接入手 + 飞卡视觉；
//                  mode === 'pick3' 弹 3 选 1 浮层（暂停游戏避免选卡时被打死）
//
// 注意：
//   - 如果将来 bug.js 想表达 bloodBoss 内容（50 胶 / 2 宝石 / 1 张卡 direct），
//     需要在 spawnGift 调用时传 lootKind:'bloodBoss' 或 type:'bloodBoss'。
//     当前 v6 bug.js 给血月 Boss 用的是 type:'armored'，那会落到 armored 分支
//     （30 胶 / 2 宝石 / 3 选 1）— 暂兼容保留，待 agent C 调整 bug.js 时再改。

function spawnGift(opts) {
  // 兼容：caller 可能传 nest 实例（含 x/y/type）或 plain {x,y,type,lootKind}
  const gift = {
    id: nextId(),
    kind: 'gift',
    x: opts.x,
    y: opts.y,
    nestType: opts.type || opts.nestType || NestType.NORMAL,
    lootKind: opts.lootKind || (opts.type === 'bloodBoss' ? 'bloodBoss' : null),
    age: 0,
    bobPhase: Math.random() * Math.PI * 2,
    pickedUp: false,
    expired: false,
    autoOpenAt: performance.now() + G.gift.autoOpenDelay * 1000,    // 3s 兜底
  };
  S.gifts.push(gift);
}

function updateGifts(dt) {
  if (!S.gifts || S.gifts.length === 0) return;
  const now = performance.now();

  for (const g of S.gifts) {
    if (g.pickedUp || g.expired) continue;
    g.age += dt;
    g.bobPhase += dt * 3;
    if (g.age >= G.gift.lifetime) { g.expired = true; continue; }

    // 接触触发
    if (heroAlive()) {
      const dx = S.hero.x - g.x;
      const dy = S.hero.y - g.y;
      const d = Math.hypot(dx, dy);
      if (d <= G.gift.pickupRange) {
        pickupGift(g);
        continue;
      }
    }
    // 兜底触发：3s 后自动开盒（走和拾取一样的统一入口）
    if (now >= g.autoOpenAt) {
      pickupGift(g);
    }
  }

  S.gifts = S.gifts.filter(g => !g.pickedUp && !g.expired);
}

// 玩家点击拾取
function onClickGift(g) {
  if (!g || g.pickedUp || g.expired) return;
  pickupGift(g);
}

// v6.1: 统一入口 — 无论 onClick / 接触 / 3s 兜底，都走这里
function pickupGift(g) {
  if (g.pickedUp) return;
  g.pickedUp = true;
  if (S.playerState) S.playerState.giftsCollected++;
  const contentKey = giftContentKey(g);
  const content = G.lootContents && G.lootContents[contentKey];
  if (!content) return;
  grantFullLoot(content, g);
}

function giftContentKey(g) {
  // v6.1: bloodBoss 显式覆盖优先；然后 nestType
  if (g.lootKind) return g.lootKind;
  if (g.nestType === NestType.ARMORED) return 'armored';
  return 'normal';
}

function grantFullLoot(content, gift) {
  // 1) 胶质入账
  S.glue += content.glue;
  if (typeof bumpStat === 'function') bumpStat('glue');
  if (typeof spawnFloatingText === 'function') {
    spawnFloatingText(gift.x, gift.y, '+' + content.glue + ' 胶', 'loot');
  }

  // 2) 宝石入账
  if (S.playerState) S.playerState.gems += content.gems;
  if (typeof bumpStat === 'function') bumpStat('gems');
  if (typeof spawnFloatingText === 'function') {
    spawnFloatingText(gift.x, gift.y - 0.4, '+' + content.gems + ' 💎', 'loot');
  }

  // 3) 卡入手牌
  if (content.mode === 'direct') {
    // 直接从 lootRarePool 抽 N 张入手（通常 1）
    for (let i = 0; i < content.rareCards; i++) {
      const pick = weightedPickArr(G.lootRarePool);
      if (!pick) break;
      if (typeof addCardToHand === 'function') addCardToHand(pick.id);
      // 飞卡视觉（dom_fx）
      if (typeof flyCardToHand === 'function') {
        flyCardToHand(gift.x, gift.y, pick.id);
      }
    }
  } else if (content.mode === 'pick3') {
    // 抽 3 张去重稀有卡，弹 3 选 1 浮层
    const picks = [];
    const used = new Set();
    for (let attempt = 0; attempt < 30 && picks.length < content.rareCards; attempt++) {
      const c = weightedPickArr(G.lootRarePool);
      if (!c) break;
      if (used.has(c.id)) continue;
      used.add(c.id);
      picks.push(c.id);
    }
    if (picks.length > 0) {
      // v6.1: 浮层期间游戏暂停（避免选卡时被打死）
      S.paused = true;
      // 已有浮层时不覆盖（避免 race）
      if (!S.overlay) S.overlay = { kind: 'lootPick3', picks, fromGift: true };
    }
  }

  showMessage('开礼盒：' + content.glue + ' 胶 / ' + content.gems + ' 💎 / ' + content.rareCards + ' 卡');
}

// =====================================================================
// v6 旧战利品逻辑（deprecated，保留以备兼容）
// =====================================================================
// @deprecated v6.1 起统一改走 grantFullLoot；以下三函数不再被 pickupGift 调用
function rollLoot(nestType) {
  const pool = G.cardLootPools[nestType] || G.cardLootPools.normal;
  let total = 0;
  for (const e of pool) total += e.weight;
  let r = Math.random() * total;
  for (const e of pool) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return pool[pool.length - 1];
}

// @deprecated v6.1
function grantLoot(loot, gift) {
  let label = '';
  if (loot.kind === 'glue') {
    S.glue += loot.amount;
    label = '+' + loot.amount + ' 胶质';
  } else if (loot.kind === 'gems') {
    if (S.playerState) S.playerState.gems += loot.amount;
    label = '+' + loot.amount + ' 宝石';
  } else if (loot.kind === 'card_rare') {
    const pick = weightedPickArr(G.lootRarePool);
    if (pick) {
      if (S.overlay) {
        if (typeof addCardToHand === 'function') addCardToHand(pick.id);
      } else {
        S.overlay = { kind: 'lootSingle', cardId: pick.id };
      }
      label = '战利品：' + CARD_DEFS[pick.id].name;
    } else {
      S.glue += 20;
      label = '稀有池为空 → +20 胶质';
    }
  } else if (loot.kind === 'card_rare3') {
    const picks = [];
    const used = new Set();
    for (let attempt = 0; attempt < 30 && picks.length < 3; attempt++) {
      const c = weightedPickArr(G.lootRarePool);
      if (!c) break;
      if (used.has(c.id)) continue;
      used.add(c.id);
      picks.push(c.id);
    }
    if (picks.length > 0) {
      if (!S.overlay) S.overlay = { kind: 'lootPick3', picks };
      label = '钢壳战利品：3 张稀有卡 3 选 1';
    } else {
      S.glue += 30;
      label = '稀有池为空 → +30 胶质';
    }
  } else if (loot.kind === 'card') {
    const poolId = loot.amount;
    const pool = G.cardPools && G.cardPools[poolId];
    if (pool && typeof addCardToHand === 'function') {
      const pick = weightedPickFromPool(pool);
      if (pick) {
        addCardToHand(pick.id);
        label = '获得卡牌：' + CARD_DEFS[pick.id].name;
      }
    }
  }
  if (label) {
    showMessage('开礼盒：' + label);
    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(gift.x, gift.y, label, 'loot');
    }
  }
}

// @deprecated v6.1
function weightedPickFromPool(pool) {
  if (!pool || !pool.cards) return null;
  return weightedPickArr(pool.cards);
}
