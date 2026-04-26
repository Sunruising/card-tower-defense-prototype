# 卡牌塔防最小原型

HTML + Canvas + Vanilla JS 零依赖的小型卡牌塔防原型。玩家在 21×13 迷雾地图上守住中央核心，撑过血月即视为胜利。

## 如何运行

直接用浏览器（Chrome / Safari / Firefox）打开 `index.html` 即可，脚本全部为普通 `<script>`，支持 `file://` 协议。

如果浏览器策略拦截了本地脚本，启一个本地服务器：

```bash
cd /Users/hudi/Downloads/卡牌塔防原型
python3 -m http.server 8080
# 访问 http://localhost:8080/
```

## 核心玩法

- **虫巢**：地图上分布若干虫巢（普通 / 钢壳两种），每晚孵化虫子并向核心进攻；白天可派英雄出征攻打。击破虫巢会掉落礼盒，英雄走近自动拾取。
- **英雄与剑士**：英雄是唯一可控单位（夜晚带扫击技能），可派他出征攻打虫巢；兵营产剑士，作为前排站桩输出，兵营被毁后剑士成为自由剑士。
- **血月**：第 5 天进入血月夜，所有虫巢同步爆发刷出 Boss 级敌人；撑过血月即胜利。
- **进化因子与天赋树**：击杀积累进化因子，可以在天赋树里解锁永久或本局加成，引导出不同的 build 方向。
- **迷雾**：地图大部分被迷雾覆盖，只有己方建筑/单位附近才可见；探照灯、侦察兵等手段可以临时驱散或永久点亮区域，未点亮的格子无法落卡。

## 操作

| 操作 | 键位 / 鼠标 |
|---|---|
| 暂停 / 继续 | 空格 |
| 直购普通卡 | 左键点顶栏商店按钮 |
| 打卡 | 左键点手牌（同名叠放） |
| 快捷打卡 | 数字键 `1`-`9` / `0`（对应手牌前 10 堆） |
| 释放扫击 | 左键点右下角技能槽（开局/复活立即可用、CD 25s） |
| 天赋面板 | `T` 切换 / 顶栏 🌟 按钮 / `ESC` 关闭 |
| 落点确认 | 左键点合法地块 |
| 探照灯方向 | 落点后选 ↑↓←→ 四向之一 |
| 取消放置 | 右键 / `ESC` |
| 出征 | 左键点虫巢 → 确认 |
| 拾取礼盒 | 左键点礼盒（或英雄自动拾取） |
| 拆除己方建筑 | 右键点击建筑 |
| 选中 / 聚焦 | 左键点击单位或建筑 |

## 目录结构

```
index.html
style.css
src/
  config.js              所有数值集中于此
  state.js               GameState + resetState
  main.js                主循环
  data/
    cards.js             卡牌定义
  entities/
    core.js  nest.js  bug.js  hero.js  swordsman.js
    buildings.js  scout.js  gift.js
  systems/
    phase.js   spawn.js   ai.js      combat.js
    cards.js   input.js   fog.js     searchlight.js
    talents.js
  render/
    map.js  ui.js  effects.js  dom_fx.js
```

## 数值调优

所有数值集中在 `src/config.js`。重点关注：

- `phaseDurations` 各阶段时长（白天 / 傍晚 / 夜晚 / 黎明 / 血月）
- `nest.bugCapByDay` 虫子上限阶梯
- `cardPools[*].cost` 抽卡 / 商店消耗
- `tower.attackRange` / `damage` 箭塔 DPS
- `hero.marchSpeed` / `damage` 英雄出征节奏
- `bug.glueDrop` / `boss.glueDrop` 胶质经济
- `fog` / `searchlight` 迷雾与探照灯参数
- `talents` 天赋树加成
