'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { COUNTRY_FLAGS } from '@/lib/countries'
import { FriendAvatar } from './friend-avatar'
import type { FriendWithCounts } from '@/types/friends'

export default function FriendCard({ friend }: { friend: FriendWithCounts }) {
  const t = useTranslations('friends')

  const available = friend.availableCount > 0

  return (
    <div className="bg-white rounded-xl border-[0.5px] border-[#d4c4b0] p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <FriendAvatar name={friend.name} src={friend.avatarUrl} size={40} />
        <div className="min-w-0">
          <p className="font-medium text-[#2c1a0e] truncate">
            {friend.name}
            {friend.country && COUNTRY_FLAGS[friend.country] && (
              <span className="ml-1.5" title={friend.country}>
                {COUNTRY_FLAGS[friend.country]}
              </span>
            )}
          </p>
          <p className="text-xs text-[#b8a898] truncate">
            {friend.currentReading ?? t('noRecentReading')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="text-xs rounded-md px-2 py-1 border bg-[#faf6f0] border-[#d4c4b0] text-[#7a5c3e]">
          {t('booksCount', { count: friend.bookCount })}
        </span>
        <span
          className={`text-xs rounded-md px-2 py-1 border ${
            available
              ? 'bg-[#eef4ec] border-[#b8d4b4] text-[#4a6741]'
              : 'bg-[#faf6f0] border-[#d4c4b0] text-[#b8a898]'
          }`}
        >
          {available ? t('availableCount', { count: friend.availableCount }) : t('noneAvailable')}
        </span>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/friends/${friend.id}`}
          className="flex-1 text-center text-sm text-[#2c4a6e] hover:bg-[#f0e8de] rounded-lg py-1.5 transition-colors"
        >
          {t('viewShelf')}
        </Link>
        <Link
          href={`/messages?with=${friend.id}`}
          className="flex-1 text-center text-sm text-[#2c1a0e] hover:bg-[#f0e8de] rounded-lg py-1.5 transition-colors"
        >
          {t('message')}
        </Link>
      </div>
    </div>
  )
}
