import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import {
  trialReminder5DayEmail,
  trialReminder1DayEmail,
  trialExpiredEmail,
} from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const results = { fiveDay: 0, oneDay: 0, expired: 0, errors: 0 }

  // ── Query 1: 5-day reminder ──────────────────────────────────────────────
  const { data: fiveDayProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, trial_ends_at')
    .eq('subscription_status', 'trialing')
    .gte('trial_ends_at', new Date(now + 4.5 * 24 * 60 * 60 * 1000).toISOString())
    .lte('trial_ends_at', new Date(now + 5.5 * 24 * 60 * 60 * 1000).toISOString())
    .is('trial_reminder_5day_sent_at', null)

  for (const profile of fiveDayProfiles ?? []) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email || !profile.trial_ends_at) continue

      const { subject, html } = trialReminder5DayEmail(
        profile.first_name ?? 'there',
        new Date(profile.trial_ends_at),
      )
      await sendEmail({ to: email, subject, html })
      await supabaseAdmin
        .from('profiles')
        .update({ trial_reminder_5day_sent_at: new Date().toISOString() })
        .eq('id', profile.id)
      results.fiveDay++
    } catch (err) {
      console.error('trial-emails: 5-day error for', profile.id, err)
      results.errors++
    }
  }

  // ── Query 2: 1-day reminder ──────────────────────────────────────────────
  const { data: oneDayProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, trial_ends_at')
    .eq('subscription_status', 'trialing')
    .gte('trial_ends_at', new Date(now + 20 * 60 * 60 * 1000).toISOString())
    .lte('trial_ends_at', new Date(now + 28 * 60 * 60 * 1000).toISOString())
    .is('trial_reminder_1day_sent_at', null)

  for (const profile of oneDayProfiles ?? []) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email || !profile.trial_ends_at) continue

      const { subject, html } = trialReminder1DayEmail(
        profile.first_name ?? 'there',
        new Date(profile.trial_ends_at),
      )
      await sendEmail({ to: email, subject, html })
      await supabaseAdmin
        .from('profiles')
        .update({ trial_reminder_1day_sent_at: new Date().toISOString() })
        .eq('id', profile.id)
      results.oneDay++
    } catch (err) {
      console.error('trial-emails: 1-day error for', profile.id, err)
      results.errors++
    }
  }

  // ── Query 3: expired ─────────────────────────────────────────────────────
  const { data: expiredProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name')
    .eq('subscription_status', 'trialing')
    .lt('trial_ends_at', new Date(now).toISOString())
    .gte('trial_ends_at', new Date(now - 28 * 60 * 60 * 1000).toISOString())
    .is('trial_expired_sent_at', null)

  for (const profile of expiredProfiles ?? []) {
    try {
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(profile.id)
      const email = authUser?.user?.email
      if (!email) continue

      const { subject, html } = trialExpiredEmail(profile.first_name ?? 'there')
      await sendEmail({ to: email, subject, html })
      await supabaseAdmin
        .from('profiles')
        .update({ trial_expired_sent_at: new Date().toISOString() })
        .eq('id', profile.id)
      results.expired++
    } catch (err) {
      console.error('trial-emails: expired error for', profile.id, err)
      results.errors++
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
