'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { RefreshCw, ShoppingBag, Users, MessageCircle, type LucideIcon } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NotificationsBell from './notifications-bell'

type NavCounts = { unreadMessages: number; pendingRequests: number; pendingFriendRequests: number }

export default function Nav({ userName, avatarUrl, missingCount = 0 }: { userName: string; avatarUrl?: string | null; missingCount?: number }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [counts, setCounts] = useState<NavCounts>({ unreadMessages: 0, pendingRequests: 0, pendingFriendRequests: 0 })
  const [refreshing, setRefreshing] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Text nav (desktop). Friends + Messages moved to icon buttons on the right.
  const NAV_LINKS = [
    { href: '/books',       label: t('myBooks'),     badge: null as null | keyof NavCounts },
    { href: '/feed',        label: t('feed'),        badge: null as null | keyof NavCounts },
    { href: '/loans',       label: t('loans'),       badge: 'pendingRequests' as keyof NavCounts },
    { href: '/bookstore',   label: t('bookstore'),   badge: null as null | keyof NavCounts },
    { href: '/marketplace', label: t('marketplace'), badge: null as null | keyof NavCounts },
  ]

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/nav-counts')
      if (!res.ok) return
      const data = await res.json()
      setCounts(data)
    } catch {}
  }, [])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 30_000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleRefresh() {
    if (refreshing) return
    setRefreshing(true)
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration()
      if (reg?.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
    }
    setTimeout(() => window.location.reload(), 1000)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="border-b border-stone-200 bg-stone-50 sm:bg-white">
      <div className="max-w-4xl mx-auto px-4 h-[52px] sm:h-14 flex items-center justify-between">

        {/* Left: wordmark + desktop nav links */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <img src="/icon.svg" alt="" className="w-7 h-7" aria-hidden="true" />
            <span className="font-serif text-xl font-semibold text-ink tracking-tight">BookShelf</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-5">
            {NAV_LINKS.map(({ href, label, badge }) => {
              const count = badge ? counts[badge] : 0
              const active = pathname.startsWith(href)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative whitespace-nowrap text-sm pb-0.5 border-b-2 transition-colors ${
                    active
                      ? 'font-medium text-stone-900 border-amber'
                      : 'text-stone-500 hover:text-stone-800 border-transparent'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className="absolute -top-1 -right-2.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: friends + messages icons (desktop) + bell + refresh (mobile) + avatar */}
        <div className="flex items-center gap-1.5">
          <NavIconLink
            href="/friends"
            label={t('friends')}
            Icon={Users}
            count={counts.pendingFriendRequests}
            active={pathname.startsWith('/friends')}
          />
          <NavIconLink
            href="/messages"
            label={t('messages')}
            Icon={MessageCircle}
            count={counts.unreadMessages}
            active={pathname.startsWith('/messages')}
          />
          <NotificationsBell />
          <Link
            href="/marketplace"
            aria-label="Marketplace"
            className="sm:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
          </Link>
          <button
            onClick={handleRefresh}
            aria-label="Refresh app"
            className="sm:hidden p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <RefreshCw className={`h-[18px] w-[18px] ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <div ref={menuRef} className="relative flex items-center">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
              aria-label="Account menu"
            >
              <Avatar className="h-8 w-8">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
                <AvatarFallback className="bg-stone-200 text-stone-700 text-xs cursor-pointer hover:bg-stone-300 transition-colors">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-stone-200 bg-white shadow-lg py-1.5 z-10">
                <Link
                  href="/profile"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  {t('profile')}
                  {missingCount > 0 && (
                    <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
                  )}
                </Link>
                <Link
                  href="/marketplace"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50 sm:hidden"
                >
                  {t('marketplace')}
                </Link>
                <Link
                  href="/support"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  {t('support')}
                </Link>
                <div className="my-1 border-t border-stone-100" />
                <button
                  onClick={() => { setMenuOpen(false); handleSignOut() }}
                  className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  {t('signOut')}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </header>
  )
}

// Desktop-only icon button (Friends / Messages) with a hover tooltip + unread badge.
function NavIconLink({
  href, label, Icon, count, active,
}: {
  href: string
  label: string
  Icon: LucideIcon
  count: number
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group relative hidden sm:inline-flex items-center justify-center p-1.5 rounded-lg transition-colors ${
        active ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
      }`}
    >
      <Icon className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute top-0 right-0 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {count > 9 ? '9+' : count}
        </span>
      )}
      <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1 whitespace-nowrap rounded-md bg-stone-800 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        {label}
      </span>
    </Link>
  )
}
