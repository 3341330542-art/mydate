'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'

import { useApp } from '@/components/AppProvider'
import { DateForm } from '@/components/DateForm'
import { IconTrash } from '@/components/Icons'
import { useToast } from '@/components/Toast'
import { Button, ConfirmSheet, EmptyState, Screen, TopBar } from '@/components/ui'
import { messageOf } from '@/lib/errors'

export default function EditDatePage() {
  const params = useParams<{ id: string }>()
  const id = typeof params?.id === 'string' ? params.id : ''
  const router = useRouter()
  const toast = useToast()

  const { dates, updateDate, deleteDate, pending } = useApp()
  const item = useMemo(() => dates.find((d) => d.id === id) ?? null, [dates, id])
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (!item) {
    return (
      <Screen className="pt-3">
        <TopBar title="编辑约会" onBack={() => router.back()} />
        <EmptyState
          emoji="🍃"
          title="这次约会不见了"
          description="可能已经被删除了。"
          action={
            <Link href="/dates">
              <Button variant="ghost">回到约会列表</Button>
            </Link>
          }
        />
      </Screen>
    )
  }

  async function handleDelete() {
    if (!item) return
    try {
      await deleteDate(item.id)
      setConfirmDelete(false)
      toast.success('已经删除了')
      router.replace('/dates')
    } catch (err) {
      toast.error(messageOf(err))
    }
  }

  return (
    <Screen className="pt-3">
      <TopBar title="编辑约会" subtitle={item.title} onBack={() => router.back()} />

      <DateForm
        initial={item}
        submitLabel="保存修改"
        onSubmit={async (draft) => {
          await updateDate(item!.id, draft)
          toast.success('已经保存')
          router.replace(`/dates/${item!.id}`)
        }}
        extra={
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="mx-auto mt-2 flex items-center gap-1.5 px-3 py-2 text-[12px] text-ink-3 transition hover:text-accent-deep"
          >
            <IconTrash className="h-3.5 w-3.5" />
            删除这次约会
          </button>
        }
      />

      <div className="h-8" />

      <ConfirmSheet
        open={confirmDelete}
        title="删除这次约会？"
        description={`「${item.title}」会被永久删除，你们两个人都看不到了。`}
        confirmText="删除"
        danger
        loading={pending}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Screen>
  )
}
