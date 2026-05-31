import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getBooks } from '@/lib/db/books'
import { getFriends } from '@/lib/db/friends'
import { buttonVariants } from '@/components/ui/button'
import BookList from './book-list'

export default async function BooksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: books, error }, { data: friends }] = await Promise.all([
    getBooks(user.id),
    getFriends(user.id),
  ])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-stone-800">My Books</h2>
          <p className="text-stone-500 text-sm mt-0.5">
            {books?.length ?? 0} {books?.length === 1 ? 'book' : 'books'} in your library
          </p>
        </div>
        <Link
          href="/books/add"
          className={buttonVariants({ className: 'bg-stone-800 hover:bg-stone-700 text-white' })}
        >
          + Add book
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-600">Failed to load books: {error}</p>
      )}

      {books && <BookList books={books} friends={friends ?? []} />}
    </div>
  )
}
