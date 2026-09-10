'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

type ToastKind = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  kind: ToastKind
  text: string
}

interface ToastApi {
  show: (text: string, kind?: ToastKind) => void
  success: (text: string) => void
  error: (text: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast 必须在 <ToastProvider> 内部使用')
  return ctx
}

const KIND_STYLE: Record<ToastKind, string> = {
  success: 'bg-ink text-white',
  error: 'bg-accent-deep text-white',
  info: 'bg-white text-ink border border-line',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
    const t = timers.current.get(id)
    if (t) {
      clearTimeout(t)
      timers.current.delete(id)
    }
  }, [])

  const show = useCallback(
    (text: string, kind: ToastKind = 'info') => {
      seq.current += 1
      const id = seq.current
      setItems((prev) => [...prev.slice(-2), { id, kind, text }])
      const timer = setTimeout(() => dismiss(id), kind === 'error' ? 3600 : 2400)
      timers.current.set(id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    const map = timers.current
    return () => {
      map.forEach((t) => clearTimeout(t))
      map.clear()
    }
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (text: string) => show(text, 'success'),
      error: (text: string) => show(text, 'error'),
    }),
    [show],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex flex-col items-center gap-2 px-6 pb-24">
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={`animate-fade-up pointer-events-auto max-w-[22rem] rounded-full px-4 py-2.5 text-sm font-medium shadow-lift backdrop-blur ${KIND_STYLE[t.kind]}`}
          >
            {t.text}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
