// entities/discovery.js —— v7 5 类迷雾发现点
//
// 类型：
//   resource —— 资源点（小，最多）
//   chest —— 宝箱（中）
//   wild_camp —— 野怪据点（中，含被动虫）
//   sleeping_nest —— 沉睡虫巢（大，血月唤醒）
//   relic —— 遗迹（小，文字事件）

function generateInitialDiscoveries() {
  if (!G.discoveryPoints || !G.discoveryPoints.enabled) return;
  S.discoveries = [];
  const cfg = G.discoveryPoints;
  const targetTotal = cfg.totalCount + Math.floor(Math.random() * (cfg.totalCountVariance + 1));

  // 按 typeWeights 分配各类数量；relic 至少 minRelics
  const counts = {};
  for (const t in cfg.typeWeights) counts[t] = 0;
  if (cfg.minRelics) counts.relic = cfg.minRelics;
  let remaining = targetTotal - (cfg.minRelics || 0);
  while (remaining > 0) {
    const pick = pickTypeByWeight(cfg.typeWeights);
    counts[pick] = (counts[pick] || 0) + 1;
    remaining--;
  }

  // 按 type 撒点
  for (const type in counts) {
    for (let i = 0; i < counts[type]; i++) {
      const pos = findDiscoverySpot();
      if (!pos) continue;
      S.discoveries.push(makeDiscovery(type, pos));
    }
  }
}

function pickTypeByWeight(weights) {
  let total = 0;
  for (const k in weights) total += weights[k];
  let r = Math.random() * total;
  for (const k in weights) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return 'resource';
}

function findDiscoverySpot() {
  const cfg = G.discoveryPoints;
  for (let attempt = 0; attempt < 60; attempt++) {
    const x = Math.floor(Math.random() * G.mapWidth);
    const y = Math.floor(Math.random() * G.mapHeight);
    if (Math.hypot(x - G.core.x, y - G.core.y) < cfg.minDistanceFromCore) continue;
    // 不与现有虫巢/建筑/已有发现点同格
    if (S.nests && S.nests.find(n => n.alive && n.x === x && n.y === y)) continue;
    if (S.buildings && S.buildings.find(b => !b.dead && b.x === x && b.y === y)) continue;
    if (S.discoveries && S.discoveries.find(d => d.x === x && d.y === y)) continue;
    let tooClose = false;
    if (S.discoveries) {
      for (const d of S.discoveries) {
        if (Math.hypot(d.x - x, d.y - y) < cfg.minDistanceFromOther) { tooClose = true; break; }
      }
    }
    if (tooClose) continue;
    return { x, y };
  }
  return null;
}

function makeDiscovery(type, pos) {
  const base = {
    id: nextId(),
    kind: 'discovery',
    type,
    x: pos.x, y: pos.y,
    bobPhase: Math.random() * Math.PI * 2,
    pickedUp: false,
  };
  if (type === 'wild_camp') {
    const cfg = G.discoveryPoints.wildCamp;
    const n = cfg.bugCountMin + Math.floor(Math.random() * (cfg.bugCountMax - cfg.bugCountMin + 1));
    base.spawnedBugCount = n;
    base.bugsSpawned = false;
    base.defeated = false;
    base.respawnAtDay = null;
  } else if (type === 'sleeping_nest') {
    base.awakened = false;
  } else if (type === 'relic') {
    const evs = (G.discoveryPoints.relic && G.discoveryPoints.relic.events) || [];
    base.eventDef = evs[Math.floor(Math.random() * evs.length)];
  }
  return base;
}

