// render/ui.js —— v6: 顶栏 + 商店栏 + 手牌（堆叠）+ 卡包/血月奖励浮层 + tooltip
function drawUI(ctx) {
  drawTopBar(ctx);
  drawShopBar(ctx);
  drawHandArea(ctx);
  drawSpellFogBlocker(ctx);          // v6 §1: 法术悬停在迷雾格 → 红色 ✗
  drawTooltip(ctx);
  drawConfirmDialog(ctx);
  drawGameOver(ctx);
  drawMessage(ctx);
  // v6 浮层（绘制在所有 UI 之上）
  drawCardOverlay(ctx);
}

function drawTopBar(ctx) {
  ctx.fillStyle = '#0D0D0D';
  ctx.fillRect(0, 0, G.canvasWidth, G.topBarHeight);
  ctx.strokeStyle = '#444';
  ctx.beginPath();
  ctx.moveTo(0, G.topBarHeight); ctx.lineTo(G.canvasWidth, G.topBarHeight);
  ctx.stroke();

  const phaseName = { day: '白天', dusk: '傍晚', night: '夜晚', dawn: '黎明' }[S.phase];
  const timerStr = Math.ceil(Math.max(0, S.phaseTimer));
  const bloodStr = (S.bloodMoonTriggered && !S.bloodMoonActive) ? '已过' :
                   (S.bloodMoonIn === 0 ? '今夜!' : `${S.bloodMoonIn} 天`);
  const gems = (S.playerState && S.playerState.gems) || 0;

  ctx.fillStyle = G.colors.text;
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  // v6: 核心回血时 ↑ 提示
  let coreHpText = `核心:${Math.ceil(S.core.hp)}`;
  let healing = false;
  if (S.core && S.core.hp < S.core.maxHp) {
    const since = (performance.now() - (S.core.lastCombatAt || 0)) / 1000;
    if (since >= (G.coreRegen ? G.coreRegen.outOfCombatDelay : 5)) healing = true;
  }
  // v7: 删除 /7 天数显示，加进化因子
  const evo = (typeof currentEvoFactor === 'function') ? currentEvoFactor() : 1.0;
  const evoStr = evo.toFixed(2);
  const prefix = `第 ${S.day} 天 · ${phaseName} ${timerStr}s   胶:`;
  const glueStr = `${Math.floor(S.glue)}`;
  const tail = `  令:${S.tokens}  血月:${bloodStr}   ${coreHpText}`;
  ctx.fillText(prefix, 10, G.topBarHeight / 2);
  let cursor = 10 + ctx.measureText(prefix).width;
  drawBumpableText(ctx, glueStr, cursor, G.topBarHeight / 2, '13px sans-serif', G.colors.text, 'glue');
  ctx.font = '13px sans-serif';
  ctx.fillStyle = G.colors.text;
  cursor += ctx.measureText(glueStr).width;
  ctx.fillText(tail, cursor, G.topBarHeight / 2);
  cursor += ctx.measureText(tail).width;
  if (healing) {
    ctx.fillStyle = G.colors.coreHealing || '#7CFFB3';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(' ↑', cursor, G.topBarHeight / 2);
    cursor += 18;
  }
  // gems 紫色 + 弹跳
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = G.colors.gemText;
  ctx.fillText('  💎 ', cursor, G.topBarHeight / 2);
  cursor += ctx.measureText('  💎 ').width;
  drawBumpableText(ctx, `${gems}`, cursor, G.topBarHeight / 2, 'bold 13px sans-serif', G.colors.gemText, 'gems');
  cursor += ctx.measureText(`${gems}`).width;
  // v7: 进化因子（颜色按强度）
  let evoColor = '#88CC88';
  if (evo >= 1.5) evoColor = '#F1C40F';
  if (evo >= 2.0) evoColor = '#E67E22';
  if (evo >= 2.5) evoColor = '#E74C3C';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillStyle = evoColor;
  ctx.fillText(`  🧬 ×${evoStr}`, cursor, G.topBarHeight / 2);

  if (S.bloodMoonActive) {
    ctx.fillStyle = '#FF3040';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('🌑 血月', G.canvasWidth - 220, G.topBarHeight / 2);
  }

  const r = pauseBtnRect();
  ctx.fillStyle = S.paused ? '#3498DB' : '#555';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#FFF';
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#FFF';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(S.paused ? '继续' : '暂停', r.x + r.w / 2, r.y + r.h / 2);

  // v7.1: 天赋按钮（在暂停按钮左边）
  const tr = talentBtnRect();
  const tp = (S.talents && S.talents.points) || 0;
  ctx.fillStyle = tp > 0 ? '#7C5DBF' : '#444';
  ctx.fillRect(tr.x, tr.y, tr.w, tr.h);
  ctx.strokeStyle = '#FFF';
  ctx.strokeRect(tr.x, tr.y, tr.w, tr.h);
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`🌟 天赋 ${tp}`, tr.x + tr.w / 2, tr.y + tr.h / 2);
}

