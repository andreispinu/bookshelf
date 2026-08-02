'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Plus, Check } from 'lucide-react'
import { sendFriendRequest } from './actions'
import { FriendAvatar } from './friend-avatar'
import type { SuggestedFriend } from '@/types/friends'

export default function SuggestedFriends({ suggestions }: { suggestions: SuggestedFriend[] }) {
  const t = useTranslations('friends')
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())

  if (suggestions.length === 0) return null

  async function add(id: string) {
    setPendingIds(prev => new Set(prev).add(id))
    await sendFriendRequest(id)
  }

  return (
    <div className="bg-white rounded-xl border-[0.5px] border-[#d4c4b0] p-4">
      <h3 className="font-serif text-lg text-[#2c1a0e] mb-3">{t('suggestedTitle')}</h3>
      <div className="flex flex-col gap-4">
        {suggestions.map((s, i) => (
          <div key={s.id} className={i > 0 ? 'pt-4 border-t border-[#f0e8e0]' : ''}>
            <div className="flex items-center gap-3">
              <FriendAvatar name={s.name} src={s.avatarUrl} size={38} />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-[#2c1a0e] leading-snug">{s.name}</p>
                <p className="text-xs text-[#b8a898]">
                  {s.mutualCount > 0
                    ? `${t('mutualFriends', { count: s.mutualCount })} · ${t('booksCount', { count: s.bookCount })}`
                    : t('booksCount', { count: s.bookCount })}
                </p>
              </div>
              <button
                disabled={pendingIds.has(s.id)}
                onClick={() => add(s.id)}
                aria-label={t('addFriend')}
                title={t('addFriend')}
                className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg border border-[#c4852a] text-[#c4852a] hover:bg-[#faf0dc] disabled:opacity-50 transition-colors"
              >
                {pendingIds.has(s.id) ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            </div>

            {s.bookCount > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                {s.bookPreview[0] && (
                  <span className="bg-[#e8ddd0] text-[#2c1a0e] text-xs rounded px-2 py-1 truncate max-w-[160px]">
                    {s.bookPreview[0]}
                  </span>
                )}
                {s.shelfUrl && (
                  <Link href={s.shelfUrl} className="text-sm text-[#2c4a6e] hover:underline">
                    {t('viewShelf')} →
                  </Link>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
