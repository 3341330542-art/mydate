'use client'

import Link from 'next/link'

import { activityOf } from '@/lib/activities'
import { dayNumber, monthLabel, weekdayCN, friendlyTime } from '@/lib/datetime'
import { shortCountdown } from '@/lib/selectors'
import type { DateItem } from '@/lib/types'

export function StatusChip({ item }: { item: DateItem }) {
  if (item.status === 'done') {
    return (
      <span className="chip bg-done-tint text-done">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12.8 9.6 17.4 19 8" />
        </svg>
        已完成
      </span>
    )
  }

  const c = shortCountdown(item.dateOn)
  if (c.tone === 'today') return <span className="chip bg-accent text-white">今天</span>
  if (c.tone === 'past') return <span className="chip bg-cream-3 text-ink-3">{c.label}</span>
  return <span className="chip bg-blush text-accent-deep">{c.label}</span>
}

export function MemberDot({
  name,
  emoji,
  className = '',
}: {
  name: string
  emoji: string
  className?: string
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] text-ink-3 ${className}`}
      title={`${name} 添加的`}
    >
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cream-2 text-[9px]">
        {emoji}
      </span>
      {name}
    </span>
  )
}

export function DateCard({
  item,
  authorName,
  authorEmoji,
}: {
  item: DateItem
  authorName?: string
  authorEmoji?: string
}) {
  const act = activityOf(item.activity)
  const time = friendlyTime(item.timeAt)

  return (
    <Link href={`/dates/${item.id}`} className="card card-tap flex gap-3.5 p-4">
      <div
        className="flex w-[52px] shrink-0 flex-col items-center justify-center rounded-2xl py-2"
        style={{ background: act.tint }}
      >
        <span className="text-[10px] leading-none font-medium opacity-75" style={{ color: act.ink }}>
          {monthLabel(item.dateOn)}
        </span>
        <span
          className="tabular mt-1 text-[22px] leading-none font-semibold"
          style={{ color: act.ink }}
        >
          {dayNumber(item.dateOn)}
        </span>
        <span className="mt-1 text-[10px] leading-none opacity-70" style={{ color: act.ink }}>
          {weekdayCN(item.dateOn)}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3
            className={`min-w-0 flex-1 text-[15px] leading-snug font-semibold text-ink ${
              item.status === 'done' ? 'text-ink-2' : ''
            }`}
          >
            {item.title}
          </h3>
          <StatusChip item={item} />
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[12px] text-ink-3">
          <span className="inline-flex items-center gap-1">
            <span aria-hidden="true">{act.emoji}</span>
            {act.label}
          </span>
          {time ? <span className="inline-flex items-center gap-1">🕒 {time}</span> : null}
          {item.place ? (
            <span className="inline-flex min-w-0 items-center gap-1">
              <span aria-hidden="true">📍</span>
              <span className="truncate">{item.place}</span>
            </span>
          ) : null}
        </div>

        {authorName && authorEmoji ? (
          <div className="mt-2">
            <MemberDot name={authorName} emoji={authorEmoji} />
          </div>
        ) : null}
      </div>
    </Link>
  )
}
