import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import {
  inviteFriendsReminderEmail,
  inviteFriendsReminderEmailRo,
  inviteFriendsReminderEmailRu,
} from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const windowStart = new Date(now - 132 * 60 * 60 * 1000).toISOString() // 5.5 days ago
  const windowEnd   = new Date(now - 108 * 60 * 60 * 1000).toISOString() // 4.5 days ago

  // Find users registered in the 4.5–5.5 day window who haven't received this email
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, ui_language')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .is('invite_friends_email_sent_at', null)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, errors: 0 })
  }

  const profileIds = profiles.map(p => p.id)

  // Fetch accepted friendships for all these users in one query
  const { data: friendships } = await supabaseAdmin
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.in.(${profileIds.join(',')}),addressee_id.in.(${profileIds.join(',')})`)

  // Count accepted friends per user
  const friendCount: Record<string, number> = {}
  for (const f of friendships ?? []) {
    if (profileIds.includes(f.requester_id)) {
      friendCount[f.requester_id] = (friendCount[f.requester_id] ?? 0) + 1
    }
    if (profileIds.includes(f.addressee_id)) {
      friendCount[f.addressee_id] = (friendCount[f.addressee_id] ?? 0) + 1
    }
  }

  // Keep only users with fewer than 3 accepted friends
  const eligibleProfiles = profiles.filter(p => (friendCount[p.id] ?? 0) < 3)

  if (eligibleProfiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, errors: 0 })
  }

  // Fetch book counts for eligible users (for personalisation)
  const eligibleIds = eligibleProfiles.map(p => p.id)
  const { data: booksData } = await supabaseAdmin
    .from('books')
    .select('user_id')
    .in('user_id', eligibleIds)

  const bookCount: Record<string, number> = {}
  for (const b of booksData ?? []) {
    bookCount[b.user_id] = (bookCount[b.user_id] ?? 0) + 1
  }

  let sent = 0
  let errors = 0

  for (const profile of eligibleProfiles) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email) continue

      const firstName = profile.first_name ?? 'there'
      const books = bookCount[profile.id] ?? 0
      const lang = profile.ui_language ?? 'en'

      const { subject, html } =
        lang === 'ro' ? inviteFriendsReminderEmailRo(firstName, books)
        : lang === 'ru' ? inviteFriendsReminderEmailRu(firstName, books)
        : inviteFriendsReminderEmail(firstName, books)

      await sendEmail({ to: email, subject, html })
      await supabaseAdmin
        .from('profiles')
        .update({ invite_friends_email_sent_at: new Date().toISOString() })
        .eq('id', profile.id)

      sent++
    } catch (err) {
      console.error('invite-friends-reminder: error for', profile.id, err)
      errors++
    }
  }

  return NextResponse.json({ ok: true, sent, errors })
}
