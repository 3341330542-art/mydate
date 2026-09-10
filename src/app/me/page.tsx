'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { useApp } from '@/components/AppProvider'
import { InvitePanel } from '@/components/InvitePanel'
import { IconEdit, IconLogout, IconLock } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import {
  Button,
  Card,
  ConfirmSheet,
  Field,
  FormError,
  Screen,
  SectionTitle,
  Sheet,
  TopBar,
} from '@/components/ui'
import { activityOf } from '@/lib/activities'
import { formatFullDate, formatMoney } from '@/lib/datetime'
import { messageOf } from '@/lib/errors'

const AVATARS = ['🌙', '🌸', '🐰', '🐻', '🍑', '🌿', '⭐️', '🐳', '🍓', '🐱', '☁️', '🍊']

function SettingRow({
  label,
  value,
  onClick,
  muted,
}: {
  label: string
  value: string
  onClick?: () => void
  muted?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 py-3 text-left transition active:opacity-70"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-[11.5px] text-ink-3">{label}</span>
        <span
          className={`mt-0.5 block truncate text-[14px] ${muted ? 'text-ink-3' : 'text-ink'}`}
        >
          {value}
        </span>
      </span>
      {onClick ? <IconEdit className="h-4 w-4 shrink-0 text-ink-4" /> : null}
    </button>
  )
}

