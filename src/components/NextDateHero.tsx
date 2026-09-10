'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { activityOf } from '@/lib/activities'
import {
  countdownOf,
  formatMoney,
  friendlyTime,
  formatFullDate,
  preciseCountdown,
  weekdayCN,
} from '@/lib/datetime'
import type { DateItem } from '@/lib/types'

/** 每秒滴答一次的实时倒计时（只在约会就在今天且有具体时间时显示） */
function usePrecise(item: DateItem): string | null {
  const [text, setText] = useState<string | null>(() =>
    preciseCountdown(item.dateOn, item.timeAt),
  )

  useEffect(() => {
    if (!item.timeAt) {
      setText(null)
      return
    }
    const tick = () => setText(preciseCountdown(item.dateOn, item.timeAt))
    tick()
    const timer = setInterval(tick, 30_000)
    return () => clearInterval(timer)
  }, [item.dateOn, item.timeAt])

  return text
}

export function NextDateHero({ item }: { item: DateItem }) {
  const act = activityOf(item.activity)
  const cd = countdownOf(item.dateOn)
  const precise = usePrecise(item)
  const money = formatMoney(item.budget)
  const time = friendlyTime(item.timeAt)

  const isToday = cd.kind === 'today'

  return (
    <Link
      href={`/dates/${item.id}`}
      className="card card-tap animate-scale-in relative block overflow-hidden p-5"
    >
      {/* 柔和渐变背景 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: isToday
            ? 'linear-gradient(135deg, #FDEEF1 0%, #FFFBF8 58%, #FBF4EE 100%)'
            : 'linear-gradient(135deg, #FFF6F2 0%, #FFFBF8 52%, #FDF3F6 100%)',
        }}
      />
      {/* 活动大 emoji 作为背景装饰 */}
      <span
        className="pointer-events-none absolute -top-3 -right-2 text-[86px] leading-none opacity-[0.07] select-none"
        aria-hidden="true"
      >
        {act.emoji}
      </span>

      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="chip bg-white/80 text-ink-2 shadow-soft">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
            下一次约会
          </span>
        </div>

        <p className="mt-4 font-serif text-[19px] leading-snug text-ink">
          {cd.kind === 'past' ? '这次约会还没标记完成' : cd.text}
          {cd.kind !== 'past' ? (
            <span className="animate-beat ml-1 inline-block">❤️</span>
          ) : null}
        </p>

        {precise && cd.days <= 1 ? (
          <p className="tabular mt-1.5 text-[12px] text-ink-3">还有 {precise}</p>
        ) : null}

        <h2 className="mt-4 text-[20px] leading-snug font-semibold tracking-tight text-ink">
          {item.title}
        </h2>

        <dl className="mt-3.5 space-y-1.5 text-[13px] text-ink-2">
          <div className="flex items-center gap-2">
            <dt className="sr-only">日期</dt>
            <span aria-hidden="true">🗓</span>
            <dd className="tabular">
              {formatFullDate(item.dateOn)} · {weekdayCN(item.dateOn)}
              {time ? ` · ${time}` : ''}
            </dd>
          </div>

          {item.place ? (
            <div className="flex items-center gap-2">
              <dt className="sr-only">地点</dt>
              <span aria-hidden="true">📍</span>
              <dd className="truncate">{item.place}</dd>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <dt className="sr-only">活动</dt>
            <span aria-hidden="true">{act.emoji}</span>
            <dd>
              {act.label}
              {money ? <span className="text-ink-3"> · 预计 {money}</span> : null}
            </dd>
          </div>
        </dl>

        {item.note ? (
          <p className="mt-3.5 line-clamp-2 rounded-2xl bg-white/70 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-2">
            {item.note}
          </p>
        ) : null}
      </div>
    </Link>
  )
}
