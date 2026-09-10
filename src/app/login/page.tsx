'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { AuthForm } from '@/components/AuthForm'
import { useApp } from '@/components/AppProvider'
import { APP_SLOGAN } from '@/lib/config'
import { Screen } from '@/components/ui'

export default function LoginPage() {
  const { status } = useApp()
  const router = useRouter()

  // 已经登录并且已经加入空间的话，直接回首页
  useEffect(() => {
    if (status === 'ready') router.replace('/')
    if (status === 'no-space') router.replace('/welcome')
  }, [status, router])

  return (
    <Screen className="flex min-h-dvh flex-col justify-center py-12">
      <div className="animate-fade-up mb-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white shadow-soft">
          <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
            <path
              d="M16 27S5 20 5 12.6A6.1 6.1 0 0 1 16 9.4a6.1 6.1 0 0 1 11 3.2C27 20 16 27 16 27z"
              fill="#D8506A"
              fillOpacity="0.92"
            />
          </svg>
        </div>
        <h1 className="mt-5 font-serif text-[22px] tracking-tight text-ink">我们的小天地</h1>
        <p className="mt-2 text-[13px] text-ink-3">{APP_SLOGAN}</p>
      </div>

      <AuthForm onSuccess={() => router.replace('/')} />
    </Screen>
  )
}
