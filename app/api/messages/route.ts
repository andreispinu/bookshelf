import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { newMessageEmail } from '@/lib/email-templates'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const withUserId = request.nextUrl.searchParams.get('with')
  if (!withUserId) return NextResponse.json({ error: 'Missing with param' }, { status: 400 })

  // Use admin client to avoid RLS/JWT issues in API routes
  const { data, error } = await supabaseAdmin
    .from('messages')
    .select('id, sender_id, receiver_id, content, read, created_at')
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${withUserId}),and(sender_id.eq.${withUserId},receiver_id.eq.${user.id})`
    )
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[messages GET] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ messages: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { receiverId, content } = body
  if (!receiverId || !content?.trim()) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('messages')
    .insert({ sender_id: user.id, receiver_id: receiverId, content: content.trim() })
    .select('id, sender_id, receiver_id, content, read, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fire-and-forget email — skip JSON borrow cards
  const trimmed = content.trim()
  if (!trimmed.startsWith('{')) {
    ;(async () => {
      // Debounce: skip if there's already an unread new_message notification from this sender
      const { data: existing } = await supabaseAdmin
        .from('notifications')
        .select('id')
        .eq('user_id', receiverId)
        .eq('type', 'new_message')
        .eq('actor_id', user.id)
        .eq('read', false)
        .maybeSingle()
      if (existing) return

      const [senderProfile, recipientAuth] = await Promise.all([
        supabaseAdmin.from('profiles').select('name').eq('id', user.id).single(),
        supabaseAdmin.auth.admin.getUserById(receiverId),
      ])
      const senderName = senderProfile.data?.name
      const recipientEmail = recipientAuth.data?.user?.email
      if (!senderName || !recipientEmail) return
      // Pass raw content — newMessageEmail() runs getMessagePreview() to handle
      // internal prefixes (SALE_REQUEST: etc.) and truncation.
      const { subject, html } = newMessageEmail(senderName, trimmed)
      await sendEmail({ to: recipientEmail, subject, html })
    })().catch(console.error)
  }

  return NextResponse.json({ message: data })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()
  const { senderId } = body
  if (!senderId) return NextResponse.json({ error: 'Missing senderId' }, { status: 400 })

  await supabaseAdmin
    .from('messages')
    .update({ read: true })
    .eq('sender_id', senderId)
    .eq('receiver_id', user.id)
    .eq('read', false)

  return NextResponse.json({ ok: true })
}
