import { redirect } from 'next/navigation'
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

  const [{ data: books, error }, { data: friends }, { data: profile }] = await Promise.all([
    getBooks(user.id),
    getFriends(user.id),
    supabase.from('profiles').select('username, profile_visibility, name').eq('id', user.id).single(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-stone-800">{t('title')}</h2>
          <p className="text-stone-500 text-sm mt-0.5">
            {t('booksCount', { count: books?.length ?? 0 })}
          </p>
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

      {books && <BookList books={books} friends={friends ?? []} />}
    </div>
  )
}
