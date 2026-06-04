'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookOpen, Sparkles, Check } from 'lucide-react'
import { removeFromReadWithAI, markInsightRead, updateReadingAiNotifications } from './actions'
import { toast } from 'sonner'

type ReadingInsight = {
  id: string
  position: number
  title: string
  insight: string
  extract: string
  delivered_at: string
  read_at: string | null
}

type ReadingBook = {
  id: string
  book_id: string
  status: 'pending' | 'generating' | 'active' | 'completed'
  book: {
    id: string
    title: string
    author: string
    cover_url: string | null
  }
  insights: ReadingInsight[]
}

export default function ReadingClient({
  readings: initialReadings,
  notificationsEnabled: initialNotifications,
}: {
  readings: ReadingBook[]
  notificationsEnabled: boolean
}) {
  const t = useTranslations('books')
  const router = useRouter()
  const [readings, setReadings] = useState(initialReadings)
  const [notificationsEnabled, setNotificationsEnabled] = useState(initialNotifications)
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set())

  async function handleStartReading(readingId: string, bookId: string) {
    setGeneratingIds(prev => new Set(prev).add(readingId))
    setReadings(prev => prev.map(r => r.id === readingId ? { ...r, status: 'generating' } : r))

    try {
      const res = await fetch('/api/read-with-ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingId, bookId }),
      })
      if (!res.ok) throw new Error('Generation failed')
      router.refresh()
    } catch {
      toast.error('Generation failed — please try again')
      setGeneratingIds(prev => { const s = new Set(prev); s.delete(readingId); return s })
      setReadings(prev => prev.map(r => r.id === readingId ? { ...r, status: 'pending' } : r))
    }
  }

  async function handleMarkRead(insightId: string, readingId: string) {
    setReadings(prev => prev.map(r => {
      if (r.id !== readingId) return r
      return {
        ...r,
        insights: r.insights.map(ins =>
          ins.id === insightId ? { ...ins, read_at: new Date().toISOString() } : ins
        ),
      }
    }))
    await markInsightRead(insightId)
  }

  async function handleRemove(readingId: string) {
    const result = await removeFromReadWithAI(readingId)
    if (result.error) {
      toast.error(result.error)
    } else {
      setReadings(prev => prev.filter(r => r.id !== readingId))
    }
  }

  async function handleToggleNotifications(enabled: boolean) {
    setNotificationsEnabled(enabled)
    await updateReadingAiNotifications(enabled)
  }

  const canAddMore = readings.length < 3

  return (
    <div className="space-y-4">
      {readings.map(reading => {
        const isGenerating = generatingIds.has(reading.id) || reading.status === 'generating'
        const deliveredInsights = reading.insights
        const readCount = deliveredInsights.filter(ins => ins.read_at).length
        const featuredInsight = deliveredInsights.length > 0
          ? deliveredInsights[deliveredInsights.length - 1]
          : null

        return (
          <div key={reading.id} className="border border-stone-200 rounded-xl p-5 bg-white">
            <div className="flex items-start gap-3 mb-4">
              <div className="shrink-0 w-12 h-16 rounded bg-stone-100 overflow-hidden flex items-center justify-center">
                {reading.book.cover_url
                  ? <img src={reading.book.cover_url} alt={reading.book.title} className="w-full h-full object-cover" />
                  : <BookOpen className="w-5 h-5 text-stone-400" />
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-stone-800 leading-snug">{reading.book.title}</p>
                <p className="text-sm text-stone-500">{reading.book.author}</p>
                {deliveredInsights.length > 0 && (
                  <p className="text-xs text-stone-400 mt-1">
                    {t('insightsReadProgress', { read: readCount, total: deliveredInsights.length })}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {reading.status === 'completed' && (
                  <Badge variant="outline" className="border-stone-200 text-stone-500 bg-stone-50 text-xs">
                    {t('completedLabel')}
                  </Badge>
                )}
                {(reading.status === 'active') && (
                  <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-xs">
                    {t('aiReadingBadge')}
                  </Badge>
                )}
                <button
                  onClick={() => handleRemove(reading.id)}
                  className="text-stone-300 hover:text-stone-500 transition-colors leading-none"
                  aria-label="Remove"
                >
                  ✕
                </button>
              </div>
            </div>

            {reading.status === 'pending' && !isGenerating && (
              <Button
                className="bg-stone-800 hover:bg-stone-700 text-white"
                onClick={() => handleStartReading(reading.id, reading.book_id)}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {t('startReading')}
              </Button>
            )}

            {isGenerating && (
              <div className="flex items-center gap-3 py-2 text-stone-500 text-sm">
                <div className="h-5 w-5 rounded-full border-2 border-stone-200 border-t-stone-600 animate-spin shrink-0" />
                {t('analyzingBook')}
              </div>
            )}

            {(reading.status === 'active' || reading.status === 'completed') && featuredInsight && (
              <div className={`rounded-lg p-4 ${!featuredInsight.read_at ? 'bg-amber-50 border border-amber-100' : 'bg-stone-50 border border-stone-100'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-stone-400 uppercase tracking-wide">
                    {!featuredInsight.read_at ? t('yourDailyInsight') : t('readLabel')}
                  </span>
                  <span className="text-xs text-stone-400">
                    {t('insightNumber', { position: featuredInsight.position, total: deliveredInsights.length })}
                  </span>
                </div>
                <p className="font-semibold text-stone-800 mb-2">{featuredInsight.title}</p>
                <p className="text-sm text-stone-600 leading-relaxed mb-3">{featuredInsight.insight}</p>
                {featuredInsight.extract && (
                  <blockquote className="border-l-2 border-stone-300 pl-3 text-sm text-stone-500 italic mb-3 leading-relaxed">
                    {featuredInsight.extract}
                  </blockquote>
                )}
                {!featuredInsight.read_at && (
                  <button
                    onClick={() => handleMarkRead(featuredInsight.id, reading.id)}
                    className="text-xs text-stone-500 hover:text-stone-700 flex items-center gap-1 transition-colors"
                  >
                    <Check className="w-3 h-3" />
                    {t('markAsRead')}
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}

      {canAddMore && (
        <Link
          href="/books"
          className="flex items-center justify-center gap-2 border-2 border-dashed border-stone-200 rounded-xl p-6 text-stone-400 hover:text-stone-600 hover:border-stone-300 transition-colors"
        >
          <span className="text-xl font-light">+</span>
          <span className="text-sm font-medium">{t('addBookToReadWithAI')}</span>
        </Link>
      )}

      {readings.length > 0 && (
        <div className="border-t border-stone-100 pt-5 flex items-center justify-between">
          <p className="text-sm text-stone-600">{t('dailyInsightsEmail')}</p>
          <button
            role="switch"
            aria-checked={notificationsEnabled}
            onClick={() => handleToggleNotifications(!notificationsEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              notificationsEnabled ? 'bg-stone-800' : 'bg-stone-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      )}
    </div>
  )
}
