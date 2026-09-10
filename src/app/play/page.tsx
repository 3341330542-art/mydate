'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useApp } from '@/components/AppProvider'
import { Confetti } from '@/components/Confetti'
import { IconClose, IconPlus, IconSparkles } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { Button, Card, EmptyState, Screen, SectionTitle, TopBar } from '@/components/ui'
import { BUILTIN_IDEAS, IDEA_EMOJIS } from '@/lib/ideas-builtin'
import { messageOf } from '@/lib/errors'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

interface RollItem {
  emoji: string
  text: string
}

/** 老虎机式的滚动：先快后慢，最后停在中奖结果上 */
function useRoll() {
  const [current, setCurrent] = useState<RollItem | null>(null)
  const [rolling, setRolling] = useState(false)
  const running = useRef(false)
  const alive = useRef(true)

  // 抽签过程中离开页面时，不要再往已经卸载的组件里写状态
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const roll = useCallback(async (pool: RollItem[], steps = 12): Promise<RollItem | null> => {
    if (pool.length === 0 || running.current) return null
    running.current = true
    setRolling(true)

    for (let i = 0; i < steps; i += 1) {
      if (!alive.current) {
        running.current = false
        return null
      }
      setCurrent(pool[Math.floor(Math.random() * pool.length)])
      await sleep(45 + i * i * 1.3)
    }

    if (!alive.current) {
      running.current = false
      return null
    }

    const final = pool[Math.floor(Math.random() * pool.length)]
    setCurrent(final)
    setRolling(false)
    running.current = false
    return final
  }, [])

  const reset = useCallback(() => setCurrent(null), [])

  return { current, rolling, roll, reset }
}

