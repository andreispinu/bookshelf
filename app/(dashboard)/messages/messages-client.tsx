'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Send, ArrowLeft, SquarePen, X, Search } from 'lucide-react'
import type { ConvItem, Message } from '@/types'
import { COUNTRY_FLAGS } from '@/lib/countries'
import { parseBorrowPayload, BorrowRequestCard, BorrowResponseCard } from './borrow-card'

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

function formatPreview(content: string): string {
  const payload = parseBorrowPayload(content)
  if (!payload) return content
  if (payload.type === 'borrow_request') return `Borrow request: ${payload.book_title}`
  const status = payload.status === 'approved' ? 'approved' : 'rejected'
  return `Request ${status}: ${payload.book_title}`
}

type FriendForCompose = { id: string; name: string; avatar_url: string | null; country: string | null }

export default function MessagesClient({ userId, friends }: { userId: string; friends: FriendForCompose[] }) {
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
  const [composing, setComposing] = useState(false)
  const [friendSearch, setFriendSearch] = useState('')

  const filteredFriends = friends.filter(f =>
    f.name.toLowerCase().includes(friendSearch.toLowerCase())
  )

  function openConversation(friendId: string) {
    setComposing(false)
    setFriendSearch('')
    router.push(`/messages?with=${friendId}`)
  }

  function closeCompose() {
    setComposing(false)
    setFriendSearch('')
  }

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
      // Mark new_message notifications from this sender as read
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId: withId, type: 'new_message' }),
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

  // Sync activeConv from conversations list
  useEffect(() => {
    if (!activeConvId) {
      setActiveConv(null)
      return
    }
    const found = conversations.find(c => c.userId === activeConvId)
    if (found) setActiveConv(found)
  }, [activeConvId, conversations])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Resolve recipient info for the chat header — friends prop is the primary source
  // (always has country); activeConv is a fallback for ex-friends with history
  const activeRecipient = useMemo(() => {
    if (!activeConvId) return null
    const fromFriends = friends.find(f => f.id === activeConvId)
    if (fromFriends) return fromFriends
    if (activeConv) return { id: activeConv.userId, name: activeConv.name, avatar_url: activeConv.avatar_url, country: null }
    return null
  }, [activeConvId, friends, activeConv])

  // Collect borrow_request IDs that already have a response in this thread
  const respondedRequestIds = useMemo(() => {
    const ids = new Set<string>()
    for (const msg of messages) {
      const payload = parseBorrowPayload(msg.content)
      if (payload?.type === 'borrow_response') ids.add(payload.borrow_request_id)
    }
    return ids
  }, [messages])

  async function handleBorrowDecide(requestId: string, action: 'approve' | 'reject', message: string) {
    await fetch('/api/borrow-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: requestId, action, message }),
    })
    if (activeConvId) fetchMessages(activeConvId)
    fetchConversations()
  }

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

      {/* New message modal */}
      {composing && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) closeCompose() }}
        >
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm flex flex-col max-h-[70vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800 text-sm">{t('newMessage')}</h3>
              <button
                onClick={closeCompose}
                className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-3 py-2 border-b border-stone-100">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-stone-400" />
                <input
                  type="text"
                  placeholder={t('searchFriends')}
                  value={friendSearch}
                  onChange={e => setFriendSearch(e.target.value)}
                  autoFocus
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent placeholder-stone-400"
                />
              </div>
            </div>
            <ul className="flex-1 overflow-y-auto divide-y divide-stone-100">
              {filteredFriends.length === 0 ? (
                <li className="py-8 text-center text-sm text-stone-400">
                  {friendSearch ? t('noFriendsMatch') : t('noFriends')}
                </li>
              ) : (
                filteredFriends.map(friend => (
                  <li key={friend.id}>
                    <button
                      onClick={() => openConversation(friend.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 transition-colors text-left"
                    >
                      <div className="shrink-0 h-9 w-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 text-xs font-medium overflow-hidden">
                        {friend.avatar_url
                          ? <img src={friend.avatar_url} alt={friend.name} className="h-full w-full object-cover" />
                          : initials(friend.name)
                        }
                      </div>
                      <span className="text-sm text-stone-800 font-medium">{friend.name}</span>
                      {friend.country && (
                        <span className="text-base ml-auto">{COUNTRY_FLAGS[friend.country] ?? ''}</span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Conversation list — hidden on mobile when a chat is open */}
      <div className={`w-full sm:w-72 border-r border-stone-200 flex flex-col shrink-0 ${activeConvId ? 'hidden sm:flex' : 'flex'}`}>
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-800">{t('title')}</h2>
          <button
            onClick={() => setComposing(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-800 text-white text-xs font-medium hover:bg-stone-700 transition-colors"
          >
            <SquarePen className="h-3.5 w-3.5 shrink-0" />
            <span className="hidden sm:inline">{t('newMessage')}</span>
          </button>
        </div>
        {conversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-stone-400">{t('noConversations')}</p>
            <button
              onClick={() => setComposing(true)}
              className="text-sm font-medium text-stone-700 hover:text-stone-900 underline underline-offset-2 transition-colors"
            >
              {t('startConversation')}
            </button>
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
                      <span className="text-xs text-stone-500 truncate">{formatPreview(conv.lastMessage)}</span>
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
              {activeRecipient && (
                <>
                  <div className="shrink-0 h-9 w-9 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 text-xs font-medium overflow-hidden">
                    {activeRecipient.avatar_url
                      ? <img src={activeRecipient.avatar_url} alt={activeRecipient.name} className="h-full w-full object-cover" />
                      : initials(activeRecipient.name)
                    }
                  </div>
                  <span className="font-medium text-stone-800 text-sm">{activeRecipient.name}</span>
                  {activeRecipient.country && (
                    <span className="text-base">{COUNTRY_FLAGS[activeRecipient.country] ?? ''}</span>
                  )}
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
                  const borrowPayload = parseBorrowPayload(msg.content)

                  if (borrowPayload) {
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        {borrowPayload.type === 'borrow_request' ? (
                          <BorrowRequestCard
                            data={borrowPayload}
                            isMine={isMine}
                            hasResponse={respondedRequestIds.has(borrowPayload.borrow_request_id)}
                            onDecide={(action, message) =>
                              handleBorrowDecide(borrowPayload.borrow_request_id, action, message)
                            }
                          />
                        ) : (
                          <BorrowResponseCard data={borrowPayload} />
                        )}
                      </div>
                    )
                  }

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
