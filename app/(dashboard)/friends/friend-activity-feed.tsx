import { getTranslations, getFormatter } from 'next-intl/server'
import { BookOpen } from 'lucide-react'
import { FriendAvatar } from './friend-avatar'
import type { ActivityItem } from '@/types/friends'

export default async function FriendActivityFeed({ items }: { items: ActivityItem[] }) {
  const t = await getTranslations('friends')
  const format = await getFormatter()

  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-xl border-[0.5px] border-[#d4c4b0] overflow-hidden">
      {items.map((item, i) => {
        const text =
          item.type === 'book_added'
            ? t('activityBookAdded', { name: item.friendName })
            : item.type === 'reading_finished'
              ? t('activityFinishedReading', { name: item.friendName })
              : t('activityLent', { name: item.friendName, borrower: item.borrowerName ?? '' })

        const chip =
          item.bookStatus === 'available'
            ? { label: t('available'), cls: 'bg-[#eef4ec] border-[#b8d4b4] text-[#4a6741]' }
            : { label: t('lentOut'), cls: 'bg-[#faf6f0] border-[#d4c4b0] text-[#b8a898]' }

        return (
          <div
            key={i}
            className="flex items-start gap-3 px-4 py-3 border-b border-[#f0e8e0] last:border-b-0"
          >
            <FriendAvatar name={item.friendName} src={item.friendAvatarUrl} size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-[#2c1a0e]">{text}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1.5 bg-[#f0e8de] rounded text-sm px-2 py-1 max-w-full">
                  <BookOpen className="h-3.5 w-3.5 text-[#7a5c3e] shrink-0" />
                  <span className="text-[#2c1a0e] truncate">{item.bookTitle}</span>
                  <span className="text-[#7a5c3e] truncate">· {item.bookAuthor}</span>
                </span>
                <span className={`text-xs rounded px-2 py-0.5 border ${chip.cls}`}>{chip.label}</span>
              </div>
            </div>
            <span className="shrink-0 text-xs text-[#b8a898] whitespace-nowrap">
              {format.relativeTime(new Date(item.occurredAt))}
            </span>
          </div>
        )
      })}
    </div>
  )
}
