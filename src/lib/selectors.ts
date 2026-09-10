import { ACTIVITIES } from './activities'
import { daysTogether, todayISO } from './datetime'
import type { DateItem, Stats } from './types'

/** 按日期、时间排序（早的在前） */
export function sortByDateAsc(a: DateItem, b: DateItem): number {
  const c = a.dateOn.localeCompare(b.dateOn)
  if (c !== 0) return c
  return (a.timeAt ?? '99:99').localeCompare(b.timeAt ?? '99:99')
}

/** 按日期倒序（新的在前） */
export function sortByDateDesc(a: DateItem, b: DateItem): number {
  return -sortByDateAsc(a, b)
}

/**
 * 选出「下一次约会」：
 *   1. 优先取今天及以后、还没完成的、最近的那一次；
 *   2. 如果没有未来的计划，但存在已经过去却没标记完成的，就返回最近的那一次，
 *      提示用户去处理（标记完成或者改期）。
 */
export function pickNextDate(dates: DateItem[]): DateItem | null {
  const planned = dates.filter((d) => d.status === 'planned')
  if (planned.length === 0) return null

  const today = todayISO()
  const upcoming = planned.filter((d) => d.dateOn >= today).sort(sortByDateAsc)
  if (upcoming.length > 0) return upcoming[0]

  return planned.slice().sort(sortByDateDesc)[0]
}

export interface DateGroups {
  upcoming: DateItem[]
  done: DateItem[]
  missed: DateItem[]
}

/** 把约会分成「即将到来 / 已完成 / 已过期未完成」三组 */
export function groupDates(dates: DateItem[]): DateGroups {
  const today = todayISO()
  const upcoming: DateItem[] = []
  const done: DateItem[] = []
  const missed: DateItem[] = []

  for (const d of dates) {
    if (d.status === 'done') done.push(d)
    else if (d.dateOn < today) missed.push(d)
    else upcoming.push(d)
  }

  upcoming.sort(sortByDateAsc)
  missed.sort(sortByDateDesc)
  done.sort(sortByDateDesc)

  return { upcoming, done, missed }
}

export function computeStats(dates: DateItem[], anniversary: string | null): Stats {
  const total = dates.length
  const doneList = dates.filter((d) => d.status === 'done')
  const done = doneList.length

  // 金额一律收敛到两位小数，避免浮点相加出现 ¥0.30000000000000004
  const sum = (list: DateItem[]) =>
    Math.round(list.reduce((s, d) => s + (d.budget ?? 0), 0) * 100) / 100

  const byActivity = ACTIVITIES.map((a) => ({
    key: a.key,
    count: dates.filter((d) => d.activity === a.key).length,
  })).filter((x) => x.count > 0)

  return {
    daysTogether: daysTogether(anniversary),
    total,
    done,
    planned: total - done,
    spent: sum(doneList),
    plannedSpend: sum(dates.filter((d) => d.status === 'planned')),
    byActivity,
  }
}

/** 「还有 3 天」「今天」这类超短标签 */
export function shortCountdown(dateOn: string): { label: string; tone: 'soon' | 'today' | 'past' } {
  const today = todayISO()
  if (dateOn === today) return { label: '今天', tone: 'today' }
  const diff = Math.round(
    (new Date(dateOn + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 86400000,
  )
  if (diff > 0) return { label: `${diff} 天后`, tone: 'soon' }
  return { label: `${Math.abs(diff)} 天前`, tone: 'past' }
}
