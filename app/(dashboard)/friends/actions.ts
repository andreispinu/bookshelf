'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { friendRequestEmail } from '@/lib/email-templates'

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

  // Fire-and-forget email to the addressee
  ;(async () => {
    const [senderProfile, recipientAuth] = await Promise.all([
      supabaseAdmin.from('profiles').select('name').eq('id', user.id).single(),
      supabaseAdmin.auth.admin.getUserById(addresseeId),
    ])
    const senderName = senderProfile.data?.name
    const recipientEmail = recipientAuth.data?.user?.email
    if (!senderName || !recipientEmail) return
    const { subject, html } = friendRequestEmail(senderName)
    await sendEmail({ to: recipientEmail, subject, html })
  })().catch(console.error)

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
