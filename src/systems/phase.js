// systems/phase.js —— 阶段切换（v6: 血月在 dusk 触发；dawn 结算）

// 本地加权抽（避免依赖 cards.js）
function _weightedPick(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  let total = 0;
  for (const c of arr) total += (c.weight || 0);
  if (total <= 0) return arr[0];
  let r = Math.random() * total;
  for (const c of arr) {
    r -= (c.weight || 0);
    if (r <= 0) return c;
  }
  return arr[arr.length - 1];
}

function updatePhase(dt) {
  S.phaseTimer -= dt;
  if (S.phaseTimer > 0) return;

  const order = G.phaseOrder;
  const idx = order.indexOf(S.phase);
  const nextIdx = (idx + 1) % order.length;
  const nextPhase = order[nextIdx];

  // ===== dawn 即将结束 → 切到 day（新一天） =====
  if (S.phase === 'dawn') {
    // v6 §8: 若刚结束血月夜（核心仍在），dawn 收尾时结算奖励
    if (S.bloodMoonActive && S.core.hp > 0) {
      const rare = _weightedPick(G.lootRarePool);
      let epic = null;
      if (Math.random() < G.bloodMoon.rewardEpicChance) {
        epic = _weightedPick(G.lootEpicPool);
      }
      S.overlay = {
        kind: 'bloodMoonReward',
        rare: rare ? rare.id : null,
        epic: epic ? epic.id : null,
      };
      if (typeof showBloodMoonSurvived === 'function') showBloodMoonSurvived();
      // v6 §9: 血月之后启用虫流虚假化
      if (S.flags) S.flags.rallyEnabled = true;
      // v7: 撑过血月夜 → 设 flag，待 overlay 关闭后由 checkWinLose 触发胜利
      if (S.flags) S.flags.bloodMoonSurvived = true;
    }
    // 血月清场
    if (S.bloodMoonActive) {
      S.bloodMoonActive = false;
      if (S.flags) S.flags.bloodBossSpawned = false;
    }

    S.day += 1;
    S.bloodMoonIn = Math.max(0, G.bloodMoonDay - S.day);
    clearAllGuardBugs();
    // v7.1 天赋点：每天清晨 +1
    if (typeof earnTalentPoints === 'function') earnTalentPoints('day', 1);
  }

  S.phase = nextPhase;
  S.phaseTimer = G.phaseDurations[nextPhase];

  // v6 §8: 进入 dusk 时若是第 5 天 → 标记血月，并播放预告
  if (nextPhase === 'dusk' && S.day === G.bloodMoonDay && S.flags && !S.flags.bloodMoonAnnounced) {
    S.flags.bloodMoonAnnounced = true;
    S.bloodMoonActive = true;
    S.bloodMoonTriggered = true;
    if (S.flags.bloodBossSpawned === undefined) S.flags.bloodBossSpawned = false;
    if (typeof showBloodMoonComing === 'function') showBloodMoonComing();
  }

  // v6 §8: 进入 night 且血月激活 → 夜晚时长拉到 120s
  if (nextPhase === 'night' && S.bloodMoonActive) {
    S.phaseTimer = G.bloodMoon.nightDuration;
  }

  for (const n of S.nests) {
    if (!n.alive) continue;
    if (nextPhase === 'day') n.state = 'fortified';
    else if (nextPhase === 'dusk') n.state = 'preparing';
    else if (nextPhase === 'night') n.state = 'active';
    else if (nextPhase === 'dawn') n.state = 'weak';
    const itv = nestCurrentSpawnInterval(n);
    n.spawnTimer = Math.min(n.spawnTimer, itv);
    if (n.spawnTimer === Infinity) n.spawnTimer = 0;
  }

  if (nextPhase === 'night') {
    for (const bug of S.bugs) if (!bug.dead && bug.state === 'idle' && !bug.isGuard) bug.state = 'marching';
    // v7.1: Day 1 night 不刷新虫巢（让玩家先认识初始 2 个巢）；Day 2 起每晚刷
    if (S.day >= 2 && typeof spawnNightlyNest === 'function') spawnNightlyNest();
  } else if (nextPhase === 'dawn') {
    for (const bug of S.bugs) if (!bug.dead && !bug.isGuard) bug.retreating = true;
    spawnGuardBugs();
  } else if (nextPhase === 'day') {
    S.tokens = Math.min(G.initial.tokenCap, S.tokens + G.initial.tokenPerDay);
    // v7: spawnLateNestsIfDue 已废弃（NO-OP），保留调用以兼容（或可移除）
    spawnLateNestsIfDue();
    showMessage(`第 ${S.day} 天开始`);
  }

  // v4 DOM 告示
  if (nextPhase === 'dusk') {
    if (typeof showNightNotice === 'function') showNightNotice('傍晚 · 准备防线', 'dusk');
  }
  if (nextPhase === 'night') {
    if (typeof showNightNotice === 'function') {
      const text = S.bloodMoonActive ? '【血月降临】夜袭来了！' : '夜晚来袭！';
      showNightNotice(text, 'night');
    }
  }
  if (nextPhase === 'dawn') {
    if (typeof showNightNotice === 'function') showNightNotice('黎明 · 反击时机', 'dawn');
  }

  // v5 英雄技能宪法：CD 由 ai.js updateHero 持续倒数
}

function spawnGuardBugs() {
  for (const n of S.nests) {
    if (!n.alive) continue;
    const isArmored = n.type === NestType.ARMORED;
    for (let i = 0; i < G.guardBug.perNest; i++) {
      const heavy = isArmored && i === 0;
      makeBug(n, { guard: true, heavy });
    }
  }
}

function clearAllGuardBugs() {
  for (const bug of S.bugs) {
    if (bug.isGuard && !bug.dead) {
      bug.silentRemove = true;
      killBug(bug);
    }
  }
}

function showMessage(text) {
  S.message = { text, timer: 2.5 };
}

function updateMessage(dt) {
  if (!S.message) return;
  S.message.timer -= dt;
  if (S.message.timer <= 0) S.message = null;
}
