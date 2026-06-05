'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

const ANCHOR_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'activity', label: 'Activity' },
]

export default function AdminTabs() {
  const pathname = usePathname()
  const isSupport = pathname.startsWith('/admin/support')
  const [activeAnchor, setActiveAnchor] = useState('overview')

  useEffect(() => {
    if (isSupport) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActiveAnchor(visible[0].target.id)
      },
      { threshold: 0.1, rootMargin: '0px 0px -60% 0px' }
    )
    ANCHOR_TABS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [isSupport])

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex gap-1 -mb-px">
          {ANCHOR_TABS.map(({ id, label }) => (
            <a
              key={id}
              href={isSupport ? `/admin#${id}` : `#${id}`}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                !isSupport && activeAnchor === id
                  ? 'border-stone-800 text-stone-900'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              {label}
            </a>
          ))}
          <Link
            href="/admin/support"
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              isSupport
                ? 'border-stone-800 text-stone-900'
                : 'border-transparent text-stone-400 hover:text-stone-600'
            }`}
          >
            Support
          </Link>
        </nav>
      </div>
    </div>
  )
}
