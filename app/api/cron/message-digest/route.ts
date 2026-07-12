import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { messageDigestEmail } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  // Find all users with unread non-borrow messages in the last 24h
  const { data: recipientRows } = await supabaseAdmin
    .from('messages')
    .select('receiver_id')
    .gte('created_at', since)
    .eq('read', false)
    .not('content', 'like', '{%')

  const recipientIds = [...new Set((recipientRows ?? []).map(r => r.receiver_id as string))]

  if (recipientIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, errors: 0 })
  }

  // Filter to users who have digest enabled
  const { data: digestProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, message_digest_enabled')
    .in('id', recipientIds)
    .eq('message_digest_enabled', true)

  const results = { sent: 0, errors: 0 }

  for (const profile of digestProfiles ?? []) {
    try {
      // Fetch all unread messages for this user in the window
      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('sender_id, content, created_at')
        .eq('receiver_id', profile.id)
        .gte('created_at', since)
        .eq('read', false)
        .not('content', 'like', '{%')
        .order('created_at', { ascending: false })

      if (!messages || messages.length === 0) continue

      // Group by sender, keep the latest preview per sender
      const bySender: Record<string, { count: number; lastPreview: string }> = {}
      for (const msg of messages) {
        if (!bySender[msg.sender_id]) {
          bySender[msg.sender_id] = { count: 0, lastPreview: msg.content }
        }
        bySender[msg.sender_id]!.count++
      }

      const senderIds = Object.keys(bySender)

      // Fetch sender names
      const { data: senderProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, name')
        .in('id', senderIds)

      const senderNameMap: Record<string, string> = {}
      for (const s of senderProfiles ?? []) senderNameMap[s.id] = s.name

      const conversations = senderIds.map(id => ({
        senderName: senderNameMap[id] ?? 'Someone',
        messageCount: bySender[id]!.count,
        // Pass raw content — messageDigestEmail() runs getMessagePreview() to
        // turn internal prefixes (SALE_REQUEST: etc.) into readable text. Slicing
        // here would truncate the JSON and break that parsing.
        lastMessagePreview: bySender[id]!.lastPreview,
      }))

      // Fetch recipient's email
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email) continue

      const { subject, html } = messageDigestEmail(profile.first_name ?? 'there', conversations)
      await sendEmail({ to: email, subject, html })
      results.sent++
    } catch (err) {
      console.error('message-digest: error for user', profile.id, err)
      results.errors++
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