// v6: 商店栏 6 个直购按钮
function drawShopBar(ctx) {
  const top = G.topBarHeight;
  const h = G.shopBarHeight;
  ctx.fillStyle = '#151515';
  ctx.fillRect(0, top, G.canvasWidth, h);
  ctx.strokeStyle = '#444';
  ctx.beginPath();
  ctx.moveTo(0, top + h); ctx.lineTo(G.canvasWidth, top + h);
  ctx.stroke();

  const rects = shopBarRects();
  for (const r of rects) {
    const it = G.shop[r.itemIndex];
    if (!it) continue;
    const def = CARD_DEFS[it.id];
    const reason = shopUnavailableReason(r.itemIndex);
    const disabled = !!reason;
    const hovered = S.hoveredShopIndex === r.itemIndex;

    ctx.fillStyle = disabled ? '#222' : (hovered ? '#3A3A3A' : '#2C2C2C');
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = hovered ? '#FFF' : '#555';
    ctx.strokeRect(r.x, r.y, r.w, r.h);

    // 顶条颜色（按品质）
    const rarity = def && def.rarity ? def.rarity : 'normal';
    ctx.fillStyle = rarityColor(rarity);
    ctx.fillRect(r.x, r.y, r.w, 4);

    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = disabled ? '#777' : '#FFF';
    ctx.fillText(def ? def.name : it.id, r.x + r.w / 2, r.y + r.h / 2 - 6);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = disabled ? (S.glue < it.cost ? '#E74C3C' : '#999') : '#FFD54F';
    ctx.fillText(`${it.cost} 胶`, r.x + r.w / 2, r.y + r.h / 2 + 12);
  }
}

function rarityColor(rarity) {
  if (rarity === 'rare') return '#3498DB';
  if (rarity === 'epic') return '#F1C40F';
  return '#9DA8AE';
}

function rarityBorder(rarity) {
  if (rarity === 'rare') return '#5DADE2';
  if (rarity === 'epic') return '#F4D03F';
  return '#777';
}

function drawHandArea(ctx) {
  const top = G.mapTop + G.mapPixelHeight;
  ctx.fillStyle = '#0D0D0D';
  ctx.fillRect(0, top, G.canvasWidth, G.handHeight);
  ctx.strokeStyle = '#444';
  ctx.beginPath(); ctx.moveTo(0, top); ctx.lineTo(G.canvasWidth, top); ctx.stroke();

  const rects = handCardRects();
  for (const r of rects) {
    const idx = r.index;
    if (idx >= S.hand.length) {
      ctx.strokeStyle = '#2A2A2A';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(r.x, r.y, r.w, r.h);
      ctx.setLineDash([]);
      continue;
    }
    drawHandStack(ctx, r, S.hand[idx], idx);
  }

  drawSkillSlot(ctx);

  ctx.fillStyle = '#888';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  const total = (typeof handTotalCards === 'function') ? handTotalCards() : S.hand.length;
  ctx.fillText(`手牌堆 ${S.hand.length}/${G.hand.maxSize}（共 ${total} 张）`, 10, top + G.handHeight - 10);
}

