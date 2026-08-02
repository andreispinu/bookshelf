'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { FriendAvatar } from './friend-avatar'

export type Invitation = {
  id: string
  email: string
  status: 'pending' | 'accepted'
  updated_at: string
  created_at: string
  accepted_user: { id: string; name: string; avatar_url: string | null } | null
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function isInCooldown(updatedAt: string) {
  return Date.now() - new Date(updatedAt).getTime() < 24 * 60 * 60 * 1000
}

export default function SentInvitations({ invitations }: { invitations: Invitation[] }) {
  const t = useTranslations('friends')
  const router = useRouter()
  const [resentIds, setResentIds] = useState<Set<string>>(new Set())

  if (invitations.length === 0) return null

  async function handleResend(id: string) {
    const res = await fetch('/api/invitations/resend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      setResentIds(prev => new Set(prev).add(id))
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-xl border-[0.5px] border-[#d4c4b0] p-4">
      <h3 className="font-serif text-lg text-[#2c1a0e] mb-3">{t('sentInvitations')}</h3>
      <ul className="flex flex-col divide-y divide-[#f0e8e0]">
        {invitations.map(inv =>
          inv.status === 'accepted' && inv.accepted_user ? (
            <li key={inv.id} className="py-2.5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-2.5">
                <FriendAvatar name={inv.accepted_user.name} src={inv.accepted_user.avatar_url} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-[#2c1a0e] truncate">{inv.accepted_user.name}</p>
                  <p className="text-xs text-[#b8a898]">{formatDate(inv.updated_at)}</p>
                </div>
              </div>
              <span className="inline-block mt-1.5 text-xs rounded-md px-2 py-0.5 border bg-[#eef4ec] border-[#b8d4b4] text-[#4a6741]">
                {t('joinedBookShelf')}
              </span>
            </li>
          ) : (
            <li key={inv.id} className="py-2.5 first:pt-0 last:pb-0">
              <p className="text-sm text-[#2c1a0e] truncate">{inv.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-[#b8a898] flex-1 truncate">{formatDate(inv.created_at)}</span>
                <span className="shrink-0 text-xs rounded-md px-2 py-0.5 border bg-[#faf0dc] border-[#e8d0a0] text-[#c4852a]">
                  {t('invited')}
                </span>
                <button
                  disabled={isInCooldown(inv.updated_at) || resentIds.has(inv.id)}
                  onClick={() => handleResend(inv.id)}
                  className="shrink-0 text-xs rounded-md px-2 py-1 border border-[#d4c4b0] text-[#7a5c3e] hover:bg-[#f0e8de] disabled:opacity-40 transition-colors"
                >
                  {resentIds.has(inv.id) ? t('resent') : t('resend')}
                </button>
              </div>
            </li>
          )
        )}
      </ul>
    </div>
  )
}
