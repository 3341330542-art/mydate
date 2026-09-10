'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { useApp } from '@/components/AppProvider'
import { Confetti } from '@/components/Confetti'
import { IconCheck, IconEdit, IconTrash, IconWarn } from '@/components/Icons'
import { StatusChip } from '@/components/DateCard'
import { useToast } from '@/components/Toast'
import { Button, ConfirmSheet, EmptyState, Screen, TopBar } from '@/components/ui'
import { activityOf } from '@/lib/activities'
import {
  countdownOf,
  formatFullDate,
  formatMoney,
  friendlyTime,
  relativeTime,
  weekdayCN,
} from '@/lib/datetime'
import { messageOf } from '@/lib/errors'

function InfoRow({
  icon,
  label,
  value,
  muted,
}: {
  icon: string
  label: string
  value: string
  muted?: boolean
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <span className="mt-0.5 w-5 shrink-0 text-center text-[14px]" aria-hidden="true">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11.5px] text-ink-3">{label}</p>
        <p
          className={`mt-0.5 text-[14px] leading-relaxed break-words ${
            muted ? 'text-ink-3' : 'text-ink'
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  )
}

export default function DateDetailPage() {
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === 'string' ? params.id : ''
  const router = useRouter()
  const toast = useToast()

  const { dates, members, updateDate, deleteDate, pending } = useApp()

  const item = useMemo(() => dates.find((d) => d.id === id) ?? null, [dates, id])
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [celebrate, setCelebrate] = useState(false)

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])

  if (!item) {
    return (
      <Screen className="pt-3">
        <TopBar title="约会详情" onBack={() => router.back()} />
        <EmptyState
          emoji="🍃"
          title="这次约会不见了"
          description="可能已经被删除了。"
          action={
            <Link href="/dates">
              <Button variant="ghost">回到约会列表</Button>
            </Link>
          }
        />
      </Screen>
    )
  }

  const act = activityOf(item.activity)
  const cd = countdownOf(item.dateOn)
  const time = friendlyTime(item.timeAt)
  const money = formatMoney(item.budget)
  const author = memberMap.get(item.createdBy)
  const editor = item.updatedBy ? memberMap.get(item.updatedBy) : null
  const isDone = item.status === 'done'

  async function handleToggleDone() {
    if (!item) return
    try {
      if (isDone) {
        await updateDate(item.id, { status: 'planned' })
        toast.show('已经改回待赴约')
      } else {
        await updateDate(item.id, { status: 'done' })
        setCelebrate(true)
        toast.success('这次约会完成啦')
      }
    } catch (err) {
      toast.error(messageOf(err))
    }
  }

  async function handleDelete() {
    if (!item) return
    try {
      await deleteDate(item.id)
      setConfirmDelete(false)
      toast.success('已经删除了')
      router.replace('/dates')
    } catch (err) {
      toast.error(messageOf(err))
    }
  }

  return (
    <Screen className="pt-3">
      <TopBar
        title="约会详情"
        onBack={() => router.back()}
        right={
          <Link
            href={`/dates/${item.id}/edit`}
            aria-label="编辑"
            className="flex h-10 w-10 items-center justify-center rounded-full text-ink-2 transition active:scale-90"
          >
            <IconEdit className="h-[20px] w-[20px]" />
          </Link>
        }
      />

      {/* ------------------------------------------------------------ 主卡片 */}
      <section className="card animate-scale-in relative overflow-hidden p-5">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28"
          style={{ background: `linear-gradient(180deg, ${act.tint} 0%, transparent 100%)` }}
        />
        <span
          className="pointer-events-none absolute -top-2 -right-1 text-[92px] leading-none opacity-[0.09] select-none"
          aria-hidden="true"
        >
          {act.emoji}
        </span>

        <div className="relative">
          <div className="flex items-center gap-2">
            <span
              className="chip"
              style={{ background: act.tint, color: act.ink }}
            >
              <span aria-hidden="true">{act.emoji}</span>
              {act.label}
            </span>
            <StatusChip item={item} />
          </div>

          <h1 className="text-balance mt-4 text-[22px] leading-snug font-semibold tracking-tight text-ink">
            {item.title}
          </h1>

          {!isDone ? (
            <p className="mt-2.5 font-serif text-[14px] text-ink-2">
              {cd.text}
              {cd.kind !== 'past' ? <span className="animate-beat ml-1 inline-block">❤️</span> : null}
            </p>
          ) : null}
        </div>
      </section>

      {/* ---------------------------------------------------------- 完成仪式感 */}
      {isDone ? (
        <section className="card animate-scale-in relative mt-3 overflow-hidden p-5 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'linear-gradient(135deg, #FDF1F4 0%, #FFFBF8 60%, #F3F6F3 100%)' }}
          />
          {celebrate ? <Confetti /> : null}
          <div className="relative">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-soft">
              <span className="text-[22px]" aria-hidden="true">
                {act.emoji}
              </span>
            </span>
            <p className="mt-3.5 font-serif text-[17px] tracking-tight text-ink">
              这次约会完成啦 <span className="animate-beat inline-block">❤️</span>
            </p>
            <p className="mt-1.5 text-[12.5px] text-ink-3">
              {item.completedAt
                ? `${relativeTime(item.completedAt)}标记为完成 · ${formatFullDate(item.dateOn)}`
                : formatFullDate(item.dateOn)}
            </p>
          </div>
        </section>
      ) : null}

      {/* -------------------------------------------------------------- 详细信息 */}
      <section className="card mt-3 divide-y divide-line px-5 py-1.5">
        <InfoRow
          icon="🗓"
          label="日期"
          value={`${formatFullDate(item.dateOn)} · ${weekdayCN(item.dateOn)}`}
        />
        <InfoRow
          icon="🕒"
          label="时间"
          value={time ?? '还没定具体时间'}
          muted={!time}
        />
        <InfoRow
          icon="📍"
          label="地点"
          value={item.place ?? '还没想好去哪儿'}
          muted={!item.place}
        />
        <InfoRow
          icon="🎡"
          label="活动"
          value={act.label}
        />
        <InfoRow
          icon="💰"
          label="预计花费"
          value={money ?? '没有填写'}
          muted={!money}
        />
      </section>

      {item.note ? (
        <section className="card mt-3 p-5">
          <p className="text-[11.5px] text-ink-3">备注</p>
          <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-wrap text-ink">
            {item.note}
          </p>
        </section>
      ) : null}

      {/* ---------------------------------------------------------------- 元信息 */}
      <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-[11.5px] text-ink-3">
        {author ? (
          <span>
            {author.emoji} {author.displayName} 添加
          </span>
        ) : null}
        <span>更新于 {relativeTime(item.updatedAt)}</span>
        {editor && editor.id !== item.createdBy ? (
          <span>
            最后由 {editor.displayName} 修改
          </span>
        ) : null}
      </div>

      {/* ---------------------------------------------------------------- 操作区 */}
      <div className="mt-6 space-y-2.5">
        <Button size="lg" full onClick={handleToggleDone} disabled={pending}>
          <IconCheck className="h-4 w-4" />
          {isDone ? '改回待赴约' : '标记为已完成'}
        </Button>

        <Link href={`/dates/${item.id}/edit`} className="block">
          <Button variant="ghost" size="lg" full disabled={pending}>
            <IconEdit className="h-4 w-4" />
            编辑这次约会
          </Button>
        </Link>

        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="mx-auto mt-2 flex items-center gap-1.5 px-3 py-2 text-[12px] text-ink-3 transition hover:text-accent-deep"
        >
          <IconTrash className="h-3.5 w-3.5" />
          删除这次约会
        </button>
      </div>

      <div className="mt-6 rounded-2xl bg-cream-2 px-4 py-3">
        <p className="flex items-start gap-2 text-[11.5px] leading-relaxed text-ink-3">
          <IconWarn className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          删除后无法恢复，但 Ta 那边会立刻同步。
        </p>
      </div>

      <div className="h-8" />

      <ConfirmSheet
        open={confirmDelete}
        title="删除这次约会？"
        description={`「${item.title}」会被永久删除，你们两个人都看不到了。`}
        confirmText="删除"
        danger
        loading={pending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Screen>
  )
}
