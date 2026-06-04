'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

const DURATION_OPTIONS = [7, 14, 30, 60]

type Props = {
  bookId: string
  bookTitle: string
  ownerId: string
}

export default function BorrowButton({ bookId, bookTitle, ownerId }: Props) {
  const t = useTranslations('loans')
  const tc = useTranslations('common')
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedDays, setSelectedDays] = useState<number | null>(null)
  const [customMode, setCustomMode] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [loading, setLoading] = useState(false)

  const requestedDays = customMode ? (parseInt(customValue) || null) : selectedDays

  function handleClose() {
    setOpen(false)
    setMessage('')
    setSelectedDays(null)
    setCustomMode(false)
    setCustomValue('')
  }

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/borrow-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, ownerId, message, requestedDays }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? tc('somethingWentWrong'))
        return
      }
      toast.success(t('borrowRequestSent'))
      handleClose()
    } catch {
      toast.error(tc('somethingWentWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="border-stone-300 text-stone-700 hover:bg-stone-50 shrink-0"
        onClick={() => setOpen(true)}
      >
        {t('requestToBorrow')}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h3 className="font-semibold text-stone-800 text-base mb-1">{t('requestToBorrow')}</h3>
            <p className="text-sm text-stone-500 mb-4 truncate">"{bookTitle}"</p>

            {/* Duration selector */}
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              {t('borrowDuration')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
            </label>
            <div className="flex gap-1.5 flex-wrap mb-1.5">
              {DURATION_OPTIONS.map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => { setSelectedDays(d); setCustomMode(false); setCustomValue('') }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    selectedDays === d && !customMode
                      ? 'bg-stone-800 text-white border-stone-800'
                      : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  {d}d
                </button>
              ))}
              <button
                type="button"
                onClick={() => { setCustomMode(true); setSelectedDays(null) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  customMode
                    ? 'bg-stone-800 text-white border-stone-800'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {t('customDays')}
              </button>
            </div>
            {customMode && (
              <input
                type="number"
                min="1"
                max="365"
                value={customValue}
                onChange={e => setCustomValue(e.target.value)}
                placeholder={t('customDaysPlaceholder')}
                className="mb-3 w-28 rounded-xl border border-stone-200 px-3 py-2 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
              />
            )}

            {/* Message */}
            <label className="block text-xs font-medium text-stone-600 mb-1.5 mt-3">
              {t('messageLabel')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={t('addNoteForOwner')}
              rows={3}
              className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
            />

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-stone-800 text-white hover:bg-stone-700"
              >
                {loading ? t('sending') : t('sendRequest')}
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="border-stone-200 text-stone-600 hover:bg-stone-50"
              >
                {tc('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