export default function PlayPage() {
  const { ideas, addIdea, deleteIdea, pending, members } = useApp()
  const toast = useToast()

  const [title, setTitle] = useState('')
  const [emoji, setEmoji] = useState('✨')

  const want = useRoll()
  const draw = useRoll()
  const [wantDone, setWantDone] = useState(false)
  const [drawDone, setDrawDone] = useState(false)

  const memberMap = useMemo(() => new Map(members.map((m) => [m.id, m])), [members])
  const showAuthor = members.length > 1

  /** 「今天想做什么」：内置建议 + 我们自己的灵感 */
  const wantPool = useMemo<RollItem[]>(
    () => [
      ...BUILTIN_IDEAS,
      ...ideas.map((i) => ({ emoji: i.emoji, text: i.title })),
    ],
    [ideas],
  )

  /** 「约会抽签」：只用我们自己添加的灵感 */
  const drawPool = useMemo<RollItem[]>(
    () => ideas.map((i) => ({ emoji: i.emoji, text: i.title })),
    [ideas],
  )

  async function handleWant() {
    setWantDone(false)
    const res = await want.roll(wantPool)
    if (res) setWantDone(true)
  }

  async function handleDraw() {
    if (drawPool.length === 0) {
      toast.show('先往清单里加几个想做的事吧')
      return
    }
    setDrawDone(false)
    const res = await draw.roll(drawPool, 14)
    if (res) setDrawDone(true)
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    const t = title.trim()
    if (!t) {
      toast.show('写点想做点什么吧')
      return
    }
    try {
      await addIdea(t, emoji)
      setTitle('')
      setEmoji('✨')
      toast.success('已经加进清单')
    } catch (err) {
      toast.error(messageOf(err))
    }
  }

  async function handleSeedBuiltin() {
    const existing = new Set(ideas.map((i) => i.title))
    const candidates = BUILTIN_IDEAS.filter((b) => !existing.has(b.text))
    const picked = candidates.sort(() => Math.random() - 0.5).slice(0, 6)
    if (picked.length === 0) {
      toast.show('内置灵感都已经在清单里啦')
      return
    }
    try {
      for (const p of picked) {
        await addIdea(p.text, p.emoji)
      }
      toast.success(`加进来 ${picked.length} 条灵感`)
    } catch (err) {
      toast.error(messageOf(err))
    }
  }

  async function handleRemove(id: string) {
    try {
      await deleteIdea(id)
    } catch (err) {
      toast.error(messageOf(err))
    }
  }

  return (
    <Screen className="pt-3">
      <TopBar title="互动" subtitle="不知道做什么的时候，交给它决定" />

      {/* ------------------------------------------------------ 今天想做什么 */}
      <Card className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #FFF6F2 0%, #FFFBF8 55%, #FDF3F6 100%)' }}
        />
        <div className="relative">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-accent shadow-soft">
              <IconSparkles className="h-[18px] w-[18px]" />
            </span>
            <h2 className="text-[15px] font-semibold text-ink">今天想做什么？</h2>
          </div>

          <div className="mt-4 min-h-[92px]">
            {want.current ? (
              <div
                className={`rounded-2xl bg-white/85 px-4 py-4 text-center transition-all duration-200 ${
                  want.rolling ? 'scale-[0.98] opacity-70' : 'animate-scale-in scale-100 opacity-100'
                }`}
              >
                <span className="block text-[26px] leading-none" aria-hidden="true">
                  {want.current.emoji}
                </span>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink">{want.current.text}</p>
              </div>
            ) : (
              <p className="px-1 py-6 text-center font-serif text-[14px] leading-relaxed text-ink-2">
                点一下下面的按钮，
                <br />
                让它随便替你们决定一件事。
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-2.5">
            <Button full onClick={handleWant} disabled={want.rolling}>
              {want.rolling ? '正在想…' : want.current ? '换一个' : '今天想做什么'}
            </Button>
          </div>

          {wantDone && want.current ? (
            <Link
              href={`/dates/new?title=${encodeURIComponent(want.current.text)}`}
              className="mt-2.5 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[12.5px] text-accent-deep transition hover:bg-white/60"
            >
              <IconPlus className="h-3.5 w-3.5" />
              就它了，安排成一次约会
            </Link>
          ) : null}
        </div>
      </Card>

      {/* ---------------------------------------------------------- 约会抽签 */}
      <Card className="relative mt-3 overflow-hidden">
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">约会抽签</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                把你们想做的事都写下来，抽到哪个就去做哪个
              </p>
            </div>
            <span className="chip bg-blush text-accent-deep">{drawPool.length} 条</span>
          </div>

          {/* 抽签结果 */}
          <div className="relative mt-4 min-h-[104px]">
            {drawDone ? <Confetti count={14} /> : null}
            {draw.current ? (
              <div
                className={`rounded-2xl px-4 py-5 text-center transition-all duration-200 ${
                  draw.rolling
                    ? 'scale-[0.97] bg-cream-2 opacity-70'
                    : 'animate-scale-in bg-gradient-to-br from-blush to-white shadow-soft'
                }`}
              >
                <span className="block text-[30px] leading-none" aria-hidden="true">
                  {draw.current.emoji}
                </span>
                <p className="mt-3 text-[16px] leading-snug font-semibold text-ink">
                  {draw.current.text}
                </p>
                {drawDone ? (
                  <p className="mt-1.5 text-[11.5px] text-ink-3">就决定是它啦</p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-line-2 px-4 py-7 text-center">
                <p className="text-[12.5px] leading-relaxed text-ink-3">
                  {drawPool.length === 0
                    ? '清单还是空的，先在下面加几条吧'
                    : '准备好了就抽一次'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex gap-2.5">
            <Button full onClick={handleDraw} disabled={draw.rolling || drawPool.length === 0}>
              {draw.rolling ? '抽签中…' : '开始抽签'}
            </Button>
            {drawDone && draw.current ? (
              <Button
                variant="ghost"
                onClick={() => {
                  draw.reset()
                  setDrawDone(false)
                }}
              >
                再来一次
              </Button>
            ) : null}
          </div>

          {drawDone && draw.current ? (
            <Link
              href={`/dates/new?title=${encodeURIComponent(draw.current.text)}`}
              className="mt-2.5 flex items-center justify-center gap-1.5 rounded-2xl py-2.5 text-[12.5px] text-accent-deep transition hover:bg-blush/60"
            >
              <IconPlus className="h-3.5 w-3.5" />
              抽中了，安排成一次约会
            </Link>
          ) : null}
        </div>
      </Card>

      {/* ------------------------------------------------------------ 添加灵感 */}
      <SectionTitle>我们的灵感清单</SectionTitle>

      <form onSubmit={handleAdd} className="card p-4">
        <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2.5">
          {IDEA_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              aria-label={`选择 ${e}`}
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px] transition active:scale-90 ${
                emoji === e ? 'bg-blush ring-2 ring-accent/40' : 'bg-cream-2'
              }`}
            >
              {e}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="field flex-1"
            placeholder="想一起做的事，例如：一起做一顿饭"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={40}
            enterKeyHint="done"
          />
          <Button type="submit" disabled={pending} className="shrink-0 px-4">
            <IconPlus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* -------------------------------------------------------------- 清单 */}
      {ideas.length > 0 ? (
        <ul className="stagger mt-3 space-y-2">
          {ideas.map((idea) => {
            const author = memberMap.get(idea.createdBy)
            return (
              <li
                key={idea.id}
                className="card flex items-center gap-3 px-4 py-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cream-2 text-[17px]">
                  {idea.emoji}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] text-ink">{idea.title}</span>
                  {showAuthor && author ? (
                    <span className="mt-0.5 block text-[11px] text-ink-3">
                      {author.displayName} 想做的
                    </span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(idea.id)}
                  aria-label={`删除 ${idea.title}`}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-ink-4 transition active:scale-90 hover:text-accent-deep"
                >
                  <IconClose className="h-4 w-4" />
                </button>
              </li>
            )
          })}
        </ul>
      ) : (
        <EmptyState
          emoji="🌱"
          title="清单还是空的"
          description="把想和 Ta 一起做的事写下来，以后不知道做什么的时候就抽一个。"
          action={
            <Button variant="ghost" onClick={handleSeedBuiltin} disabled={pending}>
              <IconSparkles className="h-4 w-4" />
              从内置灵感里加几条
            </Button>
          }
        />
      )}

      {ideas.length > 0 && ideas.length < 6 ? (
        <button
          type="button"
          onClick={handleSeedBuiltin}
          disabled={pending}
          className="mx-auto mt-3 flex items-center gap-1.5 px-3 py-2 text-[12px] text-ink-3 transition hover:text-ink-2"
        >
          <IconSparkles className="h-3.5 w-3.5" />
          再帮我加几条灵感
        </button>
      ) : null}

      <div className="h-6" />
    </Screen>
  )
}