function drawSkillSlot(ctx) {
  const r = skillSlotRect();
  const hovered = S.hoveredCardIndex === 'skill';
  ctx.fillStyle = '#1A1A1A';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = G.colors.skillSlot;
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.lineWidth = 1;

  ctx.fillStyle = G.colors.skillSlot;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('技能', r.x + r.w / 2, r.y + 4);

  if (S.heroSkillSlot) {
    const reason = skillSlotUnavailableReason();
    const disabled = !!reason;
    const card = S.heroSkillSlot;
    ctx.fillStyle = disabled ? '#333' : (hovered ? '#4A3A10' : '#3A2A00');
    ctx.fillRect(r.x + 3, r.y + 16, r.w - 6, r.h - 20);
    ctx.fillStyle = disabled ? '#777' : '#FFF';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(card.def.name, r.x + r.w / 2, r.y + r.h / 2);
    ctx.font = '10px sans-serif';
    ctx.fillStyle = '#AAA';
    ctx.fillText('点击使用', r.x + r.w / 2, r.y + r.h - 10);
  } else {
    ctx.fillStyle = '#AAA';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.ceil(Math.max(0, S.hero.skillCardTimer))}s`, r.x + r.w / 2, r.y + r.h / 2);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText('CD 中', r.x + r.w / 2, r.y + r.h / 2 + 14);
  }
}

// v6: 手牌堆叠卡渲染
function drawHandStack(ctx, rect, stack, idx) {
  const reason = handIndexUnavailableReason(idx);
  const disabled = !!reason;
  const hovered = S.hoveredCardIndex === idx;

  const def = CARD_DEFS[stack.cardId];
  if (!def) return;

  ctx.fillStyle = disabled ? '#2A2A2A' : (hovered ? '#383838' : '#2F2F2F');
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  // 边框按品质
  const rarity = def.rarity || 'normal';
  ctx.strokeStyle = hovered ? '#FFF' : rarityBorder(rarity);
  ctx.lineWidth = (rarity === 'epic') ? 2 : 1;
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.lineWidth = 1;

  // 顶条颜色
  const typeColor = {
    collector: G.colors.collector,
    reinforced_collector: G.colors.reinforcedCollector,
    tower: G.colors.tower,
    mage_tower: G.colors.mageTower,
    slow_spike: G.colors.slowSpike,
    watchtower: G.colors.watchtower,
    barracks: G.colors.barracks,
    firerain: '#FF6B35',
    repair: '#00B894',
    scout: G.colors.scout,
    sweep: '#F39C12',
    heal: '#2ECC71',
    lightning: '#3498DB',
    recall: '#E74C3C',
  }[def.id] || '#888';
  ctx.fillStyle = typeColor;
  ctx.fillRect(rect.x, rect.y, rect.w, 4);

  // v7.1: 左上角数字键角标（1-9, 0）
  const slotKey = (idx === 9) ? '0' : String(idx + 1);
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(rect.x + 2, rect.y + 6, 14, 14);
  ctx.strokeStyle = '#FFD54F';
  ctx.lineWidth = 1;
  ctx.strokeRect(rect.x + 2, rect.y + 6, 14, 14);
  ctx.fillStyle = '#FFD54F';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slotKey, rect.x + 9, rect.y + 13);

  ctx.fillStyle = disabled ? '#777' : '#FFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(def.name, rect.x + rect.w / 2, rect.y + 8);

  const icon = ({ ground: '🎯', self: '★', global: '🌐', enemy: '👾' })[def.targetType] || '';
  ctx.font = '12px sans-serif';
  ctx.fillText(icon, rect.x + rect.w / 2, rect.y + 26);

  // rarity 字
  ctx.font = '9px sans-serif';
  ctx.fillStyle = rarityColor(rarity);
  const rarityText = rarity === 'epic' ? '史诗' : (rarity === 'rare' ? '稀有' : '普通');
  ctx.fillText(rarityText, rect.x + rect.w / 2, rect.y + rect.h - 14);

  // 堆数徽章（×N，仅 N>1 时显示）
  if (stack.count > 1) {
    const bx = rect.x + rect.w - 18;
    const by = rect.y + rect.h - 22;
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.beginPath();
    ctx.arc(bx + 9, by + 9, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FFD54F';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#FFD54F';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`×${stack.count}`, bx + 9, by + 9);
  }
}

// v6 §1: 法术悬停在迷雾格 → 红色 ✗
function drawSpellFogBlocker(ctx) {
  const pm = S.placementMode;
  if (!pm) return;
  if (!pm.fogHovered) return;
  if (!pm.hoverCell) return;
  const def = pm.def;
  if (!def || def.type !== 'spell' || def.id === 'scout') return;
  const { x, y } = pm.hoverCell;
  if (typeof cellInsideMap === 'function' && !cellInsideMap(x, y)) return;
  // 红色高亮
  ctx.fillStyle = G.colors.fogBlocked || 'rgba(220,40,40,0.55)';
  ctx.fillRect(x * G.cellSize, G.mapTop + y * G.cellSize, G.cellSize, G.cellSize);
  // 中央 ✗
  const cx = x * G.cellSize + G.cellSize / 2;
  const cy = G.mapTop + y * G.cellSize + G.cellSize / 2;
  ctx.strokeStyle = '#FFF';
  ctx.lineWidth = 3;
  const k = G.cellSize * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - k, cy - k); ctx.lineTo(cx + k, cy + k);
  ctx.moveTo(cx + k, cy - k); ctx.lineTo(cx - k, cy + k);
  ctx.stroke();
  ctx.lineWidth = 1;
}

// v6.1: 顶栏数字弹跳 helper（基于 S.statBumps[key] 的剩余时间缩放）
function drawBumpableText(ctx, text, x, y, baseFont, color, key) {
  const bump = (S.statBumps && S.statBumps[key]) || 0;
  const dur = (G.gift && G.gift.valuePopDuration) || 0.5;
  const scale = 1 + Math.min(1, bump / dur) * 0.4;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = color;
  ctx.font = baseFont;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

// v6.1: 鼠标悬停礼盒（不依赖 input.js 设置 S.hoveredGiftId）
function findHoveredGift() {
  if (!S.gifts) return null;
  if (S.mouseY < G.mapTop || S.mouseY >= G.mapTop + G.mapPixelHeight) return null;
  const cellX = Math.floor(S.mouseX / G.cellSize);
  const cellY = Math.floor((S.mouseY - G.mapTop) / G.cellSize);
  for (const g of S.gifts) {
    if (g.pickedUp || g.expired) continue;
    if (Math.round(g.x) === cellX && Math.round(g.y) === cellY) return g;
  }
  return null;
}

// ===== tooltip =====
function drawTooltip(ctx) {
  const mx = S.mouseX || 0, my = S.mouseY || 0;
  if (S.overlay) return;

  if (S.hoveredNestId) {
    const n = S.nests.find(nn => nn.id === S.hoveredNestId);
    if (n && n.alive) {
      const lines = [
        `${n.type === NestType.ARMORED ? '钢壳虫巢' : '虫巢'} #${n.id}`,
        `HP: ${Math.ceil(n.hp)}/${n.maxHp}`,
        `状态: ${n.state}`,
        `下次孵化: ${Math.ceil(Math.max(0, n.spawnTimer))}s`,
        `在场虫子: ${n.bugCount}/${typeof nestCurrentBugCap === 'function' ? nestCurrentBugCap() : '?'}`,
      ];
      drawTooltipBox(ctx, mx + 14, my + 14, lines);
    }
  }

  if (S.hoveredBuildingId) {
    const b = S.buildings.find(bb => bb.id === S.hoveredBuildingId);
    if (b) {
      const type = {
        collector: '采胶器', reinforced_collector: '加固采胶器',
        tower: '箭塔', mage_tower: '法师塔', slow_spike: '减速地刺',
        watchtower: '瞭望塔', barracks: '剑士营',
      }[b.type] || b.type;
      const lines = [type, `HP: ${Math.ceil(b.hp)}/${b.maxHp}`];
      if (b.type === 'collector') lines.push(`下次产出: ${Math.ceil(b.produceTimer)}s`);
      if (b.type === 'reinforced_collector') {
        if (b.warmupTimer > 0) lines.push(`暖机中: ${Math.ceil(b.warmupTimer)}s`);
        else lines.push(`下次产出: ${Math.ceil(b.produceTimer)}s`);
      }
      if (b.type === 'slow_spike' && typeof b.usesLeft === 'number') {
        lines.push(`剩余次数: ${b.usesLeft}`);
      }
      if (b.type === 'barracks' && b.respawnQueue) {
        lines.push(`补兵倒数: ${b.respawnQueue.map(t => Math.ceil(t)).join(', ') || '无'}`);
      }
      lines.push('[右键拆除]');
      drawTooltipBox(ctx, mx + 14, my + 14, lines);
    }
  }

  // v6: hand stack tooltip
  if (typeof S.hoveredCardIndex === 'number' && S.hoveredCardIndex < S.hand.length) {
    const stack = S.hand[S.hoveredCardIndex];
    const def = CARD_DEFS[stack.cardId];
    const reason = handIndexUnavailableReason(S.hoveredCardIndex);
    const lines = [`${def.name} ×${stack.count}`, def.description];
    const rarityText = def.rarity === 'epic' ? '史诗' : (def.rarity === 'rare' ? '稀有' : '普通');
    lines.push(`品质: ${rarityText}`);
    if (reason) lines.push(`[不可用] ${reason}`);
    drawTooltipBox(ctx, mx + 14, my - 60, lines);
  }

  if (S.hoveredCardIndex === 'skill' && S.heroSkillSlot) {
    const card = S.heroSkillSlot;
    const reason = skillSlotUnavailableReason();
    const lines = [card.def.name, card.def.description];
    if (reason) lines.push(`[不可用] ${reason}`);
    drawTooltipBox(ctx, mx - 200, my - 60, lines);
  }

  // v6: 商店 tooltip
  if (typeof S.hoveredShopIndex === 'number' && G.shop[S.hoveredShopIndex]) {
    const it = G.shop[S.hoveredShopIndex];
    const def = CARD_DEFS[it.id];
    const reason = shopUnavailableReason(S.hoveredShopIndex);
    const rarityText = def.rarity === 'epic' ? '史诗' : (def.rarity === 'rare' ? '稀有' : '普通');
    const lines = [
      `${def.name}（${it.cost} 胶）`,
      def.description,
      `品质: ${rarityText}`,
    ];
    if (reason) lines.push(`[不可用] ${reason}`);
    drawTooltipBox(ctx, mx + 14, my + 14, lines);
  }

  if (S.hoveredNestId && !S.pendingNestClick) {
    const reason = marchUnavailableReason();
    if (reason) drawTooltipBox(ctx, mx + 14, my + 100, [`点击出征不可用: ${reason}`]);
    else drawTooltipBox(ctx, mx + 14, my + 100, ['点击出征（消耗 1 令牌）']);
  }

  // v6.1: 悬停礼盒 → 显示战利品包内容
  const hoveredGift = findHoveredGift();
  if (hoveredGift) {
    const ck = (typeof giftContentKey === 'function')
      ? giftContentKey(hoveredGift)
      : (hoveredGift.nestType === NestType.ARMORED ? 'armored' : 'normal');
    const c = G.lootContents && G.lootContents[ck];
    if (c) {
      const title = ck === 'armored' ? '战利品包（钢壳虫巢）'
                  : ck === 'bloodBoss' ? '战利品包（血月 Boss）'
                  : '战利品包（普通虫巢）';
      const lines = [
        title,
        '━━━━━━━━━━',
        `+${c.glue} 胶质`,
        `+${c.gems} 宝石`,
        c.mode === 'pick3' ? `+${c.rareCards} 张稀有卡（3 选 1）` : `+${c.rareCards} 张稀有卡`,
      ];
      drawTooltipBox(ctx, mx + 14, my + 14, lines);
    }
  }
}

