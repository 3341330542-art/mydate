import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config'
import { AppError, toAppError } from '../errors'
import { isActivityKey } from '../activities'
import { normalizeTime } from '../datetime'
import type {
  ChangeTopic,
  DateDraft,
  DateItem,
  DateStatus,
  Idea,
  Profile,
  Session,
  Space,
  SpaceSnapshot,
} from '../types'
import type { CreateSpaceInput, DataProvider, InvitePreview, SignUpResult } from './provider'

/** PostgreSQL 返回的 numeric 可能是数字或字符串，统一成 number */
function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function toText(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapProfile(r: any): Profile {
  return {
    id: r.id,
    displayName: r.display_name ?? '我',
    emoji: r.emoji ?? '🌙',
  }
}

function mapSpace(r: any): Space {
  return {
    id: r.id,
    name: r.name ?? '我们的小天地',
    slogan: r.slogan ?? '和喜欢的人，一起去喜欢的地方。',
    inviteCode: r.invite_code,
    anniversary: r.anniversary ?? null,
    createdAt: r.created_at,
  }
}

function mapDate(r: any): DateItem {
  return {
    id: r.id,
    title: r.title,
    dateOn: typeof r.date_on === 'string' ? r.date_on.slice(0, 10) : r.date_on,
    timeAt: normalizeTime(r.time_at),
    place: toText(r.place),
    activity: isActivityKey(r.activity) ? r.activity : 'other',
    budget: toNumber(r.budget),
    note: toText(r.note),
    status: r.status === 'done' ? 'done' : 'planned',
    completedAt: r.completed_at ?? null,
    createdBy: r.created_by,
    updatedBy: r.updated_by ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function mapIdea(r: any): Idea {
  return {
    id: r.id,
    title: r.title,
    emoji: r.emoji ?? '✨',
    createdBy: r.created_by,
    createdAt: r.created_at,
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function createSupabaseDataProvider(): DataProvider {
  const client: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // 打开它，这样即使 Supabase 那边还开着「确认邮箱」，
      // 用户点邮件里的链接回到站点也能直接登录
      detectSessionInUrl: true,
    },
    realtime: {
      params: { eventsPerSecond: 5 },
    },
  })

  let session: Session | null = null

  /**
   * 每次订阅都用一个新的频道名。
   *
   * 不能用固定的 `couple-space-<id>`：supabase-js 的 channel() 对同名的频道会
   * 直接复用尚未完全退出的旧实例，而 subscribe() 在那种状态下是空操作，
   * 结果就是「订阅悄悄失效、两边不再同步」且没有任何报错。
   */
  let channelSeq = 0

  function mapSession(s: { user: { id: string; email?: string | null } } | null): Session | null {
    if (!s?.user) return null
    return { userId: s.user.id, email: s.user.email ?? '' }
  }

  /** 读自己的资料行；读不到返回 null（不抛错） */
  async function fetchMyProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await client
      .from('profiles')
      .select('id, display_name, emoji')
      .eq('id', userId)
      .maybeSingle()
    if (error) return null
    return data ? mapProfile(data) : null
  }

  /**
   * 资料行不存在时补一条。
   * 什么情况会缺？典型的是账号在跑 0001_init.sql 之前就注册好了，
   * 那时候 handle_new_user 触发器还不存在。
   */
  async function ensureMyProfile(me: Session): Promise<Profile> {
    const fallbackName = (me.email.split('@')[0] || '我').slice(0, 20)
    const fallback: Profile = { id: me.userId, displayName: fallbackName, emoji: '🌙' }

    // 已经有行的话会因为主键冲突失败，忽略即可，下面统一读回来
    await client
      .from('profiles')
      .insert({ id: me.userId, display_name: fallbackName, emoji: '🌙' })

    const fresh = await fetchMyProfile(me.userId)
    if (fresh) return fresh

    // 连插入都失败了（例如网络问题）：先用内存里的兜底值撑住界面
    return fallback
  }

  async function ensureSession(): Promise<Session> {
    if (session) return session
    const { data, error } = await client.auth.getSession()
    if (error) throw toAppError(error)
    session = mapSession(data.session)
    if (!session) throw new AppError('NOT_AUTHENTICATED')
    return session
  }

  async function currentCoupleId(): Promise<string> {
    const { data, error } = await client.rpc('current_couple_id')
    if (error) throw toAppError(error)
    if (!data) throw new AppError('NO_SPACE')
    return data as string
  }

  return {
    kind: 'supabase',
    persistent: true,

    // ------------------------------------------------------------------ 身份
    async getSession() {
      const { data, error } = await client.auth.getSession()
      if (error) throw toAppError(error)
      session = mapSession(data.session)
      return session
    },

    onAuthStateChange(cb) {
      const { data } = client.auth.onAuthStateChange((_event, s) => {
        session = mapSession(s)
        cb(session)
      })
      return () => data.subscription.unsubscribe()
    },

    async signUp(email, password, displayName): Promise<SignUpResult> {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: displayName.trim() || '我' } },
      })
      if (error) throw toAppError(error)

      // Supabase 为了防止邮箱枚举，对已注册邮箱会返回一个 identities 为空的假用户
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new AppError('EMAIL_TAKEN')
      }

      session = mapSession(data.session)
      return { session, needsEmailConfirm: !data.session }
    },

    async signIn(email, password) {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw toAppError(error)
      session = mapSession(data.session)
      if (!session) throw new AppError('BAD_CREDENTIALS')
      return session
    },

    async signOut() {
      const { error } = await client.auth.signOut()
      session = null
      if (error) throw toAppError(error)
    },

    // ------------------------------------------------------------ 情侣空间
    async loadSpace(): Promise<SpaceSnapshot> {
      const me = await ensureSession()

      const profile = (await fetchMyProfile(me.userId)) ?? (await ensureMyProfile(me))

      const { data: membership, error: memErr } = await client
        .from('couple_members')
        .select('couple_id, role, joined_at')
        .eq('user_id', me.userId)
        .maybeSingle()

      if (memErr) throw toAppError(memErr)
      if (!membership) return { space: null, members: [], me: profile }

      const coupleId = membership.couple_id as string

      const { data: spaceRow, error: spErr } = await client
        .from('couples')
        .select('id, name, slogan, invite_code, anniversary, created_at')
        .eq('id', coupleId)
        .maybeSingle()
      if (spErr) throw toAppError(spErr)

      const { data: memberRows, error: mErr } = await client
        .from('couple_members')
        .select('user_id, role, joined_at')
        .eq('couple_id', coupleId)
      if (mErr) throw toAppError(mErr)

      const ids = (memberRows ?? []).map((m) => m.user_id as string)
      const profileMap = new Map<string, Profile>()
      if (profile) profileMap.set(profile.id, profile)

      if (ids.length) {
        const { data: profs } = await client
          .from('profiles')
          .select('id, display_name, emoji')
          .in('id', ids)
        for (const p of profs ?? []) {
          const mapped = mapProfile(p)
          profileMap.set(mapped.id, mapped)
        }
      }

      const members = (memberRows ?? []).map((m) => {
        const p = profileMap.get(m.user_id as string)
        return {
          id: m.user_id as string,
          displayName: p?.displayName ?? 'Ta',
          emoji: p?.emoji ?? '🤍',
          role: (m.role === 'owner' ? 'owner' : 'member') as 'owner' | 'member',
          joinedAt: m.joined_at as string,
        }
      })

      return { space: spaceRow ? mapSpace(spaceRow) : null, members, me: profile }
    },

    async createSpace(input: CreateSpaceInput) {
      const { error } = await client.rpc('create_couple', {
        p_name: input.name,
        p_anniversary: input.anniversary,
        p_display_name: input.displayName,
        p_slogan: input.slogan ?? null,
      })
      if (error) throw toAppError(error)
    },

    async joinSpace(code: string) {
      const { error } = await client.rpc('join_couple', { p_code: code.trim().toUpperCase() })
      if (error) throw toAppError(error)
    },

    async previewInvite(code: string): Promise<InvitePreview | null> {
      const { data, error } = await client.rpc('preview_invite', {
        p_code: code.trim().toUpperCase(),
      })
      if (error) throw toAppError(error)
      const row = Array.isArray(data) ? data[0] : data
      if (!row) return null
      return {
        coupleId: row.couple_id,
        name: row.name,
        memberCount: row.member_count ?? 0,
        hasAnniversary: Boolean(row.has_anniversary),
      }
    },

    async updateSpace(patch) {
      const coupleId = await currentCoupleId()
      const row: Record<string, unknown> = {}
      if (patch.name !== undefined) row.name = patch.name
      if (patch.slogan !== undefined) row.slogan = patch.slogan
      if (patch.anniversary !== undefined) row.anniversary = patch.anniversary
      if (!Object.keys(row).length) return

      const { error } = await client.from('couples').update(row).eq('id', coupleId)
      if (error) throw toAppError(error)
    },

    async regenerateInviteCode() {
      const { data, error } = await client.rpc('regenerate_invite_code')
      if (error) throw toAppError(error)
      return data as string
    },

    async updateMyProfile(patch) {
      const me = await ensureSession()
      const row: Record<string, unknown> = {}
      if (patch.displayName !== undefined) row.display_name = patch.displayName
      if (patch.emoji !== undefined) row.emoji = patch.emoji
      if (!Object.keys(row).length) return

      // 用 .select() 拿到受影响的行，才能发现「0 行被更新」这种静默失败
      const { data, error } = await client
        .from('profiles')
        .update(row)
        .eq('id', me.userId)
        .select('id')

      if (error) throw toAppError(error)

      if (!data || data.length === 0) {
        // profiles 里还没有这一行，补建一条，避免「提示保存成功但什么都没写」
        const { error: insertError } = await client.from('profiles').insert({
          id: me.userId,
          display_name: patch.displayName ?? '我',
          emoji: patch.emoji ?? '🌙',
        })
        if (insertError) throw toAppError(insertError)
      }
    },

    // ---------------------------------------------------------------- 约会
    async listDates(): Promise<DateItem[]> {
      const { data, error } = await client
        .from('dates')
        .select('*')
        .order('date_on', { ascending: true })
        .order('time_at', { ascending: true, nullsFirst: false })
      if (error) throw toAppError(error)
      return (data ?? []).map(mapDate)
    },

    async createDate(input: DateDraft): Promise<DateItem> {
      const me = await ensureSession()
      const coupleId = await currentCoupleId()

      const { data, error } = await client
        .from('dates')
        .insert({
          couple_id: coupleId,
          title: input.title.trim(),
          date_on: input.dateOn,
          time_at: input.timeAt,
          place: input.place,
          activity: input.activity,
          budget: input.budget,
          note: input.note,
          created_by: me.userId,
        })
        .select('*')
        .single()

      if (error) throw toAppError(error)
      return mapDate(data)
    },

    async updateDate(id, patch): Promise<DateItem> {
      const me = await ensureSession()
      const row: Record<string, unknown> = { updated_by: me.userId }

      if (patch.title !== undefined) row.title = patch.title.trim()
      if (patch.dateOn !== undefined) row.date_on = patch.dateOn
      if (patch.timeAt !== undefined) row.time_at = patch.timeAt
      if (patch.place !== undefined) row.place = patch.place
      if (patch.activity !== undefined) row.activity = patch.activity
      if (patch.budget !== undefined) row.budget = patch.budget
      if (patch.note !== undefined) row.note = patch.note
      if (patch.status !== undefined) {
        const status: DateStatus = patch.status
        row.status = status
        row.completed_at = status === 'done' ? new Date().toISOString() : null
      }

      // maybeSingle：如果这条约会已经被另一半删掉了，更新会命中 0 行，
      // 用 single() 会抛出 PostgREST 的英文错误码，界面就会弹英文
      const { data, error } = await client
        .from('dates')
        .update(row)
        .eq('id', id)
        .select('*')
        .maybeSingle()

      if (error) throw toAppError(error)
      if (!data) throw new AppError('UNKNOWN', '这次约会已经不在了，可能刚被另一半删掉')
      return mapDate(data)
    },

    async deleteDate(id) {
      const { error } = await client.from('dates').delete().eq('id', id)
      if (error) throw toAppError(error)
    },

    // ------------------------------------------------------------ 灵感抽签
    async listIdeas(): Promise<Idea[]> {
      const { data, error } = await client
        .from('ideas')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) throw toAppError(error)
      return (data ?? []).map(mapIdea)
    },

    async addIdea(title, emoji): Promise<Idea> {
      const me = await ensureSession()
      const coupleId = await currentCoupleId()

      const { data, error } = await client
        .from('ideas')
        .insert({
          couple_id: coupleId,
          title: title.trim(),
          emoji: emoji || '✨',
          created_by: me.userId,
        })
        .select('*')
        .single()

      if (error) throw toAppError(error)
      return mapIdea(data)
    },

    async deleteIdea(id) {
      const { error } = await client.from('ideas').delete().eq('id', id)
      if (error) throw toAppError(error)
    },

    // ---------------------------------------------------------------- 实时
    subscribe(coupleId: string, onChange: (topic: ChangeTopic) => void) {
      channelSeq += 1
      const channel = client
        .channel(`couple-space-${coupleId}-${channelSeq}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'dates', filter: `couple_id=eq.${coupleId}` },
          () => onChange('dates'),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'ideas', filter: `couple_id=eq.${coupleId}` },
          () => onChange('ideas'),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
          () => onChange('space'),
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'couple_members',
            filter: `couple_id=eq.${coupleId}`,
          },
          () => onChange('members'),
        )
        .subscribe()

      return () => {
        void client.removeChannel(channel)
      }
    },
  }
}
