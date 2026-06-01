'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Send, ArrowLeft } from 'lucide-react'
import type { ConvItem, Message } from '@/types'

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

function initials(name: string) {
  return name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function MessagesClient({ userId }: { userId: string }) {
  const t = useTranslations('messages')
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeConvId = searchParams.get('with')

  const [conversations, setConversations] = useState<ConvItem[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeConv, setActiveConv] = useState<ConvItem | null>(null)
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/conversations')
      if (!res.ok) return
      const data = await res.json()
      setConversations(data.conversations ?? [])
    } catch {}
  }, [])

  const fetchMessages = useCallback(async (withId: string) => {
    try {
      const res = await fetch(`/api/messages?with=${withId}`)
      if (!res.ok) return
      const data = await res.json()
      setMessages(data.messages ?? [])
      // Mark received messages as read
      fetch('/api/messages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId: withId }),
      })
    } catch {}
  }, [])

  useEffect(() => {
    fetchConversations()
    const interval = setInterval(fetchConversations, 10_000)
    return () => clearInterval(interval)
  }, [fetchConversations])

  useEffect(() => {
    if (!activeConvId) {
      setMessages([])
      return
    }
    fetchMessages(activeConvId)
    const interval = setInterval(() => fetchMessages(activeConvId), 10_000)
    return () => clearInterval(interval)
  }, [activeConvId, fetchMessages])

  // Sync activeConv from conversations list; if not found fetch profile directly
  useEffect(() => {
    if (!activeConvId) {
      setActiveConv(null)
      return
    }
    const found = conversations.find(c => c.userId === activeConvId)
    if (found) {
      setActiveConv(found)
    } else if (!activeConv || activeConv.userId !== activeConvId) {
      // Fetch profile for users we haven't messaged yet (new conversation)
      fetch(`/api/users/search?q=`)
        .catch(() => null)
    }
  }, [activeConvId, conversations, activeConv])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    if (!activeConvId || !content.trim() || sending) return
    setSending(true)
    const text = content.trim()
    setContent('')

    const optimistic: Message = {
      id: `temp-${Date.now()}`,
      sender_id: userId,
      receiver_id: activeConvId,
      content: text,
      read: false,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: activeConvId, content: text }),
      })
      if (res.ok) {
        const data = await res.json()
        setMessages(prev => prev.map(m => m.id === optimistic.id ? data.message : m))
        fetchConversations()
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        setContent(text)
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setContent(text)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-full bg-white border border-stone-200 rounded-xl overflow-hidden">

      {/* Conversation list — hidden on mobile when a chat is open */}
      <div className={`w-full sm:w-72 border-r border-stone-200 flex flex-col shrink-0 ${activeConvId ? 'hidden sm:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-stone-100">
          <h2 className="font-semibold text-stone-800">{t('title')}</h2>
        </div>
        {conversations.length === 0 ? (
          <div className="flex-1 flex items-center justify-center p-8 text-center text-sm text-stone-400">
            {t('noConversations')}
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {conversations.map(conv => (
              <li key={conv.userId}>
                <button
                  onClick={() => router.push(`/messages?with=${conv.userId}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 transition-colors ${
                    activeConvId === conv.userId ? 'bg-stone-100' : ''
                  }`}
                >
                  <div className="shrink-0 h-9 w-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 text-xs font-medium overflow-hidden">
                    {conv.avatar_url
                      ? <img src={conv.avatar_url} alt={conv.name} className="h-full w-full object-cover" />
                      : initials(conv.name)
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-sm truncate ${conv.unread > 0 ? 'font-semibold text-stone-900' : 'text-stone-800'}`}>
                        {conv.name}
                      </span>
                      <span className="text-[11px] text-stone-400 shrink-0">{timeAgo(conv.lastAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-1 mt-0.5">
                      <span className="text-xs text-stone-500 truncate">{conv.lastMessage}</span>
                      {conv.unread > 0 && (
                        <span className="shrink-0 h-4 w-4 rounded-full bg-stone-800 text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unread > 9 ? '9+' : conv.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Chat view */}
      <div className={`flex-1 flex flex-col min-w-0 ${!activeConvId ? 'hidden sm:flex' : 'flex'}`}>
        {!activeConvId ? (
          <div className="flex-1 flex items-center justify-center text-sm text-stone-400">
            {t('selectConversation')}
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-stone-100 flex items-center gap-3 shrink-0">
              <button
                onClick={() => router.push('/messages')}
                className="sm:hidden p-1 -ml-1 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                aria-label={t('backToConversations')}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              {activeConv && (
                <>
                  <div className="shrink-0 h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 text-xs font-medium overflow-hidden">
                    {activeConv.avatar_url
                      ? <img src={activeConv.avatar_url} alt={activeConv.name} className="h-full w-full object-cover" />
                      : initials(activeConv.name)
                    }
                  </div>
                  <span className="font-medium text-stone-800 text-sm">{activeConv.name}</span>
                </>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {messages.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-sm text-stone-400">
                  {t('noMessages')}
                </div>
              ) : (
                messages.map(msg => {
                  const isMine = msg.sender_id === userId
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm leading-snug whitespace-pre-wrap break-words ${
                        isMine
                          ? 'bg-stone-800 text-white rounded-br-sm'
                          : 'bg-stone-100 text-stone-800 rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-stone-100 flex items-end gap-2 shrink-0">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('placeholder')}
                rows={1}
                className="flex-1 resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent"
                style={{ maxHeight: '120px', overflowY: 'auto' }}
              />
              <button
                onClick={sendMessage}
                disabled={!content.trim() || sending}
                className="p-2.5 rounded-xl bg-stone-800 text-white hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                aria-label={t('send')}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  )
}