function drawTooltipBox(ctx, x, y, lines) {
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const pad = 6;
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, ctx.measureText(l).width);
  const w = maxW + pad * 2;
  const h = lines.length * 16 + pad * 2;
  if (x + w > G.canvasWidth) x = G.canvasWidth - w - 2;
  if (y + h > G.canvasHeight) y = G.canvasHeight - h - 2;
  if (x < 2) x = 2;
  if (y < G.mapTop + 2) y = G.mapTop + 2;
  ctx.fillStyle = G.colors.tooltipBg;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#888';
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#FFF';
  lines.forEach((l, i) => ctx.fillText(l, x + pad, y + pad + i * 16));
}

function drawConfirmDialog(ctx) {
  if (!S.pendingNestClick) return;
  const r = confirmDialogRects();
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(0, G.mapTop, G.canvasWidth, G.mapPixelHeight);
  ctx.fillStyle = '#222';
  ctx.fillRect(r.box.x, r.box.y, r.box.w, r.box.h);
  ctx.strokeStyle = '#FFF';
  ctx.strokeRect(r.box.x, r.box.y, r.box.w, r.box.h);
  ctx.fillStyle = '#FFF';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('出征攻打虫巢？', r.box.x + r.box.w / 2, r.box.y + 16);
  ctx.font = '13px sans-serif';
  ctx.fillText(`消耗 1 令牌（剩余 ${S.tokens}）`, r.box.x + r.box.w / 2, r.box.y + 42);
  drawBtn(ctx, r.yes, '出征', '#27AE60');
  drawBtn(ctx, r.no, '取消', '#555');
}

