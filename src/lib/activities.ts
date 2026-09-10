import type { ActivityKey } from './types'

export interface ActivityMeta {
  key: ActivityKey
  label: string
  emoji: string
  /** 卡片上的柔和底色 */
  tint: string
  /** 文字/描边强调色 */
  ink: string
}

/**
 * 活动类型。刻意使用低饱和度的莫兰迪色调，
 * 让每种活动有辨识度但不会破坏整体的奶油色系。
 */
export const ACTIVITIES: ActivityMeta[] = [
  { key: 'eat', label: '吃饭', emoji: '🍜', tint: '#FDF0E6', ink: '#B4703C' },
  { key: 'movie', label: '看电影', emoji: '🎬', tint: '#EDEFF7', ink: '#5A6489' },
  { key: 'coffee', label: '咖啡', emoji: '☕️', tint: '#F5EDE4', ink: '#8A6242' },
  { key: 'walk', label: '散步', emoji: '🌳', tint: '#EAF1EA', ink: '#557A5C' },
  { key: 'play', label: '游玩', emoji: '🎡', tint: '#FDEDF1', ink: '#B25A72' },
  { key: 'travel', label: '旅行', emoji: '✈️', tint: '#E9F1F4', ink: '#4E7A8A' },
  { key: 'surprise', label: '惊喜', emoji: '🎁', tint: '#F9EDF5', ink: '#94567F' },
  { key: 'other', label: '其他', emoji: '🤍', tint: '#F3EFEC', ink: '#7B6E75' },
]

const ACTIVITY_MAP = new Map(ACTIVITIES.map((a) => [a.key, a]))

export function activityOf(key: string | null | undefined): ActivityMeta {
  return ACTIVITY_MAP.get((key ?? 'other') as ActivityKey) ?? ACTIVITY_MAP.get('other')!
}

export function isActivityKey(v: string): v is ActivityKey {
  return ACTIVITY_MAP.has(v as ActivityKey)
}
