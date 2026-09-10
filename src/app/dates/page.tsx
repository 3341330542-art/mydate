'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

import { useApp } from '@/components/AppProvider'
import { DateCard } from '@/components/DateCard'
import { IconPlus } from '@/components/Icons'
import { Button, EmptyState, Screen, TopBar } from '@/components/ui'
import { groupDates } from '@/lib/selectors'
import type { DateItem } from '@/lib/types'

type Tab = 'planned' | 'done' | 'all'

const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'planned', label: '待赴约' },
  { key: 'done', label: '已完成' },
  { key: 'all', label: '全部' },
]

function SectionHeading({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="mt-6 mb-2.5 flex items-baseline gap-2 px-0.5 first:mt-0">
      <h2 className="text-[13px] font-semibold tracking-tight text-ink-2">{children}</h2>
      {count != null ? <span className="tabular text-[11px] text-ink-4">{count}</span> : null}
    </div>
  )
}

export default function DatesPage() {
  const { dates, members } = useApp()
  const [tab, setTab] = useState<Tab>('planned')

  const groups = useMemo(() => groupDates(dates), [dates])
  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const showAuthor = members.length > 1

  const counts = {
    planned: groups.upcoming.length + groups.missed.length,
    done: groups.done.length,
    all: dates.length,
  }

  function renderList(list: DateItem[]) {
    return (
      <div className="stagger space-y-2.5">
        {list.map((item) => {
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
    )
  }

  const plannedFlat = [...groups.missed, ...groups.upcoming]
  const hidden = counts[tab] === 0

  return (
    <>
      <Screen className="pt-3">
        <TopBar title="我们的约会" subtitle={`一共 ${dates.length} 次`} />

        {/* 筛选 */}
        <div className="mb-4 flex rounded-2xl bg-cream-2 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-medium transition-all duration-250 ${
                tab === t.key ? 'bg-white text-ink shadow-soft' : 'text-ink-3'
              }`}
            >
              {t.label}
              <span className="tabular text-[10.5px] text-ink-4">{counts[t.key]}</span>
            </button>
          ))}
        </div>

        {dates.length === 0 ? (
          <EmptyState
            emoji="📖"
            title="还没有约会记录"
            description="把想一起去的地方、想一起做的事记下来，慢慢变成回忆。"
            action={
              <Link href="/dates/new">
                <Button>
                  <IconPlus className="h-4 w-4" />
                  新建一次约会
                </Button>
              </Link>
            }
          />
        ) : tab === 'all' ? (
          <>
            {groups.missed.length > 0 ? (
              <>
                <SectionHeading count={groups.missed.length}>已经过去，还没标记完成</SectionHeading>
                {renderList(groups.missed)}
              </>
            ) : null}
            {groups.upcoming.length > 0 ? (
              <>
                <SectionHeading count={groups.upcoming.length}>即将到来</SectionHeading>
                {renderList(groups.upcoming)}
              </>
            ) : null}
            {groups.done.length > 0 ? (
              <>
                <SectionHeading count={groups.done.length}>已完成</SectionHeading>
                {renderList(groups.done)}
              </>
            ) : null}
          </>
        ) : hidden ? (
          <EmptyState
            emoji={tab === 'done' ? '🌿' : '🕊️'}
            title={tab === 'done' ? '还没有完成的约会' : '暂时没有待赴约的安排'}
            description={
              tab === 'done'
                ? '去完成一次约会，这里就会留下记录。'
                : '不妨现在就计划一次吧。'
            }
            action={
              tab === 'planned' ? (
                <Link href="/dates/new">
                  <Button>
                    <IconPlus className="h-4 w-4" />
                    新建一次约会
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          renderList(tab === 'done' ? groups.done : plannedFlat)
        )}
      </Screen>

      {/* 新建按钮 */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-40">
        <div className="mx-auto flex w-full max-w-[30rem] justify-end px-5">
          <Link
            href="/dates/new"
            aria-label="新建约会"
            className="btn btn-primary pointer-events-auto h-14 w-14 shadow-glow"
          >
            <IconPlus className="h-6 w-6" />
          </Link>
        </div>
      </div>
    </>
  )
}
