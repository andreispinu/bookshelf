'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { updateProgress, finishBook, readAgain } from './actions'
import type { ReadingRow } from './page'

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button key={star} type="button" onClick={() => onChange(star)}>
          <Star
            className={`h-7 w-7 transition-colors ${
              star <= value ? 'text-amber-400 fill-amber-400' : 'text-stone-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function StarDisplay({ value }: { value: number | null }) {
  if (!value) return null
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(star => (
        <Star
          key={star}
          className={`h-4 w-4 ${star <= value ? 'text-amber-400 fill-amber-400' : 'text-stone-200'}`}
        />
      ))}
    </div>
  )
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

export default function ReadingProgressClient({
  inProgress: initialInProgress,
  finished: initialFinished,
}: {
  inProgress: ReadingRow[]
  finished: ReadingRow[]
}) {
  const t = useTranslations('books')
  const [inProgress, setInProgress] = useState(initialInProgress)
  const [finished, setFinished] = useState(initialFinished)
  const [finishTarget, setFinishTarget] = useState<ReadingRow | null>(null)
  const [rating, setRating] = useState(0)
  const [review, setReview] = useState('')
  const [saving, setSaving] = useState(false)
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const handleProgressChange = useCallback((bookId: string, percent: number) => {
    setInProgress(prev => prev.map(r => r.book_id === bookId ? { ...r, progress_percent: percent } : r))
    if (debounceTimers.current[bookId]) clearTimeout(debounceTimers.current[bookId])
    debounceTimers.current[bookId] = setTimeout(async () => {
      await updateProgress(bookId, percent)
    }, 800)
  }, [])

  function openFinishModal(row: ReadingRow) {
    setFinishTarget(row)
    setRating(0)
    setReview('')
  }

  async function handleFinish() {
    if (!finishTarget) return
    setSaving(true)
    const result = await finishBook(finishTarget.book_id, rating || null, review || null)
    setSaving(false)
    if (result.error) { toast.error(result.error); return }
    const finishedRow: ReadingRow = {
      ...finishTarget,
      status: 'finished',
      progress_percent: 100,
      rating: rating || null,
      review: review || null,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setInProgress(prev => prev.filter(r => r.book_id !== finishTarget.book_id))
    setFinished(prev => [finishedRow, ...prev])
    setFinishTarget(null)
  }

  async function handleReadAgain(row: ReadingRow) {
    const result = await readAgain(row.book_id)
    if (result.error) { toast.error(result.error); return }
    const readingRow: ReadingRow = {
      ...row,
      status: 'reading',
      progress_percent: 0,
      rating: null,
      review: null,
      finished_at: null,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setFinished(prev => prev.filter(r => r.book_id !== row.book_id))
    setInProgress(prev => [readingRow, ...prev])
  }

  return (
    <div className="space-y-10">
      {/* In progress */}
      <section>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
          {t('inProgress')}
        </h3>
        {inProgress.length === 0 ? (
          <p className="text-stone-400 text-sm">{t('noReadingBooksYet')}</p>
        ) : (
          <div className="space-y-3">
            {inProgress.map(row => (
              <div key={row.id} className="flex gap-4 p-4 rounded-xl border border-stone-200 bg-white">
                <div className="shrink-0 w-14 h-20 rounded-lg bg-stone-100 overflow-hidden flex items-center justify-center">
                  {row.book.cover_url
                    ? <img src={row.book.cover_url} alt={row.book.title} className="w-full h-full object-cover" />
                    : <span className="text-stone-400 text-xl">📖</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 leading-snug">{row.book.title}</p>
                  <p className="text-sm text-stone-500">{row.book.author}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    {t('startedLabel')}: {formatDate(row.started_at)}
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={row.progress_percent}
                      onChange={e => handleProgressChange(row.book_id, Number(e.target.value))}
                      className="flex-1 accent-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-stone-600 w-8 text-right shrink-0">
                      {row.progress_percent}%
                    </span>
                  </div>
                  <div className="mt-2">
                    <button
                      className="text-sm text-emerald-700 hover:text-emerald-800 font-medium transition-colors"
                      onClick={() => openFinishModal(row)}
                    >
                      ✓ {t('iveFinishedThisBook')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Finished */}
      <section>
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-4">
          {t('finishedSection')}
        </h3>
        {finished.length === 0 ? (
          <p className="text-stone-400 text-sm">{t('keepGoing')}</p>
        ) : (
          <div className="space-y-3">
            {finished.map(row => (
              <div key={row.id} className="flex gap-4 p-4 rounded-xl border border-stone-200 bg-white">
                <div className="shrink-0 w-14 h-20 rounded-lg bg-stone-100 overflow-hidden flex items-center justify-center">
                  {row.book.cover_url
                    ? <img src={row.book.cover_url} alt={row.book.title} className="w-full h-full object-cover" />
                    : <span className="text-stone-400 text-xl">📖</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-stone-800 leading-snug">{row.book.title}</p>
                  <p className="text-sm text-stone-500">{row.book.author}</p>
                  {row.finished_at && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      {t('finishedOnLabel')}: {formatDate(row.finished_at)}
                    </p>
                  )}
                  {row.rating && (
                    <div className="mt-1.5">
                      <StarDisplay value={row.rating} />
                    </div>
                  )}
                  {row.review && (
                    <p className="text-sm text-stone-600 mt-2 italic leading-relaxed">
                      &ldquo;{row.review}&rdquo;
                    </p>
                  )}
                  <div className="mt-2">
                    <button
                      className="text-sm text-stone-400 hover:text-stone-700 font-medium transition-colors"
                      onClick={() => handleReadAgain(row)}
                    >
                      ↺ {t('readAgain')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Finish modal */}
      <Dialog open={!!finishTarget} onOpenChange={open => { if (!open) setFinishTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('howWasIt')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {finishTarget && (
              <p className="text-sm text-stone-500 font-medium">{finishTarget.book.title}</p>
            )}
            <StarRating value={rating} onChange={setRating} />
            <Textarea
              placeholder={t('reviewPlaceholder')}
              value={review}
              onChange={e => setReview(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={handleFinish} disabled={saving}>
              {t('skipRating')}
            </Button>
            <Button onClick={handleFinish} disabled={saving} className="bg-stone-800 hover:bg-stone-700 text-white">
              {saving ? '…' : t('saveAndFinish')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
