import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { dailyInsightEmail } from '@/lib/email-templates'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results = { delivered: 0, completed: 0, errors: 0 }

  // Fetch all active readings with joined book + profile data
  const { data: activeReadings } = await supabaseAdmin
    .from('reading_ai_books')
    .select(`
      id, user_id, book_id, status,
      book:books!reading_ai_books_book_id_fkey(title, author),
      profile:profiles!reading_ai_books_user_id_fkey(first_name, reading_ai_email_notifications)
    `)
    .eq('status', 'active')

  for (const reading of activeReadings ?? []) {
    try {
      // Find the next undelivered insight (lowest position where delivered_at IS NULL)
      const { data: nextInsight } = await supabaseAdmin
        .from('reading_ai_insights')
        .select('id, position, title, insight, extract')
        .eq('reading_id', reading.id)
        .is('delivered_at', null)
        .order('position', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (!nextInsight) {
        // All insights delivered — mark the reading as completed
        await supabaseAdmin
          .from('reading_ai_books')
          .update({ status: 'completed', completed_at: new Date().toISOString() })
          .eq('id', reading.id)
        results.completed++
        continue
      }

      // Deliver this insight
      await supabaseAdmin
        .from('reading_ai_insights')
        .update({ delivered_at: new Date().toISOString() })
        .eq('id', nextInsight.id)
      results.delivered++

      // Total insights count for this reading (for email display)
      const { count: totalInsights } = await supabaseAdmin
        .from('reading_ai_insights')
        .select('*', { count: 'exact', head: true })
        .eq('reading_id', reading.id)

      // Send email if user has notifications enabled
      const profile = (Array.isArray(reading.profile) ? reading.profile[0] : reading.profile) as { first_name: string | null; reading_ai_email_notifications: boolean } | null
      const book = (Array.isArray(reading.book) ? reading.book[0] : reading.book) as { title: string; author: string } | null

      if (profile?.reading_ai_email_notifications && book) {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(reading.user_id)
        const email = authUser?.user?.email
        if (email) {
          const { subject, html } = dailyInsightEmail(
            profile.first_name ?? 'there',
            book.title,
            book.author,
            nextInsight.title,
            nextInsight.insight,
            nextInsight.extract,
            nextInsight.position,
            totalInsights ?? 0,
          )
          await sendEmail({ to: email, subject, html })
        }
      }
    } catch (err) {
      console.error('deliver-insights: error for reading', reading.id, err)
      results.errors++
    }
  }

  return NextResponse.json({ ok: true, ...results })
}
