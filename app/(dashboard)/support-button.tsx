'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

export default function SupportButton() {
  const [unread, setUnread] = useState(0)

  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch('/api/nav-counts')
      if (!res.ok) return
      const data = await res.json()
      setUnread(data.unreadSupportReplies ?? 0)
    } catch {}
  }, [])

  useEffect(() => {
    fetchCounts()
    const interval = setInterval(fetchCounts, 30_000)
    return () => clearInterval(interval)
  }, [fetchCounts])

  return (
    <Link
      href="/support"
      aria-label="Support"
      className="fixed bottom-20 right-4 sm:bottom-6 z-30 h-12 w-12 rounded-full bg-stone-800 text-white shadow-lg flex items-center justify-center hover:bg-stone-700 transition-colors"
    >
      <MessageCircle className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
