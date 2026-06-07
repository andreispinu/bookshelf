import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import ReadingProgressClient from './reading-client'

export type ReadingRow = {
  id: string
  book_id: string
  status: 'reading' | 'finished'
  progress_percent: number
  rating: number | null
  review: string | null
  started_at: string
  finished_at: string | null
  updated_at: string
  book: { id: string; title: string; author: string; cover_url: string | null }
}

export default async function CurrentlyReadingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('books')

  const { data } = await supabaseAdmin
    .from('reading_progress')
    .select(`
      id, book_id, status, progress_percent, rating, review, started_at, finished_at, updated_at,
      book:books!reading_progress_book_id_fkey(id, title, author, cover_url)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  const rows: ReadingRow[] = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    book: Array.isArray(r.book) ? (r.book[0] ?? null) : r.book,
  })).filter((r: Record<string, unknown>) => r.book) as ReadingRow[]

  const inProgress = rows.filter(r => r.status === 'reading')
  const finished = rows.filter(r => r.status === 'finished')

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-stone-800">{t('currentlyReadingTitle')}</h2>
          <p className="text-stone-500 text-sm mt-0.5">{t('currentlyReading')}</p>
        </div>
        <Link href="/books" className="text-sm text-stone-500 hover:text-stone-700 transition-colors">
          ← {t('title')}
        </Link>
      </div>
      <ReadingProgressClient inProgress={inProgress} finished={finished} />
    </div>
  )
}
