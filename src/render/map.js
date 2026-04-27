// render/map.js —— 地图、建筑、单位绘制（v5: 16×10 + 迷雾 + 新建筑）
function cellToPixel(x, y) {
  return { px: x * G.cellSize + G.cellSize / 2, py: G.mapTop + y * G.cellSize + G.cellSize / 2 };
}

function drawMap(ctx) {
  // v8.4: 4 阶段底色明显区分（白天暖橙 / 傍晚紫红 / 夜晚深蓝 / 黎明青紫）
  // 用整体替换底色（不是叠加）—— 直接 fillStyle 是阶段色而非 G.colors.bg
  let phaseBg;
  if (S.phase === 'day') phaseBg = '#3a3128';            // 暖棕色（暖光时段）
  else if (S.phase === 'dusk') phaseBg = '#3a2030';      // 紫红
  else if (S.phase === 'night') phaseBg = '#0d1530';     // 深蓝夜
  else if (S.phase === 'dawn') phaseBg = '#1c1840';      // 青紫黎明
  else phaseBg = G.colors.bg;
  ctx.fillStyle = phaseBg;
  ctx.fillRect(0, G.mapTop, G.canvasWidth, G.mapPixelHeight);

  // 阶段着色叠加层（不透明度更高，强化感受）
  if (S.phase === 'day') {
    ctx.fillStyle = 'rgba(255,200,120,0.06)';            // 暖光
    ctx.fillRect(0, G.mapTop, G.canvasWidth, G.mapPixelHeight);
  } else if (S.phase === 'dusk') {
    ctx.fillStyle = 'rgba(255,80,90,0.10)';              // 落日红
    ctx.fillRect(0, G.mapTop, G.canvasWidth, G.mapPixelHeight);
  } else if (S.phase === 'night') {
    ctx.fillStyle = 'rgba(30,60,120,0.18)';              // 蓝夜（×2 浓度）
    ctx.fillRect(0, G.mapTop, G.canvasWidth, G.mapPixelHeight);
  } else if (S.phase === 'dawn') {
    ctx.fillStyle = 'rgba(180,140,230,0.12)';            // 紫色黎明
    ctx.fillRect(0, G.mapTop, G.canvasWidth, G.mapPixelHeight);
  }

  // 网格（v8.4: 按阶段调亮度，避免被深色底色吞掉）
  let gridColor = G.colors.grid;
  if (S.phase === 'day') gridColor = 'rgba(255,255,255,0.10)';
  else if (S.phase === 'dusk') gridColor = 'rgba(255,200,200,0.12)';
  else if (S.phase === 'night') gridColor = 'rgba(150,180,255,0.10)';
  else if (S.phase === 'dawn') gridColor = 'rgba(220,180,255,0.12)';
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 1;
  for (let x = 0; x <= G.mapWidth; x++) {
    const px = x * G.cellSize;
    ctx.beginPath();
    ctx.moveTo(px, G.mapTop);
    ctx.lineTo(px, G.mapTop + G.mapPixelHeight);
    ctx.stroke();
  }
  for (let y = 0; y <= G.mapHeight; y++) {
    const py = G.mapTop + y * G.cellSize;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(G.canvasWidth, py);
    ctx.stroke();
  }

  drawCore(ctx);

  // v5: 敌方单位/虫巢只在视野内绘制；我方单位 + 建筑无视雾
  for (const n of S.nests) {
    if (!n.alive) continue;
    if (typeof isVisible !== 'function' || isVisible(n.x, n.y)) drawNest(ctx, n);
  }
  for (const b of S.buildings) if (!b.dead) drawBuilding(ctx, b);
  for (const sw of S.swordsmen) if (!sw.dead) drawSwordsman(ctx, sw);
  for (const sc of S.scouts || []) if (!sc.dead) drawScout(ctx, sc);
  for (const bug of S.bugs) {
    if (bug.dead) continue;
    if (typeof isVisible !== 'function' || isVisible(bug.x, bug.y)) drawBug(ctx, bug);
  }
  if (heroAlive()) drawHero(ctx);

  // 礼盒：仅可见区域可见
  drawGifts(ctx);

  // v8: 探索宝藏（仅在驱散区域可见；v7 起 S.treasures 始终为空 — 保留兼容）
  drawTreasures(ctx);

  // v7: 5 类发现点（仅在驱散区域可见）
  drawDiscoveries(ctx);

  // v5 迷雾 overlay（在单位之上，目标提示之下）
  drawFogOverlay(ctx);

  // 镜头焦点环
  drawCameraFocus(ctx);

  // 放置预览（v5 极简化：仅 legal/illegal 色块）
  if (S.placementMode) drawPlacementPreview(ctx);

  // v7: 自爆爆炸特效（在 effects 之前，确保不被遮）
  drawExplosions(ctx);

  drawEffects(ctx);

  // v6 §8: 血月夜整体红色色调
  if (S.bloodMoonActive && (S.phase === 'night' || S.phase === 'dusk')) {
    ctx.fillStyle = G.colors.bloodMoonTint;
    ctx.fillRect(0, G.mapTop, G.canvasWidth, G.mapPixelHeight);
  }
}

