'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import NotificationsBell from './notifications-bell'

type NavCounts = { unreadMessages: number; pendingRequests: number }

export default function Nav({ userName, avatarUrl }: { userName: string; avatarUrl?: string | null }) {
  const t = useTranslations('nav')
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const [counts, setCounts] = useState<NavCounts>({ unreadMessages: 0, pendingRequests: 0 })
  const menuRef = useRef<HTMLDivElement>(null)

  const NAV_LINKS = [
    { href: '/books',    label: t('myBooks'),  badge: null as null | keyof NavCounts },
    { href: '/friends',  label: t('friends'),  badge: null as null | keyof NavCounts },
    { href: '/messages', label: t('messages'), badge: 'unreadMessages' as keyof NavCounts },
    { href: '/loans',    label: t('loans'),    badge: 'pendingRequests' as keyof NavCounts },
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
          <span className="font-semibold text-stone-800 tracking-tight">BookShelf</span>
          <nav className="hidden sm:flex items-center gap-1">
            {NAV_LINKS.map(({ href, label, badge }) => {
              const count = badge ? counts[badge] : 0
              return (
                <Link
                  key={href}
                  href={href}
                  className={`relative px-3 py-1.5 rounded-md text-sm transition-colors ${
                    pathname.startsWith(href)
                      ? 'bg-stone-100 text-stone-900 font-medium'
                      : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                  }`}
                >
                  {label}
                  {count > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                      {count > 9 ? '9+' : count}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Right: bell + avatar (both mobile and desktop) */}
        <div className="flex items-center gap-1.5">
          <NotificationsBell />
          <div ref={menuRef} className="relative flex items-center gap-2">
            <span className="text-sm text-stone-500 hidden sm:block">{userName}</span>
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
                  className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
                >
                  {t('profile')}
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
