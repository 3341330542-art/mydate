/** 内置的约会建议文案，用于「今天想做什么」（不需要联网，也不占数据库） */

export interface BuiltinIdea {
  emoji: string
  text: string
}

export const BUILTIN_IDEAS: BuiltinIdea[] = [
  { emoji: '🍜', text: '今晚一起去吃一碗热乎的拉面吧' },
  { emoji: '☕️', text: '一起散散步，顺手买两杯咖啡' },
  { emoji: '🎬', text: '窝在沙发里看一部老电影' },
  { emoji: '🍳', text: '一起做一顿晚饭，谁洗碗用猜拳决定' },
  { emoji: '🌇', text: '去天台或者江边看一次日落' },
  { emoji: '📚', text: '找一家安静的书店，各看各的' },
  { emoji: '🍰', text: '去买一块想吃了很久的蛋糕' },
  { emoji: '🚲', text: '骑车沿着河边随便晃一圈' },
  { emoji: '🎧', text: '交换一副耳机，一起听完一首歌' },
  { emoji: '🛒', text: '一起去超市，把购物车填满' },
  { emoji: '🌸', text: '去公园走走，看看最近开了什么花' },
  { emoji: '🍢', text: '找条夜市小摊，从街头吃到街尾' },
  { emoji: '🎨', text: '一起画一张彼此的样子' },
  { emoji: '🧋', text: '点两杯奶茶，猜对方会选什么口味' },
  { emoji: '🏠', text: '什么都不做，就赖在一起待一整天' },
  { emoji: '📷', text: '用拍立得记录今天的样子' },
  { emoji: '🎡', text: '去游乐园坐一次摩天轮' },
  { emoji: '🍦', text: '分吃一个冰淇淋，你吃脆筒我吃球' },
  { emoji: '🛁', text: '一起泡个脚，聊聊这周发生的事' },
  { emoji: '🌌', text: '找个没有灯的地方看星星' },
  { emoji: '🥐', text: '早起一次，去吃一顿慢慢的早餐' },
  { emoji: '🎤', text: '去 KTV 把对方最爱的歌都唱一遍' },
  { emoji: '🧩', text: '一起拼一幅拼图，输的人买夜宵' },
  { emoji: '💌', text: '给对方写一封手写信' },
  { emoji: '🚗', text: '随机上一辆车，坐到终点站再回来' },
  { emoji: '🕯️', text: '关掉大灯，点一支蜡烛吃顿晚饭' },
  { emoji: '🍿', text: '去看一场午夜场电影' },
  { emoji: '🐾', text: '去猫咖待一下午，被猫包围' },
  { emoji: '🧺', text: '去草坪野餐，带一块格子布' },
  { emoji: '📝', text: '一起写一张「今年想一起做的事」清单' },
]

/** 添加灵感时可以快速选择的 emoji */
export const IDEA_EMOJIS = [
  '✨', '🍜', '☕️', '🎬', '🌳', '🎡', '✈️', '🎁', '🍰', '🧋',
  '🌇', '🏠', '🎧', '📷', '🛒', '🍢', '🌸', '🚲', '💌', '🕯️',
]
