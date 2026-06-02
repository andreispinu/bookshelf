'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { sendFriendRequest } from './actions'
import { COUNTRY_FLAGS } from '@/lib/countries'
import type { FriendSuggestion } from '@/lib/db/friends'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function SuggestionsClient({ suggestions }: { suggestions: FriendSuggestion[] }) {
  const t = useTranslations('friends')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  async function handleAdd(id: string) {
    setPendingIds(prev => new Set(prev).add(id))
    await sendFriendRequest(id)
  }

  return (
    <section>
      <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
        {t('peopleYouMayKnow')}
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {suggestions.map(s => (
          <div key={s.id} className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-2.5">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-8 w-8 shrink-0">
                {s.avatar_url && <AvatarImage src={s.avatar_url} alt={s.name} />}
                <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                  {initials(s.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-800 truncate">{s.name}</p>
                {s.country && (
                  <p className="text-xs text-stone-400 truncate">
                    {COUNTRY_FLAGS[s.country] && <span className="mr-1">{COUNTRY_FLAGS[s.country]}</span>}
                    {s.country}
                  </p>
                )}
              </div>
            </div>
            <p className="text-xs text-stone-400">{t('mutualFriends', { count: s.mutualCount })}</p>
            <Button
              size="sm"
              disabled={pendingIds.has(s.id)}
              onClick={() => handleAdd(s.id)}
              className={
                pendingIds.has(s.id)
                  ? 'w-full bg-stone-100 text-stone-400 cursor-not-allowed hover:bg-stone-100'
                  : 'w-full bg-stone-800 hover:bg-stone-700 text-white'
              }
            >
              {pendingIds.has(s.id) ? t('pending') : t('addFriend')}
            </Button>
          </div>
        ))}
      </div>
    </section>
  )
}
