'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Bell } from 'lucide-react'

type Notification = {
  id: string
  type: 'friend_request' | 'friend_accepted' | 'friend_new_book' | 'borrow_request' | 'borrow_approved' | 'borrow_rejected' | 'new_message' | 'support_reply'
  read: boolean
  created_at: string
  actor: { id: string; name: string; avatar_url: string | null } | null
  book: { id: string; title: string } | null
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

function notifHref(n: Notification): string {
  if (n.type === 'friend_new_book' && n.actor?.id) return `/friends/${n.actor.id}`
  if (n.type === 'borrow_request') return '/loans/requests'
  if (n.type === 'borrow_approved' || n.type === 'borrow_rejected') return '/loans?tab=requests'
  if (n.type === 'new_message' && n.actor?.id) return `/messages?with=${n.actor.id}`
  if (n.type === 'support_reply') return '/support'
  return '/friends'
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function NotificationsBell() {
  const t = useTranslations('notifications')
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const dropdownRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.read).length

  function notifMessage(n: Notification): string {
    const name = n.actor?.name ?? 'Someone'
    const title = n.book?.title ?? 'a book'
    if (n.type === 'friend_request') return t('friendRequest', { name })
    if (n.type === 'friend_accepted') return t('friendAccepted', { name })
    if (n.type === 'friend_new_book') return t('friendNewBook', { name, title })
    if (n.type === 'borrow_request') return t('borrowRequest', { name, title })
    if (n.type === 'borrow_approved') return t('borrowApproved', { name, title })
    if (n.type === 'borrow_rejected') return t('borrowRejected', { name, title })
    if (n.type === 'new_message') return t('newMessage', { name })
    if (n.type === 'support_reply') return t('supportReply')
    return ''
  }

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.notifications ?? [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60_000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleMarkRead(id: string) {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  }

  async function handleMarkAllRead() {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true }),
    })
  }

  async function handleNotifClick(n: Notification) {
    setOpen(false)
    if (!n.read) await handleMarkRead(n.id)
    router.push(notifHref(n))
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-1.5 rounded-md text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
        aria-label={t('title')}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-80 rounded-xl border border-stone-200 bg-white shadow-lg z-20 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-stone-100">
            <span className="text-sm font-semibold text-stone-800">{t('title')}</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
              >
                {t('markAllRead')}
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-stone-400">
              {t('noNotifications')}
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-stone-100">
              {notifications.map(n => (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotifClick(n)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-stone-100 transition-colors ${
                      !n.read ? 'bg-amber-50' : 'bg-white'
                    }`}
                  >
                    <div className="shrink-0 h-8 w-8 rounded-full bg-stone-200 flex items-center justify-center text-stone-700 text-xs font-medium overflow-hidden">
                      {n.actor?.avatar_url
                        ? <img src={n.actor.avatar_url} alt={n.actor.name} className="h-full w-full object-cover" />
                        : (n.actor ? initials(n.actor.name) : '?')
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-800 leading-snug">{notifMessage(n)}</p>
                      <p className="text-xs text-stone-400 mt-0.5">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read && (
                      <div className="shrink-0 mt-2 h-2 w-2 rounded-full bg-red-400" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
