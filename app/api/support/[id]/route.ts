import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// GET /api/support/[id] — get ticket + replies, mark admin replies as read
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      id, type, subject, status, created_at, updated_at,
      support_replies(id, from_admin, content, read_at, created_at)
    `)
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Mark unread admin replies as read
  const unreadIds = (ticket.support_replies as { id: string; from_admin: boolean; read_at: string | null }[])
    .filter(r => r.from_admin && !r.read_at)
    .map(r => r.id)

  if (unreadIds.length > 0) {
    await supabaseAdmin
      .from('support_replies')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
  }

  return NextResponse.json({ ticket })
}

// POST /api/support/[id] — user replies to an existing ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify ownership
  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select('id, subject')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const { data: reply, error } = await supabaseAdmin
    .from('support_replies')
    .insert({ ticket_id: id, from_admin: false, content: content.trim() })
    .select('id, from_admin, content, read_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Bump updated_at on ticket + reopen if resolved
  await supabaseAdmin
    .from('support_tickets')
    .update({ updated_at: new Date().toISOString(), status: 'open' })
    .eq('id', id)

  return NextResponse.json({ reply })
}
