'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { DEMO_MODE } from '@/lib/config'
import { getDataProvider } from '@/lib/data'
import type { CreateSpaceInput, DataProvider, InvitePreview } from '@/lib/data/provider'
import { AppError, messageOf } from '@/lib/errors'
import { computeStats } from '@/lib/selectors'
import type {
  ChangeTopic,
  DateDraft,
  DateItem,
  DateStatus,
  Idea,
  Member,
  Profile,
  Session,
  Space,
  Stats,
} from '@/lib/types'

export type AppStatus =
  /** 正在读取本地会话 / 云端数据 */
  | 'loading'
  /** 没有登录 */
  | 'unauthenticated'
  /** 已登录但还没有加入任何情侣空间 */
  | 'no-space'
  /** 一切就绪 */
  | 'ready'
  /** 没有配置 Supabase（也没开演示模式） */
  | 'unconfigured'
  /** 启动过程出错 */
  | 'error'

export interface AppContextValue {
  status: AppStatus
  errorMessage: string | null
  /** true = 数据不会保存（演示模式） */
  demo: boolean
  syncEnabled: boolean

  session: Session | null
  me: Profile | null
  partner: Member | null
  space: Space | null
  members: Member[]
  dates: DateItem[]
  ideas: Idea[]
  stats: Stats

  /** 任意写操作正在进行 */
  pending: boolean

  refresh: () => Promise<void>
  retry: () => void

  signIn: (email: string, password: string) => Promise<void>
  signUp: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<{ needsEmailConfirm: boolean }>
  signOut: () => Promise<void>

  createSpace: (input: CreateSpaceInput) => Promise<void>
  joinSpace: (code: string) => Promise<void>
  previewInvite: (code: string) => Promise<InvitePreview | null>
  updateSpace: (patch: Partial<Pick<Space, 'name' | 'slogan' | 'anniversary'>>) => Promise<void>
  regenerateInviteCode: () => Promise<string>
  updateMyProfile: (patch: { displayName?: string; emoji?: string }) => Promise<void>

  createDate: (input: DateDraft) => Promise<DateItem>
  updateDate: (
    id: string,
    patch: Partial<DateDraft> & { status?: DateStatus },
  ) => Promise<DateItem>
  deleteDate: (id: string) => Promise<void>

  addIdea: (title: string, emoji: string) => Promise<Idea>
  deleteIdea: (id: string) => Promise<void>
}

/**
 * 导出这个 Context 是为了让自动化测试能注入一份固定的数据来渲染各个页面，
 * 从而在不启动浏览器的情况下检查页面有没有运行时报错。业务代码请用 useApp()。
 */
export const AppContext = createContext<AppContextValue | null>(null)

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp 必须在 <AppProvider> 内部使用')
  return ctx
}

