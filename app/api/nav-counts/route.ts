import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

const SUPPORT_BOT_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ unreadMessages: 0, pendingRequests: 0, unreadSupportReplies: 0 })

  const [{ count: unreadMessages }, { count: pendingRequests }] = await Promise.all([
    supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false)
      .neq('sender_id', SUPPORT_BOT_ID),
    supabaseAdmin
      .from('borrow_requests')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'pending'),
  ])

  // Support unread count requires two steps (no subquery in Supabase JS client)
  const { data: myTickets } = await supabaseAdmin
    .from('support_tickets')
    .select('id')
    .eq('user_id', user.id)
  const ticketIds = (myTickets ?? []).map((t: { id: string }) => t.id)
  let unreadSupportReplies = 0
  if (ticketIds.length > 0) {
    const { count } = await supabaseAdmin
      .from('support_replies')
      .select('id', { count: 'exact', head: true })
      .eq('from_admin', true)
      .is('read_at', null)
      .in('ticket_id', ticketIds)
    unreadSupportReplies = count ?? 0
  }

  return NextResponse.json({
    unreadMessages: unreadMessages ?? 0,
    pendingRequests: pendingRequests ?? 0,
    unreadSupportReplies: unreadSupportReplies ?? 0,
  })
}
