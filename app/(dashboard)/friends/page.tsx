import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getFriends, getFriendSuggestions } from '@/lib/db/friends'
import { Separator } from '@/components/ui/separator'
import UserSearch from './user-search'
import FriendList from './friend-list'
import FriendsTabs from './friends-tabs'
import SuggestionsClient from './suggestions-client'
import InviteSection from './invite-section'
import InviteCta from './invite-cta'
import type { Invitation } from './invite-section'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('friends')

  const [{ data: friends, error }, suggestions, { data: invitations }] = await Promise.all([
    getFriends(user.id),
    getFriendSuggestions(user.id),
    supabaseAdmin
      .from('invitations')
      .select('id, email, status, updated_at, created_at, accepted_user:accepted_user_id(id, name, avatar_url)')
      .eq('inviter_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const inviteCount = (invitations ?? []).length

  return (
    <div className="max-w-lg">
      <FriendsTabs active="friends" />
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">{t('title')}</h2>
        <p className="text-stone-500 text-sm mt-0.5">{t('connectWith')}</p>
      </div>

      <InviteCta initialCount={inviteCount} />

      <UserSearch currentUserId={user.id} existingFriends={friends ?? []} />

      <Separator className="my-8 bg-stone-100" />

      {error && <p className="text-sm text-red-600">Failed to load friends: {error}</p>}

      {friends && <FriendList friends={friends} />}

      {suggestions.length > 0 && (
        <>
          <Separator className="my-8 bg-stone-100" />
          <SuggestionsClient suggestions={suggestions} />
        </>
      )}

      <Separator className="my-8 bg-stone-100" />
      <InviteSection initialInvitations={(invitations ?? []) as unknown as Invitation[]} />
    </div>
  )
}
