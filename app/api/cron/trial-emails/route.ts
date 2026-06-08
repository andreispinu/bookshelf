import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { bookLimitNudgeEmail } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

const FREE_BOOK_LIMIT = 10

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find free users who have 9 or 10 books and haven't received the nudge email
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name')
    .neq('subscription_status', 'active')
    .is('book_limit_email_sent_at', null)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, errors: 0 })
  }

  const profileIds = profiles.map(p => p.id)

  // Count books per user
  const { data: booksData } = await supabaseAdmin
    .from('books')
    .select('user_id')
    .in('user_id', profileIds)

  const bookCount: Record<string, number> = {}
  for (const b of booksData ?? []) {
    bookCount[b.user_id] = (bookCount[b.user_id] ?? 0) + 1
  }

  // Keep only users with 9 or 10 books
  const eligible = profiles.filter(p => {
    const count = bookCount[p.id] ?? 0
    return count >= FREE_BOOK_LIMIT - 1 && count <= FREE_BOOK_LIMIT
  })

  let sent = 0
  let errors = 0

  for (const profile of eligible) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email) continue

      const count = bookCount[profile.id] ?? 0
      const { subject, html } = bookLimitNudgeEmail(profile.first_name ?? 'there', count)
      await sendEmail({ to: email, subject, html })
      await supabaseAdmin
        .from('profiles')
        .update({ book_limit_email_sent_at: new Date().toISOString() })
        .eq('id', profile.id)
      sent++
    } catch (err) {
      console.error('trial-emails: nudge error for', profile.id, err)
      errors++
    }
  }

  return NextResponse.json({ ok: true, sent, errors })
}
