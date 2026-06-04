'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { sendFriendRequest } from './actions'

type InvitedUser = {
  id: string
  name: string
  avatar_url: string | null
}

export type Invitation = {
  id: string
  email: string
  status: 'pending' | 'accepted'
  updated_at: string
  created_at: string
  accepted_user: InvitedUser | null
}

type InviteResult =
  | { exists: true; profile: InvitedUser }
  | { alreadyInvited: true }
  | { sent: true }
  | null

function nameInitials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function isInCooldown(updatedAt: string) {
  return Date.now() - new Date(updatedAt).getTime() < 24 * 60 * 60 * 1000
}

export default function InviteSection({ initialInvitations }: { initialInvitations: Invitation[] }) {
  const t = useTranslations('friends')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<InviteResult>(null)
  const [resentIds, setResentIds] = useState<Set<string>>(new Set())
  const [friendSent, setFriendSent] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      setResult(data)
      if (data.sent) {
        setEmail('')
        window.dispatchEvent(new CustomEvent('invite-sent'))
        router.refresh()
      }
    } catch {
      // ignore network errors
    } finally {
      setLoading(false)
    }
  }

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

  function handleAddFriend(userId: string) {
    startTransition(async () => {
      const res = await sendFriendRequest(userId)
      if (!res?.error) setFriendSent(prev => new Set(prev).add(userId))
    })
  }

  return (
    <div id="invite-section" className="space-y-6">
      {/* Invite input */}
      <div>
        <h3 className="text-base font-semibold text-stone-800 mb-1">{t('inviteAFriend')}</h3>
        <p className="text-sm text-stone-500 mb-4">{t('inviteByEmail')}</p>
        <form onSubmit={handleInvite} className="flex gap-2">
          <Input
            id="invite-email-input"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder={t('emailAddress')}
            className="border-stone-200 focus-visible:ring-stone-400"
            required
          />
          <Button
            type="submit"
            disabled={loading}
            className="bg-stone-800 hover:bg-stone-700 text-white shrink-0"
          >
            {loading ? t('sending') : t('sendInvite')}
          </Button>
        </form>

        {/* Feedback */}
        {result && 'sent' in result && (
          <p className="text-sm text-emerald-600 mt-2">{t('inviteSent')}</p>
        )}
        {result && 'alreadyInvited' in result && (
          <p className="text-sm text-stone-500 mt-2">{t('alreadyInvited')}</p>
        )}
        {result && 'exists' in result && (
          <div className="mt-3 flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-lg p-3">
            <Avatar className="h-8 w-8 shrink-0">
              {result.profile.avatar_url && <AvatarImage src={result.profile.avatar_url} />}
              <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                {nameInitials(result.profile.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800">{result.profile.name}</p>
              <p className="text-xs text-stone-500">{t('alreadyOnBookshelf')}</p>
            </div>
            {friendSent.has(result.profile.id) ? (
              <span className="text-xs text-stone-400 shrink-0">{t('requestSent')}</span>
            ) : (
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => handleAddFriend(result.profile.id)}
                className="bg-stone-800 hover:bg-stone-700 text-white shrink-0"
              >
                {t('addFriend')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Sent invitations list */}
      {initialInvitations.length > 0 && (
        <div>
          <h3 className="text-base font-semibold text-stone-800 mb-3">{t('sentInvitations')}</h3>
          <ul className="divide-y divide-stone-100">
            {initialInvitations.map(inv => (
              <li key={inv.id} className="flex items-center gap-3 py-3">
                {inv.status === 'accepted' && inv.accepted_user ? (
                  <>
                    <Avatar className="h-8 w-8 shrink-0">
                      {inv.accepted_user.avatar_url && <AvatarImage src={inv.accepted_user.avatar_url} />}
                      <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                        {nameInitials(inv.accepted_user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{inv.accepted_user.name}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {new Date(inv.updated_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 shrink-0">
                      {t('joinedBookShelf')}
                    </Badge>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-stone-800 truncate">{inv.email}</p>
                      <p className="text-xs text-stone-400 mt-0.5">
                        {new Date(inv.created_at).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 shrink-0">
                      {t('invited')}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isInCooldown(inv.updated_at) || resentIds.has(inv.id)}
                      onClick={() => handleResend(inv.id)}
                      className="shrink-0 border-stone-200 text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                    >
                      {resentIds.has(inv.id) ? t('resent') : t('resend')}
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
