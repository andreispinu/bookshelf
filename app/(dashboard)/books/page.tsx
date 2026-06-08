import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { getBooks } from '@/lib/db/books'
import { getFriends } from '@/lib/db/friends'
import BookList from './book-list'
import AddBookButton from './photo-button'
import ShareShelfButton from './share-shelf-button'

export default async function BooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('books')

  const [{ data: books, error }, { data: friends }, { data: profile }, { data: readingAIBooks }, { data: readingProgress }] = await Promise.all([
    getBooks(user.id),
    getFriends(user.id),
    supabase.from('profiles').select('username, profile_visibility, name, subscription_status').eq('id', user.id).single(),
    supabase.from('reading_ai_books').select('id, book_id').eq('user_id', user.id),
    supabase.from('reading_progress').select('book_id').eq('user_id', user.id).eq('status', 'reading'),
  ])

  const bookCount = books?.length ?? 0
  const isPaid = profile?.subscription_status === 'active'
  const FREE_LIMIT = 10

  const readingAIMap: Record<string, string> = {}
  for (const r of readingAIBooks ?? []) readingAIMap[r.book_id] = r.id

  const readingProgressMap: Record<string, boolean> = {}
  for (const r of readingProgress ?? []) readingProgressMap[r.book_id] = true

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-stone-800">{t('title')}</h2>
          <p className="text-stone-500 text-sm mt-0.5">
            {t('booksCount', { count: bookCount })}
            {(readingProgress?.length ?? 0) > 0 && (
              <>
                {' · '}
                <Link href="/books/currently-reading" className="text-sky-600 hover:text-sky-700 transition-colors">
                  {t('currentlyReadingLink')} ({readingProgress!.length})
                </Link>
              </>
            )}
            {(readingAIBooks?.length ?? 0) > 0 && (
              <>
                {' · '}
                <Link href="/books/read-with-ai" className="text-amber-600 hover:text-amber-700 transition-colors">
                  {t('readWithAI')} ({readingAIBooks!.length})
                </Link>
              </>
            )}
          </p>
          {!isPaid && bookCount >= FREE_LIMIT && (
            <>
              {' · '}
              <Link href="/profile#plans" className="text-amber-600 hover:text-amber-700 transition-colors font-medium">
                {t('shelfFull')}
              </Link>
            </>
          )}
          {!isPaid && bookCount >= 8 && bookCount < FREE_LIMIT && (
            <>
              {' · '}
              <Link href="/profile#plans" className="text-stone-400 hover:text-stone-600 transition-colors">
                {t('bookUsage', { count: bookCount, limit: FREE_LIMIT })}
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShareShelfButton
            username={profile?.username ?? null}
            visibility={(profile?.profile_visibility as 'private' | 'public_minimal' | 'public_full') ?? 'private'}
            name={profile?.name ?? ''}
            bookCount={books?.length ?? 0}
          />
          <AddBookButton />
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">Failed to load books: {error}</p>
      )}

      {books && <BookList books={books} friends={friends ?? []} readingAIMap={readingAIMap} readingProgressMap={readingProgressMap} />}
    </div>
  )
}
