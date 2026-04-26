// main.js —— 游戏入口 & 主循环
let canvas = null;
let ctx = null;
let lastTime = 0;
let _loopStarted = false;

function init() {
  canvas = document.getElementById('game');
  canvas.width = G.canvasWidth;
  canvas.height = G.canvasHeight;
  ctx = canvas.getContext('2d');

  setupStageSize();

  resetState();
  bindInput(canvas);

  // v6 ASSERT 已废弃（v7 虫巢位置随机化，不再固定）；保留 typeof 守护以防有人还在用
  if (typeof assertAllNestQuadrants === 'function') assertAllNestQuadrants();

  // v4 开场叙事：1500ms 后启动主循环
  setTimeout(() => {
    hideIntroNarrative();
    if (!_loopStarted) {
      _loopStarted = true;
      lastTime = performance.now();
      requestAnimationFrame(gameLoop);
    }
  }, 1500);
}

function setupStageSize() {
  const stage = document.getElementById('stage');
  if (stage) {
    stage.style.width = G.canvasWidth + 'px';
    stage.style.height = G.canvasHeight + 'px';
  }
}

function gameLoop(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  if (!S.paused && !S.gameOver) {
    updatePhase(dt);
    // v6 §9: 血月后第一个白天的 rally 提示（仅一次）
    if (S.flags && S.flags.rallyEnabled && !S.flags.rallyChangeAnnounced && S.phase === 'day') {
      if (typeof showRallyChangeNotice === 'function') showRallyChangeNotice();
      S.flags.rallyChangeAnnounced = true;
    }
    updateNests(dt);
    updateBugs(dt);
    updateSwordsmen(dt);
    updateHero(dt);
    if (typeof applyCoreRegen === 'function') applyCoreRegen(dt);   // v6 §2
    updateBuildings(dt);
    if (typeof updateSearchlights === 'function') updateSearchlights(dt);   // v7.1: 探照灯锥形扫描
    updateScouts(dt);             // v5: 侦察兵
    updateFog(dt);                // v5: 迷雾
    updateGifts(dt);
    updateFx(dt);
    updateMessage(dt);
    updateCameraRing(dt);
    if (typeof tickStatBumps === 'function') tickStatBumps(dt);   // v6.1
    checkWinLose();
  } else {
    updateFx(dt);
    updateMessage(dt);
    updateCameraRing(dt);
  }

  render();
  requestAnimationFrame(gameLoop);
}

function updateCameraRing(dt) {
  if (S.cameraRingTimer > 0) S.cameraRingTimer = Math.max(0, S.cameraRingTimer - dt);
}

function render() {
  ctx.fillStyle = G.colors.bg;
  ctx.fillRect(0, 0, G.canvasWidth, G.canvasHeight);
  drawMap(ctx);
  drawUI(ctx);

  if (S.paused && !S.gameOver) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, G.topBarHeight, G.canvasWidth, G.mapPixelHeight);
    ctx.fillStyle = '#FFF';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('已暂停（空格继续）', G.canvasWidth / 2, G.topBarHeight + G.mapPixelHeight / 2);
  }
}

function onGameEnd() {}

window.addEventListener('load', init);