function drawBtn(ctx, r, label, color) {
  ctx.fillStyle = color;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.strokeStyle = '#FFF';
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = '#FFF';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, r.x + r.w / 2, r.y + r.h / 2);
}

function drawGameOver(ctx) {
  if (!S.gameOver) return;
  ctx.fillStyle = 'rgba(0,0,0,0.78)';
  ctx.fillRect(0, G.mapTop, G.canvasWidth, G.mapPixelHeight);

  ctx.fillStyle = S.victory ? '#27AE60' : '#E74C3C';
  ctx.font = 'bold 40px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const title = S.victory ? '胜利！' : '避难所沦陷';
  const cy = G.mapTop + G.mapPixelHeight / 2;
  ctx.fillText(title, G.canvasWidth / 2, cy - 80);

  ctx.font = '15px sans-serif';
  ctx.fillStyle = '#FFF';
  let subtitle = '';
  if (S.victory) {
    if (S.victoryReason === 'survived_blood_moon') {
      subtitle = '撑过了第一次血月 · 避难所守住了';
    } else if (S.victoryReason === 'survived_seven_days') {
      subtitle = `坚守了 ${G.survivalDay} 天 · 避难所平安`;
    } else {
      subtitle = '所有虫巢已清剿';
    }
  } else {
    subtitle = '核心被攻破 · 第 ' + S.day + ' 天 ' + ({ day: '白天', dusk: '傍晚', night: '夜晚', dawn: '黎明' }[S.phase]);
  }
  ctx.fillText(subtitle, G.canvasWidth / 2, cy - 44);

  const stats = [
    `天数：第 ${S.day} 天`,
    `胶质：${Math.floor(S.glue)}`,
    `💎 宝石：${(S.playerState && S.playerState.gems) || 0}`,
    `击杀：${(S.playerState && S.playerState.lifetimeKills) || 0}`,
    `礼盒：${(S.playerState && S.playerState.giftsCollected) || 0}`,
  ];
  ctx.font = '13px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < stats.length; i++) {
    ctx.fillStyle = i === 2 ? G.colors.gemText : '#CCC';
    ctx.fillText(stats[i], G.canvasWidth / 2, cy - 12 + i * 18);
  }

  const r = restartBtnRect();
  drawBtn(ctx, r, '重新开始', '#3498DB');
}

