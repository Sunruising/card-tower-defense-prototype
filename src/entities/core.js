// entities/core.js —— 核心建筑
// 核心作为 state.core 直接存在，这里提供若干辅助
function damageCore(amount) {
  S.core.hp -= amount;
  S.core.lastCombatAt = performance.now();   // v6: 标记脱战起点
  if (S.core.hp <= 0) {
    S.core.hp = 0;
    S.defeat = true;
    S.gameOver = true;
  }
}

// v6: 治疗核心（被治疗术 AOE 调用）
function healCore(amount) {
  if (S.core.hp >= S.core.maxHp) return;
  S.core.hp = Math.min(S.core.maxHp, S.core.hp + amount);
}
