'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search } from 'lucide-react'
import FriendCard from './friend-card'
import type { FriendWithCounts } from '@/types/friends'

function focusInvite() {
  const el = document.getElementById('invite-form')
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  setTimeout(() => document.getElementById('invite-email-input')?.focus(), 400)
}

// Owns the friend-name search state. Renders the search bar on top, then any
// `children` (the activity feed), then the filtered friends grid at the bottom.
export default function FriendsBrowser({
  friends,
  children,
}: {
  friends: FriendWithCounts[]
  children?: React.ReactNode
}) {
  const t = useTranslations('friends')
  const [query, setQuery] = useState('')

  const q = query.trim().toLowerCase()
  const filtered = q ? friends.filter(f => f.name.toLowerCase().includes(q)) : friends

  return (
    <div className="flex flex-col gap-6">
      {/* Search — on top */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="h-4 w-4 text-[#b8a898] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('searchByName')}
            className="w-full pl-9 pr-3 py-2 rounded-lg border-[0.5px] border-[#d4c4b0] bg-white text-sm text-[#2c1a0e] placeholder:text-[#b8a898] focus:outline-none focus:ring-2 focus:ring-[#c4852a]/30"
          />
        </div>
        <button
          onClick={focusInvite}
          className="shrink-0 px-3 py-2 rounded-lg bg-[#c4852a] text-white text-sm font-medium hover:bg-[#b0761f] transition-colors"
        >
          {t('addFriend')}
        </button>
      </div>

      {/* Activity feed (passed in from the server page) */}
      {children}

      {/* Friends grid */}
      <section>
        {filtered.length === 0 ? (
          <p className="text-sm text-[#b8a898]">{q ? t('noUsersFound') : t('noFriends')}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map(f => (
              <FriendCard key={f.id} friend={f} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