function drawMessage(ctx) {
  if (!S.message) return;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  const w = 320, h = 36;
  const x = (G.canvasWidth - w) / 2;
  const y = G.mapTop + 10;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#FFF';
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#FFF';
  ctx.font = '14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(S.message.text, G.canvasWidth / 2, y + h / 2);
}

// ===== v6 卡包/血月奖励浮层 =====
function drawCardOverlay(ctx) {
  if (!S.overlay) return;

  // 半透明遮罩
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, G.mapTop, G.canvasWidth, G.mapPixelHeight);

  if (S.overlay.kind === 'lootPick3') {
    drawLootPick3Overlay(ctx);
  } else if (S.overlay.kind === 'lootSingle') {
    drawLootSingleOverlay(ctx);
  } else if (S.overlay.kind === 'bloodMoonReward') {
    drawBloodMoonRewardOverlay(ctx);
  } else if (S.overlay.kind === 'talents') {
    drawTalentsOverlay(ctx);
  }
}

// v7.1: 天赋面板
function drawTalentsOverlay(ctx) {
  const points = (S.talents && S.talents.points) || 0;
  const headerY = G.mapTop + 40;
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`核心天赋树（剩余 ${points} 点）`, G.canvasWidth / 2, headerY);

  ctx.font = '12px sans-serif';
  ctx.fillStyle = '#AAA';
  ctx.fillText('每天清晨 +1 / 每杀虫巢 +1 / 每 10 个虫子 +1', G.canvasWidth / 2, headerY + 22);

  for (const r of talentNodeRects()) {
    const def = (typeof talentDef === 'function') ? talentDef(r.talentId) : null;
    if (!def) continue;
    const unlocked = (typeof isUnlocked === 'function') && isUnlocked(r.talentId);
    const chk = (typeof canUnlockTalent === 'function') ? canUnlockTalent(r.talentId) : { ok: false };
    let bg = '#2A2A2A', borderColor = '#555';
    if (unlocked) { bg = '#1B3A1B'; borderColor = '#5DBF5D'; }
    else if (chk.ok) { bg = '#3A2A4A'; borderColor = '#9B6BD9'; }
    ctx.fillStyle = bg;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = unlocked ? 2 : 1;
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    ctx.lineWidth = 1;
    // 名称
    ctx.fillStyle = unlocked ? '#7CFFB3' : '#FFF';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(def.name + (unlocked ? '（已解锁）' : ` · ${def.cost} 点`), r.x + 10, r.y + 10);
    // 描述
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#CCC';
    wrapText(ctx, def.description, r.x + 10, r.y + 32, r.w - 20, 14);
    // 前置
    if (def.prereq) {
      const prereqDef = (typeof talentDef === 'function') ? talentDef(def.prereq) : null;
      const prereqOk = (typeof isUnlocked === 'function') && isUnlocked(def.prereq);
      ctx.font = '10px sans-serif';
      ctx.fillStyle = prereqOk ? '#5DBF5D' : '#E74C3C';
      ctx.fillText('前置：' + (prereqDef ? prereqDef.name : def.prereq), r.x + 10, r.y + r.h - 16);
    }
    // 状态
    if (!unlocked && !chk.ok) {
      ctx.font = '10px sans-serif';
      ctx.fillStyle = '#E74C3C';
      ctx.textAlign = 'right';
      ctx.fillText(chk.reason || '不可解锁', r.x + r.w - 10, r.y + r.h - 16);
    }
  }

  // 关闭按钮
  const close = talentPanelCloseBtnRect();
  drawBtn(ctx, close, '关闭(T/ESC)', '#555');
}

