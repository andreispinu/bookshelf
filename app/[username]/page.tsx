import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Badge } from '@/components/ui/badge'
import type { Metadata } from 'next'

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

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatar_url, created_at, profile_visibility')
    .eq('username', username)
    .single()

  if (!profile || profile.profile_visibility === 'private') notFound()

  const visibility = profile.profile_visibility as 'public_minimal' | 'public_full'

  // Fetch books for public_full
  let books: { id: string; title: string; author: string; cover_url: string | null; status: string }[] = []
  if (visibility === 'public_full') {
    const { data } = await supabaseAdmin
      .from('books')
      .select('id, title, author, cover_url, status')
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
            <h1 className="text-2xl font-semibold text-stone-800">{profile.name}'s BookShelf</h1>
            <p className="text-stone-500 text-sm mt-0.5">
              {bookCount} {bookCount === 1 ? 'book' : 'books'} on their shelf
            </p>
          </div>
        </div>

        {/* Minimal — no book list */}
        {visibility === 'public_minimal' && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 text-center text-stone-500 text-sm">
            {profile.name} has {bookCount} {bookCount === 1 ? 'book' : 'books'} on their shelf.
            <br />Their full library is private.
          </div>
        )}

        {/* Full — book grid */}
        {visibility === 'public_full' && books.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:block sm:divide-y sm:divide-stone-100">
            {books.map(book => (
              <li
                key={book.id}
                className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-stone-200
                           sm:flex-row sm:items-center sm:gap-4 sm:py-4 sm:px-0 sm:bg-transparent sm:rounded-none sm:border-0"
              >
                <div className="shrink-0 w-full aspect-[2/3] sm:w-10 sm:h-14 sm:aspect-auto rounded bg-stone-200 overflow-hidden flex items-center justify-center">
                  {book.cover_url
                    ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    : <span className="text-stone-400 text-2xl sm:text-lg">📖</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 truncate text-sm sm:text-base">{book.title}</p>
                  <p className="text-xs sm:text-sm text-stone-500 truncate">{book.author}</p>
                  <Badge
                    variant="outline"
                    className={`mt-1.5 text-xs ${
                      book.status === 'available'
                        ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                        : 'border-amber-200 text-amber-700 bg-amber-50'
                    }`}
                  >
                    {book.status === 'available' ? 'Available' : 'Lent out'}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}

        {visibility === 'public_full' && books.length === 0 && (
          <div className="text-center py-16 text-stone-400">
            <p>No books on this shelf yet.</p>
          </div>
        )}

      </main>

      {/* CTA */}
      <section className="max-w-2xl mx-auto px-4 py-10">
        <div className="rounded-xl border border-stone-200 bg-white p-6 text-center">
          <h2 className="text-base font-semibold text-stone-800">Discover your own bookshelf</h2>
          <p className="text-sm text-stone-500 mt-1.5 mb-4">
            Track your books, connect with friends, and lend your favourites.
          </p>
          <a
            href="https://bookshelf.name"
            className="inline-block px-5 py-2.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
          >
            Try BookShelf free
          </a>
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-stone-400">
        Powered by <a href="https://bookshelf.name" className="hover:text-stone-600 transition-colors">BookShelf</a>
      </footer>
    </div>
  )
}
