'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, type ReactNode } from 'react'

import { useApp } from './AppProvider'
import { IconRefresh, IconWarn } from './Icons'
import { TabBar } from './TabBar'
import { Button, Screen } from './ui'

/** 需要底部 Tab Bar 的四个一级页面 */
const TAB_ROUTES = ['/', '/dates', '/play', '/me']

/** 未登录也能访问的页面 */
const OPEN_ROUTES = ['/login', '/join']

function isTabRoute(pathname: string) {
  return TAB_ROUTES.includes(pathname)
}

/* ------------------------------------------------------------------ 加载中 */

function Splash({ hint }: { hint?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 px-8">
      <div className="animate-pulse-soft relative flex h-20 w-20 items-center justify-center">
        <div
          className="absolute inset-0 rounded-[28px] blur-xl"
          style={{ background: 'radial-gradient(circle, #F6CDD5 0%, transparent 70%)' }}
        />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-soft">
          <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
            <path
              d="M16 27S5 20 5 12.6A6.1 6.1 0 0 1 16 9.4a6.1 6.1 0 0 1 11 3.2C27 20 16 27 16 27z"
              fill="#D8506A"
              fillOpacity="0.92"
            />
          </svg>
        </div>
      </div>
      <div className="text-center">
        <p className="font-serif text-[15px] tracking-wide text-ink-2">我们的小天地</p>
        <p className="mt-1.5 text-xs text-ink-3">{hint ?? '正在连接…'}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- 未配置数据库 */

function SetupNotice() {
  return (
    <Screen className="flex min-h-dvh flex-col justify-center py-14">
      <div className="card p-6">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-tint text-accent">
            <IconWarn className="h-5 w-5" />
          </span>
          <h1 className="text-[17px] font-semibold text-ink">还差一步：连接数据库</h1>
        </div>

        <p className="mt-4 text-[13px] leading-relaxed text-ink-2">
          页面已经跑起来了，但还没有连接云端数据库，所以暂时没法保存数据。
          按下面的步骤配置好 Supabase 就可以了：
        </p>

        <ol className="mt-4 space-y-3 text-[13px] leading-relaxed text-ink-2">
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush text-[11px] font-semibold text-accent-deep">
              1
            </span>
            <span>
              在 <b className="font-semibold text-ink">supabase.com</b> 免费注册并新建项目
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush text-[11px] font-semibold text-accent-deep">
              2
            </span>
            <span>
              打开 SQL Editor，把项目里的{' '}
              <code className="rounded bg-cream-2 px-1.5 py-0.5 text-[12px] text-ink">
                supabase/migrations/0001_init.sql
              </code>{' '}
              整段粘贴执行
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush text-[11px] font-semibold text-accent-deep">
              3
            </span>
            <span>
              复制 <b className="font-semibold text-ink">Project URL</b> 和{' '}
              <b className="font-semibold text-ink">anon key</b>，写进项目根目录的{' '}
              <code className="rounded bg-cream-2 px-1.5 py-0.5 text-[12px] text-ink">.env.local</code>
            </span>
          </li>
          <li className="flex gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blush text-[11px] font-semibold text-accent-deep">
              4
            </span>
            <span>重新启动开发服务器（npm run dev）</span>
          </li>
        </ol>

        <p className="mt-5 rounded-2xl bg-cream-2 px-4 py-3 text-[12px] leading-relaxed text-ink-3">
          想先看看界面长什么样？在 <code>.env.local</code> 里加一行{' '}
          <code className="text-ink-2">NEXT_PUBLIC_DEMO_MODE=1</code> 即可进入演示模式
          （数据不会保存）。
        </p>
      </div>

      <p className="mt-5 text-center text-xs text-ink-3">
        完整步骤见项目里的 <span className="text-ink-2">README.md</span>
      </p>
    </Screen>
  )
}

/* ------------------------------------------------------------------ 出错 */

function ErrorView({
  message,
  onRetry,
  onExit,
}: {
  message: string | null
  onRetry: () => void
  onExit: () => void
}) {
  return (
    <Screen className="flex min-h-dvh flex-col justify-center py-14">
      <div className="card p-6 text-center">
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent-tint text-accent">
          <IconWarn className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-[17px] font-semibold text-ink">连接不太顺利</h1>
        <p className="mt-2 text-[13px] leading-relaxed text-ink-2">{message ?? '请稍后再试'}</p>
        <div className="mt-5 flex flex-col gap-2.5">
          <Button full onClick={onRetry}>
            <IconRefresh className="h-4 w-4" />
            重新连接
          </Button>
          {/* 万一是登录状态出了问题，得留一条能出去的路，不然就卡死在这一页了 */}
          <Button variant="ghost" full onClick={onExit}>
            退出登录，回到登录页
          </Button>
        </div>
      </div>
    </Screen>
  )
}

/* ---------------------------------------------------------------- 演示提示 */

function DemoBanner() {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-center gap-2 bg-ink/90 px-4 py-1.5 text-[11px] font-medium text-white/90 backdrop-blur">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-soft" />
      演示模式 · 数据不会保存，配置数据库后即可正式使用
    </div>
  )
}

/* ------------------------------------------------------------------ 框架 */

export function AppFrame({ children }: { children: ReactNode }) {
  const { status, errorMessage, demo, retry, signOut } = useApp()
  const pathname = usePathname() || '/'
  const router = useRouter()

  const isOpenRoute = OPEN_ROUTES.includes(pathname)

  const handleExit = useCallback(() => {
    void (async () => {
      try {
        await signOut()
      } catch {
        /* 演示模式下不能退出登录，忽略即可 */
      }
      router.replace('/login')
    })()
  }, [signOut, router])

  useEffect(() => {
    if (status === 'loading' || status === 'unconfigured' || status === 'error') return

    if (status === 'unauthenticated') {
      if (!isOpenRoute) router.replace('/login')
      return
    }

    if (status === 'no-space') {
      if (pathname !== '/welcome' && pathname !== '/join') router.replace('/welcome')
      return
    }

    if (status === 'ready') {
      if (pathname === '/login' || pathname === '/welcome') router.replace('/')
    }
  }, [status, pathname, isOpenRoute, router])

  // ---------- 决定当前该渲染什么 ----------
  let body: ReactNode

  if (status === 'unconfigured') {
    body = <SetupNotice />
  } else if (status === 'error') {
    body = <ErrorView message={errorMessage} onRetry={retry} onExit={handleExit} />
  } else if (status === 'loading') {
    body = <Splash />
  } else if (status === 'unauthenticated' && !isOpenRoute) {
    body = <Splash hint="正在前往登录…" />
  } else if (status === 'no-space' && pathname !== '/welcome' && pathname !== '/join') {
    body = <Splash hint="正在准备你们的空间…" />
  } else if (status === 'ready' && (pathname === '/login' || pathname === '/welcome')) {
    body = <Splash hint="马上就到家了…" />
  } else {
    const showTab = status === 'ready' && isTabRoute(pathname)
    body = (
      <div className={showTab ? 'pb-[calc(env(safe-area-inset-bottom,0px)+5.75rem)]' : ''}>
        {children}
      </div>
    )
  }

  return (
    <div className="relative flex min-h-dvh flex-col">
      {demo ? <DemoBanner /> : null}
      {body}
      {status === 'ready' && isTabRoute(pathname) ? <TabBar /> : null}
      {status === 'ready' && !isTabRoute(pathname) && pathname !== '/login' && pathname !== '/join' ? (
        <p className="pb-safe pt-6 text-center text-[11px] text-ink-4">
          <Link href="/" className="transition hover:text-ink-3">
            我们的小天地
          </Link>
        </p>
      ) : null}
    </div>
  )
}
