'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import {
  friendRequestEmail,
  friendRequestAcceptedEmail,
  friendRequestAcceptedEmailRo,
  friendRequestAcceptedEmailRu,
} from '@/lib/email-templates'

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

  // Fire-and-forget email to the requester when their request was accepted.
  // The acceptor is the current user (the addressee of the request).
  if (response === 'accepted') {
    ;(async () => {
      const { data: friendship } = await supabaseAdmin
        .from('friendships')
        .select('requester_id')
        .eq('id', friendshipId)
        .single()
      const requesterId = friendship?.requester_id
      if (!requesterId) return

      const [acceptorProfile, requesterProfile, requesterAuth] = await Promise.all([
        supabaseAdmin.from('profiles').select('name, username').eq('id', user.id).single(),
        supabaseAdmin.from('profiles').select('ui_language').eq('id', requesterId).single(),
        supabaseAdmin.auth.admin.getUserById(requesterId),
      ])

      const acceptorName = acceptorProfile.data?.name
      const acceptorUsername = acceptorProfile.data?.username ?? ''
      const requesterEmail = requesterAuth.data?.user?.email
      if (!acceptorName || !requesterEmail) return

      const lang = requesterProfile.data?.ui_language
      const template =
        lang === 'ro' ? friendRequestAcceptedEmailRo
        : lang === 'ru' ? friendRequestAcceptedEmailRu
        : friendRequestAcceptedEmail

      await sendEmail({ to: requesterEmail, ...template(acceptorName, acceptorUsername) })
    })().catch(console.error)
  }

  return { error: null }
}

export async function deleteSentInvitation(invitationId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Scoped to the current user's own invitations.
  const { error } = await supabaseAdmin
    .from('invitations')
    .delete()
    .eq('id', invitationId)
    .eq('inviter_id', user.id)

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
