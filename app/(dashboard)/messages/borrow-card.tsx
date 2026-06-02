'use client'

import { useState } from 'react'
import { Check, X } from 'lucide-react'
import { useTranslations } from 'next-intl'

// ─── Payload types ────────────────────────────────────────────────────────────

export type BorrowRequestPayload = {
  type: 'borrow_request'
  borrow_request_id: string
  book_id: string
  book_title: string
  book_author: string
  book_cover_url: string | null
  requester_message: string | null
}

export type BorrowResponsePayload = {
  type: 'borrow_response'
  borrow_request_id: string
  book_title: string
  status: 'approved' | 'rejected'
  owner_message: string | null
}

export type BorrowPayload = BorrowRequestPayload | BorrowResponsePayload

export function parseBorrowPayload(content: string): BorrowPayload | null {
  if (!content.startsWith('{')) return null
  try {
    const d = JSON.parse(content)
    if (d.type === 'borrow_request' || d.type === 'borrow_response') return d as BorrowPayload
    return null
  } catch {
    return null
  }
}

// ─── Borrow request card ──────────────────────────────────────────────────────

type BorrowRequestCardProps = {
  data: BorrowRequestPayload
  isMine: boolean
  hasResponse: boolean
  onDecide: (action: 'approve' | 'reject', message: string) => Promise<void>
}

export function BorrowRequestCard({ data, isMine, hasResponse, onDecide }: BorrowRequestCardProps) {
  const t = useTranslations('loans')
  const tc = useTranslations('common')
  const [confirming, setConfirming] = useState<'approve' | 'reject' | null>(null)
  const [responseText, setResponseText] = useState('')
  const [loading, setLoading] = useState(false)

  const showActions = !isMine && !hasResponse

  async function handleConfirm() {
    if (!confirming) return
    setLoading(true)
    await onDecide(confirming, responseText)
    setLoading(false)
    setConfirming(null)
    setResponseText('')
  }

  return (
    <div className="w-64 rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
      {/* Book info */}
      <div className="flex gap-2.5 p-3 border-b border-stone-100">
        {data.book_cover_url ? (
          <img
            src={data.book_cover_url}
            alt={data.book_title}
            className="h-14 w-10 rounded object-cover shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="h-14 w-10 rounded bg-stone-100 flex items-center justify-center shrink-0 text-lg select-none">📖</div>
        )}
        <div className="min-w-0">
          <p className="text-[10px] font-medium text-stone-400 uppercase tracking-wide mb-0.5">{t('inChatBorrowRequest')}</p>
          <p className="text-sm font-semibold text-stone-900 leading-tight line-clamp-2">{data.book_title}</p>
          <p className="text-xs text-stone-500 mt-0.5 truncate">{data.book_author}</p>
        </div>
      </div>

      {/* Requester's message */}
      {data.requester_message && (
        <p className="px-3 py-2 text-sm text-stone-700 border-b border-stone-100">{data.requester_message}</p>
      )}

      {/* Status / actions */}
      <div className="px-3 py-2.5">
        {!hasResponse && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            ● {t('pending')}
          </span>
        )}

        {/* Approve / Decline buttons (owner only, while pending) */}
        {showActions && !confirming && (
          <div className="flex gap-1.5 mt-2">
            <button
              onClick={() => setConfirming('approve')}
              className="flex-1 py-1.5 rounded-lg bg-stone-800 text-white text-xs font-medium hover:bg-stone-700 transition-colors"
            >
              {t('approve')}
            </button>
            <button
              onClick={() => setConfirming('reject')}
              className="flex-1 py-1.5 rounded-lg border border-stone-300 text-stone-700 text-xs font-medium hover:bg-stone-50 transition-colors"
            >
              {t('decline')}
            </button>
          </div>
        )}

        {/* Inline confirm form */}
        {showActions && confirming && (
          <div className="mt-2 space-y-2">
            <p className="text-xs font-medium text-stone-600">
              {confirming === 'approve' ? t('confirmApprove') : t('confirmDecline')}
            </p>
            <textarea
              value={responseText}
              onChange={e => setResponseText(e.target.value)}
              placeholder={t('optionalMessage')}
              rows={2}
              className="w-full resize-none rounded-lg border border-stone-200 px-2.5 py-2 text-xs text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-stone-300"
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleConfirm}
                disabled={loading}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                  confirming === 'approve'
                    ? 'bg-stone-800 text-white hover:bg-stone-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                {loading ? '…' : t('confirm')}
              </button>
              <button
                onClick={() => { setConfirming(null); setResponseText('') }}
                disabled={loading}
                className="px-3 py-1.5 rounded-lg border border-stone-200 text-stone-600 text-xs hover:bg-stone-50 transition-colors"
              >
                {tc('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Borrow response card ─────────────────────────────────────────────────────

type BorrowResponseCardProps = {
  data: BorrowResponsePayload
}

export function BorrowResponseCard({ data }: BorrowResponseCardProps) {
  const t = useTranslations('loans')
  const approved = data.status === 'approved'

  return (
    <div className={`w-64 rounded-2xl overflow-hidden shadow-sm border ${
      approved ? 'border-emerald-200 bg-emerald-50' : 'border-red-100 bg-red-50'
    }`}>
      <div className={`px-3 py-2.5 flex items-center gap-2 ${
        approved ? 'text-emerald-800' : 'text-red-800'
      }`}>
        <div className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${
          approved ? 'bg-emerald-200' : 'bg-red-200'
        }`}>
          {approved
            ? <Check className="h-3.5 w-3.5" />
            : <X className="h-3.5 w-3.5" />
          }
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {approved ? t('requestApprovedCard') : t('requestDeclinedCard')}
          </p>
          <p className="text-xs opacity-60 truncate">"{data.book_title}"</p>
        </div>
      </div>
      {data.owner_message && (
        <p className={`px-3 pb-2.5 text-xs border-t ${
          approved ? 'border-emerald-200 text-emerald-800' : 'border-red-100 text-red-800'
        }`}>
          {data.owner_message}
        </p>
      )}
    </div>
  )
}
