'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { AuthForm } from '@/components/AuthForm'
import { useApp } from '@/components/AppProvider'
import { IconCheck, IconHeart, IconWarn } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { Button, FormError, Screen } from '@/components/ui'
import type { InvitePreview } from '@/lib/data/provider'
import { messageOf } from '@/lib/errors'

function readCodeFromUrl(): string {
  if (typeof window === 'undefined') return ''
  const raw = new URLSearchParams(window.location.search).get('code') ?? ''
  return raw.trim().toUpperCase()
}

export default function JoinPage() {
  const { status, joinSpace, previewInvite } = useApp()
  const router = useRouter()
  const toast = useToast()

  const [code, setCode] = useState('')
  const [codeReady, setCodeReady] = useState(false)
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  useEffect(() => {
    setCode(readCodeFromUrl())
    setCodeReady(true)
  }, [])

  // 预览邀请信息（未注册的人也能看到「谁邀请了你」）
  useEffect(() => {
    if (!codeReady || !code) return

    let alive = true
    setPreviewError(null)
    setPreview(null)
    setPreviewing(true)

    previewInvite(code)
      .then((p) => {
        if (!alive) return
        if (!p) setPreviewError('这个邀请码没有对应的空间，可能已经被重新生成过了')
        else setPreview(p)
      })
      .catch((err) => {
        if (alive) setPreviewError(messageOf(err))
      })
      .finally(() => {
        if (alive) setPreviewing(false)
      })

    return () => {
      alive = false
    }
  }, [codeReady, code, previewInvite])

  async function handleJoin() {
    setJoinError(null)
    setJoining(true)
    try {
      await joinSpace(code)
      toast.success('欢迎加入你们的小天地')
      router.replace('/')
    } catch (err) {
      setJoinError(messageOf(err))
      setJoining(false)
    }
  }

  /* ------------------------------------------------------------ 链接里没有邀请码 */

  if (codeReady && !code) {
    return (
      <Screen className="flex min-h-dvh flex-col justify-center py-12">
        <div className="card animate-scale-in p-6 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-cream-2 text-ink-3">
            <IconWarn className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-[16px] font-semibold text-ink">链接里没有邀请码</h1>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
            让 Ta 重新发一次完整的邀请链接，或者直接输入邀请码。
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <Button full onClick={() => router.replace('/welcome')}>
              手动输入邀请码
            </Button>
            <Button variant="ghost" full onClick={() => router.replace('/login')}>
              先去登录
            </Button>
          </div>
        </div>
      </Screen>
    )
  }

  /* -------------------------------------------------------------- 邀请卡片 */

  const errorNotice = previewError ? (
    <p className="mt-4 flex items-start gap-2 rounded-2xl bg-accent-tint px-4 py-3 text-left text-[12.5px] leading-relaxed text-accent-deep">
      <IconWarn className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{previewError}</span>
    </p>
  ) : null

  const inviteCard = (
    <div className="card animate-scale-in p-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-blush text-accent">
        <IconHeart className="h-7 w-7" />
      </span>
      <p className="mt-4 text-[13px] text-ink-3">
        {previewError ? '邀请链接' : '有人邀请你加入'}
      </p>
      <h1 className="mt-1 font-serif text-[21px] tracking-tight text-ink">
        {preview?.name ?? (previewing ? '正在确认…' : '一个情侣空间')}
      </h1>
      <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
        {preview
          ? preview.memberCount >= 2
            ? '不过这个空间里已经有两个人了'
            : '加入后，你们两个人就能一起记录和规划每一次约会'
          : previewing
            ? '稍等一下下'
            : '可以确认一下邀请码有没有输错'}
      </p>
      <p className="tabular mt-4 inline-flex items-center gap-2 rounded-full bg-cream-2 px-3.5 py-1.5 text-[12px] tracking-[0.18em] text-ink-2">
        邀请码 {code}
      </p>
      {errorNotice}
    </div>
  )

  /* --------------------------------------------------- 已经登录、已经在空间里 */

  if (status === 'ready') {
    return (
      <Screen className="flex min-h-dvh flex-col justify-center py-12">
        {inviteCard}
        <div className="card mt-4 p-5 text-center">
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-done-tint text-done">
            <IconCheck className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[13.5px] font-medium text-ink">你已经在情侣空间里啦</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-3">
            一个账号只能属于一个空间，直接回到首页就好。
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            <Button full onClick={() => router.replace('/')}>
              回到首页
            </Button>
            <Button variant="ghost" full onClick={() => router.replace('/me')}>
              查看我的邀请码
            </Button>
          </div>
        </div>
      </Screen>
    )
  }

  /* ------------------------------------------------- 还没有账号：先注册再自动加入 */

  if (status === 'unauthenticated') {
    return (
      <Screen className="flex min-h-dvh flex-col justify-center py-10">
        {inviteCard}
        <div className="mt-5">
          <p className="mb-3 text-center text-[12.5px] text-ink-3">
            {previewError
              ? '注册一个账号，也可以自己建一个新的空间'
              : '注册一个账号（只要邮箱和密码），就能马上进入'}
          </p>
          <AuthForm defaultMode="signup" onSuccess={() => void handleJoin()} compact />
        </div>
        <button
          type="button"
          onClick={() => router.replace('/login')}
          className="mt-5 text-center text-[12px] text-ink-3 transition hover:text-ink-2"
        >
          我已经有账号了，去登录
        </button>
      </Screen>
    )
  }

  /* ----------------------------------------------- 已登录但还没加入任何情侣空间 */

  if (status === 'no-space') {
    const full = (preview?.memberCount ?? 0) >= 2
    const blocked = full || Boolean(previewError) || !preview

    return (
      <Screen className="flex min-h-dvh flex-col justify-center py-12">
        {inviteCard}
        <div className="mt-5 space-y-3">
          {joinError ? <FormError>{joinError}</FormError> : null}

          {full ? (
            <p className="rounded-2xl bg-cream-2 px-4 py-3 text-[12.5px] leading-relaxed text-ink-3">
              这个空间已经有两个人了，加入不了。你可以自己建一个，再把你自己的邀请码发给 Ta。
            </p>
          ) : (
            <Button size="lg" full onClick={handleJoin} disabled={joining || blocked}>
              {joining ? '正在加入…' : previewError ? '邀请码无效' : '加入这个空间'}
            </Button>
          )}

          <Button variant="ghost" full onClick={() => router.replace('/welcome')}>
            我想自己创建一个
          </Button>
        </div>
      </Screen>
    )
  }

  /* ------------------------------------------------------------------ 加载中 */

  return (
    <Screen className="flex min-h-dvh flex-col justify-center py-12">{inviteCard}</Screen>
  )
}
