import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ReadingClient from './reading-client'

export default async function ReadWithAIPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('books')

  const { data: readingsData } = await supabaseAdmin
    .from('reading_ai_books')
    .select(`
      id, book_id, status,
      book:books!reading_ai_books_book_id_fkey(id, title, author, cover_url)
    `)
    .eq('user_id', user.id)
    .order('added_at', { ascending: false })

  const readingIds = (readingsData ?? []).map(r => r.id)

  const { data: insightsData } = readingIds.length > 0
    ? await supabaseAdmin
        .from('reading_ai_insights')
        .select('id, reading_id, position, title, insight, extract, delivered_at, read_at')
        .in('reading_id', readingIds)
        .not('delivered_at', 'is', null)
        .order('position', { ascending: true })
    : { data: [] as {
        id: string; reading_id: string; position: number; title: string;
        insight: string; extract: string; delivered_at: string; read_at: string | null
      }[] }

  const { data: profile } = await supabase
    .from('profiles')
    .select('reading_ai_email_notifications')
    .eq('id', user.id)
    .single()

  const insightsByReading: Record<string, typeof insightsData> = {}
  for (const ins of insightsData ?? []) {
    if (!insightsByReading[ins.reading_id]) insightsByReading[ins.reading_id] = []
    insightsByReading[ins.reading_id]!.push(ins)
  }

  const readings = (readingsData ?? []).map(r => ({
    id: r.id,
    book_id: r.book_id,
    status: r.status as 'pending' | 'generating' | 'active' | 'completed',
    book: Array.isArray(r.book) ? r.book[0] : r.book,
    insights: insightsByReading[r.id] ?? [],
  })).filter(r => r.book)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-stone-800">{t('readWithAI')}</h2>
          <p className="text-stone-500 text-sm mt-0.5">{t('readWithAISubtitle')}</p>
        </div>
        <Link href="/books" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
          ← {t('title')}
        </Link>
      </div>
      <ReadingClient
        readings={readings}
        notificationsEnabled={profile?.reading_ai_email_notifications ?? true}
      />
    </div>
  )
}
