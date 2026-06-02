'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen, Users, MessageSquare, ArrowLeftRight } from 'lucide-react'

type NavCounts = { unreadMessages: number; pendingRequests: number }

export default function MobileBottomNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')
  const [counts, setCounts] = useState<NavCounts>({ unreadMessages: 0, pendingRequests: 0 })

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/nav-counts')
      if (!res.ok) return
      setCounts(await res.json())
    } catch {}
  }, [])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 30_000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  const items = [
    { href: '/books',    label: t('myBooks'),  Icon: BookOpen,         badge: null as null | keyof NavCounts },
    { href: '/friends',  label: t('friends'),  Icon: Users,            badge: null as null | keyof NavCounts },
    { href: '/messages', label: t('messages'), Icon: MessageSquare,    badge: 'unreadMessages' as keyof NavCounts },
    { href: '/loans',    label: t('loans'),    Icon: ArrowLeftRight,   badge: 'pendingRequests' as keyof NavCounts },
  ]

  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 bg-stone-50 border-t border-stone-200 z-40"
      style={{ paddingBottom: 'max(14px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex">
        {items.map(({ href, label, Icon, badge }) => {
          const count = badge ? counts[badge] : 0
          const isActive = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5"
            >
              <div className="relative">
                <Icon
                  className="h-5 w-5"
                  style={{ color: isActive ? '#1c1917' : '#a8a29e' }}
                  strokeWidth={isActive ? 2 : 1.5}
                />
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-600 ring-[1.5px] ring-white" />
                )}
              </div>
              <span
                className="text-[9px] leading-none"
                style={{
                  color: isActive ? '#1c1917' : '#a8a29e',
                  fontWeight: isActive ? 500 : 400,
                }}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
