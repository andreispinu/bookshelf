import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getBooks } from '@/lib/db/books'
import FriendShelfClient from './friend-shelf-client'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default async function FriendShelfPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: friendId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [t, tb] = await Promise.all([
    getTranslations('friends'),
    getTranslations('books'),
  ])

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
  const [{ data: books }, { data: readingProgress }] = await Promise.all([
    getBooks(friendId),
    supabaseAdmin
      .from('reading_progress')
      .select(`
        id, book_id, progress_percent,
        book:books!reading_progress_book_id_fkey(id, title, author, cover_url)
      `)
      .eq('user_id', friendId)
      .eq('status', 'reading')
      .order('updated_at', { ascending: false })
      .limit(3),
  ])

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="h-14 w-14 rounded-full bg-stone-800 overflow-hidden flex items-center justify-center text-white text-lg font-semibold shrink-0">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt={profile.name} className="h-full w-full object-cover" />
            : initials(profile.name)
          }
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-stone-800">{t('friendShelf', { name: profile.name })}</h2>
          <p className="text-stone-500 text-sm mt-0.5">{t('memberSince', { date: memberSince })}</p>
        </div>
      </div>

      {/* Currently Reading */}
      {readingProgress && readingProgress.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
            {tb('currentlyReadingSection')}
          </h3>
          <div className="space-y-2">
            {readingProgress.map(r => {
              const book = Array.isArray(r.book) ? r.book[0] : r.book
              if (!book) return null
              return (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-stone-100 bg-white">
                  <div className="shrink-0 w-9 h-13 rounded overflow-hidden bg-stone-100 flex items-center justify-center">
                    {book.cover_url
                      ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      : <span className="text-stone-400 text-sm">📖</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{book.title}</p>
                    <p className="text-xs text-stone-500 truncate">{book.author}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 bg-stone-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-sky-400 h-1.5 rounded-full transition-all"
                          style={{ width: `${r.progress_percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-stone-400 shrink-0">{r.progress_percent}%</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Books */}
      {!books || books.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-lg">{t('noBooksYet')}</p>
          <p className="text-sm mt-1">{t('friendNoBooksAdded', { name: profile.name })}</p>
        </div>
      ) : (
        <>
          <p className="text-stone-500 text-sm mb-4">
            {t('bookCount', { count: books.length })}
          </p>
          <FriendShelfClient
            books={books}
            friendId={friendId}
            ownerId={profile.id}
            availableLabel={tb('available')}
            lentOutLabel={tb('lentOut')}
          />
        </>
      )}
    </div>
  )
}
