import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { getFriends } from '@/lib/db/friends'
import { Separator } from '@/components/ui/separator'
import UserSearch from './user-search'
import FriendList from './friend-list'
import FriendsTabs from './friends-tabs'

export default async function FriendsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('friends')

  const { data: friends, error } = await getFriends(user.id)

  return (
    <div className="max-w-lg">
      <FriendsTabs active="friends" />
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">{t('title')}</h2>
        <p className="text-stone-500 text-sm mt-0.5">{t('connectWith')}</p>
      </div>

      <UserSearch currentUserId={user.id} existingFriends={friends ?? []} />

      <Separator className="my-8 bg-stone-100" />

      {error && <p className="text-sm text-red-600">Failed to load friends: {error}</p>}

      {friends && <FriendList friends={friends} />}
    </div>
  )
}