function updateDiscoveries(dt) {
  if (!S.discoveries || S.discoveries.length === 0) return;
  for (const d of S.discoveries) {
    if (d.pickedUp) continue;
    d.bobPhase = (d.bobPhase || 0) + dt * 2;

    // 野怪据点重生检查
    if (d.type === 'wild_camp' && d.defeated && d.respawnAtDay != null) {
      if (S.day >= d.respawnAtDay) {
        d.defeated = false;
        d.respawnAtDay = null;
        d.bugsSpawned = false;
        const wc = G.discoveryPoints.wildCamp;
        d.spawnedBugCount = wc.bugCountMin
          + Math.floor(Math.random() * (wc.bugCountMax - wc.bugCountMin + 1));
      }
    }

    // 走过自动拾取（仅 resource / chest / relic）
    const r = (G.discoveryPoints && G.discoveryPoints.pickupRange) || 1.4;
    let pickerNear = null;
    if (typeof heroAlive === 'function' && heroAlive()
        && Math.hypot(S.hero.x - d.x, S.hero.y - d.y) <= r) {
      pickerNear = S.hero;
    }
    if (!pickerNear && S.swordsmen) {
      for (const sw of S.swordsmen) {
        if (sw.dead) continue;
        if (Math.hypot(sw.x - d.x, sw.y - d.y) <= r) { pickerNear = sw; break; }
      }
    }
    if (!pickerNear && S.scouts) {
      for (const sc of S.scouts) {
        if (sc.dead) continue;
        if (Math.hypot(sc.x - d.x, sc.y - d.y) <= r) { pickerNear = sc; break; }
      }
    }
    if (pickerNear && (d.type === 'resource' || d.type === 'chest' || d.type === 'relic')) {
      pickupDiscovery(d);
      continue;
    }

    // 沉睡虫巢血月唤醒
    if (d.type === 'sleeping_nest' && !d.awakened && S.bloodMoonActive) {
      awakenSleepingNest(d);
    }
  }

  // 野怪据点击败检查（在 updateBugs 之后由本函数兜底；main.js 顺序保证）
  checkWildCampDefeat();

  S.discoveries = S.discoveries.filter(d => !d.pickedUp);
}

function pickupDiscovery(d) {
  if (d.pickedUp) return;
  d.pickedUp = true;
  if (d.type === 'resource') {
    const reward = (typeof weightedPickArr === 'function')
      ? weightedPickArr(G.discoveryPoints.resource.rewards)
      : G.discoveryPoints.resource.rewards[0];
    if (reward) {
      S.glue += reward.amount;
      if (typeof spawnFloatingText === 'function') spawnFloatingText(d.x, d.y, '+' + reward.amount + ' 胶', 'loot');
    }
    if (typeof taskNotify === 'function') taskNotify('discovery_pickup', { type: 'resource' });
  } else if (d.type === 'chest') {
    openChest(d);
    if (typeof taskNotify === 'function') taskNotify('discovery_pickup', { type: 'chest' });
  } else if (d.type === 'relic') {
    triggerRelic(d);
    if (typeof taskNotify === 'function') taskNotify('discovery_pickup', { type: 'relic' });
  }
}

function openChest(d) {
  const reward = (typeof weightedPickArr === 'function')
    ? weightedPickArr(G.discoveryPoints.chest.rewards)
    : G.discoveryPoints.chest.rewards[0];
  if (!reward) return;
  let label = '';
  if (reward.kind === 'glue') {
    S.glue += reward.amount;
    label = '+' + reward.amount + ' 胶';
  } else if (reward.kind === 'gems') {
    if (S.playerState) S.playerState.gems = (S.playerState.gems || 0) + reward.amount;
    label = '+' + reward.amount + ' 💎';
  } else if (reward.kind === 'card') {
    let cardId = null;
    if (reward.rarity === 'normal') {
      const shopIds = (G.shop || []).map(s => s.id);
      if (shopIds.length > 0) cardId = shopIds[Math.floor(Math.random() * shopIds.length)];
    } else if (reward.rarity === 'rare') {
      const pick = (typeof weightedPickArr === 'function' && G.lootRarePool)
        ? weightedPickArr(G.lootRarePool) : null;
      cardId = pick && pick.id;
    } else if (reward.rarity === 'special') {
      const sp = G.specialCards || [];
      if (sp.length > 0) cardId = sp[Math.floor(Math.random() * sp.length)];
    }
    if (cardId && typeof addCardToHand === 'function') {
      addCardToHand(cardId);
      const def = (typeof CARD_DEFS !== 'undefined') ? CARD_DEFS[cardId] : null;
      label = '获得：' + (def ? def.name : cardId);
    } else {
      // 兜底（手牌满 / 没有可用卡 ID）
      S.glue += 30;
      label = '+30 胶（卡满）';
    }
  }
  if (label && typeof showMessage === 'function') showMessage('开宝箱：' + label);
  if (label && typeof spawnFloatingText === 'function') spawnFloatingText(d.x, d.y, label, 'loot');
}

