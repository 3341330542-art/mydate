'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { IconCalendar, IconHome, IconSparkles, IconUser } from './Icons'

const TABS = [
  { href: '/', label: '首页', Icon: IconHome },
  { href: '/dates', label: '约会', Icon: IconCalendar },
  { href: '/play', label: '互动', Icon: IconSparkles },
  { href: '/me', label: '我的', Icon: IconUser },
] as const

export function TabBar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center"
      aria-label="主导航"
    >
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-cream via-cream/85 to-transparent" />
      <div className="relative mx-3 mb-3 w-full max-w-[28rem] pb-safe">
        <ul className="flex items-stretch gap-1 rounded-[26px] border border-white/90 bg-white/80 p-1.5 shadow-lift backdrop-blur-xl">
          {TABS.map(({ href, label, Icon }) => {
            const active = pathname === href
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex flex-col items-center gap-1 rounded-[20px] py-2 transition-all duration-250 ${
                    active ? 'bg-blush' : 'active:scale-95'
                  }`}
                >
                  <Icon
                    className={`h-[21px] w-[21px] transition-colors duration-250 ${
                      active ? 'text-accent' : 'text-ink-3'
                    }`}
                  />
                  <span
                    className={`text-[10.5px] leading-none font-medium transition-colors duration-250 ${
                      active ? 'text-accent-deep' : 'text-ink-3'
                    }`}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
