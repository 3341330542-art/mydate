'use client'

import { useState, type FormEvent } from 'react'

import { ACTIVITIES } from '@/lib/activities'
import { toISODate, todayISO } from '@/lib/datetime'
import type { ActivityKey, DateDraft, DateItem } from '@/lib/types'

import { Button, Field, FormError, TextArea } from './ui'

function quickDates(): Array<{ label: string; value: string }> {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  // 最近的周六
  const sat = new Date(today)
  const delta = (6 - today.getDay() + 7) % 7 || 7
  sat.setDate(today.getDate() + delta)

  return [
    { label: '今天', value: toISODate(today) },
    { label: '明天', value: toISODate(tomorrow) },
    { label: '这周六', value: toISODate(sat) },
  ]
}

export interface DateFormProps {
  /** 编辑时传入原始数据 */
  initial?: DateItem | null
  /** 新建时预填的标题（例如从抽签结果跳过来） */
  presetTitle?: string
  submitLabel: string
  onSubmit: (draft: DateDraft) => Promise<void>
  /** 编辑模式下额外渲染的删除按钮 */
  extra?: React.ReactNode
}

export function DateForm({ initial, presetTitle, submitLabel, onSubmit, extra }: DateFormProps) {
  const [title, setTitle] = useState(initial?.title ?? presetTitle ?? '')
  const [dateOn, setDateOn] = useState(initial?.dateOn ?? todayISO())
  const [timeAt, setTimeAt] = useState(initial?.timeAt ?? '')
  const [place, setPlace] = useState(initial?.place ?? '')
  const [activity, setActivity] = useState<ActivityKey>(initial?.activity ?? 'other')
  const [budget, setBudget] = useState(initial?.budget != null ? String(initial.budget) : '')
  const [note, setNote] = useState(initial?.note ?? '')

  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const quick = quickDates()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const cleanTitle = title.trim()
    if (!cleanTitle) {
      setError('给这次约会起个名字吧')
      return
    }
    if (!dateOn) {
      setError('选一个日期吧')
      return
    }

    const budgetNum = budget.trim() === '' ? null : Number(budget)
    if (budgetNum !== null && (!Number.isFinite(budgetNum) || budgetNum < 0)) {
      setError('预计花费填一个正常的数字就好')
      return
    }

    const draft: DateDraft = {
      title: cleanTitle,
      dateOn,
      timeAt: timeAt.trim() === '' ? null : timeAt,
      place: place.trim() === '' ? null : place.trim(),
      activity,
      budget: budgetNum,
      note: note.trim() === '' ? null : note.trim(),
    }

    setSaving(true)
    try {
      await onSubmit(draft)
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败，再试一次')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="card space-y-4 p-5">
        <Field
          label="约会名称"
          placeholder="例如：去看那家新开的美术馆"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={60}
          autoComplete="off"
          enterKeyHint="done"
        />

        <div>
          <Field
            label="日期"
            type="date"
            value={dateOn}
            onChange={(e) => setDateOn(e.target.value)}
            className="tabular"
          />
          <div className="mt-2 flex gap-2">
            {quick.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setDateOn(q.value)}
                className={`chip transition active:scale-95 ${
                  dateOn === q.value
                    ? 'bg-accent text-white'
                    : 'border border-line bg-white text-ink-2'
                }`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        <Field
          label="时间"
          hint="不确定就先空着"
          type="time"
          value={timeAt}
          onChange={(e) => setTimeAt(e.target.value)}
          className="tabular"
        />

        <Field
          label="地点"
          placeholder="例如：西岸美术馆"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          maxLength={80}
          autoComplete="off"
        />
      </div>

      <div className="card p-5">
        <p className="mb-3 text-[13px] font-medium text-ink-2">活动类型</p>
        <div className="grid grid-cols-4 gap-2">
          {ACTIVITIES.map((a) => {
            const active = activity === a.key
            return (
              <button
                key={a.key}
                type="button"
                onClick={() => setActivity(a.key)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 transition-all duration-200 active:scale-95 ${
                  active ? 'ring-2 ring-accent/45' : 'ring-1 ring-line'
                }`}
                style={{ background: active ? a.tint : '#fff' }}
              >
                <span className="text-[19px] leading-none" aria-hidden="true">
                  {a.emoji}
                </span>
                <span
                  className={`text-[11px] leading-none font-medium ${active ? '' : 'text-ink-3'}`}
                  style={active ? { color: a.ink } : undefined}
                >
                  {a.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="card space-y-4 p-5">
        <Field
          label="预计花费"
          hint="选填"
          placeholder="0"
          inputMode="decimal"
          value={budget}
          onChange={(e) => setBudget(e.target.value.replace(/[^\d.]/g, ''))}
        />

        <TextArea
          label="备注"
          hint="选填"
          placeholder="想提醒对方的话、要带的东西、要预约的事…"
          rows={4}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <FormError>{error}</FormError>

      <Button type="submit" size="lg" full disabled={saving}>
        {saving ? '保存中…' : submitLabel}
      </Button>

      {extra}
    </form>
  )
}
