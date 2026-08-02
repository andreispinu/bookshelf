import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  getFriendsWithBookCounts,
  getFriendActivityFeed,
  getSuggestedFriends,
} from '@/lib/db/friends'
import FriendsTabs from './friends-tabs'
import PendingRequestBanner, { type PendingRequest } from './pending-request-banner'
import FriendActivityFeed from './friend-activity-feed'
import FriendsBrowser from './friends-browser'
import SuggestedFriends from './suggested-friends'
import InviteForm from './invite-form'
import SentInvitations, { type Invitation } from './sent-invitations'

export default async function FriendsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('friends')

  const [friends, activity, suggested, { data: pendingRows }, { data: invitationRows }] =
    await Promise.all([
      getFriendsWithBookCounts(user.id),
      getFriendActivityFeed(user.id, 3),
      getSuggestedFriends(user.id),
      supabase
        .from('friendships')
        .select('id, created_at, requester:profiles!friendships_requester_id_fkey(id, name, avatar_url)')
        .eq('addressee_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('invitations')
        .select('id, email, status, updated_at, created_at, accepted_user:accepted_user_id(id, name, avatar_url)')
        .eq('inviter_id', user.id)
        .order('created_at', { ascending: false }),
    ])

  const invitations: Invitation[] = (
    (invitationRows ?? []) as unknown as Array<{
      id: string
      email: string
      status: 'pending' | 'accepted'
      updated_at: string
      created_at: string
      accepted_user:
        | { id: string; name: string; avatar_url: string | null }
        | { id: string; name: string; avatar_url: string | null }[]
        | null
    }>
  ).map(row => ({
    id: row.id,
    email: row.email,
    status: row.status,
    updated_at: row.updated_at,
    created_at: row.created_at,
    accepted_user: Array.isArray(row.accepted_user) ? row.accepted_user[0] ?? null : row.accepted_user,
  }))

  const pending: PendingRequest[] = (
    (pendingRows ?? []) as unknown as Array<{
      id: string
      created_at: string
      requester: { name: string; avatar_url: string | null } | { name: string; avatar_url: string | null }[]
    }>
  ).map(row => {
    const p = Array.isArray(row.requester) ? row.requester[0] : row.requester
    return {
      friendshipId: row.id,
      createdAt: row.created_at,
      name: p?.name ?? '',
      avatarUrl: p?.avatar_url ?? null,
    }
  })

  return (
    <div>
      <FriendsTabs active="friends" />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-serif text-3xl text-[#1e1008]">{t('pageTitle')}</h1>
        <p className="text-sm text-[#7a5c3e] mt-1">
          {t('subtitle', { count: friends.length, requests: pending.length })}
        </p>
      </div>

      {/* Pending request banners */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-3 mb-6">
          {pending.map(p => (
            <PendingRequestBanner key={p.friendshipId} request={p} />
          ))}
        </div>
      )}

      {/* Main grid: content + sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6 items-start">
        {/* Left: search (top) + activity feed + friends grid */}
        <div className="min-w-0">
          <FriendsBrowser friends={friends}>
            {activity.length > 0 && (
              <section>
                <h2 className="font-serif text-xl text-[#2c1a0e] mb-3">{t('activitySection')}</h2>
                <FriendActivityFeed items={activity} />
                <Link
                  href="/feed"
                  className="mt-2 inline-block text-sm text-[#2c4a6e] hover:underline"
                >
                  {t('seeAll')} →
                </Link>
              </section>
            )}
          </FriendsBrowser>
        </div>

        {/* Right: sidebar — People you may know, then invite */}
        <aside className="flex flex-col gap-6">
          <SuggestedFriends suggestions={suggested} />
          <InviteForm />
          <SentInvitations invitations={invitations} />
        </aside>
      </div>
    </div>
  )
}