function drawLootPick3Overlay(ctx) {
  const cy = G.mapTop + 50;
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('钢壳战利品 · 三选一', G.canvasWidth / 2, cy);

  for (let i = 0; i < (S.overlay.picks || []).length; i++) {
    const r = lootOverlayRects()[i];
    if (!r) continue;
    const def = CARD_DEFS[r.cardId];
    if (!def) continue;
    drawOverlayCard(ctx, r, def, S.hoveredOverlayIndex === i);
  }
}

function drawLootSingleOverlay(ctx) {
  const cy = G.mapTop + 50;
  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('战利品卡包', G.canvasWidth / 2, cy);

  const def = CARD_DEFS[S.overlay.cardId];
  const w = 140, h = 200;
  const x = (G.canvasWidth - w) / 2;
  const y = G.mapTop + (G.mapPixelHeight - h) / 2 - 20;
  if (def) drawOverlayCard(ctx, { x, y, w, h, cardId: def.id }, def, false);

  const cr = lootRewardConfirmRect();
  drawBtn(ctx, cr, '确认', '#3498DB');
}

function drawBloodMoonRewardOverlay(ctx) {
  const cy = G.mapTop + 46;
  ctx.fillStyle = '#FF5252';
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('你撑住了第一次血月', G.canvasWidth / 2, cy);

  ctx.fillStyle = '#CCC';
  ctx.font = '13px sans-serif';
  ctx.fillText('点击"领取"加入手牌', G.canvasWidth / 2, cy + 26);

  const rects = bloodMoonRewardCardRects();
  for (const r of rects) {
    const def = CARD_DEFS[r.cardId];
    if (!def) continue;
    drawOverlayCard(ctx, r, def, false);
    // 角标：稀有/史诗
    const tag = (r.role === 'epic') ? '史诗' : '稀有';
    ctx.fillStyle = (r.role === 'epic') ? '#F1C40F' : '#5DADE2';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(tag, r.x + r.w / 2, r.y - 8);
  }

  const cr = lootRewardConfirmRect();
  drawBtn(ctx, cr, '领取', '#27AE60');
}

