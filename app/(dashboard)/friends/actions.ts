'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function sendFriendRequest(addresseeId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('friendships').insert({
    requester_id: user.id,
    addressee_id: addresseeId,
  })

  if (error) return { error: error.message }

  revalidatePath('/friends')
  return { error: null }
}

export async function respondToRequest(friendshipId: string, response: 'accepted' | 'declined') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('friendships')
    .update({ status: response })
    .eq('id', friendshipId)
    .eq('addressee_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/friends')
  return { error: null }
}

export async function cancelOrRemoveFriend(friendshipId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  if (error) return { error: error.message }

  revalidatePath('/friends')
  return { error: null }
}
