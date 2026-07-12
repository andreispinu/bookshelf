import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { monthlyTipEmail, MONTHLY_TIP_COUNT, type EmailLang } from '@/lib/email-templates'

export const runtime = 'nodejs'
// Hobby plan caps function duration at 60s. This cron iterates all opted-in users,
// so it sends in bounded-concurrency batches (see CONCURRENCY) to fit more per run.
// Any users not reached before the timeout keep their guard flag unset and are picked
// up on the next monthly run (rotation continues from last_tip_number).
export const maxDuration = 60

const DAY = 24 * 60 * 60 * 1000
const CONCURRENCY = 10

type Profile = {
  id: string
  first_name: string | null
  ui_language: string | null
  username: string | null
  last_tip_number: number | null
}

// Monthly tips & tricks — 1st of each month, 10:00 UTC. Sent to every opted-in user,
// rotating through MONTHLY_TIP_COUNT tips so each user gets a different one each month.
// The 25-day guard makes the run idempotent within the month (safe on cron retries).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const guard = new Date(Date.now() - 25 * DAY).toISOString()
  const PAGE = 1000

  // Phase 1 — collect all candidates up front. We must NOT page-and-send in one pass:
  // each send clears the recipient from the filter, so an incrementing offset would skip users.
  const candidates: Profile[] = []
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, first_name, ui_language, username, last_tip_number')
      .eq('marketing_emails_enabled', true)
      .or(`last_tip_email_sent_at.is.null,last_tip_email_sent_at.lt.${guard}`)
      .order('created_at', { ascending: true })
      .range(from, from + PAGE - 1)

    const page = (data ?? []) as Profile[]
    candidates.push(...page)
    if (page.length < PAGE) break
  }

  // Phase 2 — send + record, in bounded-concurrency batches to fit the 60s budget.
  let sent = 0
  let errors = 0

  async function sendToProfile(p: Profile): Promise<'sent' | 'error' | 'skip'> {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(p.id)
      const email = authUser?.user?.email
      if (!email) return 'skip'

      // Rotate to the next tip (1..N), wrapping around.
      const nextTip = ((p.last_tip_number ?? 0) % MONTHLY_TIP_COUNT) + 1
      const lang = (p.ui_language ?? 'en') as EmailLang

      const { subject, html } = monthlyTipEmail(p.first_name ?? 'there', nextTip, p.username, lang)
      await sendEmail({ to: email, subject, html })
      await supabaseAdmin
        .from('profiles')
        .update({ last_tip_email_sent_at: new Date().toISOString(), last_tip_number: nextTip })
        .eq('id', p.id)

      return 'sent'
    } catch (err) {
      console.error('monthly-tips: error for', p.id, err)
      return 'error'
    }
  }

  for (let i = 0; i < candidates.length; i += CONCURRENCY) {
    const batch = candidates.slice(i, i + CONCURRENCY)
    const results = await Promise.all(batch.map(sendToProfile))
    for (const r of results) {
      if (r === 'sent') sent++
      else if (r === 'error') errors++
    }
  }

  return NextResponse.json({ ok: true, sent, errors })
}
