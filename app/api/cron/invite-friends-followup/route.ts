import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { inviteReminderAEmail, inviteReminderBEmail, type EmailLang } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

const HOUR = 60 * 60 * 1000

type Profile = { id: string; first_name: string | null; ui_language: string | null; username: string | null }

// Count accepted friends for each of the given profile ids in one query.
async function friendCounts(ids: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  if (ids.length === 0) return counts
  const { data } = await supabaseAdmin
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.in.(${ids.join(',')}),addressee_id.in.(${ids.join(',')})`)
  const set = new Set(ids)
  for (const f of data ?? []) {
    if (set.has(f.requester_id)) counts[f.requester_id] = (counts[f.requester_id] ?? 0) + 1
    if (set.has(f.addressee_id)) counts[f.addressee_id] = (counts[f.addressee_id] ?? 0) + 1
  }
  return counts
}

async function emailFor(id: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(id)
  return data?.user?.email ?? null
}

// Invite-friends follow-up sequence — daily 10:00 UTC. Separate from the day-5
// invite-friends-reminder cron (which owns invite_friends_email_sent_at).
//   Email A: ~10 days after signup, fewer than 2 accepted friends.
//   Email B: ~21 days after signup, fewer than 2 accepted friends, Email A already sent.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = Date.now()
  const win = (centerDays: number) => ({
    start: new Date(now - (centerDays * 24 + 12) * HOUR).toISOString(),
    end: new Date(now - (centerDays * 24 - 12) * HOUR).toISOString(),
  })

  let sentA = 0
  let sentB = 0
  let errors = 0

  // ── Email A: 10 days after signup, <2 friends ────────────────────────────
  const a = win(10)
  const { data: aProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, ui_language, username')
    .eq('marketing_emails_enabled', true)
    .is('invite_reminder_a_sent_at', null)
    .gte('created_at', a.start)
    .lte('created_at', a.end)

  const aList = (aProfiles ?? []) as Profile[]
  if (aList.length > 0) {
    const counts = await friendCounts(aList.map(p => p.id))
    const eligible = aList.filter(p => (counts[p.id] ?? 0) < 2)
    for (const p of eligible) {
      try {
        const email = await emailFor(p.id)
        if (!email) continue
        const lang = (p.ui_language ?? 'en') as EmailLang
        const { subject, html } = inviteReminderAEmail(p.first_name ?? 'there', lang)
        await sendEmail({ to: email, subject, html })
        await supabaseAdmin
          .from('profiles')
          .update({ invite_reminder_a_sent_at: new Date().toISOString() })
          .eq('id', p.id)
        sentA++
      } catch (err) {
        console.error('invite-friends-followup A: error for', p.id, err)
        errors++
      }
    }
  }

  // ── Email B: 21 days after signup, <2 friends, A already sent ─────────────
  const b = win(21)
  const { data: bProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, ui_language, username')
    .eq('marketing_emails_enabled', true)
    .is('invite_reminder_b_sent_at', null)
    .not('invite_reminder_a_sent_at', 'is', null)
    .gte('created_at', b.start)
    .lte('created_at', b.end)

  const bList = (bProfiles ?? []) as Profile[]
  if (bList.length > 0) {
    const counts = await friendCounts(bList.map(p => p.id))
    const eligible = bList.filter(p => (counts[p.id] ?? 0) < 2)
    for (const p of eligible) {
      try {
        const email = await emailFor(p.id)
        if (!email) continue
        const lang = (p.ui_language ?? 'en') as EmailLang
        const { subject, html } = inviteReminderBEmail(p.first_name ?? 'there', p.username, lang)
        await sendEmail({ to: email, subject, html })
        await supabaseAdmin
          .from('profiles')
          .update({ invite_reminder_b_sent_at: new Date().toISOString() })
          .eq('id', p.id)
        sentB++
      } catch (err) {
        console.error('invite-friends-followup B: error for', p.id, err)
        errors++
      }
    }
  }

  return NextResponse.json({ ok: true, sentA, sentB, errors })
}
