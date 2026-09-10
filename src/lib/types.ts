/** 领域模型：整个应用内部统一使用的类型（与数据库列名解耦） */

export type ActivityKey =
  | 'eat'
  | 'movie'
  | 'coffee'
  | 'walk'
  | 'play'
  | 'travel'
  | 'surprise'
  | 'other'

export type DateStatus = 'planned' | 'done'

export type MemberRole = 'owner' | 'member'

export interface Session {
  userId: string
  email: string
}

export interface Profile {
  id: string
  displayName: string
  emoji: string
}

export interface Space {
  id: string
  name: string
  slogan: string
  inviteCode: string
  /** YYYY-MM-DD，可为空 */
  anniversary: string | null
  createdAt: string
}

export interface Member extends Profile {
  role: MemberRole
  joinedAt: string
}

export interface DateItem {
  id: string
  title: string
  /** YYYY-MM-DD */
  dateOn: string
  /** HH:MM，可为空表示「还没定几点」 */
  timeAt: string | null
  place: string | null
  activity: ActivityKey
  budget: number | null
  note: string | null
  status: DateStatus
  completedAt: string | null
  createdBy: string
  updatedBy: string | null
  createdAt: string
  updatedAt: string
}

/** 创建 / 编辑约会时提交的字段 */
export interface DateDraft {
  title: string
  dateOn: string
  timeAt: string | null
  place: string | null
  activity: ActivityKey
  budget: number | null
  note: string | null
}

export interface Idea {
  id: string
  title: string
  emoji: string
  createdBy: string
  createdAt: string
}

export interface SpaceSnapshot {
  space: Space | null
  members: Member[]
  me: Profile | null
}

export interface Stats {
  /** 在一起多少天（未设置纪念日时为 null） */
  daysTogether: number | null
  total: number
  done: number
  planned: number
  /** 已完成约会的总花费 */
  spent: number
  /** 所有约会（含计划中）的预计总花费 */
  plannedSpend: number
  byActivity: Array<{ key: ActivityKey; count: number }>
}

/** 实时变更主题 */
export type ChangeTopic = 'dates' | 'ideas' | 'space' | 'members'
