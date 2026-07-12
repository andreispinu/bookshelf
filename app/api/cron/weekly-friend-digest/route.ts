import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { weeklyFriendDigestEmail, type DigestBook, type EmailLang } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

const DAY = 24 * 60 * 60 * 1000
const MAX_BOOKS = 5

// Weekly friend activity digest — Monday 09:00 UTC.
// Sent to users who have ≥1 accepted friend, have NOT been active in the past 7 days,
// and have NOT received this digest in the past 6 days. Skipped (no send, flag untouched)
// when none of their friends added a book in the past 7 days, so they stay eligible next week.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const sevenDaysAgo = new Date(now - 7 * DAY).toISOString()
  const sixDaysAgo = new Date(now - 6 * DAY).toISOString()

  // 1. Candidate recipients: opted in, inactive 7d, not sent in the last 6d.
  const { data: candidates } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, ui_language')
    .eq('marketing_emails_enabled', true)
    .lt('last_active_at', sevenDaysAgo)
    .or(`weekly_digest_sent_at.is.null,weekly_digest_sent_at.lt.${sixDaysAgo}`)

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, errors: 0 })
  }

  const candidateIds = candidates.map(c => c.id)

  // 2. Accepted friendships touching any candidate → map candidate → friend ids.
  const { data: friendships } = await supabaseAdmin
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.in.(${candidateIds.join(',')}),addressee_id.in.(${candidateIds.join(',')})`)

  const friendsOf: Record<string, string[]> = {}
  const candidateSet = new Set(candidateIds)
  for (const f of friendships ?? []) {
    if (candidateSet.has(f.requester_id)) {
      ;(friendsOf[f.requester_id] ??= []).push(f.addressee_id)
    }
    if (candidateSet.has(f.addressee_id)) {
      ;(friendsOf[f.addressee_id] ??= []).push(f.requester_id)
    }
  }

  // Keep only candidates who actually have friends.
  const withFriends = candidates.filter(c => (friendsOf[c.id]?.length ?? 0) > 0)
  if (withFriends.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: 0, errors: 0 })
  }

  // 3. All friend books added in the past 7 days (single query over the union of friend ids).
  const allFriendIds = Array.from(new Set(withFriends.flatMap(c => friendsOf[c.id] ?? [])))
  const { data: recentBooks } = await supabaseAdmin
    .from('books')
    .select('user_id, title, author, cover_url, created_at')
    .in('user_id', allFriendIds)
    .gte('created_at', sevenDaysAgo)
    .order('created_at', { ascending: false })

  if (!recentBooks || recentBooks.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, skipped: withFriends.length, errors: 0 })
  }

  // 4. Friend names for the "added by" line.
  const { data: friendProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name')
    .in('id', allFriendIds)
  const nameOf: Record<string, string> = {}
  for (const p of friendProfiles ?? []) nameOf[p.id] = p.name ?? 'A friend'

  let sent = 0
  let skipped = 0
  let errors = 0

  for (const profile of withFriends) {
    const friendIds = new Set(friendsOf[profile.id] ?? [])
    const books: DigestBook[] = []
    for (const b of recentBooks) {
      if (!friendIds.has(b.user_id)) continue
      books.push({
        title: b.title,
        author: b.author,
        coverUrl: b.cover_url,
        friendName: nameOf[b.user_id] ?? 'A friend',
      })
      if (books.length >= MAX_BOOKS) break
    }

    // No fresh friend activity → skip without consuming the send guard.
    if (books.length === 0) {
      skipped++
      continue
    }

    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email) continue

      const firstName = profile.first_name ?? 'there'
      const lang = (profile.ui_language ?? 'en') as EmailLang

      const { subject, html } = weeklyFriendDigestEmail(firstName, books, lang)
      await sendEmail({ to: email, subject, html })
      await supabaseAdmin
        .from('profiles')
        .update({ weekly_digest_sent_at: new Date().toISOString() })
        .eq('id', profile.id)

      sent++
    } catch (err) {
      console.error('weekly-friend-digest: error for', profile.id, err)
      errors++
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, errors })
}
