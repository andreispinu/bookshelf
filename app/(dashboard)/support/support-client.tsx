'use client'

import { useState, useEffect, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { Send, ArrowLeft, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'

type SupportReply = {
  id: string
  from_admin: boolean
  content: string
  read_at: string | null
  created_at: string
}

type SupportTicket = {
  id: string
  type: string
  subject: string
  status: 'open' | 'in_progress' | 'resolved'
  created_at: string
  updated_at: string
  support_replies: SupportReply[]
}

const TICKET_TYPES = ['bug', 'question', 'feature', 'billing', 'other'] as const
const TYPE_KEY_MAP: Record<string, string> = {
  bug: 'typeBug',
  question: 'typeQuestion',
  feature: 'typeFeature',
  billing: 'typeBilling',
  other: 'typeOther',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('support')
  const label =
    status === 'open' ? t('statusOpen')
    : status === 'in_progress' ? t('statusInProgress')
    : t('statusResolved')
  const cls =
    status === 'resolved' ? 'bg-green-100 text-green-700'
    : status === 'in_progress' ? 'bg-amber-100 text-amber-700'
    : 'bg-stone-100 text-stone-600'
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
  )
}

function NewMessageTab({ onSuccess }: { onSuccess: (ticket: SupportTicket) => void }) {
  const t = useTranslations('support')
  const [type, setType] = useState<string>('question')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !message.trim() || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, subject: subject.trim(), message: message.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()

      // Fetch the new ticket to show it
      const ticketRes = await fetch(`/api/support/${data.ticket.id}`)
      const ticketData = await ticketRes.json()
      onSuccess(ticketData.ticket)
      toast.success(t('successTitle'))
    } catch {
      toast.error('Something went wrong — please try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      {/* Type pills */}
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">{t('typeLabel')}</p>
        <div className="flex flex-wrap gap-2">
          {TICKET_TYPES.map(tp => (
            <button
              key={tp}
              type="button"
              onClick={() => setType(tp)}
              className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                type === tp
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t(TYPE_KEY_MAP[tp] as Parameters<typeof t>[0])}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <input
        type="text"
        value={subject}
        onChange={e => setSubject(e.target.value)}
        placeholder={t('subjectPlaceholder')}
        maxLength={120}
        required
        className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder-stone-400"
      />

      {/* Message */}
      <textarea
        value={message}
        onChange={e => setMessage(e.target.value)}
        placeholder={t('messagePlaceholder')}
        rows={5}
        required
        className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-stone-300 placeholder-stone-400 resize-none"
      />

      <button
        type="submit"
        disabled={!subject.trim() || !message.trim() || submitting}
        className="w-full py-2.5 bg-stone-800 text-white text-sm font-medium rounded-xl hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {submitting ? t('submitting') : t('submit')}
      </button>
    </form>
  )
}

function TicketThread({
  ticket: initial,
  onBack,
}: {
  ticket: SupportTicket
  onBack: () => void
}) {
  const t = useTranslations('support')
  const [ticket, setTicket] = useState(initial)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Mark admin replies as read by fetching ticket
  useEffect(() => {
    fetch(`/api/support/${initial.id}`)
      .then(r => r.json())
      .then(d => { if (d.ticket) setTicket(d.ticket) })
      .catch(() => {})
  }, [initial.id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [ticket.support_replies.length])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/support/${ticket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: reply.trim() }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setTicket(prev => ({
        ...prev,
        status: 'open',
        support_replies: [...prev.support_replies, data.reply],
      }))
      setReply('')
    } catch {
      toast.error('Something went wrong — please try again')
    } finally {
      setSending(false)
    }
  }

  const sortedReplies = [...ticket.support_replies].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="flex flex-col h-full">
      {/* Thread header */}
      <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3 shrink-0">
        <button
          onClick={onBack}
          className="p-1 -ml-1 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-stone-800 text-sm truncate">{ticket.subject}</p>
        </div>
        <StatusBadge status={ticket.status} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {sortedReplies.map(r => (
          <div key={r.id} className={`flex ${r.from_admin ? 'justify-start' : 'justify-end'}`}>
            {r.from_admin && (
              <div className="shrink-0 h-7 w-7 rounded-full bg-stone-800 flex items-center justify-center mr-2 mt-1">
                <MessageCircle className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] ${r.from_admin ? '' : ''}`}>
              <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words ${
                r.from_admin
                  ? 'bg-stone-100 text-stone-800 rounded-bl-sm'
                  : 'bg-stone-800 text-white rounded-br-sm'
              }`}>
                {r.content}
              </div>
              <p className={`text-[11px] text-stone-400 mt-1 ${r.from_admin ? 'text-left' : 'text-right'}`}>
                {r.from_admin ? t('supportBotName') + ' · ' : ''}{timeAgo(r.created_at)}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply input */}
      {ticket.status !== 'resolved' && (
        <form onSubmit={handleSend} className="p-3 border-t border-stone-100 flex items-end gap-2 shrink-0">
          <textarea
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
            placeholder={t('replyPlaceholder')}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
            style={{ maxHeight: '120px', overflowY: 'auto' }}
          />
          <button
            type="submit"
            disabled={!reply.trim() || sending}
            className="p-2.5 rounded-xl bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            aria-label={t('sendReply')}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  )
}

export default function SupportClient({ initialTickets }: { initialTickets: SupportTicket[] }) {
  const t = useTranslations('support')
  const [tab, setTab] = useState<'new' | 'mine'>(initialTickets.length > 0 ? 'mine' : 'new')
  const [tickets, setTickets] = useState(initialTickets)
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null)

  function handleNewTicket(ticket: SupportTicket) {
    setTickets(prev => [ticket, ...prev])
    setActiveTicket(ticket)
    setTab('mine')
  }

  if (activeTicket) {
    return (
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden" style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
        <TicketThread
          ticket={activeTicket}
          onBack={() => setActiveTicket(null)}
        />
      </div>
    )
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-stone-100">
        {(['new', 'mine'] as const).map(t_ => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === t_
                ? 'text-stone-900 border-b-2 border-stone-800'
                : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            {t_ === 'new' ? t('newMessage') : t('myMessages')}
          </button>
        ))}
      </div>

      {tab === 'new' ? (
        <NewMessageTab onSuccess={handleNewTicket} />
      ) : (
        <div className="divide-y divide-stone-100">
          {tickets.length === 0 ? (
            <div className="py-12 text-center text-sm text-stone-400">
              {t('noTickets')}
            </div>
          ) : (
            tickets.map(ticket => {
              const unreadCount = ticket.support_replies.filter(r => r.from_admin && !r.read_at).length
              const lastReply = ticket.support_replies.length > 0
                ? [...ticket.support_replies].sort((a, b) =>
                    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                  )[0]
                : null

              return (
                <button
                  key={ticket.id}
                  onClick={() => setActiveTicket(ticket)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className={`text-sm truncate ${unreadCount > 0 ? 'font-semibold text-stone-900' : 'text-stone-800'}`}>
                        {ticket.subject}
                      </span>
                      <span className="text-[11px] text-stone-400 shrink-0">{timeAgo(ticket.updated_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={ticket.status} />
                      {lastReply && (
                        <span className="text-xs text-stone-400 truncate">
                          {lastReply.from_admin ? t('supportBotName') : 'You'}: {lastReply.content.slice(0, 40)}
                        </span>
                      )}
                    </div>
                  </div>
                  {unreadCount > 0 && (
                    <span className="shrink-0 h-5 w-5 rounded-full bg-stone-800 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      {unreadCount}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
