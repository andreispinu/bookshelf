import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { addBooksReminderAEmail, addBooksReminderBEmail, type EmailLang } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

const HOUR = 60 * 60 * 1000

type Profile = { id: string; first_name: string | null; ui_language: string | null }

// Count books per user id in one query.
async function bookCounts(userIds: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {}
  if (userIds.length === 0) return counts
  const { data } = await supabaseAdmin.from('books').select('user_id').in('user_id', userIds)
  for (const b of data ?? []) counts[b.user_id] = (counts[b.user_id] ?? 0) + 1
  return counts
}

// Top 3 categories across all books (for Email A suggestions); sensible fallback if none.
async function popularCategories(): Promise<string[]> {
  const { data } = await supabaseAdmin.from('books').select('category').not('category', 'is', null)
  const counts: Record<string, number> = {}
  for (const b of data ?? []) {
    if (b.category) counts[b.category] = (counts[b.category] ?? 0) + 1
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)
  return top.length ? top : ['Fiction', 'Non-Fiction', 'Mystery & Thriller']
}

async function emailFor(id: string): Promise<string | null> {
  const { data } = await supabaseAdmin.auth.admin.getUserById(id)
  return data?.user?.email ?? null
}

// Add-books reminder sequence — daily 10:00 UTC.
//   Email A: ~14 days after signup, fewer than 3 books.
//   Email B: ~30 days after signup, fewer than 5 books, and Email A already sent.
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

  // ── Email A: 14 days after signup, <3 books ──────────────────────────────
  const a = win(14)
  const { data: aProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, ui_language')
    .eq('marketing_emails_enabled', true)
    .is('add_books_reminder_a_sent_at', null)
    .gte('created_at', a.start)
    .lte('created_at', a.end)

  const aList = (aProfiles ?? []) as Profile[]
  if (aList.length > 0) {
    const counts = await bookCounts(aList.map(p => p.id))
    const eligible = aList.filter(p => (counts[p.id] ?? 0) < 3)
    const categories = eligible.length ? await popularCategories() : []
    for (const p of eligible) {
      try {
        const email = await emailFor(p.id)
        if (!email) continue
        const lang = (p.ui_language ?? 'en') as EmailLang
        const { subject, html } = addBooksReminderAEmail(p.first_name ?? 'there', categories, lang)
        await sendEmail({ to: email, subject, html })
        await supabaseAdmin
          .from('profiles')
          .update({ add_books_reminder_a_sent_at: new Date().toISOString() })
          .eq('id', p.id)
        sentA++
      } catch (err) {
        console.error('add-books-reminder A: error for', p.id, err)
        errors++
      }
    }
  }

  // ── Email B: 30 days after signup, <5 books, A already sent ───────────────
  const b = win(30)
  const { data: bProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id, first_name, ui_language')
    .eq('marketing_emails_enabled', true)
    .is('add_books_reminder_b_sent_at', null)
    .not('add_books_reminder_a_sent_at', 'is', null)
    .gte('created_at', b.start)
    .lte('created_at', b.end)

  const bList = (bProfiles ?? []) as Profile[]
  if (bList.length > 0) {
    const counts = await bookCounts(bList.map(p => p.id))
    const eligible = bList.filter(p => (counts[p.id] ?? 0) < 5)
    for (const p of eligible) {
      try {
        const email = await emailFor(p.id)
        if (!email) continue
        const lang = (p.ui_language ?? 'en') as EmailLang
        const { subject, html } = addBooksReminderBEmail(p.first_name ?? 'there', counts[p.id] ?? 0, lang)
        await sendEmail({ to: email, subject, html })
        await supabaseAdmin
          .from('profiles')
          .update({ add_books_reminder_b_sent_at: new Date().toISOString() })
          .eq('id', p.id)
        sentB++
      } catch (err) {
        console.error('add-books-reminder B: error for', p.id, err)
        errors++
      }
    }
  }

  return NextResponse.json({ ok: true, sentA, sentB, errors })
}
