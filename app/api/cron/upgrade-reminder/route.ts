import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { upgradeReminderEmail, type EmailLang } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

const FREE_BOOK_LIMIT = 10
const DAYS_AFTER_LIMIT = 90
const PAGE = 1000

type Profile = { id: string; first_name: string | null; ui_language: string | null }

// Every book's (user_id, created_at) for the given users, oldest first. Paged
// because PostgREST caps a single response at 1000 rows.
async function bookDatesByUser(userIds: string[]): Promise<Map<string, string[]>> {
  const byUser = new Map<string, string[]>()
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin
      .from('books')
      .select('user_id, created_at')
      .in('user_id', userIds)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1)
    if (error) throw error
    for (const b of data ?? []) {
      const list = byUser.get(b.user_id) ?? []
      list.push(b.created_at)
      byUser.set(b.user_id, list)
    }
    if (!data || data.length < PAGE) break
  }
  return byUser
}

// Upgrade reminder — daily 10:00 UTC. Sent once to free users who reached the
// 10-book limit at least 90 days ago and still haven't upgraded. "Limit reached"
// is the created_at of the user's 10th book (no extra tracking column needed).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profiles, error } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, ui_language')
    .neq('subscription_status', 'active')
    .eq('marketing_emails_enabled', true)
    .is('upgrade_reminder_sent_at', null)

  if (error) {
    console.error('upgrade-reminder: profile query failed', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const list = (profiles ?? []) as Profile[]
  if (list.length === 0) return NextResponse.json({ ok: true, sent: 0, errors: 0 })

  const cutoff = Date.now() - DAYS_AFTER_LIMIT * 24 * 60 * 60 * 1000
  const dates = await bookDatesByUser(list.map(p => p.id))

  const eligible = list.filter(p => {
    const d = dates.get(p.id) ?? []
    return d.length >= FREE_BOOK_LIMIT && new Date(d[FREE_BOOK_LIMIT - 1]).getTime() <= cutoff
  })

  let sent = 0
  let errors = 0

  for (const p of eligible) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.id)
      const email = authUser?.user?.email
      if (!email) continue

      const lang = (['en', 'ro', 'ru'].includes(p.ui_language ?? '') ? p.ui_language : 'en') as EmailLang
      const count = dates.get(p.id)?.length ?? FREE_BOOK_LIMIT
      const { subject, html } = upgradeReminderEmail(p.first_name ?? 'there', count, lang)
      await sendEmail({ to: email, subject, html })
      await supabaseAdmin
        .from('profiles')
        .update({ upgrade_reminder_sent_at: new Date().toISOString() })
        .eq('id', p.id)
      sent++
    } catch (err) {
      console.error('upgrade-reminder: error for', p.id, err)
      errors++
    }
  }

  return NextResponse.json({ ok: true, sent, errors })
}
