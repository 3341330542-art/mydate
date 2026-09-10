'use client'

import { useState } from 'react'

import { useApp } from './AppProvider'
import { IconCopy, IconLock, IconRefresh, IconShare } from './Icons'
import { QrCode } from './QrCode'
import { useToast } from './Toast'
import { Button, ConfirmSheet } from './ui'
import { copyText, shareText } from '@/lib/clipboard'
import { inviteUrl } from '@/lib/config'
import { messageOf } from '@/lib/errors'

export function InvitePanel() {
  const { space, members, regenerateInviteCode, demo, pending } = useApp()
  const toast = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)

  if (!space) return null

  const url = inviteUrl(space.inviteCode)
  const full = members.length >= 2

  async function handleCopyCode() {
    const ok = await copyText(space!.inviteCode)
    toast[ok ? 'success' : 'error'](ok ? '邀请码已复制' : '复制失败，请手动记下')
  }

  async function handleCopyLink() {
    const ok = await copyText(url)
    toast[ok ? 'success' : 'error'](ok ? '邀请链接已复制' : '复制失败，请长按链接手动复制')
  }

  async function handleShare() {
    const res = await shareText({
      title: '我们的小天地',
      text: `${space!.name} · 和喜欢的人，一起去喜欢的地方。邀请码 ${space!.inviteCode}`,
      url,
    })
    if (res === 'copied') toast.success('已复制，去粘贴给 Ta 吧')
    if (res === 'failed') toast.error('分享失败，请手动复制链接')
  }

  async function handleRegenerate() {
    try {
      await regenerateInviteCode()
      setConfirmOpen(false)
      toast.success('已生成新的邀请码')
    } catch (err) {
      toast.error(messageOf(err))
    }
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start justify-between gap-3 px-5 pt-5">
        <div>
          <h2 className="flex items-center gap-1.5 text-[15px] font-semibold text-ink">
            <IconLock className="h-4 w-4 text-accent" />
            {full ? '你们的空间已满员' : '邀请 Ta 加入'}
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
            {full
              ? '这个空间里已经有两个人啦，只有你们两个能看到里面的内容。'
              : '把下面的二维码或链接发给 Ta，Ta 打开后就能进入同一个空间。'}
          </p>
        </div>
      </div>

      {/* 邀请码 */}
      <div className="px-5 pt-4">
        <button
          type="button"
          onClick={handleCopyCode}
          className="flex w-full items-center justify-between gap-3 rounded-2xl bg-blush px-4 py-3.5 transition active:scale-[0.98]"
        >
          <span>
            <span className="block text-[11px] text-ink-3">邀请码</span>
            <span className="tabular mt-0.5 block text-[24px] leading-none font-semibold tracking-[0.22em] text-accent-deep">
              {space.inviteCode}
            </span>
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-ink-2">
            <IconCopy className="h-[18px] w-[18px]" />
          </span>
        </button>
      </div>

      {/* 二维码 */}
      <div className="flex flex-col items-center gap-3 px-5 pt-5">
        <div className="rounded-[26px] bg-white p-3 shadow-soft">
          <QrCode value={url} size={180} />
        </div>
        <p className="max-w-[17rem] text-center text-[11px] leading-relaxed text-ink-3">
          Ta 用手机相机扫一扫，就能直接打开你们的空间
        </p>
      </div>

      {/* 链接 */}
      <div className="px-5 pt-5">
        <p className="mb-1.5 text-[11px] text-ink-3">邀请链接</p>
        <p className="rounded-2xl bg-cream-2 px-3.5 py-2.5 text-[12px] leading-relaxed break-all text-ink-2 select-all">
          {url}
        </p>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 border-t border-line px-5 py-4">
        <Button variant="ghost" onClick={handleCopyLink} disabled={pending}>
          <IconCopy className="h-4 w-4" />
          复制链接
        </Button>
        <Button onClick={handleShare} disabled={pending}>
          <IconShare className="h-4 w-4" />
          分享给 Ta
        </Button>
      </div>

      {!full ? (
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="inline-flex items-center gap-1.5 text-[11.5px] text-ink-3 transition hover:text-ink-2"
          >
            <IconRefresh className="h-3.5 w-3.5" />
            重新生成邀请码
          </button>
        </div>
      ) : null}

      {demo ? (
        <p className="border-t border-line bg-cream-2 px-5 py-3 text-[11px] leading-relaxed text-ink-3">
          当前是演示模式，这里的邀请码和链接只是示意，配置数据库后才会真正生效。
        </p>
      ) : null}

      <ConfirmSheet
        open={confirmOpen}
        title="重新生成邀请码？"
        description="旧的邀请码会立即失效。如果 Ta 还没有加入，需要把新的邀请码再发一次。"
        confirmText="生成新的"
        loading={pending}
        onConfirm={handleRegenerate}
        onClose={() => setConfirmOpen(false)}
      />
    </div>
  )
}
