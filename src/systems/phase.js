// systems/phase.js —— 阶段切换（v6: 血月在 dusk 触发；dawn 结算）

// v8: 判定第 X 天是否是血月日（基于 G.bloodMoonDays 数组，兼容旧 bloodMoonDay）
function isBloodMoonDay(day) {
  if (Array.isArray(G.bloodMoonDays)) return G.bloodMoonDays.includes(day);
  return day === G.bloodMoonDay;
}

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
    // v6 §8 / v8: 若刚结束血月夜（核心仍在），dawn 收尾时结算奖励 + 累加血月计数
    if (S.bloodMoonActive && S.core.hp > 0) {
      // v8: 累加血月完成数
      if (S.flags) S.flags.bloodMoonsCompleted = (S.flags.bloodMoonsCompleted || 0) + 1;

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

      // 兼容字段（v8 不再用作胜利条件）
      if (S.flags) S.flags.bloodMoonSurvived = true;
      // v7: 血月幸存任务
      if (typeof taskNotify === 'function') taskNotify('blood_moon_survived');

      // v8: 撑过 winRequiredBloodMoons 次 → 刷终极 Boss
      if (S.flags
          && S.flags.bloodMoonsCompleted >= (G.winRequiredBloodMoons || 2)
          && !S.flags.terminalBossSpawned) {
        if (typeof spawnTerminalBoss === 'function') spawnTerminalBoss();
      }
    }
    // 血月清场
    if (S.bloodMoonActive) {
      S.bloodMoonActive = false;
      if (S.flags) S.flags.bloodBossSpawned = false;
    }

    // v7: 第一夜 dawn → day 触发"撑过第一夜"任务
    if (S.day === 1 && typeof taskNotify === 'function') {
      taskNotify('survive_first_night');
    }

    S.day += 1;
    // v8.1: 资源涌泉天赋每天清晨给胶质
    if (S.mul && S.mul.dailyGlueBonus) {
      S.glue += S.mul.dailyGlueBonus;
      if (typeof spawnFloatingText === 'function') {
        spawnFloatingText(S.core.x, S.core.y, '+' + S.mul.dailyGlueBonus + ' 胶（涌泉）', 'loot');
      }
    }
    // v8: bloodMoonIn 用于 UI 倒计时 —— 找下一个未到的血月日
    if (Array.isArray(G.bloodMoonDays)) {
      const next = G.bloodMoonDays.find(d => d >= S.day);
      S.bloodMoonIn = next != null ? Math.max(0, next - S.day) : 0;
    } else {
      S.bloodMoonIn = Math.max(0, G.bloodMoonDay - S.day);
    }
    clearAllGuardBugs();
    // v7.1 天赋点：每天清晨 +1
    if (typeof earnTalentPoints === 'function') earnTalentPoints('day', 1);
  }

  S.phase = nextPhase;
  S.phaseTimer = G.phaseDurations[nextPhase];

  // v8: 进入 dusk 时若是血月日（数组判定），按日 keyed 字典防重复
  if (nextPhase === 'dusk' && isBloodMoonDay(S.day) && S.flags) {
    if (!S.flags.bloodMoonsAnnounced) S.flags.bloodMoonsAnnounced = {};
    if (!S.flags.bloodMoonsAnnounced[S.day]) {
      S.flags.bloodMoonsAnnounced[S.day] = true;
      S.bloodMoonActive = true;
      S.bloodMoonTriggered = true;
      S.flags.bloodBossSpawned = false;
      // 兼容旧 flag
      S.flags.bloodMoonAnnounced = true;
      if (typeof showBloodMoonComing === 'function') showBloodMoonComing();
      // v8: 血月 dusk 智能补刷虫巢
      if (typeof spawnBloodMoonNests === 'function') spawnBloodMoonNests();
    }
  }

  // v7: 傍晚开始计算来袭预警（血月夜由 computeRaidPreview 内部跳过）
  if (nextPhase === 'dusk') {
    if (typeof computeRaidPreview === 'function') computeRaidPreview();
  }
  // v7: 夜晚开始清掉预警
  if (nextPhase === 'night') {
    if (typeof clearRaidPreview === 'function') clearRaidPreview();
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
    // v7.1: 夜晚结束 → 保底胶 + 补给站结算
    settleNightEndGlue();
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

// v7.1: 夜晚结束（night → dawn 切换瞬间）保底胶 + 补给站结算
function settleNightEndGlue() {
  if (!G.nightEndGlue) return;
  const cfg = G.nightEndGlue;
  // 保底胶 + 天赋"夜后红利"
  let baseAmount = (S.day <= cfg.earlyDayThreshold) ? cfg.early : cfg.late;
  if (S.bloodMoonActive) baseAmount = cfg.bloodMoon;
  baseAmount += ((S.mul && S.mul.nightEndGlueBonus) || 0);
  S.glue += baseAmount;
  // 补给站结算
  const flatBonus = (S.mul && S.mul.supplyBonusFlat) || 0;
  let supplyTotal = 0;
  for (const b of S.buildings) {
    if (b.dead) continue;
    if (b.type !== 'supply_station') continue;
    const bonus = (b.supplyBonusBase || G.supplyStation.nightEndBonus) + (b.supplyBonusAdd || 0) + flatBonus;
    supplyTotal += bonus;
    // 补给站发光特效
    if (typeof spawnFloatingText === 'function') {
      spawnFloatingText(b.x, b.y, '+' + bonus + ' 胶', 'loot');
    }
  }
  S.glue += supplyTotal;
  if (typeof bumpStat === 'function') bumpStat('glue');
  // 全屏 toast：基础保底
  const total = baseAmount + supplyTotal;
  const subText = supplyTotal > 0 ? `（保底 ${baseAmount} + 补给 ${supplyTotal}）` : '幸存者送来物资';
  if (typeof showNightNotice === 'function') {
    showNightNotice('+' + total + ' 胶 · ' + subText, 'dawn');
  }
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
