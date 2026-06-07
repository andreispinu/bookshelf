import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { getTranslations } from 'next-intl/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { COUNTRY_FLAGS } from '@/lib/countries'
import type { Metadata } from 'next'
import PublicShelf from './public-shelf'

type Props = { params: Promise<{ username: string }> }

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('name, profile_visibility')
    .eq('username', username)
    .single()

  if (!profile || profile.profile_visibility === 'private') {
    return { title: 'Not Found' }
  }
  return { title: `${profile.name}'s BookShelf` }
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params
  const t = await getTranslations('landing')

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatar_url, created_at, profile_visibility, country, city')
    .eq('username', username)
    .single()

  if (!profile || profile.profile_visibility === 'private') notFound()

  const visibility = profile.profile_visibility as 'public_minimal' | 'public_full'

  // Fetch currently reading (always, for any public profile)
  const { data: readingProgressData } = await supabaseAdmin
    .from('reading_progress')
    .select(`
      id, progress_percent,
      book:books!reading_progress_book_id_fkey(id, title, author, cover_url)
    `)
    .eq('user_id', profile.id)
    .eq('status', 'reading')
    .order('updated_at', { ascending: false })
    .limit(3)

  type ReadingItem = { id: string; progress_percent: number; book: { id: string; title: string; author: string; cover_url: string | null } | null }
  const currentlyReading = ((readingProgressData ?? []).map((r: Record<string, unknown>) => ({
    id: r.id as string,
    progress_percent: r.progress_percent as number,
    book: Array.isArray(r.book) ? (r.book[0] ?? null) : r.book as ReadingItem['book'],
  })) as ReadingItem[]).filter(r => r.book != null) as (ReadingItem & { book: NonNullable<ReadingItem['book']> })[]

  // Fetch books for public_full
  let books: { id: string; title: string; author: string; cover_url: string | null; status: string; category: string | null; availability_mode: string | null; sale_price: number | null; sale_currency: string | null }[] = []
  if (visibility === 'public_full') {
    const { data } = await supabaseAdmin
      .from('books')
      .select('id, title, author, cover_url, status, category, availability_mode, sale_price, sale_currency')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
    books = data ?? []
  } else {
    // Just get count
    const { count } = await supabaseAdmin
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile.id)
    books = Array(count ?? 0).fill(null) // placeholder for count
  }

  const bookCount = books.length

  return (
    <div className="min-h-screen bg-stone-50">
      <main className="max-w-2xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="h-16 w-16 rounded-full bg-stone-800 overflow-hidden flex items-center justify-center text-white text-xl font-semibold shrink-0">
            {profile.avatar_url
              ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
              : initials(profile.name)
            }
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-stone-800">{t('publicProfileTitle', { name: profile.name })}</h1>
            <p className="text-stone-500 text-sm mt-0.5">
              {t('publicProfileBookCount', { count: bookCount })}
            </p>
            {(profile.city || profile.country) && (
              <p className="flex items-center gap-1 text-sm text-stone-400 mt-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>
                  {[profile.city, profile.country].filter(Boolean).join(', ')}
                  {profile.country && COUNTRY_FLAGS[profile.country] && (
                    <span className="ml-1">{COUNTRY_FLAGS[profile.country]}</span>
                  )}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Currently Reading */}
        {currentlyReading.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
              {t('publicCurrentlyReading')}
            </h3>
            <div className="space-y-2">
              {currentlyReading.map(r => r.book && (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-200 bg-white">
                  <div className="shrink-0 w-9 h-12 rounded overflow-hidden bg-stone-100 flex items-center justify-center">
                    {r.book.cover_url
                      ? <img src={r.book.cover_url} alt={r.book.title} className="w-full h-full object-cover" />
                      : <span className="text-stone-400 text-sm">📖</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{r.book.title}</p>
                    <p className="text-xs text-stone-500 truncate">{r.book.author}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-sky-400 h-1.5 rounded-full"
                          style={{ width: `${r.progress_percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0">{r.progress_percent}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Minimal — no book list */}
        {visibility === 'public_minimal' && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 text-center text-stone-500 text-sm">
            {t('publicProfileMinimalCount', { name: profile.name, count: bookCount })}
            <br />{t('publicProfilePrivateNote')}
          </div>
        )}

        {/* Full — filterable book grid */}
        {visibility === 'public_full' && books.length > 0 && (
          <PublicShelf books={books} />
        )}

        {visibility === 'public_full' && books.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p>{t('publicProfileNoBooks')}</p>
          </div>
        )}

      </main>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <h2 className="text-base font-semibold text-stone-800">{t('publicProfileCtaHeading')}</h2>
          <p className="text-sm text-stone-500 mt-1.5 mb-4">
            {t('publicProfileCtaText')}
          </p>
          <a
            href="https://bookshelf.name"
            className="inline-block px-5 py-2.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            {t('publicProfileCtaButton')}
          </a>
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-stone-400">
        {t('publicProfilePoweredBy')} <Link href="/" className="hover:text-stone-600 transition-colors">BookShelf</Link>
      </footer>
    </div>
  )
}
