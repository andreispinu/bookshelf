import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getBooks } from '@/lib/db/books'
import { Badge } from '@/components/ui/badge'
import BorrowButton from './borrow-button'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default async function FriendShelfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: friendId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Verify accepted friendship
  const { data: friendship } = await supabase
    .from('friendships')
    .select('id')
    .eq('status', 'accepted')
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`
    )
    .single()

  if (!friendship) notFound()

  // Fetch friend's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, created_at')
    .eq('id', friendId)
    .single()

  if (!profile) notFound()

  // Fetch friend's books (RLS allows accepted friends to read)
  const { data: books } = await getBooks(friendId)

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 rounded-full bg-stone-800 flex items-center justify-center text-white text-lg font-semibold shrink-0">
          {initials(profile.name)}
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-stone-800">{profile.name}'s shelf</h2>
          <p className="text-stone-500 text-sm mt-0.5">Member since {memberSince}</p>
        </div>
      </div>

      {/* Books */}
      {!books || books.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-lg">No books yet.</p>
          <p className="text-sm mt-1">{profile.name} hasn't added any books.</p>
        </div>
      ) : (
        <>
          <p className="text-stone-500 text-sm mb-4">
            {books.length} {books.length === 1 ? 'book' : 'books'}
          </p>
          <ul className="grid grid-cols-2 gap-3 sm:block sm:divide-y sm:divide-stone-100">
            {books.map(book => (
              <li
                key={book.id}
                className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-stone-200
                           sm:flex-row sm:items-center sm:gap-4 sm:py-4 sm:px-0 sm:bg-transparent sm:rounded-none sm:border-0"
              >
                {/* Cover */}
                <div className="shrink-0 w-full aspect-[2/3] sm:w-10 sm:h-14 sm:aspect-auto rounded bg-stone-200 overflow-hidden flex items-center justify-center">
                  {book.cover_url
                    ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    : <span className="text-stone-400 text-2xl sm:text-lg">📖</span>
                  }
                </div>

                {/* Details */}
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

                {/* Borrow button — desktop only shows inline, mobile shows below */}
                {book.status === 'available' && (
                  <div className="sm:shrink-0">
                    <BorrowButton />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
