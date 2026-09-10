'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState, type FormEvent } from 'react'

import { useApp } from '@/components/AppProvider'
import { IconHeart, IconLink } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { Button, Field, FormError, Screen } from '@/components/ui'
import type { InvitePreview } from '@/lib/data/provider'
import { messageOf } from '@/lib/errors'

export default function WelcomePage() {
  const { status, me, createSpace, joinSpace, previewInvite, signOut, pending, demo } = useApp()
  const router = useRouter()
  const toast = useToast()

  const [tab, setTab] = useState<'create' | 'join'>('create')

  const [spaceName, setSpaceName] = useState('我们的小天地')
  const [anniversary, setAnniversary] = useState('')
  const [nickname, setNickname] = useState('')

  const [code, setCode] = useState('')
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (me?.displayName) setNickname((prev) => prev || me.displayName)
  }, [me])

  // 已经加入空间了就直接回首页
  useEffect(() => {
    if (status === 'ready') router.replace('/')
  }, [status, router])

  // 输入满 6 位邀请码后预览一下
  useEffect(() => {
    const normalized = code.trim().toUpperCase()
    if (normalized.length !== 6) {
      setPreview(null)
      return
    }
    let alive = true
    previewInvite(normalized)
      .then((p) => {
        if (alive) setPreview(p)
      })
      .catch(() => {
        if (alive) setPreview(null)
      })
    return () => {
      alive = false
    }
  }, [code, previewInvite])

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await createSpace({
        name: spaceName.trim() || '我们的小天地',
        anniversary: anniversary || null,
        displayName: nickname.trim() || (me?.displayName ?? '我'),
      })
      toast.success('你们的小天地已经建好啦')
      router.replace('/')
    } catch (err) {
      setError(messageOf(err))
    }
  }

  async function handleJoin(e: FormEvent) {
    e.preventDefault()
    setError(null)
    const normalized = code.trim().toUpperCase()
    if (normalized.length !== 6) {
      setError('邀请码是 6 位字母数字，再检查一下')
      return
    }
    try {
      await joinSpace(normalized)
      toast.success('欢迎加入你们的小天地')
      router.replace('/')
    } catch (err) {
      setError(messageOf(err))
    }
  }

  return (
    <Screen className="flex min-h-dvh flex-col justify-center py-12">
      <div className="animate-fade-up mb-7 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-blush text-accent">
          <IconHeart className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-serif text-[21px] tracking-tight text-ink">
          {tab === 'create' ? '建立你们的小天地' : '加入 Ta 的空间'}
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
          {tab === 'create'
            ? '建好之后，把邀请码发给 Ta，你们就能一起用了'
            : '输入 Ta 给你的 6 位邀请码'}
        </p>
      </div>

      <div className="mb-5 flex rounded-2xl bg-cream-2 p-1">
        {(
          [
            { key: 'create', label: '创建空间' },
            { key: 'join', label: '有邀请码' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setTab(t.key)
              setError(null)
            }}
            className={`flex-1 rounded-xl py-2 text-[13.5px] font-medium transition-all duration-250 ${
              tab === t.key ? 'bg-white text-ink shadow-soft' : 'text-ink-3'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="card space-y-4 p-5">
            <Field
              label="空间名字"
              placeholder="我们的小天地"
              value={spaceName}
              onChange={(e) => setSpaceName(e.target.value)}
              maxLength={24}
            />
            <Field
              label="我的昵称"
              hint="Ta 会看到"
              placeholder="小名或者昵称"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={20}
            />
            <Field
              label="我们在一起的日子"
              hint="选填，填了会显示在一起多少天"
              type="date"
              value={anniversary}
              onChange={(e) => setAnniversary(e.target.value)}
              className="tabular"
            />
          </div>

          <FormError>{error}</FormError>

          <Button type="submit" size="lg" full disabled={pending}>
            {pending ? '创建中…' : '创建我们的小天地'}
          </Button>

          {demo ? (
            <p className="rounded-2xl bg-cream-2 px-4 py-3 text-[12px] leading-relaxed text-ink-3">
              演示模式下空间已经建好了，点按钮可以直接进去看看。
            </p>
          ) : null}
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-4">
          <div className="card space-y-4 p-5">
            <Field
              label="邀请码"
              placeholder="6 位字母数字"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              icon={<IconLink className="h-[18px] w-[18px]" />}
              className="tabular tracking-[0.3em] uppercase"
              style={{ letterSpacing: '0.28em' }}
            />

            {preview ? (
              <div className="animate-fade-in rounded-2xl bg-done-tint px-4 py-3">
                <p className="text-[12.5px] text-ink-2">
                  找到啦 —— <b className="font-semibold text-ink">{preview.name}</b>
                  {preview.memberCount >= 2 ? '（已满员）' : '，加入后你们就能一起记录约会了'}
                </p>
              </div>
            ) : code.trim().length === 6 ? (
              <div className="animate-fade-in rounded-2xl bg-accent-tint px-4 py-3">
                <p className="text-[12.5px] text-accent-deep">没找到这个邀请码，确认一下有没有输错</p>
              </div>
            ) : null}
          </div>

          <FormError>{error}</FormError>

          <Button type="submit" size="lg" full disabled={pending}>
            {pending ? '正在加入…' : '加入 Ta 的空间'}
          </Button>
        </form>
      )}

      <button
        type="button"
        onClick={() => {
          void signOut()
            .then(() => router.replace('/login'))
            .catch(() => router.replace('/login'))
        }}
        className="mt-6 text-center text-[12px] text-ink-3 transition hover:text-ink-2"
      >
        退出登录
      </button>
    </Screen>
  )
}
