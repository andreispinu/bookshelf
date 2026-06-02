import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 })

  // Find pending invitation by token
  const { data: invitation } = await supabaseAdmin
    .from('invitations')
    .select('id, inviter_id, status')
    .eq('token', token)
    .eq('status', 'pending')
    .maybeSingle()

  if (!invitation) return NextResponse.json({ error: 'Invalid or already accepted token' }, { status: 404 })

  const inv = invitation as { id: string; inviter_id: string; status: string }

  if (inv.inviter_id === user.id) {
    return NextResponse.json({ error: 'Cannot accept your own invitation' }, { status: 400 })
  }

  // Mark as accepted
  await supabaseAdmin
    .from('invitations')
    .update({ status: 'accepted', accepted_user_id: user.id, updated_at: new Date().toISOString() })
    .eq('id', inv.id)

  // Send friend request from inviter to new user (if no existing friendship)
  const { data: existing } = await supabaseAdmin
    .from('friendships')
    .select('id')
    .or(`and(requester_id.eq.${inv.inviter_id},addressee_id.eq.${user.id}),and(requester_id.eq.${user.id},addressee_id.eq.${inv.inviter_id})`)
    .maybeSingle()

  if (!existing) {
    await supabaseAdmin.from('friendships').insert({
      requester_id: inv.inviter_id,
      addressee_id: user.id,
      status: 'pending',
    })
  }

  return NextResponse.json({ accepted: true })
}
