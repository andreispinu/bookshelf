'use client'

import { useEffect, useState } from 'react'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'revenue', label: 'Revenue' },
  { id: 'activity', label: 'Activity' },
]

export default function AdminTabs() {
  const [active, setActive] = useState('overview')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length > 0) setActive(visible[0].target.id)
      },
      { threshold: 0.1, rootMargin: '0px 0px -60% 0px' }
    )
    TABS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-6">
        <nav className="flex gap-1 -mb-px">
          {TABS.map(({ id, label }) => (
            <a
              key={id}
              href={`#${id}`}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                active === id
                  ? 'border-stone-800 text-stone-900'
                  : 'border-transparent text-stone-400 hover:text-stone-600'
              }`}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
