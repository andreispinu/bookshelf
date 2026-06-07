import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import {
  firstBookReminderEmail,
  firstBookReminderEmailRo,
  firstBookReminderEmailRu,
} from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const windowStart = new Date(now - 28 * 60 * 60 * 1000).toISOString()
  const windowEnd   = new Date(now - 20 * 60 * 60 * 1000).toISOString()

  // Find users who registered in the 20–28h window and haven't received this email
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, ui_language')
    .gte('created_at', windowStart)
    .lte('created_at', windowEnd)
    .is('first_book_email_sent_at', null)

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, errors: 0 })
  }

  // Find which of these users already have at least one book
  const profileIds = profiles.map(p => p.id)
  const { data: booksData } = await supabaseAdmin
    .from('books')
    .select('user_id')
    .in('user_id', profileIds)

  const usersWithBooks = new Set((booksData ?? []).map(b => b.user_id))

  let sent = 0
  let errors = 0

  for (const profile of profiles) {
    // Skip users who already added a book
    if (usersWithBooks.has(profile.id)) continue

    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email) continue

      const firstName = profile.first_name ?? 'there'
      const lang = profile.ui_language ?? 'en'

      const { subject, html } =
        lang === 'ro' ? firstBookReminderEmailRo(firstName)
        : lang === 'ru' ? firstBookReminderEmailRu(firstName)
        : firstBookReminderEmail(firstName)

      await sendEmail({ to: email, subject, html })
      await supabaseAdmin
        .from('profiles')
        .update({ first_book_email_sent_at: new Date().toISOString() })
        .eq('id', profile.id)

      sent++
    } catch (err) {
      console.error('first-book-reminder: error for', profile.id, err)
      errors++
    }
  }

  return NextResponse.json({ ok: true, sent, errors })
}
