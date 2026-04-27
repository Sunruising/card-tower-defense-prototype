// data/cards.js —— v6: 14 张卡定义 + rarity 字段
//
// targetType:
//   'ground'   —— 选地块（v6 治疗术也改为 ground）
//   'self'     —— 立即对自身（英雄）释放
//   'global'   —— 立即全局
//   'enemy'    —— 选敌方虫子
window.CARD_DEFS = {
  // ===== 生产 =====
  collector: {
    id: 'collector', name: '基础采胶器', type: 'building', subtype: 'collector',
    cost: 20, targetType: 'ground', rarity: 'normal',
    description: '基础采胶器：每 4s 产 1 胶（0.25/s），hp 20',
  },
  reinforced_collector: {
    id: 'reinforced_collector', name: '加固采胶器', type: 'building', subtype: 'reinforced_collector',
    cost: 35, targetType: 'ground', rarity: 'rare',
    description: '加固采胶器：10s 暖机后每 2s 产 1 胶（0.5/s），hp 40',
  },
  watchtower: {
    id: 'watchtower', name: '瞭望塔', type: 'building', subtype: 'watchtower',
    cost: 15, targetType: 'ground', rarity: 'rare',
    description: '**驱散**周围 3 格半径迷雾（永久），hp 25',
  },
  searchlight: {
    id: 'searchlight', name: '探照灯', type: 'building', subtype: 'searchlight',
    cost: 25, targetType: 'ground', rarity: 'normal',
    description: '探照灯：选定方向后缓慢**驱散** 90° 锥形迷雾（每 1.5s 一格，优先离基地近的），射程 6 格，hp 30',
  },

  // ===== 军事 =====
  tower: {
    id: 'tower', name: '箭塔', type: 'building', subtype: 'tower',
    cost: 30, targetType: 'ground', rarity: 'normal',
    description: '箭塔：射程 2，1s 1 发，4 伤，hp 40',
  },
  mage_tower: {
    id: 'mage_tower', name: '法师塔', type: 'building', subtype: 'mage_tower',
    cost: 45, targetType: 'ground', rarity: 'rare',
    description: '法师塔：射程 2.5，1.6s 一发 AOE（1 格半径），8 伤，hp 35',
  },
  slow_spike: {
    id: 'slow_spike', name: '减速地刺', type: 'building', subtype: 'slow_spike',
    cost: 20, targetType: 'ground', rarity: 'rare',
    description: '减速地刺：站上去的虫子移速 ×0.5，离开 1.5s 后失效',
  },
  barracks: {
    id: 'barracks', name: '剑士营', type: 'building', subtype: 'barracks',
    cost: 40, targetType: 'ground', rarity: 'normal',
    description: '剑士营：维持 2 剑士，死亡 10 秒补，hp 50',
  },

  // ===== 法术 =====
  firerain: {
    id: 'firerain', name: '火雨', type: 'spell',
    cost: 25, targetType: 'ground', rarity: 'normal',
    description: '指定地块 2 格半径内虫子受 20 伤害',
  },
  repair: {
    id: 'repair', name: '加急建造', type: 'spell',
    cost: 10, targetType: 'global', rarity: 'normal',
    description: '所有己方建筑血量回满',
  },
  scout: {
    id: 'scout', name: '侦察兵', type: 'spell',
    cost: 15, targetType: 'ground', rarity: 'normal',
    description: '**点亮**指定区域 30 秒（沿途 + 抵达后）',
  },
  heal: {
    id: 'heal', name: '治疗术', type: 'spell',
    cost: 15, targetType: 'ground', rarity: 'rare',
    description: '指定地块 1 格半径 AOE，建筑 +30 hp，核心 +15 hp',
  },
  lightning: {
    id: 'lightning', name: '闪电', type: 'spell',
    cost: 20, targetType: 'enemy', rarity: 'epic',
    description: '选中一只虫子，造成 25 伤害',
  },
  recall: {
    id: 'recall', name: '召回令', type: 'spell',
    cost: 10, targetType: 'global', rarity: 'epic',
    description: '英雄立即返回基地（中断出征）',
  },

  // ===== v7 特殊卡（仅从发现点获得，不入商店/卡包）=====
  ancient_wall: {
    id: 'ancient_wall', name: '古老的石墙', type: 'building', subtype: 'ancient_wall',
    cost: 0, targetType: 'ground', rarity: 'special',
    description: '建造一座 200 hp 的墙体，挡住虫子寻路；无攻击',
  },
  bug_signal: {
    id: 'bug_signal', name: '虫族信号灯', type: 'spell',
    cost: 0, targetType: 'global', rarity: 'special',
    description: '永久揭示一个最近虫巢周围 3 格的迷雾',
  },
  time_glass: {
    id: 'time_glass', name: '时间沙漏', type: 'spell',
    cost: 0, targetType: 'global', rarity: 'special',
    description: '把当前阶段的剩余时间倒回 30 秒',
  },

  // ===== 英雄技能（独立槽位）=====
  sweep: {
    id: 'sweep', name: '扫击', type: 'hero_skill',
    cost: 0, targetType: 'self', rarity: 'normal',
    description: '英雄周围 1.5 格内敌人受 30 伤害（self_centered）',
  },
};
