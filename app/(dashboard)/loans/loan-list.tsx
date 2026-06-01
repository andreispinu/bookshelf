'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { markReturned } from './actions'
import type { LoanWithDetails, SentRequest } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_BADGE: Record<SentRequest['status'], { label: string; className: string }> = {
  pending:  { label: 'Pending',  className: 'border-amber-200 text-amber-700 bg-amber-50' },
  approved: { label: 'Approved', className: 'border-emerald-200 text-emerald-700 bg-emerald-50' },
  rejected: { label: 'Declined', className: 'border-stone-200 text-stone-500 bg-stone-50' },
}

export default function LoanList({
  lentOut: initialLentOut,
  borrowed,
  sentRequests,
  defaultTab,
}: {
  lentOut: LoanWithDetails[]
  borrowed: LoanWithDetails[]
  sentRequests: SentRequest[]
  defaultTab?: string
}) {
  const [lentOut, setLentOut] = useState(initialLentOut)
  const [isPending, startTransition] = useTransition()

  function handleMarkReturned(loanId: string, bookId: string) {
    startTransition(async () => {
      const result = await markReturned(loanId, bookId)
      if (!result?.error) {
        setLentOut(prev => prev.filter(l => l.id !== loanId))
      }
    })
  }

  const pendingCount = sentRequests.filter(r => r.status === 'pending').length

  return (
    <Tabs defaultValue={defaultTab ?? 'lent'}>
      <TabsList className="mb-6">
        <TabsTrigger value="lent">
          Lent out
          {lentOut.length > 0 && (
            <Badge variant="outline" className="ml-1.5 border-amber-200 text-amber-700 bg-amber-50">
              {lentOut.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="borrowed">
          Borrowed
          {borrowed.length > 0 && (
            <Badge variant="outline" className="ml-1.5 border-stone-200 text-stone-600">
              {borrowed.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="requests">
          Requests
          {pendingCount > 0 && (
            <Badge variant="outline" className="ml-1.5 border-amber-200 text-amber-700 bg-amber-50">
              {pendingCount}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* Lent out */}
      <TabsContent value="lent">
        {lentOut.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">
            You haven't lent out any books. Use the "Lend" button on your books page.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {lentOut.map(loan => (
              <li key={loan.id} className="py-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 truncate">{loan.book.title}</p>
                  <p className="text-sm text-stone-500">{loan.book.author}</p>
                  <p className="text-xs text-stone-400 mt-1">
                    Lent to <span className="text-stone-600">{loan.otherParty.name}</span> · {formatDate(loan.loaned_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => handleMarkReturned(loan.id, loan.book.id)}
                  className="shrink-0 border-stone-200 text-stone-600 hover:bg-stone-100"
                >
                  Mark returned
                </Button>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      {/* Borrowed */}
      <TabsContent value="borrowed">
        {borrowed.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">
            You haven't borrowed any books from friends.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {borrowed.map(loan => (
              <li key={loan.id} className="py-4">
                <p className="font-medium text-stone-800">{loan.book.title}</p>
                <p className="text-sm text-stone-500">{loan.book.author}</p>
                <p className="text-xs text-stone-400 mt-1">
                  Borrowed from <span className="text-stone-600">{loan.otherParty.name}</span> · {formatDate(loan.loaned_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>

      {/* Borrow requests sent */}
      <TabsContent value="requests">
        {sentRequests.length === 0 ? (
          <p className="text-sm text-stone-400 py-8 text-center">
            You haven't sent any borrow requests yet.
          </p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {sentRequests.map(req => (
              <li key={req.id} className="py-4 flex items-start gap-3">
                <div className="shrink-0 w-9 h-12 rounded bg-stone-200 overflow-hidden flex items-center justify-center">
                  {req.book.cover_url
                    ? <img src={req.book.cover_url} alt={req.book.title} className="w-full h-full object-cover" />
                    : <span className="text-stone-400 text-base">📖</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 truncate">{req.book.title}</p>
                  <p className="text-sm text-stone-500 truncate">{req.book.author}</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    From <span className="text-stone-600">{req.owner.name}</span> · {formatDate(req.created_at)}
                  </p>
                  {req.owner_message && req.status !== 'pending' && (
                    <p className="text-xs text-stone-500 mt-1 italic">"{req.owner_message}"</p>
                  )}
                </div>
                <Badge variant="outline" className={`shrink-0 text-xs ${STATUS_BADGE[req.status].className}`}>
                  {STATUS_BADGE[req.status].label}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        {/* Link to review incoming requests */}
        <div className="mt-4 pt-4 border-t border-stone-100">
          <Link href="/loans/requests" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
            View incoming borrow requests →
          </Link>
        </div>
      </TabsContent>
    </Tabs>
  )
}
