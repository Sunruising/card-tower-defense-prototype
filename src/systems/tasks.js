// systems/tasks.js —— v7 任务系统（教学 4 + 长线 N）
//
// 入口：
//   - resetState 末尾应调 ensureTaskState() / activateNextTutorialTask()（整合时加）
//   - taskNotify(trigger, payload)：被其它系统调用以推进任务
//   - updateTasks(dt)：主循环每帧调一次，处理"查询型"trigger
//
// 任务对象结构（active 中）:
//   { id, title, description, trigger, count, target, reward,
//     progress: 0, isTutorial, endsTutorial?, endsTutorialMessage? }

function ensureTaskState() {
  if (!S.tasks) S.tasks = { active: [], completed: [], events: {}, tutorialIndex: 0, pendingFollowup: false };
  if (!S.tasks.events) S.tasks.events = {};
}

function activateNextTutorialTask() {
  ensureTaskState();
  if (S.flags && S.flags.tutorialEnded) return;
  const tut = G.tasks && G.tasks.tutorial;
  if (!tut) return;
  if (S.tasks.tutorialIndex >= tut.length) return;
  // 不超过教学并发上限
  const tutorialActive = S.tasks.active.filter(t => t.isTutorial).length;
  if (tutorialActive >= (G.tasks.activeMaxTutorial || 1)) return;
  const def = tut[S.tasks.tutorialIndex];
  S.tasks.active.push({
    ...def,
    progress: 0,
    target: def.count,
    isTutorial: true,
  });
  S.tasks.tutorialIndex += 1;
  if (typeof showMessage === 'function') showMessage('新任务：' + def.title);
}

// 教学结束后激活长线任务（最多并发 3）
function refreshLongRunningTasks() {
  ensureTaskState();
  if (!S.flags || !S.flags.tutorialEnded) return;
  const longDefs = G.tasks && G.tasks.longRunning;
  if (!longDefs) return;
  const longActive = S.tasks.active.filter(t => !t.isTutorial).length;
  const max = G.tasks.activeMaxLongRunning || 3;
  if (longActive >= max) return;
  // 找一个未完成、未激活的
  for (const def of longDefs) {
    if (S.tasks.completed.includes(def.id)) continue;
    if (S.tasks.active.find(a => a.id === def.id)) continue;
    S.tasks.active.push({
      ...def,
      progress: 0,
      target: def.count,
      isTutorial: false,
    });
    if (typeof showMessage === 'function') showMessage('新任务：' + def.title);
    if (S.tasks.active.filter(t => !t.isTutorial).length >= max) break;
  }
}

function taskNotify(trigger, payload) {
  ensureTaskState();
  payload = payload || {};
  // 复制一份避免迭代时修改
  const snapshot = S.tasks.active.slice();
  for (const task of snapshot) {
    if (task.trigger !== trigger) continue;
    // 一些 trigger 需要额外条件
    if (trigger === 'lightning_kill_heavy') {
      if (!payload.bug || !payload.bug.isHeavy) continue;
    }
    // 任务可能在循环内已被移除
    if (!S.tasks.active.includes(task)) continue;
    task.progress = (task.progress || 0) + 1;
    if (task.progress >= task.target) {
      completeTask(task);
    }
  }
}

function completeTask(task) {
  // 给奖励
  grantTaskReward(task.reward);
  // 移出 active
  const idx = S.tasks.active.findIndex(a => a.id === task.id);
  if (idx >= 0) S.tasks.active.splice(idx, 1);
  S.tasks.completed.push(task.id);
  if (typeof spawnFloatingText === 'function' && S.core) {
    spawnFloatingText(S.core.x, S.core.y, '任务完成：' + task.title, 'kill-big');
  }
  if (typeof showMessage === 'function') showMessage('✓ ' + task.title);
  // 教学结束特例
  if (task.endsTutorial) {
    if (S.flags) S.flags.tutorialEnded = true;
    if (task.endsTutorialMessage && typeof showNightNotice === 'function') {
      showNightNotice(task.endsTutorialMessage, 'dawn');
    }
    if (S.flags) S.flags.tutorialMessageShown = true;
  }
  // 教学还没结束就推下一个；结束了开始长线
  if (task.isTutorial) {
    activateNextTutorialTask();
  }
  refreshLongRunningTasks();
}

function grantTaskReward(reward) {
  if (!reward) return;
  if (reward.glue) S.glue += reward.glue;
  if (reward.gems && S.playerState) S.playerState.gems += reward.gems;
  if (reward.card) {
    // card 取值：'normal' / 'rare' / 'epic' / 'special'
    let cardId = null;
    if (reward.card === 'normal') {
      // 从 G.shop 中随便抽（normal 卡）
      const shopIds = (G.shop || []).map(s => s.id);
      cardId = shopIds[Math.floor(Math.random() * shopIds.length)];
    } else if (reward.card === 'rare') {
      const pick = (typeof weightedPickArr === 'function') ? weightedPickArr(G.lootRarePool) : null;
      cardId = pick ? pick.id : null;
    } else if (reward.card === 'epic') {
      const pick = (typeof weightedPickArr === 'function') ? weightedPickArr(G.lootEpicPool) : null;
      cardId = pick ? pick.id : null;
    } else if (reward.card === 'special') {
      const sp = G.specialCards || [];
      cardId = sp[Math.floor(Math.random() * sp.length)];
    }
    if (cardId && typeof addCardToHand === 'function') addCardToHand(cardId);
  }
}

function updateTasks(dt) {
  ensureTaskState();
  // 查询型 trigger
  for (const task of S.tasks.active) {
    if (task.trigger === 'fog_revealed_pct') {
      const pct = computeFogRevealedPct();
      if (pct >= task.target) {
        task.progress = task.target;
        completeTask(task);
        return;     // 防止迭代时修改
      }
    } else if (task.trigger === 'gems_total') {
      const gems = (S.playerState && S.playerState.gems) || 0;
      if (gems >= task.target) {
        task.progress = task.target;
        completeTask(task);
        return;
      }
    }
  }
}

function computeFogRevealedPct() {
  if (!S.fogMap || !S.fogMap.cells) return 0;
  let total = 0, visible = 0;
  for (let y = 0; y < G.mapHeight; y++) {
    for (let x = 0; x < G.mapWidth; x++) {
      total++;
      const c = S.fogMap.cells[y][x];
      if (c && (c.ownerCount > 0 || (c.tempExpireAt > performance.now()))) visible++;
    }
  }
  return total > 0 ? visible / total : 0;
}

window.ensureTaskState = ensureTaskState;
window.activateNextTutorialTask = activateNextTutorialTask;
window.refreshLongRunningTasks = refreshLongRunningTasks;
window.taskNotify = taskNotify;
window.completeTask = completeTask;
window.grantTaskReward = grantTaskReward;
window.updateTasks = updateTasks;
