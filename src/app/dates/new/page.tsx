'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

import { useApp } from '@/components/AppProvider'
import { DateForm } from '@/components/DateForm'
import { useToast } from '@/components/Toast'
import { Screen, TopBar } from '@/components/ui'

export default function NewDatePage() {
  const router = useRouter()
  const { createDate } = useApp()
  const toast = useToast()

  const [presetTitle, setPresetTitle] = useState('')
  const [ready, setReady] = useState(false)

  // 支持从「抽签结果」带标题跳过来：/dates/new?title=xxx
  useEffect(() => {
    const raw = new URLSearchParams(window.location.search).get('title') ?? ''
    setPresetTitle(raw.slice(0, 60))
    setReady(true)
  }, [])

  return (
    <Screen className="pt-3">
      <TopBar
        title="新建约会"
        subtitle="记下来，然后一起期待"
        onBack={() => router.back()}
      />

      {ready ? (
        <DateForm
          presetTitle={presetTitle}
          submitLabel="保存这次约会"
          onSubmit={async (draft) => {
            await createDate(draft)
            toast.success('约会已经安排好，等着那天到来吧')
            router.replace('/dates')
          }}
        />
      ) : (
        <div className="space-y-4">
          <div className="skeleton h-64 rounded-card" />
          <div className="skeleton h-40 rounded-card" />
        </div>
      )}

      <div className="h-8" />
    </Screen>
  )
}
