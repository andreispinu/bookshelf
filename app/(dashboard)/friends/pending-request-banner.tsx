'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useFormatter } from 'next-intl'
import { respondToRequest } from './actions'
import { FriendAvatar } from './friend-avatar'

export type PendingRequest = {
  friendshipId: string
  name: string
  avatarUrl: string | null
  createdAt: string
}

export default function PendingRequestBanner({ request }: { request: PendingRequest }) {
  const t = useTranslations('friends')
  const format = useFormatter()
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function respond(response: 'accepted' | 'declined') {
    startTransition(async () => {
      const result = await respondToRequest(request.friendshipId, response)
      if (!result?.error) router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border-[0.5px] border-[#d4c4b0] border-l-[3px] border-l-[#c4852a] p-4 flex items-center gap-3">
      <FriendAvatar name={request.name} src={request.avatarUrl} size={40} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[#2c1a0e]">{t('pendingRequestBanner', { name: request.name })}</p>
        <p className="text-xs text-[#b8a898] mt-0.5">{format.relativeTime(new Date(request.createdAt))}</p>
      </div>
      <div className="flex gap-2 shrink-0">
        <button
          disabled={isPending}
          onClick={() => respond('accepted')}
          className="px-3 py-1.5 rounded-lg bg-[#4a6741] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {t('accept')}
        </button>
        <button
          disabled={isPending}
          onClick={() => respond('declined')}
          className="px-3 py-1.5 rounded-lg text-[#7a5c3e] text-sm font-medium hover:bg-[#f0e8de] disabled:opacity-50 transition-colors"
        >
          {t('decline')}
        </button>
      </div>
    </div>
  )
}
