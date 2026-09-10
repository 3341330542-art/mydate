import type {
  ChangeTopic,
  DateDraft,
  DateItem,
  DateStatus,
  Idea,
  Session,
  Space,
  SpaceSnapshot,
} from '../types'

export interface InvitePreview {
  coupleId: string
  name: string
  memberCount: number
  hasAnniversary: boolean
}

export interface SignUpResult {
  session: Session | null
  needsEmailConfirm: boolean
}

export interface CreateSpaceInput {
  name: string
  anniversary: string | null
  displayName: string
  slogan?: string
}

/**
 * 数据访问层的统一接口。
 *
 * UI 只依赖这个接口，因此可以有两种实现：
 *   - supabase：正式实现，数据存在云端 PostgreSQL，两个人实时同步；
 *   - demo    ：本地演示实现，内存假数据，用于没配置数据库时预览界面。
 * 以后要换成别的后端，只需要再写一个实现即可。
 */
export interface DataProvider {
  readonly kind: 'supabase' | 'demo'
  /** 这个实现是否会把数据持久化到云端 */
  readonly persistent: boolean

  // ---------- 身份 ----------
  getSession(): Promise<Session | null>
  onAuthStateChange(cb: (session: Session | null) => void): () => void
  signUp(email: string, password: string, displayName: string): Promise<SignUpResult>
  signIn(email: string, password: string): Promise<Session>
  signOut(): Promise<void>

  // ---------- 情侣空间 ----------
  loadSpace(): Promise<SpaceSnapshot>
  createSpace(input: CreateSpaceInput): Promise<void>
  joinSpace(code: string): Promise<void>
  previewInvite(code: string): Promise<InvitePreview | null>
  updateSpace(patch: Partial<Pick<Space, 'name' | 'slogan' | 'anniversary'>>): Promise<void>
  regenerateInviteCode(): Promise<string>
  updateMyProfile(patch: { displayName?: string; emoji?: string }): Promise<void>

  // ---------- 约会 ----------
  listDates(): Promise<DateItem[]>
  createDate(input: DateDraft): Promise<DateItem>
  updateDate(id: string, patch: Partial<DateDraft> & { status?: DateStatus }): Promise<DateItem>
  deleteDate(id: string): Promise<void>

  // ---------- 灵感 / 抽签 ----------
  listIdeas(): Promise<Idea[]>
  addIdea(title: string, emoji: string): Promise<Idea>
  deleteIdea(id: string): Promise<void>

  // ---------- 实时同步 ----------
  /** 订阅情侣空间内的变更；返回取消订阅函数 */
  subscribe(coupleId: string, onChange: (topic: ChangeTopic) => void): () => void
}
