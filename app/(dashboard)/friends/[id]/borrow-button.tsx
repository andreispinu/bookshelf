'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

type Props = {
  bookId: string
  bookTitle: string
  ownerId: string
}

export default function BorrowButton({ bookId, bookTitle, ownerId }: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/borrow-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, ownerId, message }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Something went wrong')
        return
      }
      toast.success('Borrow request sent!')
      setOpen(false)
      setMessage('')
    } catch {
      toast.error('Something went wrong')
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
        Request to borrow
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setOpen(false); setMessage('') } }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h3 className="font-semibold text-stone-800 text-base mb-1">Request to borrow</h3>
            <p className="text-sm text-stone-500 mb-4 truncate">"{bookTitle}"</p>

            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              Message <span className="text-stone-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Add a note for the owner…"
              rows={3}
              className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
            />

            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-stone-800 text-white hover:bg-stone-700"
              >
                {loading ? 'Sending…' : 'Send request'}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setOpen(false); setMessage('') }}
                disabled={loading}
                className="border-stone-200 text-stone-600 hover:bg-stone-50"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
