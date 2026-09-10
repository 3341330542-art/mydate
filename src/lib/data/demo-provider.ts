import { AppError } from '../errors'
import { toISODate } from '../datetime'
import type {
  DateDraft,
  DateItem,
  Idea,
  Profile,
  Session,
  Space,
  SpaceSnapshot,
} from '../types'
import type { CreateSpaceInput, DataProvider, InvitePreview, SignUpResult } from './provider'

/**
 * 本地演示实现：把数据放在内存里，用来在没有配置 Supabase 时预览完整界面。
 *
 * 注意：这里的数据**不会保存**，刷新页面就恢复成初始的示例数据。
 * 正式使用请配置 Supabase（见 README 的部署教程）。
 */

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

function iso(offsetMinutes = 0): string {
  return new Date(Date.now() + offsetMinutes * 60_000).toISOString()
}

interface DemoState {
  me: Profile
  partner: Profile
  space: Space
  dates: DateItem[]
  ideas: Idea[]
}

function seed(): DemoState {
  const meId = 'demo-me'
  const partnerId = 'demo-partner'
  const coupleId = 'demo-couple'

  const dates: DateItem[] = [
    {
      id: 'd1',
      title: '去看那家新开的美术馆',
      dateOn: daysFromNow(3),
      timeAt: '14:00',
      place: '西岸美术馆',
      activity: 'play',
      budget: 240,
      note: '记得提前在公众号预约，周一闭馆',
      status: 'planned',
      completedAt: null,
      createdBy: meId,
      updatedBy: null,
      createdAt: iso(-60 * 24 * 6),
      updatedAt: iso(-60 * 24 * 6),
    },
    {
      id: 'd2',
      title: '老地方吃拉面',
      dateOn: daysFromNow(10),
      timeAt: '19:00',
      place: '巷口那家面馆',
      activity: 'eat',
      budget: 90,
      note: '要加一份溏心蛋',
      status: 'planned',
      completedAt: null,
      createdBy: partnerId,
      updatedBy: null,
      createdAt: iso(-60 * 24 * 2),
      updatedAt: iso(-60 * 24 * 2),
    },
    {
      id: 'd3',
      title: '周末去海边走走',
      dateOn: daysFromNow(24),
      timeAt: null,
      place: '东海岸线',
      activity: 'travel',
      budget: 600,
      note: '看天气再定，可能要带外套',
      status: 'planned',
      completedAt: null,
      createdBy: partnerId,
      updatedBy: null,
      createdAt: iso(-60 * 24 * 1),
      updatedAt: iso(-60 * 24 * 1),
    },
    {
      id: 'd4',
      title: '一起看了那部期待很久的电影',
      dateOn: daysFromNow(-9),
      timeAt: '20:30',
      place: '万象城 IMAX',
      activity: 'movie',
      budget: 160,
      note: '你哭了，还嘴硬说没有',
      status: 'done',
      completedAt: iso(-60 * 24 * 9),
      createdBy: meId,
      updatedBy: null,
      createdAt: iso(-60 * 24 * 20),
      updatedAt: iso(-60 * 24 * 9),
    },
    {
      id: 'd5',
      title: '下午茶 + 散步',
      dateOn: daysFromNow(-21),
      timeAt: '15:30',
      place: '梧桐区',
      activity: 'coffee',
      budget: 78,
      note: null,
      status: 'done',
      completedAt: iso(-60 * 24 * 21),
      createdBy: partnerId,
      updatedBy: null,
      createdAt: iso(-60 * 24 * 25),
      updatedAt: iso(-60 * 24 * 21),
    },
  ]

  const ideas: Idea[] = [
    { id: 'i1', title: '一起做一顿饭', emoji: '🍳', createdBy: meId, createdAt: iso(-500) },
    { id: 'i2', title: '去公园散步', emoji: '🌳', createdBy: partnerId, createdAt: iso(-400) },
    { id: 'i3', title: '唱一次 KTV', emoji: '🎤', createdBy: meId, createdAt: iso(-300) },
    { id: 'i4', title: '拼一幅一千片的拼图', emoji: '🧩', createdBy: partnerId, createdAt: iso(-200) },
    { id: 'i5', title: '去邻市住一晚', emoji: '✈️', createdBy: meId, createdAt: iso(-100) },
  ]

  return {
    me: { id: meId, displayName: '我', emoji: '🌙' },
    partner: { id: partnerId, displayName: '小朋友', emoji: '🌸' },
    space: {
      id: coupleId,
      name: '我们的小天地',
      slogan: '和喜欢的人，一起去喜欢的地方。',
      inviteCode: 'LOVE26',
      anniversary: daysFromNow(-412),
      createdAt: iso(-60 * 24 * 412),
    },
    dates,
    ideas,
  }
}

