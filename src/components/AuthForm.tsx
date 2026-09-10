'use client'

import { useState, type FormEvent } from 'react'

import { useApp } from './AppProvider'
import { IconMail, IconLock, IconUser } from './Icons'
import { useToast } from './Toast'
import { Button, Field, FormError } from './ui'
import { messageOf } from '@/lib/errors'

type Mode = 'signin' | 'signup'

export function AuthForm({
  onSuccess,
  defaultMode = 'signin',
  compact = false,
}: {
  onSuccess: () => void
  defaultMode?: Mode
  compact?: boolean
}) {
  const { signIn, signUp, demo } = useApp()
  const toast = useToast()

  const [mode, setMode] = useState<Mode>(defaultMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const mail = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(mail)) {
      setError('填一个正确的邮箱地址吧')
      return
    }
    if (password.length < 6) {
      setError('密码至少 6 位哦')
      return
    }
    if (mode === 'signup' && displayName.trim().length === 0) {
      setError('给自己起个名字吧，Ta 会看到')
      return
    }

    setBusy(true)
    try {
      if (mode === 'signin') {
        await signIn(mail, password)
        toast.success('欢迎回来')
        onSuccess()
      } else {
        const res = await signUp(mail, password, displayName.trim())
        if (res.needsEmailConfirm) {
          setSentTo(mail)
          setBusy(false)
          return
        }
        toast.success('注册成功，欢迎')
        onSuccess()
      }
    } catch (err) {
      setError(messageOf(err))
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div className="card animate-scale-in p-6 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blush text-accent">
          <IconMail className="h-6 w-6" />
        </span>
        <h2 className="mt-4 text-[16px] font-semibold text-ink">去邮箱确认一下吧</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">
          确认邮件已经发到 <b className="font-medium text-ink">{sentTo}</b>
          ，点一下里面的链接就完成注册了。
        </p>
        <p className="mt-3 rounded-2xl bg-cream-2 px-4 py-3 text-[12px] leading-relaxed text-ink-3">
          没收到？看看垃圾邮件。也可以在 Supabase 控制台把
          「Authentication → Sign In / Providers → Email → Confirm email」关掉，
          注册后就能直接登录。
        </p>
        <div className="mt-5">
          <Button
            variant="ghost"
            full
            onClick={() => {
              setSentTo(null)
              setMode('signin')
            }}
          >
            返回登录
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 登录 / 注册 切换 */}
      <div className="flex rounded-2xl bg-cream-2 p-1">
        {(
          [
            { key: 'signin', label: '登录' },
            { key: 'signup', label: '注册' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => {
              setMode(t.key)
              setError(null)
            }}
            className={`flex-1 rounded-xl py-2 text-[13.5px] font-medium transition-all duration-250 ${
              mode === t.key ? 'bg-white text-ink shadow-soft' : 'text-ink-3'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card space-y-4 p-5">
        {mode === 'signup' ? (
          <Field
            label="你的名字"
            placeholder="小名或者昵称都可以"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={20}
            autoComplete="nickname"
            icon={<IconUser className="h-[18px] w-[18px]" />}
          />
        ) : null}

        <Field
          label="邮箱"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          inputMode="email"
          icon={<IconMail className="h-[18px] w-[18px]" />}
        />

        <Field
          label="密码"
          hint="至少 6 位"
          type="password"
          placeholder="••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          icon={<IconLock className="h-[18px] w-[18px]" />}
        />
      </div>

      <FormError>{error}</FormError>

      {demo ? (
        <p className="rounded-2xl bg-cream-2 px-4 py-3 text-[12px] leading-relaxed text-ink-3">
          演示模式下已经自动登录，随便点一下按钮就能进去看看。
        </p>
      ) : null}

      <Button type="submit" size="lg" full disabled={busy}>
        {busy ? '处理中…' : mode === 'signin' ? '登录' : '创建账号'}
      </Button>

      {!compact ? (
        <p className="px-2 text-center text-[11.5px] leading-relaxed text-ink-3">
          只有你们两个会看到这里的内容。
          <br />
          空间里的数据由数据库行级权限保护，别人即使拿到链接也读不到。
        </p>
      ) : null}
    </form>
  )
}
