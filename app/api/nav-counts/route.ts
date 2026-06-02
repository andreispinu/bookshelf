import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ unreadMessages: 0, pendingRequests: 0 })

  const [{ count: unreadMessages }, { count: pendingRequests }] = await Promise.all([
    supabaseAdmin
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .eq('read', false),
    supabaseAdmin
      .from('borrow_requests')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', user.id)
      .eq('status', 'pending'),
  ])

  return NextResponse.json({
    unreadMessages: unreadMessages ?? 0,
    pendingRequests: pendingRequests ?? 0,
  })
}
