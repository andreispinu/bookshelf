import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { newTicketAdminEmail } from '@/lib/email-templates'

const SUPPORT_BOT_ID = '00000000-0000-0000-0000-000000000001'
const ADMIN_EMAIL = 'sp_andrei@yahoo.com'
const VALID_TYPES = ['bug', 'question', 'feature', 'billing', 'other']

// GET /api/support — list current user's tickets with latest reply
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tickets, error } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      id, type, subject, status, created_at, updated_at,
      support_replies(id, from_admin, content, read_at, created_at)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ tickets: tickets ?? [] })
}

// POST /api/support — create a new ticket
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { type, subject, message } = body

  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }
  if (!subject?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Subject and message are required' }, { status: 400 })
  }

  // Create the ticket
  const { data: ticket, error: ticketError } = await supabaseAdmin
    .from('support_tickets')
    .insert({ user_id: user.id, type, subject: subject.trim(), status: 'open' })
    .select('id')
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
  }

  // Insert initial user message into support_replies
  await supabaseAdmin.from('support_replies').insert({
    ticket_id: ticket.id,
    from_admin: false,
    content: message.trim(),
  })

  // Insert stub into messages table for nav badge + /messages preview
  const msgContent = `SUPPORT:${JSON.stringify({ ticketId: ticket.id, type, subject: subject.trim() })}\n${message.trim().slice(0, 200)}`
  await supabaseAdmin.from('messages').insert({
    sender_id: user.id,
    receiver_id: SUPPORT_BOT_ID,
    content: msgContent,
    read: true, // user's own message, don't count as unread for them
  })

  // Get user's profile and email for admin notification
  const [{ data: profile }, { data: authUser }] = await Promise.all([
    supabaseAdmin.from('profiles').select('name, first_name').eq('id', user.id).single(),
    supabaseAdmin.auth.admin.getUserById(user.id),
  ])

  const userName = profile?.name ?? 'Unknown'
  const userEmail = authUser.user?.email ?? ''

  sendEmail({
    to: ADMIN_EMAIL,
    ...newTicketAdminEmail(userName, userEmail, type, subject.trim(), message.trim(), ticket.id),
  }).catch(console.error)

  return NextResponse.json({ ticket: { id: ticket.id } })
}