export default function MePage() {
  const {
    me,
    partner,
    space,
    members,
    session,
    stats,
    updateMyProfile,
    updateSpace,
    signOut,
    pending,
    demo,
  } = useApp()
  const toast = useToast()
  const router = useRouter()

  // 个人资料
  const [profileOpen, setProfileOpen] = useState(false)
  const [nickname, setNickname] = useState('')
  const [avatar, setAvatar] = useState('🌙')

  // 空间设置
  const [spaceOpen, setSpaceOpen] = useState(false)
  const [spaceName, setSpaceName] = useState('')
  const [slogan, setSlogan] = useState('')
  const [anniversary, setAnniversary] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [logoutOpen, setLogoutOpen] = useState(false)

  /**
   * 表单内容只在「打开弹层」的那一刻从当前数据同步一次。
   * 不在 effect 里跟着 me / space 走 —— 因为每当前台切回来或对方改了数据，
   * 这两个对象都会被整体替换，那样会把用户正在输入的内容冲掉。
   */
  function openProfile() {
    setError(null)
    setNickname(me?.displayName ?? '')
    setAvatar(me?.emoji ?? '🌙')
    setProfileOpen(true)
  }

  function openSpace() {
    setError(null)
    setSpaceName(space?.name ?? '')
    setSlogan(space?.slogan ?? '')
    setAnniversary(space?.anniversary ?? '')
    setSpaceOpen(true)
  }

  async function saveProfile() {
    setError(null)
    if (!nickname.trim()) {
      setError('名字不能为空')
      return
    }
    try {
      await updateMyProfile({ displayName: nickname.trim(), emoji: avatar })
      setProfileOpen(false)
      toast.success('已经更新')
    } catch (err) {
      setError(messageOf(err))
    }
  }

  async function saveSpace() {
    setError(null)
    if (!spaceName.trim()) {
      setError('空间名字不能为空')
      return
    }
    try {
      await updateSpace({
        name: spaceName.trim(),
        // 允许清空成空字符串（首页会回退到默认文案），
        // 不能传 undefined —— 那会被当成「这个字段不改」
        slogan: slogan.trim(),
        anniversary: anniversary || null,
      })
      setSpaceOpen(false)
      toast.success('已经更新')
    } catch (err) {
      setError(messageOf(err))
    }
  }

  async function handleSignOut() {
    try {
      await signOut()
      setLogoutOpen(false)
      router.replace('/login')
    } catch (err) {
      toast.error(messageOf(err))
    }
  }

  const maxActivity = Math.max(1, ...stats.byActivity.map((a) => a.count))

  return (
    <Screen className="pt-3">
      <TopBar title="我的" subtitle={session?.email} />

      {/* ------------------------------------------------------------ 资料卡 */}
      <Card className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'linear-gradient(135deg, #FDF1F4 0%, #FFFBF8 60%)' }}
        />
        <div className="relative flex items-center gap-4">
          <button
            type="button"
            onClick={openProfile}
            aria-label="修改我的资料"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-white text-[26px] shadow-soft transition active:scale-95"
          >
            {me?.emoji ?? '🌙'}
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[17px] font-semibold text-ink">
              {me?.displayName ?? '我'}
            </p>
            <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
              {partner
                ? `和 ${partner.emoji} ${partner.displayName} 在一起`
                : 'Ta 还没有加入这个空间'}
            </p>
          </div>
          <button
            type="button"
            onClick={openProfile}
            aria-label="编辑资料"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-ink-3 transition active:scale-90"
          >
            <IconEdit className="h-4 w-4" />
          </button>
        </div>
      </Card>

      {/* ------------------------------------------------------------ 我们的小天地 */}
      <SectionTitle>我们的小天地</SectionTitle>
      <Card className="divide-y divide-line px-5 py-1.5">
        <SettingRow label="空间名字" value={space?.name ?? '—'} onClick={() => setSpaceOpen(true)} />
        <SettingRow
          label="在一起的日子"
          value={space?.anniversary ? formatFullDate(space.anniversary) : '还没填'}
          muted={!space?.anniversary}
          onClick={openSpace}
        />
        <SettingRow
          label="首页文案"
          value={space?.slogan?.trim() || '默认文案'}
          onClick={openSpace}
        />
      </Card>

      <p className="mt-2.5 flex items-start gap-2 px-1 text-[11.5px] leading-relaxed text-ink-3">
        <IconLock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        空间里的内容只有你们两个人能看到，别人即使拿到链接也读不到。
      </p>

      {/* -------------------------------------------------------------- 邀请 */}
      <SectionTitle>邀请另一半</SectionTitle>
      <InvitePanel />

      {/* -------------------------------------------------------------- 数据 */}
      <SectionTitle>我们的数据</SectionTitle>
      <div className="stagger grid grid-cols-2 gap-2.5">
        {[
          {
            label: '在一起',
            value: stats.daysTogether != null ? `${stats.daysTogether} 天` : '未设置',
          },
          { label: '约会总数', value: `${stats.total} 次` },
          { label: '已完成', value: `${stats.done} 次` },
          { label: '待赴约', value: `${stats.planned} 次` },
        ].map((s) => (
          <div key={s.label} className="card px-4 py-3.5">
            <p className="text-[11.5px] text-ink-3">{s.label}</p>
            <p className="tabular mt-1 text-[18px] leading-none font-semibold text-ink">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <Card className="mt-2.5">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] text-ink-3">已完成约会的花费</p>
          <p className="tabular text-[16px] font-semibold text-ink">
            {formatMoney(stats.spent) ?? '¥0'}
          </p>
        </div>
        {stats.plannedSpend > 0 ? (
          <p className="mt-1.5 text-[11.5px] text-ink-3">
            还有 {formatMoney(stats.plannedSpend)} 是计划中的预计花费
          </p>
        ) : null}
      </Card>

      {stats.byActivity.length > 0 ? (
        <Card className="mt-2.5">
          <p className="text-[12px] text-ink-3">我们都爱做什么</p>
          <ul className="mt-3 space-y-2.5">
            {stats.byActivity
              .slice()
              .sort((a, b) => b.count - a.count)
              .map((a) => {
                const meta = activityOf(a.key)
                return (
                  <li key={a.key} className="flex items-center gap-3">
                    <span className="w-[68px] shrink-0 text-[12px] text-ink-2">
                      {meta.emoji} {meta.label}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-cream-2">
                      <span
                        className="block h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.max(8, (a.count / maxActivity) * 100)}%`,
                          background: meta.ink,
                          opacity: 0.75,
                        }}
                      />
                    </span>
                    <span className="tabular w-6 shrink-0 text-right text-[11.5px] text-ink-3">
                      {a.count}
                    </span>
                  </li>
                )
              })}
          </ul>
        </Card>
      ) : null}

      {/* -------------------------------------------------------------- 账号 */}
      <SectionTitle>账号</SectionTitle>
      <Card className="px-5 py-1.5">
        <SettingRow label="登录邮箱" value={session?.email ?? '—'} />
        <SettingRow label="空间成员" value={`${members.length} / 2 人`} />
        <SettingRow
          label="数据存储"
          value={demo ? '演示模式（不会保存）' : 'Supabase 云端数据库'}
          muted={demo}
        />
      </Card>

      <div className="mt-4">
        <Button variant="ghost" size="lg" full onClick={() => setLogoutOpen(true)} disabled={pending}>
          <IconLogout className="h-4 w-4" />
          退出登录
        </Button>
      </div>

      <p className="mt-6 pb-2 text-center text-[11px] leading-relaxed text-ink-4">
        我们的小天地 · 和喜欢的人，一起去喜欢的地方。
        <br />
        数据保存在云端，换手机重新登录也还在。
      </p>

      {/* ------------------------------------------------------------ 弹层 */}
      <Sheet
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        title="我的资料"
        description="Ta 会在约会卡片上看到你的名字"
      >
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-2">头像</p>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`flex h-11 items-center justify-center rounded-2xl text-[20px] transition active:scale-90 ${
                    avatar === a ? 'bg-blush ring-2 ring-accent/40' : 'bg-cream-2'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <Field
            label="名字"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            maxLength={20}
          />

          <FormError>{error}</FormError>

          <Button size="lg" full onClick={saveProfile} disabled={pending}>
            {pending ? '保存中…' : '保存'}
          </Button>
        </div>
      </Sheet>

      <Sheet
        open={spaceOpen}
        onClose={() => setSpaceOpen(false)}
        title="我们的小天地"
        description="这些信息只对你们两个人可见"
      >
        <div className="space-y-4">
          <Field
            label="空间名字"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            maxLength={24}
          />
          <Field
            label="在一起的日子"
            hint="填了会显示在一起多少天"
            type="date"
            value={anniversary}
            onChange={(e) => setAnniversary(e.target.value)}
            className="tabular"
          />
          <Field
            label="首页文案"
            value={slogan}
            onChange={(e) => setSlogan(e.target.value)}
            maxLength={40}
          />

          <FormError>{error}</FormError>

          <Button size="lg" full onClick={saveSpace} disabled={pending}>
            {pending ? '保存中…' : '保存'}
          </Button>
        </div>
      </Sheet>

      <ConfirmSheet
        open={logoutOpen}
        title="退出登录？"
        description="退出后数据不会丢失，用邮箱和密码重新登录就能回来。"
        confirmText="退出"
        cancelText="再想想"
        loading={pending}
        onConfirm={handleSignOut}
        onClose={() => setLogoutOpen(false)}
      />
    </Screen>
  )
}