// v5: 迷雾覆盖层
function drawFogOverlay(ctx) {
  if (!S.fogMap) return;
  const W = G.mapWidth, H = G.mapHeight;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const st = (typeof fogStateAt === 'function') ? fogStateAt(x, y) : FogState.VISIBLE;
      if (st === FogState.VISIBLE) continue;
      ctx.fillStyle = (st === FogState.TEMP_VISIBLE) ? G.colors.tempFog : G.colors.fogged;
      ctx.fillRect(x * G.cellSize, G.mapTop + y * G.cellSize, G.cellSize, G.cellSize);
    }
  }

  // v6.1 §3: 攻击暴露红色脉冲圈（在 fog overlay 之后渲染，叠在 TEMP_VISIBLE 格上）
  if (S.fogMap.exposes && S.fogMap.exposes.length > 0) {
    const now = performance.now();
    const period = G.fog.exposePulsePeriod * 1000;     // 0.4s 一次脉冲
    const pulseR = G.fog.exposePulseRadius * G.cellSize;
    for (const e of S.fogMap.exposes) {
      const remain = e.endsAt - now;
      if (remain <= 0) continue;
      const elapsed = now - e.startedAt;
      const phase = (elapsed % period) / period;       // 0..1
      const r = pulseR * (0.55 + 0.45 * Math.sin(phase * Math.PI * 2));
      // 全程衰减强度（剩余时间越短越淡）
      const remainFrac = Math.min(1, remain / (G.fog.exposeDuration * 1000));
      const a = 0.45 + 0.45 * remainFrac;
      const cx = e.x * G.cellSize + G.cellSize / 2;
      const cy = G.mapTop + e.y * G.cellSize + G.cellSize / 2;
      ctx.fillStyle = `rgba(255,60,60,${0.18 * remainFrac})`;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = `rgba(255,40,40,${a})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    }
  }
}

function drawHpBar(ctx, cx, cy, w, hp, maxHp) {
  const barW = Math.max(20, w);
  const barH = 4;
  const x = cx - barW / 2;
  const y = cy - G.cellSize / 2 + 2;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x, y, barW, barH);
  const frac = Math.max(0, hp / maxHp);
  let color = '#27AE60';
  if (frac < 0.66) color = '#F1C40F';
  if (frac < 0.33) color = '#E74C3C';
  ctx.fillStyle = color;
  ctx.fillRect(x, y, barW * frac, barH);
}

function drawCore(ctx) {
  const { px, py } = cellToPixel(S.core.x, S.core.y);
  ctx.fillStyle = G.colors.core;
  ctx.fillRect(px - 18, py - 18, 36, 36);
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 2;
  ctx.strokeRect(px - 18, py - 18, 36, 36);
  drawHpBar(ctx, px, py, 42, S.core.hp, S.core.maxHp);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('基地', px, py);

  // v6.1 §2: 核心受击 0.8s 内 → 头顶红色感叹号
  if (S.flags && S.flags.coreUnderAttackAt > 0) {
    const since = (performance.now() - S.flags.coreUnderAttackAt) / 1000;
    if (since < 0.8) {
      const a = 1 - since / 0.8;
      ctx.fillStyle = G.colors.coreAlertExclam;
      ctx.globalAlpha = a;
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('❗', px, py - 28);
      ctx.globalAlpha = 1;
    }
  }
}

function drawNest(ctx, n) {
  if (!n.alive) return;
  const { px, py } = cellToPixel(n.x, n.y);
  const isArmored = n.type === NestType.ARMORED;
  const palette = isArmored ? G.colors.armoredNest : G.colors.nest;
  let color = palette[n.state] || palette.fortified;
  ctx.fillStyle = color;
  if (n.state === 'weak') ctx.globalAlpha = 0.65;
  ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = isArmored ? G.colors.armoredNest.stroke : '#FFF';
  ctx.lineWidth = isArmored ? 3 : 2;
  ctx.beginPath(); ctx.arc(px, py, 18, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;

  if (isArmored) {
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath(); ctx.arc(px, py, 13, 0, Math.PI * 2); ctx.stroke();
  }

  drawHpBar(ctx, px, py, 42, n.hp, n.maxHp);

  const icon = ({ fortified: '🛡', preparing: '⚔', active: '⚔', weak: '🌙' })[n.state] || '?';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFF';
  ctx.fillText(icon, px, py - 25);

  if (isArmored) {
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = G.colors.armoredNest.stroke;
    ctx.fillText('钢壳', px, py + 27);
  }
}

function drawBuilding(ctx, b) {
  const { px, py } = cellToPixel(b.x, b.y);
  // 主体 + 占位文字
  if (b.type === 'collector') {
    ctx.fillStyle = G.colors.collector;
    ctx.fillRect(px - 16, py - 16, 32, 32);
    drawCenterChar(ctx, px, py, '采', '#222');
  } else if (b.type === 'reinforced_collector') {
    ctx.fillStyle = G.colors.reinforcedCollector;
    ctx.fillRect(px - 18, py - 18, 36, 36);
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 18, py - 18, 36, 36);
    ctx.lineWidth = 1;
    drawCenterChar(ctx, px, py, '采+', '#FFF');
    if (b.warmupTimer > 0) {
      // 暖机倒计时显示
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#FFF';
      ctx.textAlign = 'center';
      ctx.fillText(`暖机 ${Math.ceil(b.warmupTimer)}s`, px, py + 26);
    }
  } else if (b.type === 'tower') {
    ctx.fillStyle = G.colors.tower;
    ctx.beginPath();
    ctx.moveTo(px, py - 18); ctx.lineTo(px + 18, py); ctx.lineTo(px, py + 18); ctx.lineTo(px - 18, py);
    ctx.closePath();
    ctx.fill();
    drawCenterChar(ctx, px, py, '箭', '#FFF');
  } else if (b.type === 'mage_tower') {
    ctx.fillStyle = G.colors.mageTower;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i + Math.PI / 6;
      const r = 18;
      const x = px + Math.cos(a) * r;
      const y = py + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1; ctx.stroke();
    drawCenterChar(ctx, px, py, '法', '#FFF');
  } else if (b.type === 'slow_spike') {
    ctx.fillStyle = G.colors.slowSpike;
    // 三角刺
    ctx.beginPath();
    ctx.moveTo(px - 14, py + 10); ctx.lineTo(px, py - 14); ctx.lineTo(px + 14, py + 10);
    ctx.closePath();
    ctx.fill();
    drawCenterChar(ctx, px, py + 4, '减', '#FFF', 9);
    // v6 §3: 底部小光点指示 usesLeft（5 / 4 / 3 / 2 / 1）
    {
      const total = G.slowSpike.usesLeft;     // 5
      const leftCount = (b.usesLeft !== undefined) ? b.usesLeft : total;
      const dotR = 2;
      for (let i = 0; i < total; i++) {
        const dpx = b.x * G.cellSize + G.cellSize / 2 - 12 + i * 6;
        const dpy = G.mapTop + b.y * G.cellSize + G.cellSize - 6;
        ctx.fillStyle = (i < leftCount) ? '#FFFFFF' : 'rgba(255,255,255,0.2)';
        ctx.beginPath(); ctx.arc(dpx, dpy, dotR, 0, Math.PI * 2); ctx.fill();
      }
    }
  } else if (b.type === 'watchtower') {
    ctx.fillStyle = G.colors.watchtower;
    // 高塔造型：底座方 + 上方三角
    ctx.fillRect(px - 12, py - 4, 24, 18);
    ctx.beginPath();
    ctx.moveTo(px - 14, py - 4); ctx.lineTo(px, py - 18); ctx.lineTo(px + 14, py - 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1; ctx.stroke();
    drawCenterChar(ctx, px, py + 18, '望', '#FFF', 9);
    // v6 §7: 顶部持续亮起的小灯泡（驱散标记）
    {
      const lpx = px;
      const lpy = py - 26;
      ctx.fillStyle = '#FFE066';
      ctx.beginPath(); ctx.arc(lpx, lpy, 4, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFAA00';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(lpx, lpy, 4, 0, Math.PI * 2); ctx.stroke();
      // 高光
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(lpx - 1.2, lpy - 1.2, 1.2, 0, Math.PI * 2); ctx.fill();
    }
  } else if (b.type === 'barracks') {
    ctx.fillStyle = G.colors.barracks;
    ctx.fillRect(px - 18, py - 18, 36, 36);
    drawCenterChar(ctx, px, py, '兵', '#FFF');
  } else if (b.type === 'searchlight') {
    // v7.1: 探照灯主体（黄色矩形 + 中央"灯"字）
    ctx.fillStyle = G.colors.watchtower || '#F39C12';
    ctx.fillRect(px - 14, py - 14, 28, 28);
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(px - 14, py - 14, 28, 28);
    drawCenterChar(ctx, px, py, '灯', '#222');
    // 方向指示扇形（半透明）
    const dir = b.direction || 'right';
    const range = G.searchlight.range * G.cellSize;
    let startAng, endAng;
    if (dir === 'right') { startAng = -Math.PI / 4; endAng = Math.PI / 4; }
    else if (dir === 'down') { startAng = Math.PI / 4; endAng = 3 * Math.PI / 4; }
    else if (dir === 'left') { startAng = 3 * Math.PI / 4; endAng = 5 * Math.PI / 4; }
    else { startAng = -3 * Math.PI / 4; endAng = -Math.PI / 4; }
    ctx.fillStyle = 'rgba(255,215,0,0.10)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, range, startAng, endAng);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,215,0,0.4)';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.arc(px, py, range, startAng, endAng);
    ctx.closePath();
    ctx.stroke();
  } else if (b.type === 'stone_wall') {
    // v7.1: 石墙 —— 灰色矩形，砖块纹理
    ctx.fillStyle = G.colors.stoneWall || '#7F8C8D';
    ctx.fillRect(px - 18, py - 18, 36, 36);
    ctx.strokeStyle = '#34495E';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 18, py - 18, 36, 36);
    // 砖块横线
    ctx.beginPath();
    ctx.moveTo(px - 18, py - 6); ctx.lineTo(px + 18, py - 6);
    ctx.moveTo(px - 18, py + 6); ctx.lineTo(px + 18, py + 6);
    // 错位竖线
    ctx.moveTo(px, py - 18); ctx.lineTo(px, py - 6);
    ctx.moveTo(px - 9, py - 6); ctx.lineTo(px - 9, py + 6);
    ctx.moveTo(px + 9, py - 6); ctx.lineTo(px + 9, py + 6);
    ctx.moveTo(px, py + 6); ctx.lineTo(px, py + 18);
    ctx.stroke();
    ctx.lineWidth = 1;
  } else if (b.type === 'outpost') {
    // v7.1: 哨所 —— 黄色塔楼 + 望远镜符号
    ctx.fillStyle = G.colors.outpost || '#F39C12';
    ctx.fillRect(px - 14, py - 4, 28, 18);
    ctx.beginPath();
    ctx.moveTo(px - 16, py - 4); ctx.lineTo(px, py - 18); ctx.lineTo(px + 16, py - 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 1;
    ctx.stroke();
    drawCenterChar(ctx, px, py + 18, '哨', '#FFF', 9);
    // 视野半径提示
    ctx.strokeStyle = 'rgba(243,156,18,0.25)';
    ctx.beginPath(); ctx.arc(px, py, G.outpost.attackRange * G.cellSize, 0, Math.PI * 2); ctx.stroke();
  } else if (b.type === 'repair_station') {
    // v7.1: 维修台 —— 绿色十字
    ctx.fillStyle = G.colors.repairStation || '#27AE60';
    ctx.fillRect(px - 16, py - 16, 32, 32);
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 16, py - 16, 32, 32);
    // 白色十字
    ctx.fillStyle = '#FFF';
    ctx.fillRect(px - 2, py - 10, 4, 20);
    ctx.fillRect(px - 10, py - 2, 20, 4);
    ctx.lineWidth = 1;
    // 范围提示（每帧脉动）
    if (Math.sin(performance.now() / 600) > 0) {
      ctx.strokeStyle = 'rgba(39,174,96,0.25)';
      ctx.beginPath(); ctx.arc(px, py, G.repairStation.healRadius * G.cellSize, 0, Math.PI * 2); ctx.stroke();
    }
  } else if (b.type === 'supply_station') {
    // v7.1: 补给站 —— 紫色箱子 + 胶罐
    ctx.fillStyle = G.colors.supplyStation || '#9B59B6';
    ctx.fillRect(px - 14, py - 14, 28, 28);
    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - 14, py - 14, 28, 28);
    // 胶罐（圆顶）
    ctx.fillStyle = '#F1C40F';
    ctx.beginPath(); ctx.arc(px, py - 4, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFF';
    ctx.beginPath(); ctx.arc(px, py - 4, 7, 0, Math.PI * 2); ctx.stroke();
    drawCenterChar(ctx, px, py + 8, '补', '#FFF', 9);
    ctx.lineWidth = 1;
  }

  if (S.selectedBuildingId === b.id) {
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(px - 20, py - 20, 40, 40);
    if (b.type === 'tower') {
      ctx.strokeStyle = G.colors.rangePreviewStroke;
      ctx.beginPath(); ctx.arc(px, py, G.tower.attackRange * G.cellSize, 0, Math.PI * 2); ctx.stroke();
    }
    if (b.type === 'mage_tower') {
      ctx.strokeStyle = G.colors.rangePreviewStroke;
      ctx.beginPath(); ctx.arc(px, py, G.mageTower.attackRange * G.cellSize, 0, Math.PI * 2); ctx.stroke();
    }
    if (b.type === 'watchtower') {
      ctx.strokeStyle = 'rgba(243,156,18,0.5)';
      ctx.beginPath(); ctx.arc(px, py, G.fog.watchtowerRadius * G.cellSize, 0, Math.PI * 2); ctx.stroke();
    }
  }
  // v8: attractsAggro 红圈视觉（瞭望塔/探照灯）— 提示玩家"虫子优先打这个"
  if (b.attractsAggro && !b.dead) {
    ctx.strokeStyle = G.colors.aggroMark || 'rgba(255,80,80,0.85)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.arc(px, py, 22, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineWidth = 1;
  }
  drawHpBar(ctx, px, py, 40, b.hp, b.maxHp);
}

function drawCenterChar(ctx, px, py, ch, color, size) {
  ctx.font = 'bold ' + (size || 11) + 'px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color || '#FFF';
  ctx.fillText(ch, px, py);
}

function drawSwordsman(ctx, sw) {
  const { px, py } = cellToPixel(sw.x, sw.y);
  ctx.fillStyle = G.colors.swordsman;
  ctx.fillRect(px - 8, py - 8, 16, 16);
  drawHpBar(ctx, px, py, 20, sw.hp, sw.maxHp);
  // v6.1: ENGAGE 头顶 ⚔ 图标
  if (sw.state === 'chasing' || sw.state === 'attacking') {
    ctx.fillStyle = G.colors.heroEngageIcon;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔', px, py - 14);
  }
}

function drawScout(ctx, sc) {
  const { px, py } = cellToPixel(sc.x, sc.y);
  ctx.fillStyle = G.colors.scout;
  ctx.beginPath(); ctx.arc(px, py, 7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#FFF'; ctx.lineWidth = 1; ctx.stroke();
  drawCenterChar(ctx, px, py, '侦', '#FFF', 8);
  // v8: hp bar（侦察兵可被打）
  if (sc.maxHp) drawHpBar(ctx, px, py, 18, sc.hp, sc.maxHp);
  // v8: attractsAggro 红圈
  if (sc.attractsAggro) {
    ctx.strokeStyle = G.colors.aggroMark || 'rgba(255,80,80,0.85)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px, py, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
  // 视野半径轻量提示
  ctx.strokeStyle = 'rgba(93,173,226,0.35)';
  ctx.beginPath(); ctx.arc(px, py, G.fog.scoutVisionRadius * G.cellSize, 0, Math.PI * 2); ctx.stroke();

  // v6 §7: 观察状态时上方画时钟图标 + 倒数秒
  if (sc.state === 'observing') {
    const cpx = px;
    const cpy = py - 16;
    // 时钟外圈
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath(); ctx.arc(cpx, cpy, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cpx, cpy, 6, 0, Math.PI * 2); ctx.stroke();
    // 时钟指针（12 点 + 3 点）
    ctx.beginPath();
    ctx.moveTo(cpx, cpy); ctx.lineTo(cpx, cpy - 4);
    ctx.moveTo(cpx, cpy); ctx.lineTo(cpx + 3, cpy);
    ctx.stroke();
    // 倒数秒
    const left = Math.max(0, Math.ceil(G.scout.lifetimeAfterArrive - sc.lifeTimer));
    ctx.font = 'bold 10px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(left + 's', cpx + 14, cpy);
  }
}

function drawBug(ctx, bug) {
  const { px, py } = cellToPixel(bug.x, bug.y);
  let r, fill;
  if (bug.isTerminalBoss) { r = 32; fill = G.colors.terminalBoss; }    // v8
  else if (bug.isBloodBoss) { r = 24; fill = G.colors.bloodBoss; }
  else if (bug.isBoss) { r = 12; fill = G.colors.bugBoss; }
  else if (bug.isHeavy) { r = 9; fill = G.colors.bugHeavy; }
  else if (bug.isFlying) { r = 9; fill = '#9B59B6'; }       // v7 紫色飞行虫
  else if (bug.isFast) { r = 6; fill = '#5DADE2'; }         // v7 浅蓝快速虫
  else if (bug.isExploder) { r = 9; fill = '#C0392B'; }     // v7 深红自爆虫
  else if (bug.isGuard) { r = 8; fill = G.colors.bugGuard; }
  else { r = 7; fill = G.colors.bug; }
  ctx.fillStyle = fill;
  if (bug.retreating) ctx.globalAlpha = 0.5;
  // v7: 快速虫 — 先画残影（在主体之前，避免遮主体）
  if (bug.isFast && !bug.retreating) {
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.arc(px - 4, py, r * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = bug.retreating ? 0.5 : 1;
    ctx.fillStyle = fill;
  }
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
  if (bug.isTerminalBoss) {
    // 终极 Boss 双重描边 + 紫色光晕
    ctx.strokeStyle = G.colors.terminalBossStroke;
    ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,80,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(px, py, r + 6, 0, Math.PI * 2); ctx.stroke();
    // 头顶标签
    ctx.fillStyle = G.colors.terminalBossStroke;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('终极 BOSS', px, py - r - 12);
  } else if (bug.isBloodBoss) {
    ctx.strokeStyle = G.colors.bloodBossStroke;
    ctx.lineWidth = 3; ctx.stroke();
  } else if (bug.isHeavy) {
    ctx.strokeStyle = G.colors.bugHeavyStroke;
    ctx.lineWidth = 2; ctx.stroke();
  }
  if (bug.isGuard) {
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2; ctx.stroke();
  }
  // v7: 飞行虫 — 白色翅膀符号（左右两个三角）
  if (bug.isFlying) {
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px - r - 2, py - 2); ctx.lineTo(px - r - 6, py - 6); ctx.lineTo(px - r - 2, py - 6);
    ctx.moveTo(px + r + 2, py - 2); ctx.lineTo(px + r + 6, py - 6); ctx.lineTo(px + r + 2, py - 6);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  // v7: 自爆虫 — 内部脉动红光
  if (bug.isExploder && !bug.exploded) {
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 200);
    ctx.fillStyle = `rgba(255,80,40,${pulse})`;
    ctx.beginPath(); ctx.arc(px, py, r * 0.5, 0, Math.PI * 2); ctx.fill();
  }
  // v5 减速指示
  if (bug.slowedUntil > performance.now()) {
    ctx.strokeStyle = '#16A085';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px, py, r + 2, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.lineWidth = 1;
  drawHpBar(ctx, px, py, r * 2 + 4, bug.hp, bug.maxHp);

  // v6 §9: rallyTarget 标记 —— 短虚线指向集结点
  if (bug.rallyTarget && !bug.retreating) {
    const tp = cellToPixel(bug.rallyTarget.x, bug.rallyTarget.y);
    ctx.save();
    ctx.strokeStyle = G.colors.rallyMark;
    ctx.lineWidth = 1.2;
    if (ctx.setLineDash) ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(tp.px, tp.py);
    ctx.stroke();
    if (ctx.setLineDash) ctx.setLineDash([]);
    ctx.restore();
    // 头顶橙色小三角（朝集结点方向）
    const dx = tp.px - px;
    const dy = tp.py - py;
    const dl = Math.hypot(dx, dy) || 1;
    const ux = dx / dl, uy = dy / dl;
    const nx = -uy, ny = ux;
    const tipX = px + ux * (r + 8);
    const tipY = py + uy * (r + 8);
    const baseX = px + ux * (r + 3);
    const baseY = py + uy * (r + 3);
    ctx.fillStyle = G.colors.rallyMark;
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX + nx * 3, baseY + ny * 3);
    ctx.lineTo(baseX - nx * 3, baseY - ny * 3);
    ctx.closePath();
    ctx.fill();
  }
}

// v7: 自爆爆炸特效 — 红色扩散圈（用 performance.now 计时，无需 dt）
function drawExplosions(ctx) {
  if (!S.explosions || S.explosions.length === 0) return;
  const now = performance.now();
  for (let i = S.explosions.length - 1; i >= 0; i--) {
    const e = S.explosions[i];
    if (!e.bornAt) e.bornAt = now;
    const age = (now - e.bornAt) / 1000;
    const t = age / e.duration;
    if (t >= 1) { S.explosions.splice(i, 1); continue; }
    const { px, py } = cellToPixel(e.x, e.y);
    const r = e.radius * G.cellSize * (0.3 + t * 0.7);
    ctx.fillStyle = `rgba(231,76,60,${(1 - t) * 0.5})`;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,140,40,${1 - t})`;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawHero(ctx) {
  const { px, py } = cellToPixel(S.hero.x, S.hero.y);
  ctx.fillStyle = G.colors.hero;
  ctx.beginPath();
  ctx.moveTo(px, py - 16);
  ctx.lineTo(px + 14, py + 12);
  ctx.lineTo(px - 14, py + 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 1;
  ctx.stroke();
  drawHpBar(ctx, px, py, 36, S.hero.hp, S.hero.maxHp);
  // v6.1 §2: ENGAGE 状态头顶 ⚔ 红色图标
  if (S.hero.state === 'engage' || S.hero.state === 'fighting') {
    ctx.fillStyle = G.colors.heroEngageIcon;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚔', px, py - 22);
  }
}

// v8: 探索宝藏渲染（金色宝藏箱 + 上下浮动 + 金色光晕）
function drawTreasures(ctx) {
  if (!S.treasures || S.treasures.length === 0) return;
  for (const t of S.treasures) {
    if (t.pickedUp) continue;
    if (typeof isVisible === 'function' && !isVisible(t.x, t.y)) continue;   // 迷雾里看不见
    const bob = Math.sin(t.bobPhase) * 4;
    const { px, py } = cellToPixel(t.x, t.y);
    const cy = py + bob;
    // 金色光晕
    const halo = 0.55 + 0.25 * Math.sin(t.bobPhase * 1.3);
    ctx.fillStyle = `rgba(255,215,0,${0.18 * halo})`;
    ctx.beginPath(); ctx.arc(px, cy, 16, 0, Math.PI * 2); ctx.fill();
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(px, py + 11, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
    // 主体宝箱
    ctx.fillStyle = G.colors.treasure || '#F39C12';
    ctx.fillRect(px - 10, cy - 6, 20, 12);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - 10, cy - 6, 20, 12);
    // 盖
    ctx.fillStyle = '#E67E22';
    ctx.fillRect(px - 11, cy - 11, 22, 7);
    ctx.strokeRect(px - 11, cy - 11, 22, 7);
    // 锁
    ctx.fillStyle = '#FFD700';
    ctx.fillRect(px - 2, cy - 5, 4, 5);
    ctx.lineWidth = 1;
    // "宝"字
    ctx.font = 'bold 9px sans-serif';
    ctx.fillStyle = '#FFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('宝', px, cy + 1);
  }
}

function drawGifts(ctx) {
  if (!S.gifts || S.gifts.length === 0) return;
  for (const g of S.gifts) {
    if (g.pickedUp || g.expired) continue;
    if (typeof isVisible === 'function' && !isVisible(g.x, g.y)) continue;
    const bob = Math.sin(g.bobPhase) * G.gift.bobAmplitude * G.cellSize;
    const { px, py } = cellToPixel(g.x, g.y);
    const cy = py + bob;

    // v6.1: 礼盒新外观 —— 金色礼盒 + 红色蝴蝶结
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(px, py + 13, 13, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // 金色光圈呼吸（保留 v4 行为）
    const halo = 0.55 + 0.25 * Math.sin(g.bobPhase * 1.6);
    ctx.fillStyle = `rgba(255,215,0,${0.18 * halo})`;
    ctx.beginPath(); ctx.arc(px, cy, 18, 0, Math.PI * 2); ctx.fill();

    const isArmored = g.nestType === NestType.ARMORED || g.lootKind === 'armored';
    const isBloodBoss = g.lootKind === 'bloodBoss';
    const bodyColor = isArmored ? '#A569BD' : isBloodBoss ? '#C0392B' : G.colors.giftBoxBody;
    const lidColor  = isArmored ? '#7D3C98' : isBloodBoss ? '#922B21' : G.colors.giftBoxLid;

    // 礼盒主体（下半 14×11）
    ctx.fillStyle = bodyColor;
    ctx.fillRect(px - 11, cy - 4, 22, 14);
    ctx.strokeStyle = G.colors.giftStroke;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(px - 11, cy - 4, 22, 14);

    // 礼盒盖（上半 14×6，比下半略宽）
    ctx.fillStyle = lidColor;
    ctx.fillRect(px - 12, cy - 9, 24, 6);
    ctx.strokeRect(px - 12, cy - 9, 24, 6);

    // 红色蝴蝶结
    ctx.fillStyle = G.colors.giftRibbon;
    // 中间结
    ctx.fillRect(px - 3, cy - 11, 6, 5);
    // 左 / 右两个三角"耳朵"
    ctx.beginPath();
    ctx.moveTo(px - 3, cy - 9); ctx.lineTo(px - 11, cy - 12); ctx.lineTo(px - 11, cy - 5); ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(px + 3, cy - 9); ctx.lineTo(px + 11, cy - 12); ctx.lineTo(px + 11, cy - 5); ctx.closePath();
    ctx.fill();
    // 中央竖向丝带（贯穿盖到底）
    ctx.fillStyle = G.colors.giftRibbon;
    ctx.fillRect(px - 1, cy - 9, 2, 19);
    ctx.lineWidth = 1;

    // 即将过期闪烁
    if (G.gift.lifetime - g.age < 8) {
      const blink = Math.sin(g.age * 8) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(255,80,80,${0.45 * blink})`;
      ctx.fillRect(px - 14, cy - 12, 28, 26);
    }
  }
}

function drawCameraFocus(ctx) {
  const pos = cameraTargetPos();
  if (!pos) return;
  const { px, py } = cellToPixel(pos.x, pos.y);
  const t = (performance.now() / 1000) % G.camera.pulsePeriod;
  const phase = t / G.camera.pulsePeriod;
  const baseR = pos.kind === 'hero' ? 22 : 26;
  const r = baseR + Math.sin(phase * Math.PI * 2) * 3;
  ctx.strokeStyle = G.colors.cameraRing;
  ctx.globalAlpha = 0.55 + 0.25 * Math.sin(phase * Math.PI * 2);
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;

  if (S.cameraRingTimer > 0) {
    const prog = 1 - S.cameraRingTimer / G.fx.cameraRing;
    const a = 1 - prog;
    ctx.strokeStyle = G.colors.cameraRing;
    ctx.globalAlpha = a;
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, baseR + prog * 24, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.lineWidth = 1;
}

// v5 placement preview 极简化：仅 legal/illegal 色块（移除范围圈/金边/提示文字）
function drawPlacementPreview(ctx) {
  const pm = S.placementMode;
  if (!pm) return;

  // v7.1: 探照灯方向选择子模式 — 渲染 4 个方向圆形按钮 + 高亮选定 cell
  if (pm.subStep === 'pickDirection') {
    const cellPx = pm.pickedCellX * G.cellSize;
    const cellPy = G.mapTop + pm.pickedCellY * G.cellSize;
    // 高亮已选定的格
    ctx.fillStyle = G.colors.legalTile;
    ctx.fillRect(cellPx, cellPy, G.cellSize, G.cellSize);
    // 标题
    const cx = cellPx + G.cellSize / 2;
    const cy = cellPy + G.cellSize / 2;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(cx - 70, cellPy - 32, 140, 22);
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('选择探照方向', cx, cellPy - 21);
    // 4 个方向按钮（圆形 + 箭头）
    const rects = (typeof searchlightDirectionRects === 'function') ? searchlightDirectionRects() : [];
    for (const r of rects) {
      const bx = r.x + r.w / 2, by = r.y + r.h / 2;
      ctx.fillStyle = '#7C5DBF';
      ctx.beginPath(); ctx.arc(bx, by, r.w / 2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFD54F';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bx, by, r.w / 2, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const arrow = ({ up: '↑', down: '↓', left: '←', right: '→' })[r.dir];
      ctx.fillText(arrow, bx, by);
    }
    return;
  }

  if (!pm.hoverCell) return;
  const { x, y } = pm.hoverCell;
  if (!cellInsideMap(x, y)) return;

  // target-select 模式：选目标用黄色高亮
  if (pm.selectKind) {
    ctx.fillStyle = G.colors.selectTarget;
    ctx.fillRect(x * G.cellSize, G.mapTop + y * G.cellSize, G.cellSize, G.cellSize);
    return;
  }

  const cardDef = (pm.card && pm.card.def) || pm.def;
  let legal = true;
  if (cardDef && cardDef.type === 'building') {
    legal = canPlaceBuildingAt(cardDef.subtype, x, y);
  }
  ctx.fillStyle = legal ? G.colors.legalTile : G.colors.illegalTile;
  ctx.fillRect(x * G.cellSize, G.mapTop + y * G.cellSize, G.cellSize, G.cellSize);
}

// v7: 5 类发现点渲染（迷雾里看不见；驱散后随浮动呼吸）
function drawDiscoveries(ctx) {
  if (!S.discoveries || S.discoveries.length === 0) return;
  for (const d of S.discoveries) {
    if (d.pickedUp) continue;
    if (typeof isVisible === 'function' && !isVisible(d.x, d.y)) continue;
    const bob = Math.sin(d.bobPhase || 0) * 4;
    const { px, py } = cellToPixel(d.x, d.y);
    const cy = py + bob;
    if (d.type === 'resource') {
      // 金色小堆 + 闪烁
      const halo = 0.55 + 0.25 * Math.sin((d.bobPhase || 0) * 1.4);
      ctx.fillStyle = `rgba(255,215,0,${0.2 * halo})`;
      ctx.beginPath(); ctx.arc(px, cy, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#F1C40F';
      ctx.beginPath(); ctx.arc(px, cy, 6, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(px, cy, 6, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 1;
    } else if (d.type === 'chest') {
      // 木质宝箱
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(px, py + 11, 11, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#8B5A2B';
      ctx.fillRect(px - 10, cy - 5, 20, 11);
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(px - 11, cy - 10, 22, 7);
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1.5;
      ctx.strokeRect(px - 11, cy - 10, 22, 16);
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(px - 2, cy - 4, 4, 5);
      ctx.lineWidth = 1;
    } else if (d.type === 'wild_camp') {
      // 营地图标（一团小怪聚落 + 红色营圈 + ?）
      if (!d.defeated) {
        ctx.fillStyle = '#7F2E2E';
        for (let i = 0; i < 3; i++) {
          const ax = px + Math.cos(i * 2.1) * 8;
          const ay = cy + Math.sin(i * 2.1) * 8;
          ctx.beginPath(); ctx.arc(ax, ay, 4, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = '#E74C3C'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, cy, 14, 0, Math.PI * 2); ctx.stroke();
        ctx.font = 'bold 9px sans-serif';
        ctx.fillStyle = '#FFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', px, cy);
        ctx.lineWidth = 1;
      } else {
        // 已击败 — 灰色废墟（重生倒计时）
        ctx.fillStyle = 'rgba(120,120,120,0.5)';
        ctx.beginPath(); ctx.arc(px, cy, 12, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#888'; ctx.lineWidth = 1;
        if (ctx.setLineDash) ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.arc(px, cy, 12, 0, Math.PI * 2); ctx.stroke();
        if (ctx.setLineDash) ctx.setLineDash([]);
        ctx.fillStyle = '#AAA';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const remain = Math.max(0, (d.respawnAtDay || 0) - S.day);
        ctx.fillText(remain + 'd', px, cy);
      }
    } else if (d.type === 'sleeping_nest') {
      // 紫色圆 + Z 字母
      ctx.fillStyle = '#5C3D70';
      ctx.beginPath(); ctx.arc(px, cy, 14, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#9B6BD9'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(px, cy, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#FFF';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Z', px, cy);
      ctx.lineWidth = 1;
    } else if (d.type === 'relic') {
      // 石碑（深灰矩形 + 金"遗"字）
      ctx.fillStyle = '#5D6D7E';
      ctx.fillRect(px - 6, cy - 12, 12, 22);
      ctx.strokeStyle = '#85929E'; ctx.lineWidth = 1.5;
      ctx.strokeRect(px - 6, cy - 12, 12, 22);
      ctx.fillStyle = '#F4D03F';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('遗', px, cy);
      ctx.lineWidth = 1;
    }
  }
}
