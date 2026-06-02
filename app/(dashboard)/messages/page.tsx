import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import { getFriends } from '@/lib/db/friends'
import MessagesClient from './messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: friendsData } = await getFriends(user.id)
  const friends = (friendsData ?? [])
    .filter(f => f.status === 'accepted')
    .map(f => ({
      id: f.profile.id,
      name: f.profile.name,
      avatar_url: f.profile.avatar_url,
      country: f.profile.country,
    }))

  return (
    <div style={{ height: 'calc(100vh - 10rem)' }}>
      <Suspense>
        <MessagesClient userId={user.id} friends={friends} />
      </Suspense>
    </div>
  )
}
