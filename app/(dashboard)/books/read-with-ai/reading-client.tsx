'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
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

const STALE_MS = 5 * 60 * 1000 // 5 minutes
const TIMEOUT_MS = 30 * 1000   // 30 seconds
const POLL_MS = 3000
const MAX_FAILURES = 10

function ReadingBookCard({
  reading: initial,
  onRemove,
}: {
  reading: ReadingBook
  onRemove: (id: string) => void
}) {
  const t = useTranslations('books')

  const [status, setStatus] = useState(initial.status)
  const [insights, setInsights] = useState(initial.insights)
  const [pollError, setPollError] = useState(false)
  const [showReady, setShowReady] = useState(false)
  const [insightsCount, setInsightsCount] = useState(0)
  const [showInsights, setShowInsights] = useState(
    initial.status === 'active' || initial.status === 'completed'
  )
  const [msgIdx, setMsgIdx] = useState(0)

  // Track when the current generation session started.
  // If the page loaded with status='generating' (stale), treat it as 5+ min ago so
  // isStale=true immediately and the Retry button shows.
  const [generatingStartedAt, setGeneratingStartedAt] = useState<number | null>(
    initial.status === 'generating' ? Date.now() - STALE_MS : null
  )

  // Guard against double-calling transitionToActive (race between polling + fetch response)
  const transitioned = useRef(false)

  const elapsed = (status === 'generating' && generatingStartedAt !== null)
    ? Date.now() - generatingStartedAt
    : 0
  const isStale = status === 'generating' && elapsed >= STALE_MS
  const isTimeout = status === 'generating' && !isStale && elapsed >= TIMEOUT_MS
  const isNormal = status === 'generating' && !isStale && !isTimeout && !pollError

  const STEPS = [
    t('generatingStep1', { title: initial.book.title }),
    t('generatingStep2'),
    t('generatingStep3'),
    t('generatingStep4'),
  ]

  // Cycle through messages while actively generating
  useEffect(() => {
    if (!isNormal) return
    const timer = setInterval(() => setMsgIdx(i => (i + 1) % 4), 2000)
    return () => clearInterval(timer)
  }, [isNormal])

  // Poll for status changes while generating
  useEffect(() => {
    if (status !== 'generating') return
    let failCount = 0
    let cancelled = false

    async function poll() {
      if (cancelled) return
      try {
        const res = await fetch(`/api/read-with-ai/status?readingId=${initial.id}`)
        if (!res.ok) throw new Error()
        const data = await res.json()
        failCount = 0
        if (data.status === 'active') {
          cancelled = true
          transitionToActive(data.insightsCount, data.latestInsight ?? null)
        }
      } catch {
        failCount++
        if (failCount >= MAX_FAILURES) {
          cancelled = true
          setPollError(true)
        }
      }
    }

    const id = setInterval(poll, POLL_MS)
    return () => { cancelled = true; clearInterval(id) }
  }, [status, initial.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function transitionToActive(count: number, insight: ReadingInsight | null) {
    if (transitioned.current) return
    transitioned.current = true
    setInsightsCount(count)
    setShowReady(true)
    setStatus('active')
    setTimeout(() => {
      if (insight) setInsights([insight])
      setShowInsights(true)
    }, 1000)
  }

  async function startGenerate(readingId: string, bookId: string) {
    try {
      const res = await fetch('/api/read-with-ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ readingId, bookId }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      // Fetch the latest insight to show it immediately
      const statusRes = await fetch(`/api/read-with-ai/status?readingId=${readingId}`)
      const statusData = await statusRes.json()
      transitionToActive(data.total ?? statusData.insightsCount ?? 0, statusData.latestInsight ?? null)
    } catch {
      toast.error('Generation failed — please try again')
      transitioned.current = false
      setGeneratingStartedAt(null)
      setStatus('pending')
    }
  }

  function handleStartReading() {
    transitioned.current = false
    setGeneratingStartedAt(Date.now())
    setStatus('generating')
    setPollError(false)
    startGenerate(initial.id, initial.book_id)
  }

  function handleRetry() {
    transitioned.current = false
    setGeneratingStartedAt(Date.now()) // resets isStale immediately
    setPollError(false)
    startGenerate(initial.id, initial.book_id)
  }

  async function handleMarkRead(insightId: string) {
    setInsights(prev => prev.map(ins =>
      ins.id === insightId ? { ...ins, read_at: new Date().toISOString() } : ins
    ))
    await markInsightRead(insightId)
  }

  const deliveredInsights = insights
  const readCount = deliveredInsights.filter(ins => ins.read_at).length
  const featuredInsight = deliveredInsights.length > 0
    ? deliveredInsights[deliveredInsights.length - 1]
    : null

  return (
    <div className="border border-stone-200 rounded-xl p-5 bg-white">
      {/* Book header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="shrink-0 w-12 h-16 rounded bg-stone-100 overflow-hidden flex items-center justify-center">
          {initial.book.cover_url
            ? <img src={initial.book.cover_url} alt={initial.book.title} className="w-full h-full object-cover" />
            : <BookOpen className="w-5 h-5 text-stone-400" />
          }
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-stone-800 leading-snug">{initial.book.title}</p>
          <p className="text-sm text-stone-500">{initial.book.author}</p>
          {deliveredInsights.length > 0 && (
            <p className="text-xs text-stone-400 mt-1">
              {t('insightsReadProgress', { read: readCount, total: deliveredInsights.length })}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status === 'completed' && (
            <Badge variant="outline" className="border-stone-200 text-stone-500 bg-stone-50 text-xs">
              {t('completedLabel')}
            </Badge>
          )}
          {status === 'active' && (
            <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-xs">
              {t('aiReadingBadge')}
            </Badge>
          )}
          <button
            onClick={() => onRemove(initial.id)}
            className="text-stone-300 hover:text-stone-500 transition-colors leading-none"
            aria-label="Remove"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Pending */}
      {status === 'pending' && (
        <Button
          className="bg-stone-800 hover:bg-stone-700 text-white"
          onClick={handleStartReading}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {t('startReading')}
        </Button>
      )}

      {/* Generating */}
      {status === 'generating' && !showReady && (
        <div className="py-2">
          {pollError ? (
            <p className="text-sm text-red-600">{t('generationError')}</p>
          ) : isStale ? (
            <div>
              <p className="text-sm text-amber-700 mb-3">{t('generationTimeout')}</p>
              <Button size="sm" variant="outline" onClick={handleRetry} className="border-stone-300 text-stone-700">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                {t('generationRetry')}
              </Button>
            </div>
          ) : isTimeout ? (
            <p className="text-sm text-amber-700">{t('generationTimeout')}</p>
          ) : (
            <>
              <style>{`@keyframes rw-shimmer{0%{transform:translateX(-250%)}100%{transform:translateX(350%)}}`}</style>
              <p className="text-sm text-stone-600 mb-3 min-h-[1.25rem] transition-all duration-300">
                {STEPS[msgIdx]}
              </p>
              <div className="relative w-full h-1 rounded-full overflow-hidden bg-amber-100">
                <div
                  className="absolute h-full w-1/3 rounded-full bg-amber-600"
                  style={{ animation: 'rw-shimmer 1.5s ease-in-out infinite' }}
                />
              </div>
              <p className="text-xs text-stone-400 mt-2">{t('generatingEstimate')}</p>
            </>
          )}
        </div>
      )}

      {/* Ready animation — full bar + count, before insights reveal */}
      {showReady && !showInsights && (
        <div className="py-2 mb-3">
          <div className="w-full h-1 rounded-full bg-emerald-100">
            <div className="h-full w-full rounded-full bg-emerald-500 transition-all duration-500" />
          </div>
          <p className="text-sm text-emerald-700 mt-2 flex items-center gap-1.5 font-medium">
            <Check className="w-3.5 h-3.5" />
            {t('insightsReady', { count: insightsCount })}
          </p>
        </div>
      )}

      {/* Insight card */}
      {(status === 'active' || status === 'completed') && showInsights && featuredInsight && (
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
              onClick={() => handleMarkRead(featuredInsight.id)}
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
}

export default function ReadingClient({
  readings: initialReadings,
  notificationsEnabled: initialNotifications,
}: {
  readings: ReadingBook[]
  notificationsEnabled: boolean
}) {
  const t = useTranslations('books')
  const [readings, setReadings] = useState(initialReadings)
  const [notificationsEnabled, setNotificationsEnabled] = useState(initialNotifications)

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
      {readings.map(reading => (
        <ReadingBookCard
          key={reading.id}
          reading={reading}
          onRemove={handleRemove}
        />
      ))}

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