function triggerRelic(d) {
  const ev = d.eventDef;
  if (!ev) return;
  const e = ev.effect || {};
  if (e.coreMaxHp) {
    S.core.maxHp += e.coreMaxHp;
    S.core.hp += e.coreMaxHp;
  }
  if (e.tokenInstant) {
    S.tokens = (S.tokens || 0) + e.tokenInstant;
  }
  if (e.tokenCapBonus) {
    S.tokenCapBonus = (S.tokenCapBonus || 0) + e.tokenCapBonus;
  }
  if (e.addSpecialCard) {
    const sp = G.specialCards || [];
    if (sp.length > 0) {
      const cardId = sp[Math.floor(Math.random() * sp.length)];
      if (cardId && typeof addCardToHand === 'function') addCardToHand(cardId);
    }
  }
  if (e.collectorMul) {
    // v8.1 没有 mul 字段；用 +1 produceAmount bonus 近似 +30%
    if (S.mul) S.mul.collectorProduceBonus = (S.mul.collectorProduceBonus || 0) + 1;
  }
  if (typeof showMessage === 'function') showMessage(ev.text || '遗迹效果生效');
  if (typeof showNightNotice === 'function') showNightNotice(ev.text || '遗迹', 'dawn');
}

// 由整合代码（ai.js / cards.js）在玩家单位靠近 wild_camp 1 格时调用，把据点中的虫子展开
function attackWildCamp(camp, attacker) {
  if (!camp || camp.defeated || camp.bugsSpawned) return;
  camp.bugsSpawned = true;
  const ncfg = G.discoveryPoints.wildCamp;
  const fakeNest = { x: camp.x, y: camp.y, id: nextId(), bugCount: 0, alive: true };
  for (let i = 0; i < camp.spawnedBugCount; i++) {
    if (typeof makeBug !== 'function') break;
    const bug = makeBug(fakeNest, {});
    if (bug) bug.fromWildCamp = camp.id;
  }
}

function checkWildCampDefeat() {
  if (!S.discoveries) return;
  for (const d of S.discoveries) {
    if (d.type !== 'wild_camp' || d.defeated) continue;
    if (!d.bugsSpawned) continue;
    const remain = (S.bugs || []).filter(b => !b.dead && b.fromWildCamp === d.id).length;
    if (remain > 0) continue;

    d.defeated = true;
    const wc = G.discoveryPoints.wildCamp;
    d.respawnAtDay = S.day + (wc.respawnDays || 2);
    const reward = wc.reward;
    if (reward) {
      if (reward.glue) {
        S.glue += reward.glue;
        if (typeof spawnFloatingText === 'function') spawnFloatingText(d.x, d.y, '+' + reward.glue + ' 胶', 'loot');
      }
      if (reward.card === 'normal' && typeof addCardToHand === 'function') {
        const shopIds = (G.shop || []).map(s => s.id);
        if (shopIds.length > 0) addCardToHand(shopIds[Math.floor(Math.random() * shopIds.length)]);
      }
    }
    const r = wc.revealRadiusOnDefeat || 2;
    if (typeof revealPermanent === 'function') {
      revealPermanent(d.x, d.y, r, 'wildcamp#' + d.id);
    }
    if (typeof showMessage === 'function') showMessage('击败野怪据点！');
    if (typeof taskNotify === 'function') taskNotify('wildcamp_defeated');
  }
}

function awakenSleepingNest(d) {
  d.awakened = true;
  const ncfg = G.nest;
  const n = {
    id: nextId(), kind: 'nest',
    x: d.x, y: d.y,
    type: NestType.NORMAL,
    hp: ncfg.hp, maxHp: ncfg.maxHp,
    state: 'active',
    spawnTimer: ncfg.spawnIntervals.day,
    bugCount: 0,
    alive: true,
    lastCombatAt: 0,
  };
  S.nests.push(n);
  d.pickedUp = true;
  if (typeof showMessage === 'function') showMessage('沉睡虫巢被血月唤醒！');
}

// 玩家点击发现点（input.js 调）
function onClickDiscovery(d) {
  if (!d || d.pickedUp) return;
  if (typeof isVisible === 'function' && !isVisible(d.x, d.y)) {
    if (typeof showMessage === 'function') showMessage('看不到迷雾里的发现点');
    return;
  }
  if (d.type === 'resource' || d.type === 'chest' || d.type === 'relic') {
    pickupDiscovery(d);
  } else if (d.type === 'wild_camp') {
    if (typeof showMessage === 'function') showMessage('靠近野怪据点会自动开战');
  } else if (d.type === 'sleeping_nest') {
    if (typeof showMessage === 'function') showMessage('沉睡虫巢需要主动出征');
  }
}

window.generateInitialDiscoveries = generateInitialDiscoveries;
window.updateDiscoveries = updateDiscoveries;
window.pickupDiscovery = pickupDiscovery;
window.attackWildCamp = attackWildCamp;
window.checkWildCampDefeat = checkWildCampDefeat;
window.awakenSleepingNest = awakenSleepingNest;
window.onClickDiscovery = onClickDiscovery;
