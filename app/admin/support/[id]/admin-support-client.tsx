'use client'

import { useState } from 'react'
import { Send, Check } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type SupportReply = {
  id: string
  from_admin: boolean
  content: string
  read_at: string | null
  created_at: string
}

type TicketStatus = 'open' | 'in_progress' | 'resolved'

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

export default function AdminSupportClient({
  ticketId,
  subject,
  initialStatus,
  initialReplies,
  userName,
  userEmail,
}: {
  ticketId: string
  subject: string
  initialStatus: TicketStatus
  initialReplies: SupportReply[]
  userName: string
  userEmail: string
}) {
  const router = useRouter()
  const [replies, setReplies] = useState(initialReplies)
  const [status, setStatus] = useState<TicketStatus>(initialStatus)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const sortedReplies = [...replies].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: content.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setReplies(prev => [...prev, data.reply])
      setStatus('in_progress')
      setContent('')
      toast.success('Reply sent')
    } catch {
      toast.error('Failed to send reply')
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(newStatus: TicketStatus) {
    if (updatingStatus || newStatus === status) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/admin/support/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error()
      setStatus(newStatus)
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`)
      if (newStatus === 'resolved') router.refresh()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const statusOptions: { value: TicketStatus; label: string }[] = [
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In progress' },
    { value: 'resolved', label: 'Resolved' },
  ]

  return (
    <div className="space-y-6">
      {/* Status + user info */}
      <div className="bg-white border border-stone-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">From</p>
          <p className="font-medium text-stone-800">{userName}</p>
          <p className="text-sm text-stone-400">{userEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleStatusChange(opt.value)}
              disabled={updatingStatus}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                status === opt.value
                  ? opt.value === 'resolved'
                    ? 'bg-green-100 text-green-700'
                    : opt.value === 'in_progress'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-stone-200 text-stone-700'
                  : 'bg-stone-50 text-stone-400 hover:text-stone-600 hover:bg-stone-100'
              }`}
            >
              {status === opt.value && <Check className="h-3.5 w-3.5" />}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">{subject}</h2>
        </div>
        <div className="p-4 flex flex-col gap-3">
          {sortedReplies.map(r => (
            <div key={r.id} className={`flex ${r.from_admin ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%]`}>
                <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words ${
                  r.from_admin
                    ? 'bg-stone-800 text-white rounded-br-sm'
                    : 'bg-stone-100 text-stone-800 rounded-bl-sm'
                }`}>
                  {r.content}
                </div>
                <p className={`text-[11px] text-stone-400 mt-1 ${r.from_admin ? 'text-right' : 'text-left'}`}>
                  {r.from_admin ? 'You (admin)' : userName} · {timeAgo(r.created_at)}
                  {r.from_admin && !r.read_at && (
                    <span className="ml-1 text-amber-500">· unread</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply input */}
        <form onSubmit={handleReply} className="p-3 border-t border-stone-100 flex items-end gap-2">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(e) } }}
            placeholder="Write a reply to the user…"
            rows={2}
            className="flex-1 resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
            style={{ maxHeight: '160px', overflowY: 'auto' }}
          />
          <button
            type="submit"
            disabled={!content.trim() || sending}
            className="p-2.5 rounded-xl bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  )
}
