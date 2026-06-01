'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import type { BorrowRequest } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function RequestsClient({ requests: initialRequests }: { requests: BorrowRequest[] }) {
  const t = useTranslations('loans')
  const tc = useTranslations('common')
  const [requests, setRequests] = useState(initialRequests)
  const [loading, setLoading] = useState<string | null>(null)

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setLoading(id)
    try {
      const res = await fetch('/api/borrow-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? tc('somethingWentWrong'))
        return
      }
      setRequests(prev => prev.filter(r => r.id !== id))
      toast.success(action === 'approve' ? t('requestApproved') : t('requestDeclined'))
    } catch {
      toast.error(tc('somethingWentWrong'))
    } finally {
      setLoading(null)
    }
  }

  if (requests.length === 0) {
    return (
      <p className="text-sm text-stone-400 py-8 text-center">
        {t('noPendingRequests')}
      </p>
    )
  }

  return (
    <ul className="divide-y divide-stone-100">
      {requests.map(req => (
        <li key={req.id} className="py-4 flex items-start gap-4">
          {/* Cover */}
          <div className="shrink-0 w-10 h-14 rounded bg-stone-200 overflow-hidden flex items-center justify-center">
            {req.book.cover_url
              ? <img src={req.book.cover_url} alt={req.book.title} className="w-full h-full object-cover" />
              : <span className="text-stone-400 text-lg">📖</span>
            }
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-medium text-stone-800 truncate">{req.book.title}</p>
            <p className="text-sm text-stone-500 truncate">{req.book.author}</p>

            <div className="flex items-center gap-2 mt-1.5">
              <div className="shrink-0 h-5 w-5 rounded-full bg-stone-200 flex items-center justify-center text-stone-600 text-[10px] font-medium overflow-hidden">
                {req.requester.avatar_url
                  ? <img src={req.requester.avatar_url} alt={req.requester.name} className="h-full w-full object-cover" />
                  : initials(req.requester.name)
                }
              </div>
              <span className="text-xs text-stone-500">
                {req.requester.name} · {formatDate(req.created_at)}
              </span>
            </div>

            {req.requester_message && (
              <p className="text-xs text-stone-500 mt-1.5 italic">"{req.requester_message}"</p>
            )}

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                disabled={loading === req.id}
                onClick={() => handleAction(req.id, 'approve')}
                className="bg-stone-800 text-white hover:bg-stone-700 h-8 px-3 text-xs"
              >
                {t('approve')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loading === req.id}
                onClick={() => handleAction(req.id, 'reject')}
                className="border-stone-200 text-stone-600 hover:bg-stone-50 h-8 px-3 text-xs"
              >
                {t('decline')}
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
