import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { adminReplyEmail, ticketSolvedEmail } from '@/lib/email-templates'

const SUPPORT_BOT_ID = '00000000-0000-0000-0000-000000000001'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== 'sp_andrei@yahoo.com') return null
  return user
}

// GET /api/admin/support/[id] — get single ticket with full thread
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      id, type, subject, status, created_at, updated_at, user_id,
      profiles!support_tickets_user_id_fkey(id, name, avatar_url, first_name),
      support_replies(id, from_admin, content, read_at, created_at)
    `)
    .eq('id', id)
    .single()

  if (error || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Get user email
  const profile = ticket.profiles as unknown as { id: string; name: string; avatar_url: string | null; first_name: string | null } | null
  let userEmail = ''
  if (profile?.id) {
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
    userEmail = authUser.user?.email ?? ''
  }

  return NextResponse.json({ ticket, userEmail })
}

// PATCH /api/admin/support/[id] — update ticket status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  const VALID_STATUSES = ['open', 'in_progress', 'resolved']
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
  }

  const { data: ticket, error } = await supabaseAdmin
    .from('support_tickets')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(`
      id, subject, user_id,
      profiles!support_tickets_user_id_fkey(name, first_name)
    `)
    .single()

  if (error || !ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // If marking resolved, send email to user
  if (status === 'resolved') {
    const profile = ticket.profiles as unknown as { name: string; first_name: string | null } | null
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id)
    const userEmail = authUser.user?.email
    if (userEmail) {
      const firstName = profile?.first_name ?? profile?.name ?? 'there'
      sendEmail({
        to: userEmail,
        ...ticketSolvedEmail(firstName, ticket.subject),
      }).catch(console.error)
    }
  }

  return NextResponse.json({ ok: true })
}

// POST /api/admin/support/[id] — admin replies to ticket
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!await requireAdmin()) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { content } = await req.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  // Get ticket + user info
  const { data: ticket } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      id, subject, user_id,
      profiles!support_tickets_user_id_fkey(name, first_name)
    `)
    .eq('id', id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Insert admin reply
  const { data: reply, error } = await supabaseAdmin
    .from('support_replies')
    .insert({ ticket_id: id, from_admin: true, content: content.trim() })
    .select('id, from_admin, content, read_at, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update ticket status to in_progress + updated_at
  await supabaseAdmin
    .from('support_tickets')
    .update({ status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Insert SUPPORT_REPLY: message in messages table for nav badge + preview
  const msgContent = `SUPPORT_REPLY:${id}\n${content.trim().slice(0, 200)}`
  await supabaseAdmin.from('messages').insert({
    sender_id: SUPPORT_BOT_ID,
    receiver_id: ticket.user_id,
    content: msgContent,
    read: false,
  })

  // Create notification for user
  await supabaseAdmin.from('notifications').insert({
    user_id: ticket.user_id,
    type: 'support_reply',
    actor_id: SUPPORT_BOT_ID,
  })

  // Send email to user
  const profile = ticket.profiles as unknown as { name: string; first_name: string | null } | null
  const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(ticket.user_id)
  const userEmail = authUser.user?.email
  if (userEmail) {
    const firstName = profile?.first_name ?? profile?.name ?? 'there'
    sendEmail({
      to: userEmail,
      ...adminReplyEmail(firstName, content.trim(), ticket.subject),
    }).catch(console.error)
  }

  return NextResponse.json({ reply })
}