export function createDemoDataProvider(): DataProvider {
  let state = seed()
  let counter = 0
  const listeners = new Set<(topic: 'dates' | 'ideas' | 'space' | 'members') => void>()

  function emit(topic: 'dates' | 'ideas' | 'space' | 'members') {
    listeners.forEach((l) => l(topic))
  }

  function nextId(prefix: string) {
    counter += 1
    return `${prefix}-${Date.now().toString(36)}-${counter}`
  }

  const session: Session = { userId: 'demo-me', email: 'demo@example.com' }

  return {
    kind: 'demo',
    persistent: false,

    async getSession() {
      return session
    },

    onAuthStateChange() {
      return () => {}
    },

    async signUp(): Promise<SignUpResult> {
      return { session, needsEmailConfirm: false }
    },

    async signIn() {
      return session
    },

    async signOut() {
      throw new AppError('UNKNOWN', '演示模式下不能退出登录，配置 Supabase 后即可正常使用')
    },

    async loadSpace(): Promise<SpaceSnapshot> {
      return {
        space: { ...state.space },
        me: { ...state.me },
        members: [
          { ...state.me, role: 'owner', joinedAt: state.space.createdAt },
          { ...state.partner, role: 'member', joinedAt: iso(-60 * 24 * 400) },
        ],
      }
    },

    async createSpace(input: CreateSpaceInput) {
      state.space = {
        ...state.space,
        name: input.name || state.space.name,
        anniversary: input.anniversary,
      }
      state.me = { ...state.me, displayName: input.displayName || state.me.displayName }
      emit('space')
    },

    async joinSpace() {
      /* 演示模式已经在空间里了 */
    },

    async previewInvite(code: string): Promise<InvitePreview | null> {
      if (code.trim().toUpperCase() !== state.space.inviteCode) return null
      return {
        coupleId: state.space.id,
        name: state.space.name,
        memberCount: 1,
        hasAnniversary: Boolean(state.space.anniversary),
      }
    },

    async updateSpace(patch) {
      state.space = { ...state.space, ...patch }
      emit('space')
    },

    async regenerateInviteCode() {
      // 和真实实现保持一致：6 位、去掉容易看错的 0/O/1/I
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      for (let i = 0; i < 6; i += 1) {
        code += alphabet[Math.floor(Math.random() * alphabet.length)]
      }
      state.space = { ...state.space, inviteCode: code }
      emit('space')
      return code
    },

    async updateMyProfile(patch) {
      state.me = {
        ...state.me,
        displayName: patch.displayName ?? state.me.displayName,
        emoji: patch.emoji ?? state.me.emoji,
      }
      emit('members')
    },

    async listDates() {
      return [...state.dates]
    },

    async createDate(input: DateDraft) {
      const item: DateItem = {
        id: nextId('d'),
        ...input,
        status: 'planned',
        completedAt: null,
        createdBy: state.me.id,
        updatedBy: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      state.dates = [...state.dates, item]
      emit('dates')
      return item
    },

    async updateDate(id, patch) {
      const idx = state.dates.findIndex((d) => d.id === id)
      if (idx < 0) throw new AppError('UNKNOWN', '找不到这次约会')
      const prev = state.dates[idx]
      const next: DateItem = {
        ...prev,
        ...patch,
        completedAt:
          patch.status === 'done'
            ? (prev.completedAt ?? new Date().toISOString())
            : patch.status === 'planned'
              ? null
              : prev.completedAt,
        updatedBy: state.me.id,
        updatedAt: new Date().toISOString(),
      }
      state.dates = state.dates.map((d) => (d.id === id ? next : d))
      emit('dates')
      return next
    },

    async deleteDate(id) {
      state.dates = state.dates.filter((d) => d.id !== id)
      emit('dates')
    },

    async listIdeas() {
      return [...state.ideas]
    },

    async addIdea(title, emoji) {
      const idea: Idea = {
        id: nextId('i'),
        title: title.trim(),
        emoji: emoji || '✨',
        createdBy: state.me.id,
        createdAt: new Date().toISOString(),
      }
      state.ideas = [idea, ...state.ideas]
      emit('ideas')
      return idea
    },

    async deleteIdea(id) {
      state.ideas = state.ideas.filter((i) => i.id !== id)
      emit('ideas')
    },

    subscribe(_coupleId, onChange) {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
  }
}
