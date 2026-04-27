// systems/raid.js —— v7 来袭预警
//
// 进入 dusk 时由 phase.js 调 computeRaidPreview()
// 在 night 进入时由 phase.js 调 clearRaidPreview()
// drawRaidPreview() 渲染（ui.js）
// updateRaidPreview(dt) 由 main.js 推动 timer

function computeRaidPreview() {
  if (!G.raidWarning || !G.raidWarning.enabled) return null;
  // 血月夜不预警（已由 showBloodMoonComing 处理）
  if (S.bloodMoonActive) return null;

  const day = S.day;
  let precision;
  if (day <= G.raidWarning.precisePrecisionDays) precision = 'precise';
  else if (day <= G.raidWarning.roughPrecisionDays) precision = 'rough';
  else precision = 'vague';

  const mix = (G.nightlyEnemyMix && (G.nightlyEnemyMix[day] || G.nightlyEnemyMix.default))
    || { normal: 1.0 };

  // 估算总数（按当前 alive 巢数 × cap，简化）
  const aliveNests = (S.nests || []).filter(n => n.alive).length;
  const cap = (typeof nestCurrentBugCap === 'function') ? nestCurrentBugCap() : 5;
  const totalEst = aliveNests * cap;

  // 方向（粗略）
  const dirs = aliveNests > 0
    ? (aliveNests <= 2 ? '少数方向' : '多个方向')
    : '未知';

  S.raidPreview = {
    day,
    precision,
    mix,
    countEstimate: totalEst,
    direction: dirs,
    timer: (G.raidWarning.durationOnDusk != null) ? G.raidWarning.durationOnDusk : 15,
  };
  if (S.flags && S.flags.raidPreviewShown) {
    S.flags.raidPreviewShown[day] = true;
  }
  return S.raidPreview;
}

function updateRaidPreview(dt) {
  if (!S.raidPreview) return;
  S.raidPreview.timer -= dt;
  if (S.raidPreview.timer <= 0) S.raidPreview = null;
}

function clearRaidPreview() {
  S.raidPreview = null;
}

window.computeRaidPreview = computeRaidPreview;
window.updateRaidPreview = updateRaidPreview;
window.clearRaidPreview = clearRaidPreview;
