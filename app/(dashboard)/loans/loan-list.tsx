'use client'

import { useState, useTransition } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { markReturned } from './actions'
import type { LoanWithDetails } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function LoanList({
  lentOut: initialLentOut,
  borrowed,
}: {
  lentOut: LoanWithDetails[]
  borrowed: LoanWithDetails[]
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

  return (
    <Tabs defaultValue="lent">
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
    </Tabs>
  )
}