export function AppProvider({ children }: { children: ReactNode }) {
  // Supabase 客户端只在浏览器里创建；服务端渲染时先留空，首屏显示加载动画。
  const [provider] = useState<DataProvider | null>(() => {
    if (typeof window === 'undefined') return null
    try {
      return getDataProvider()
    } catch {
      return null
    }
  })

  const [status, setStatus] = useState<AppStatus>('loading')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [me, setMe] = useState<Profile | null>(null)
  const [space, setSpace] = useState<Space | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [dates, setDates] = useState<DateItem[]>([])
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [pending, setPending] = useState(false)
  const [bootKey, setBootKey] = useState(0)

  const spaceId = space?.id ?? null

  /** 清空所有与空间相关的数据（退出登录时用） */
  const clearSpace = useCallback(() => {
    setMe(null)
    setSpace(null)
    setMembers([])
    setDates([])
    setIdeas([])
  }, [])

  /** 只刷新空间信息与成员，不动 status */
  const refreshSpaceOnly = useCallback(async (p: DataProvider) => {
    const snap = await p.loadSpace()
    setMe(snap.me)
    setMembers(snap.members)
    setSpace(snap.space)
    return snap.space
  }, [])

  /** 完整加载：空间 + 约会 + 灵感 */
  const loadAll = useCallback(async (p: DataProvider, s: Session) => {
    const snap = await p.loadSpace()
    setMe(snap.me)
    setMembers(snap.members)
    setSpace(snap.space)

    if (!snap.space) {
      setDates([])
      setIdeas([])
      setSession(s)
      setStatus('no-space')
      return
    }

    const [d, i] = await Promise.all([p.listDates(), p.listIdeas()])
    setDates(d)
    setIdeas(i)
    setSession(s)
    setStatus('ready')
  }, [])

  // ---------------------------------------------------------------- 启动 / 会话
  useEffect(() => {
    if (!provider) {
      setStatus('unconfigured')
      return
    }

    let cancelled = false
    const fail = (err: unknown) => {
      if (cancelled) return
      setErrorMessage(messageOf(err))
      setStatus(err instanceof AppError && err.code === 'NOT_CONFIGURED' ? 'unconfigured' : 'error')
    }

    setStatus('loading')
    setErrorMessage(null)

    provider
      .getSession()
      .then(async (s) => {
        if (cancelled) return
        setSession(s)
        if (!s) {
          setStatus('unauthenticated')
          return
        }
        await loadAll(provider, s)
      })
      .catch(fail)

    const offAuth = provider.onAuthStateChange((s) => {
      if (cancelled) return
      if (!s) {
        clearSpace()
        setSession(null)
        setStatus('unauthenticated')
        return
      }
      setSession(s)
      loadAll(provider, s).catch(fail)
    })

    return () => {
      cancelled = true
      offAuth()
    }
  }, [provider, loadAll, clearSpace, bootKey])

  // ---------------------------------------------------------------- 实时同步
  useEffect(() => {
    if (!provider || !space?.id) return

    const dirty = new Set<ChangeTopic>()
    let timer: ReturnType<typeof setTimeout> | null = null

    const flush = () => {
      timer = null
      const topics = new Set(dirty)
      dirty.clear()

      void (async () => {
        try {
          if (topics.has('dates')) setDates(await provider.listDates())
          if (topics.has('ideas')) setIdeas(await provider.listIdeas())
          if (topics.has('space') || topics.has('members')) await refreshSpaceOnly(provider)
        } catch {
          /* 实时同步失败不打断使用，下次刷新会补上 */
        }
      })()
    }

    const off = provider.subscribe(space.id, (topic) => {
      dirty.add(topic)
      if (timer) clearTimeout(timer)
      timer = setTimeout(flush, 280)
    })

    return () => {
      off()
      if (timer) clearTimeout(timer)
    }
  }, [provider, space?.id, refreshSpaceOnly])

  // -------------------------------------------------- 回到前台时自动拉一次最新数据
  const refresh = useCallback(async () => {
    if (!provider) return
    try {
      const s = session ?? (await provider.getSession())
      if (!s) {
        setStatus('unauthenticated')
        return
      }
      await loadAll(provider, s)
      setErrorMessage(null)
    } catch (err) {
      setErrorMessage(messageOf(err))
      setStatus('error')
    }
  }, [provider, session, loadAll])

  useEffect(() => {
    if (!provider || status !== 'ready' || !spaceId) return

    const onWake = () => {
      if (document.visibilityState !== 'visible') return
      void (async () => {
        try {
          setDates(await provider.listDates())
          setIdeas(await provider.listIdeas())
          await refreshSpaceOnly(provider)
        } catch {
          /* 忽略，保持当前界面 */
        }
      })()
    }

    window.addEventListener('focus', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      window.removeEventListener('focus', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [provider, status, spaceId, refreshSpaceOnly])

  const retry = useCallback(() => setBootKey((k) => k + 1), [])

  // ---------------------------------------------------------------- 写操作包装
  const run = useCallback(async <T,>(fn: (p: DataProvider) => Promise<T>): Promise<T> => {
    if (!provider) throw new AppError('NOT_CONFIGURED')
    setPending(true)
    try {
      return await fn(provider)
    } finally {
      setPending(false)
    }
  }, [provider])

  // ---------------------------------------------------------------- 身份操作
  const signIn = useCallback(
    async (email: string, password: string) => {
      await run(async (p) => {
        const s = await p.signIn(email, password)
        await loadAll(p, s)
      })
    },
    [run, loadAll],
  )

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      return run(async (p) => {
        const res = await p.signUp(email, password, displayName)
        if (res.session) await loadAll(p, res.session)
        return { needsEmailConfirm: res.needsEmailConfirm }
      })
    },
    [run, loadAll],
  )

  const signOut = useCallback(async () => {
    await run(async (p) => {
      await p.signOut()
      clearSpace()
      setSession(null)
      setStatus('unauthenticated')
    })
  }, [run, clearSpace])

  // ---------------------------------------------------------------- 空间操作
  const createSpace = useCallback(
    async (input: CreateSpaceInput) => {
      await run(async (p) => {
        await p.createSpace(input)
        const s = (await p.getSession()) ?? session
        if (s) await loadAll(p, s)
      })
    },
    [run, session, loadAll],
  )

  const joinSpace = useCallback(
    async (code: string) => {
      await run(async (p) => {
        await p.joinSpace(code)
        const s = (await p.getSession()) ?? session
        if (s) await loadAll(p, s)
      })
    },
    [run, session, loadAll],
  )

  const previewInvite = useCallback(
    async (code: string) => {
      if (!provider) throw new AppError('NOT_CONFIGURED')
      return provider.previewInvite(code)
    },
    [provider],
  )

  const updateSpace = useCallback(
    async (patch: Partial<Pick<Space, 'name' | 'slogan' | 'anniversary'>>) => {
      await run(async (p) => {
        await p.updateSpace(patch)
        // 写完之后以服务端为准重新读一次。
        // 只打本地补丁的话，下一次前台刷新会用服务端快照整体覆盖，
        // 用户会觉得「刚改的东西过一会儿又变回去了」。
        await refreshSpaceOnly(p)
      })
    },
    [run, refreshSpaceOnly],
  )

  const regenerateInviteCode = useCallback(async () => {
    return run(async (p) => {
      const code = await p.regenerateInviteCode()
      setSpace((prev) => (prev ? { ...prev, inviteCode: code } : prev))
      return code
    })
  }, [run])

  const updateMyProfile = useCallback(
    async (patch: { displayName?: string; emoji?: string }) => {
      await run(async (p) => {
        await p.updateMyProfile(patch)
        await refreshSpaceOnly(p)
      })
    },
    [run, refreshSpaceOnly],
  )

  // ---------------------------------------------------------------- 约会操作
  const createDate = useCallback(
    async (input: DateDraft) => {
      return run(async (p) => {
        const item = await p.createDate(input)
        setDates((prev) => (prev.some((d) => d.id === item.id) ? prev : [...prev, item]))
        return item
      })
    },
    [run],
  )

  const updateDate = useCallback(
    async (id: string, patch: Partial<DateDraft> & { status?: DateStatus }) => {
      return run(async (p) => {
        const item = await p.updateDate(id, patch)
        setDates((prev) => prev.map((d) => (d.id === id ? item : d)))
        return item
      })
    },
    [run],
  )

  const deleteDate = useCallback(
    async (id: string) => {
      await run(async (p) => {
        await p.deleteDate(id)
        setDates((prev) => prev.filter((d) => d.id !== id))
      })
    },
    [run],
  )

  // ---------------------------------------------------------------- 灵感操作
  const addIdea = useCallback(
    async (title: string, emoji: string) => {
      return run(async (p) => {
        const idea = await p.addIdea(title, emoji)
        setIdeas((prev) => (prev.some((i) => i.id === idea.id) ? prev : [idea, ...prev]))
        return idea
      })
    },
    [run],
  )

  const deleteIdea = useCallback(
    async (id: string) => {
      await run(async (p) => {
        await p.deleteIdea(id)
        setIdeas((prev) => prev.filter((i) => i.id !== id))
      })
    },
    [run],
  )

  // ---------------------------------------------------------------- 派生数据
  const stats = useMemo(() => computeStats(dates, space?.anniversary ?? null), [dates, space])

  const partner = useMemo(
    () => members.find((m) => m.id !== session?.userId) ?? null,
    [members, session],
  )

  const value = useMemo<AppContextValue>(
    () => ({
      status,
      errorMessage,
      demo: provider?.kind === 'demo' || (DEMO_MODE && !provider),
      syncEnabled: provider?.persistent ?? false,
      session,
      me,
      partner,
      space,
      members,
      dates,
      ideas,
      stats,
      pending,
      refresh,
      retry,
      signIn,
      signUp,
      signOut,
      createSpace,
      joinSpace,
      previewInvite,
      updateSpace,
      regenerateInviteCode,
      updateMyProfile,
      createDate,
      updateDate,
      deleteDate,
      addIdea,
      deleteIdea,
    }),
    [
      status,
      errorMessage,
      provider,
      session,
      me,
      partner,
      space,
      members,
      dates,
      ideas,
      stats,
      pending,
      refresh,
      retry,
      signIn,
      signUp,
      signOut,
      createSpace,
      joinSpace,
      previewInvite,
      updateSpace,
      regenerateInviteCode,
      updateMyProfile,
      createDate,
      updateDate,
      deleteDate,
      addIdea,
      deleteIdea,
    ],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
