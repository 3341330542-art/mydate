'use client'

import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'

import { IconClose } from './Icons'

/* ------------------------------------------------------------------ 布局 */

export function Screen({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <main className={`mx-auto w-full max-w-[30rem] px-5 ${className}`}>{children}</main>
  )
}

/** 顶部标题栏：返回按钮 + 标题 + 右侧操作 */
export function TopBar({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string
  subtitle?: string
  onBack?: () => void
  right?: ReactNode
}) {
  return (
    <header className="sticky top-0 z-30 -mx-5 mb-4 px-5 pt-3 pb-3 backdrop-blur-xl">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(to bottom, rgb(255 251 248 / 0.94) 0%, rgb(255 251 248 / 0.78) 62%, rgb(255 251 248 / 0) 100%)',
        }}
      />
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              aria-label="返回"
              className="-ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition active:scale-90"
            >
              <BackArrow />
            </button>
          ) : null}
          <div className="min-w-0">
            <h1 className="truncate text-[17px] leading-tight font-semibold text-ink">{title}</h1>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-ink-3">{subtitle}</p>
            ) : null}
          </div>
        </div>
        {right ? <div className="flex shrink-0 items-center gap-1">{right}</div> : null}
      </div>
    </header>
  )
}

function BackArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-[22px] w-[22px]"
      aria-hidden="true"
    >
      <path d="M14.6 5.8 8.4 12l6.2 6.2" />
    </svg>
  )
}

/* ------------------------------------------------------------------ 按钮 */

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'plain'
type ButtonSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  plain: 'bg-transparent text-ink-2 hover:text-ink',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-[13px]',
  md: 'h-11 px-5 text-[15px]',
  lg: 'h-[52px] px-6 text-base',
}

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  full?: boolean
}) {
  return (
    <button
      type="button"
      {...props}
      className={`btn ${VARIANT[variant]} ${SIZE[size]} ${full ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  )
}

/** 圆形图标按钮 */
export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={`flex h-10 w-10 items-center justify-center rounded-full text-ink-2 transition active:scale-90 ${className}`}
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------ 表单 */

export function Field({
  label,
  hint,
  icon,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string
  hint?: string
  icon?: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {hint ? <span className="text-[11px] text-ink-3">{hint}</span> : null}
      </span>
      <span className="relative block">
        {icon ? (
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-3">
            {icon}
          </span>
        ) : null}
        <input {...props} className={`field ${icon ? 'pl-11' : ''} ${className}`} />
      </span>
    </label>
  )
}

export function TextArea({
  label,
  hint,
  className = '',
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        {hint ? <span className="text-[11px] text-ink-3">{hint}</span> : null}
      </span>
      <textarea {...props} className={`field resize-none leading-relaxed ${className}`} />
    </label>
  )
}

export function FormError({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <p className="animate-fade-in rounded-2xl bg-accent-tint px-4 py-2.5 text-[13px] text-accent-deep">
      {children}
    </p>
  )
}

/* ------------------------------------------------------------------ 卡片 */

export function Card({
  children,
  className = '',
  as = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section'
}) {
  const Tag = as
  return <Tag className={`card p-5 ${className}`}>{children}</Tag>
}

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mt-7 mb-3 flex items-end justify-between gap-3 px-0.5">
      <h2 className="text-[15px] font-semibold tracking-tight text-ink">{children}</h2>
      {action}
    </div>
  )
}

export function EmptyState({
  emoji = '🕊️',
  title,
  description,
  action,
}: {
  emoji?: string
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="card animate-fade-up flex flex-col items-center gap-3 px-6 py-10 text-center">
      <span className="text-3xl" aria-hidden="true">
        {emoji}
      </span>
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {description ? (
        <p className="max-w-[16rem] text-[13px] leading-relaxed text-ink-3">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  )
}

/* ------------------------------------------------------------- 底部弹层 */

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
}) {
  const [mounted, setMounted] = useState(open)

  // 用 ref 存 onClose：调用点基本都传内联箭头函数，
  // 直接放进依赖数组会让父组件每渲染一次就重装一遍键盘监听和滚动锁。
  const closeRef = useRef(onClose)
  useEffect(() => {
    closeRef.current = onClose
  })

  useEffect(() => {
    if (open) setMounted(true)
    else {
      const t = setTimeout(() => setMounted(false), 220)
      return () => clearTimeout(t)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/25 backdrop-blur-[3px] transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        className={`relative w-full max-w-[30rem] rounded-t-[32px] bg-cream px-5 pt-3 pb-8 shadow-lift transition-transform duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line-2" />
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
            {description ? (
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">{description}</p>
            ) : null}
          </div>
          <IconButton label="关闭" onClick={onClose} className="-mt-1 -mr-2">
            <IconClose className="h-5 w-5" />
          </IconButton>
        </div>
        {children}
      </div>
    </div>
  )
}

export function ConfirmSheet({
  open,
  title,
  description,
  confirmText = '确定',
  cancelText = '再想想',
  danger = false,
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description?: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} description={description}>
      <div className="flex gap-3">
        <Button variant="ghost" size="lg" full onClick={onClose} disabled={loading}>
          {cancelText}
        </Button>
        <Button
          variant={danger ? 'danger' : 'primary'}
          size="lg"
          full
          onClick={onConfirm}
          disabled={loading}
        >
          {loading ? '处理中…' : confirmText}
        </Button>
      </div>
    </Sheet>
  )
}
