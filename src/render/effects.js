// render/effects.js —— 临时特效
function drawEffects(ctx) {
  for (const f of S.fx) {
    if (f.type === 'line') {
      let color = G.colors.attackLine;
      if (f.kind === 'hero') color = G.colors.heroAttackLine;
      else if (f.kind === 'bug') color = G.colors.bugAttackLine;
      const a = Math.max(0, f.timer / G.fx.attackLine);
      const { px: x1, py: y1 } = cellToPixel(f.x1, f.y1);
      const { px: x2, py: y2 } = cellToPixel(f.x2, f.y2);
      ctx.strokeStyle = color;
      ctx.globalAlpha = a;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (f.type === 'firerain') {
      const a = Math.max(0, f.timer / G.fx.firerain);
      const { px, py } = cellToPixel(f.x, f.y);
      ctx.fillStyle = `rgba(255,140,40,${0.55 * a})`;
      ctx.beginPath();
      ctx.arc(px, py, f.r * G.cellSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.type === 'sweep') {
      const a = Math.max(0, f.timer / G.fx.sweep);
      const { px, py } = cellToPixel(f.x, f.y);
      ctx.fillStyle = `rgba(255,230,80,${0.55 * a})`;
      ctx.beginPath();
      ctx.arc(px, py, f.r * G.cellSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.type === 'newNestRing') {
      const prog = 1 - f.timer / f.duration;     // 0→1
      const a = Math.max(0, f.timer / f.duration);
      const { px, py } = cellToPixel(f.x, f.y);
      ctx.strokeStyle = G.colors.newNestRing;
      ctx.globalAlpha = a;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(px, py, 14 + prog * 48, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    } else if (f.type === 'glueDrop') {
      const prog = 1 - f.timer / f.duration;  // 0→1
      const a = Math.max(0, f.timer / f.duration);
      const { px, py } = cellToPixel(f.x, f.y);
      ctx.fillStyle = `rgba(241,196,15,${a})`;
      ctx.strokeStyle = `rgba(0,0,0,${a})`;
      ctx.lineWidth = 2;
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const dy = -18 * prog;
      ctx.strokeText(`+${f.amount}`, px, py + dy);
      ctx.fillText(`+${f.amount}`, px, py + dy);
    } else if (f.type === 'lightning') {
      // v5: 锯齿状闪电折线
      const a = Math.max(0, f.timer / G.fx.lightning);
      const { px: x1, py: y1 } = cellToPixel(f.x1, f.y1);
      const { px: x2, py: y2 } = cellToPixel(f.x2, f.y2);
      ctx.strokeStyle = G.colors.lightning;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const segs = 6;
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        const mx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 14;
        const my = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 14;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    } else if (f.type === 'heal') {
      // v5: 绿色光环
      const a = Math.max(0, f.timer / G.fx.heal);
      const prog = 1 - f.timer / G.fx.heal;
      const { px, py } = cellToPixel(f.x, f.y);
      ctx.strokeStyle = G.colors.heal;
      ctx.globalAlpha = a;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(px, py, 18 + prog * 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
    } else if (f.type === 'mageBlast') {
      // v5: 法师塔 AOE
      const a = Math.max(0, f.timer / 0.25);
      const { px, py } = cellToPixel(f.x, f.y);
      ctx.fillStyle = `rgba(155,89,182,${0.55 * a})`;
      ctx.beginPath();
      ctx.arc(px, py, f.r * G.cellSize, 0, Math.PI * 2);
      ctx.fill();
    } else if (f.type === 'fogAttackArc') {
      // v6.1 §3: 迷雾敌人攻击瞬间 → 白色短弧（300ms 淡出）
      const dur = f.duration || 0.3;
      const a = Math.max(0, f.timer / dur);
      const { px: x1, py: y1 } = cellToPixel(f.x1, f.y1);
      const { px: x2, py: y2 } = cellToPixel(f.x2, f.y2);
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      // 中点抬高画弧
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 14;
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(mx, my, x2, y2);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else if (f.type === 'spikePulse') {
      // v6.1 §3: 减速地刺触发的绿色脉冲
      const dur = f.duration || G.fog.spikePulseDuration;
      const prog = 1 - f.timer / dur;
      const a = Math.max(0, f.timer / dur);
      const { px, py } = cellToPixel(f.x, f.y);
      ctx.fillStyle = `rgba(22,160,133,${0.55 * a})`;
      ctx.beginPath();
      ctx.arc(px, py, 6 + prog * 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = `rgba(22,160,133,${0.85 * a})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 6 + prog * 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1;
    } else if (f.type === 'spikeBreak') {
      // v6 §3: 减速地刺次数耗尽碎裂动画 —— 三角碎片向外扩散 + 淡出
      const dur = f.duration || G.fx.spikeBreak;
      const prog = 1 - f.timer / dur;             // 0 → 1
      const a = Math.max(0, f.timer / dur);
      const { px, py } = cellToPixel(f.x, f.y);
      ctx.globalAlpha = a;
      ctx.fillStyle = G.colors.slowSpike || '#16A085';
      const radius = 6 + prog * 22;
      for (let i = 0; i < 6; i++) {
        const ang = (Math.PI * 2 * i) / 6 + prog * 0.6;
        const cx = px + Math.cos(ang) * radius;
        const cy = py + Math.sin(ang) * radius;
        ctx.beginPath();
        ctx.moveTo(cx, cy - 4);
        ctx.lineTo(cx + 4, cy + 3);
        ctx.lineTo(cx - 4, cy + 3);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}