function drawOverlayCard(ctx, r, def, hovered) {
  ctx.fillStyle = '#2F2F2F';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  const rarity = def.rarity || 'normal';
  ctx.strokeStyle = hovered ? '#FFF' : rarityBorder(rarity);
  ctx.lineWidth = (rarity === 'epic') ? 3 : 2;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.lineWidth = 1;

  const accent = {
    collector: G.colors.collector,
    reinforced_collector: G.colors.reinforcedCollector,
    tower: G.colors.tower,
    mage_tower: G.colors.mageTower,
    slow_spike: G.colors.slowSpike,
    watchtower: G.colors.watchtower,
    barracks: G.colors.barracks,
    firerain: '#FF6B35',
    repair: '#00B894',
    scout: G.colors.scout,
    heal: '#2ECC71',
    lightning: '#3498DB',
    recall: '#E74C3C',
  }[def.id] || '#888';
  ctx.fillStyle = accent;
  ctx.fillRect(r.x, r.y, r.w, 6);

  ctx.fillStyle = '#FFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(def.name, r.x + r.w / 2, r.y + 14);

  ctx.font = '11px sans-serif';
  ctx.fillStyle = '#CCC';
  wrapText(ctx, def.description, r.x + 8, r.y + 40, r.w - 16, 14);

  const hint = ({ ground: '选地块', self: '英雄', global: '全局', enemy: '选敌人' })[def.targetType] || '';
  ctx.font = '10px sans-serif';
  ctx.fillStyle = '#888';
  ctx.fillText(hint, r.x + r.w / 2, r.y + r.h - 18);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  if (!text) return;
  const chars = text.split('');
  let line = '';
  let cy = y;
  for (let i = 0; i < chars.length; i++) {
    const test = line + chars[i];
    if (ctx.measureText(test).width > maxW && line.length > 0) {
      ctx.fillText(line, x + maxW / 2, cy);
      line = chars[i];
      cy += lineH;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x + maxW / 2, cy);
}
