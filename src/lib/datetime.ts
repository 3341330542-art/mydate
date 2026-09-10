/**
 * 日期 / 时间工具。
 *
 * 全部按「本地时区」处理，并且手动解析 'YYYY-MM-DD'，
 * 避免 new Date('2026-03-14') 被当成 UTC 午夜而在某些时区偏移一天。
 */

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'] as const

/** 'YYYY-MM-DD' → 本地时间的 Date（当天 00:00） */
export function parseDay(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISODate(new Date())
}

/** 今天 00:00（本地） */
function startOfToday(): Date {
  const n = new Date()
  return new Date(n.getFullYear(), n.getMonth(), n.getDate())
}

/** 两个 'YYYY-MM-DD'（或 Date）之间相差的整天数，b - a */
export function diffDays(a: string | Date, b: string | Date): number {
  const da = typeof a === 'string' ? parseDay(a) : new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const db = typeof b === 'string' ? parseDay(b) : new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((db.getTime() - da.getTime()) / 86400000)
}

/** 距离某个约会还有几天：正数=未来，0=今天，负数=已过去 */
export function daysFromToday(iso: string): number {
  return diffDays(startOfToday(), parseDay(iso))
}

export function weekdayCN(iso: string): string {
  return WEEKDAYS[parseDay(iso).getDay()]
}

/** '2026-03-14' → '3月14日' */
export function formatMonthDay(iso: string): string {
  const d = parseDay(iso)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

/** '2026-03-14' → '2026年3月14日' */
export function formatFullDate(iso: string): string {
  const d = parseDay(iso)
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

/** '2026-03-14' → '03/14' */
export function formatShortDate(iso: string): string {
  const d = parseDay(iso)
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
}

/** 日期卡片左侧的「日」数字 */
export function dayNumber(iso: string): string {
  return String(parseDay(iso).getDate()).padStart(2, '0')
}

/** 日期卡片左侧的「月」 */
export function monthLabel(iso: string): string {
  return `${parseDay(iso).getMonth() + 1}月`
}

/** 'HH:MM:SS' | 'HH:MM' | null → 'HH:MM' | null */
export function normalizeTime(v: string | null | undefined): string | null {
  if (!v) return null
  const m = /^(\d{1,2}):(\d{2})/.exec(v.trim())
  if (!m) return null
  return `${m[1].padStart(2, '0')}:${m[2]}`
}

/** '19:30' → '晚上 7:30' 之类的口语化描述 */
export function friendlyTime(t: string | null): string | null {
  if (!t) return null
  const [hs, ms] = t.split(':')
  const h = Number(hs)
  const period = h < 5 ? '凌晨' : h < 11 ? '早上' : h < 13 ? '中午' : h < 18 ? '下午' : '晚上'
  const h12 = h % 12 === 0 ? 12 : h % 12
  const minute = ms === '00' ? '' : `:${ms}`
  return `${period} ${h12}${minute}`
}

export type CountdownKind = 'today' | 'tomorrow' | 'future' | 'past'

export interface Countdown {
  kind: CountdownKind
  /** 距离今天的天数差，未来为正 */
  days: number
  /** 默认展示文案 */
  text: string
  /** 用于卡片上的超短标签 */
  short: string
}

/** 倒计时文案：例如「距离我们的下一次约会还有 3 天 ❤️」 */
export function countdownOf(iso: string): Countdown {
  const days = daysFromToday(iso)

  if (days === 0) {
    return { kind: 'today', days, text: '就是今天呀 ❤️', short: '今天' }
  }
  if (days === 1) {
    return { kind: 'tomorrow', days, text: '明天就能见到你啦 ❤️', short: '明天' }
  }
  if (days > 1) {
    return {
      kind: 'future',
      days,
      text: `距离我们的下一次约会还有 ${days} 天 ❤️`,
      short: `${days} 天后`,
    }
  }
  const past = Math.abs(days)
  if (past === 1) {
    return { kind: 'past', days, text: '这次约会就在昨天', short: '昨天' }
  }
  return { kind: 'past', days, text: `这次约会已经过去 ${past} 天了`, short: `${past} 天前` }
}

/** 在一起的纪念日 → 「在一起的第 N 天」 */
export function daysTogether(anniversary: string | null | undefined): number | null {
  if (!anniversary) return null
  const n = diffDays(parseDay(anniversary), startOfToday())
  return n >= 0 ? n + 1 : null
}

/** 「3 天 4 小时 12 分」式的实时倒计时（用于今天的约会） */
export function preciseCountdown(iso: string, time: string | null): string | null {
  if (!time) return null
  const [h, m] = time.split(':').map(Number)
  const d = parseDay(iso)
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0)
  let ms = target.getTime() - Date.now()
  if (ms <= 0) return null
  const totalMin = Math.floor(ms / 60000)
  const days = Math.floor(totalMin / 1440)
  const hours = Math.floor((totalMin % 1440) / 60)
  const mins = totalMin % 60
  const parts: string[] = []
  if (days > 0) parts.push(`${days} 天`)
  if (hours > 0) parts.push(`${hours} 小时`)
  parts.push(`${mins} 分`)
  return parts.join(' ')
}

/** 「刚刚」「3 分钟前」「2 小时前」「3 天前」 */
export function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 2_592_000_000) return `${Math.floor(diff / 86_400_000)} 天前`
  return formatFullDate(toISODate(new Date(t)))
}

export function formatMoney(v: number | null | undefined): string | null {
  if (v === null || v === undefined) return null
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return null
  // 金额相加可能出现 0.30000000000000004 这类浮点噪声，统一收敛到两位小数
  const rounded = Math.round(n * 100) / 100
  return Number.isInteger(rounded) ? `¥${rounded}` : `¥${rounded.toFixed(2)}`
}
