'use client'

import Link from 'next/link'
import { useMemo } from 'react'

import { useApp } from '@/components/AppProvider'
import { DateCard } from '@/components/DateCard'
import { IconChevronRight, IconPlus, IconSparkles } from '@/components/Icons'
import { NextDateHero } from '@/components/NextDateHero'
import { Button, EmptyState, Screen, SectionTitle } from '@/components/ui'
import { APP_SLOGAN } from '@/lib/config'
import { groupDates, pickNextDate } from '@/lib/selectors'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早上好'
  if (h < 13) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

function StatTile({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="card flex flex-col items-center px-2 py-3.5">
      <p className="tabular flex items-baseline gap-0.5 text-ink">
        <span className="text-[19px] leading-none font-semibold">{value}</span>
        {unit ? <span className="text-[11px] font-medium text-ink-3">{unit}</span> : null}
      </p>
      <p className="mt-1.5 text-[11px] text-ink-3">{label}</p>
    </div>
  )
}

export default function HomePage() {
  const { me, partner, space, members, dates, stats, ideas } = useApp()

  const next = useMemo(() => pickNextDate(dates), [dates])
  const { upcoming, missed } = useMemo(() => groupDates(dates), [dates])
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const showAuthor = members.length > 1

  const rest = useMemo(() => {
    const list = [...missed, ...upcoming]
    return next ? list.filter((d) => d.id !== next.id) : list
  }, [missed, upcoming, next])

  return (
    <Screen className="pt-3">
      {/* ---------------------------------------------------------- 顶部问候 */}
      <header className="animate-fade-up pt-4 pb-1">
        <p className="text-[12.5px] text-ink-3">
          {greeting()}
          {me?.displayName ? `，${me.displayName}` : ''}
          {partner ? ` 和 ${partner.displayName}` : ''}
        </p>
        <h1 className="text-balance mt-2 font-serif text-[22px] leading-relaxed tracking-tight text-ink">
          {space?.slogan?.trim() || APP_SLOGAN}
        </h1>
        {space?.name ? (
          <p className="mt-2 text-[12px] text-ink-3">{space.name}</p>
        ) : null}
      </header>

      {/* ------------------------------------------------------ 等待另一半加入 */}
      {members.length < 2 ? (
        <Link href="/me" className="card card-tap animate-fade-up mt-5 flex items-center gap-3 p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush text-accent">
            <IconSparkles className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-medium text-ink">Ta 还没有加入</span>
            <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-3">
              去「我的」页面把邀请码或二维码发给 Ta 吧
            </span>
          </span>
          <IconChevronRight className="h-4 w-4 shrink-0 text-ink-4" />
        </Link>
      ) : null}

      {/* ---------------------------------------------------------- 下一次约会 */}
      <div className="mt-5">
        {next ? (
          <NextDateHero item={next} />
        ) : (
          <EmptyState
            emoji="🗓"
            title="还没有约会计划"
            description="想想最近想去哪儿，先定下来一个吧。"
            action={
              <Link href="/dates/new">
                <Button>
                  <IconPlus className="h-4 w-4" />
                  新建一次约会
                </Button>
              </Link>
            }
          />
        )}
      </div>

      {/* -------------------------------------------------------------- 快捷入口 */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Link
          href="/dates/new"
          className="card card-tap flex items-center justify-center gap-2 py-3.5 text-[13px] font-medium text-ink"
        >
          <IconPlus className="h-4 w-4 text-accent" />
          新建约会
        </Link>
        <Link
          href="/play"
          className="card card-tap flex items-center justify-center gap-2 py-3.5 text-[13px] font-medium text-ink"
        >
          <IconSparkles className="h-4 w-4 text-accent" />
          今天想做什么
        </Link>
      </div>

      {/* ---------------------------------------------------------------- 我们的数据 */}
      <SectionTitle>我们的数据</SectionTitle>
      <div className="stagger grid grid-cols-3 gap-2.5">
        <StatTile
          value={stats.daysTogether != null ? String(stats.daysTogether) : '—'}
          unit={stats.daysTogether != null ? '天' : undefined}
          label="在一起"
        />
        <StatTile value={String(stats.total)} unit="次" label="约会总数" />
        <StatTile value={String(stats.done)} unit="次" label="已完成" />
      </div>
      {stats.daysTogether == null ? (
        <p className="mt-2 px-1 text-[11.5px] text-ink-3">
          在「我的」里填上你们在一起的日子，就能看到在一起多少天了
        </p>
      ) : null}

      {/* ---------------------------------------------------------------- 近期安排 */}
      <SectionTitle
        action={
          dates.length > 0 ? (
            <Link
              href="/dates"
              className="inline-flex items-center gap-0.5 text-[12px] text-ink-3 transition hover:text-ink-2"
            >
              全部 {dates.length} 次
              <IconChevronRight className="h-3.5 w-3.5" />
            </Link>
          ) : null
        }
      >
        近期安排
      </SectionTitle>

      {rest.length > 0 ? (
        <div className="stagger space-y-2.5">
          {rest.slice(0, 4).map((item) => {
            const author = memberMap.get(item.createdBy)
            return (
              <DateCard
                key={item.id}
                item={item}
                authorName={showAuthor ? author?.displayName : undefined}
                authorEmoji={showAuthor ? author?.emoji : undefined}
              />
            )
          })}
        </div>
      ) : (
        <div className="card px-5 py-7 text-center">
          <p className="text-[13px] text-ink-2">
            {dates.length === 0 ? '还没有任何约会记录' : '暂时没有更多安排啦'}
          </p>
          <p className="mt-1.5 text-[12px] text-ink-3">
            {ideas.length > 0
              ? `灵感的清单里躺着 ${ideas.length} 个想法，去「互动」抽一个吧`
              : '去「互动」里加几个想一起做的事吧'}
          </p>
          <div className="mt-4 flex justify-center">
            <Link href="/play">
              <Button variant="ghost" size="sm">
                <IconSparkles className="h-4 w-4" />
                去互动看看
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Screen>
  )
}
