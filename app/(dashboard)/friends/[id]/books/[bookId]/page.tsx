import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Badge } from '@/components/ui/badge'
import BorrowButton from '../../borrow-button'
import { translateCategory } from '@/lib/translate-category'
import type { Book } from '@/types'

export default async function FriendBookDetailPage({
  params,
}: {
  params: Promise<{ id: string; bookId: string }>
}) {
  const { id: friendId, bookId } = await params

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
    .maybeSingle()

  if (!friendship) notFound()

  // Fetch friend's profile and the specific book in parallel
  const [{ data: profile }, { data: book }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, name, avatar_url').eq('id', friendId).single(),
    supabaseAdmin.from('books').select('*').eq('id', bookId).eq('user_id', friendId).single(),
  ])

  if (!profile || !book) notFound()

  const tCat = await getTranslations('categories')
  const b = book as Book

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link
          href={`/friends/${friendId}`}
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← Back to {profile.name}'s shelf
        </Link>
      </div>

      <div className="flex gap-6 items-start">
        {/* Cover */}
        <div
          className="shrink-0 w-28 rounded-md overflow-hidden bg-stone-200 flex items-center justify-center shadow-sm"
          style={{ aspectRatio: '2/3' }}
        >
          {b.cover_url
            ? <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
            : <span className="text-4xl">📖</span>
          }
        </div>

        {/* Title / Author / Status */}
        <div className="flex-1 min-w-0 pt-1">
          <h2 className="text-2xl font-semibold text-stone-800 leading-tight">{b.title}</h2>
          <p className="text-stone-500 mt-1">{b.author}</p>
          <div className="mt-3">
            <Badge
              variant="outline"
              className={
                b.status === 'available'
                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                  : 'border-amber-200 text-amber-700 bg-amber-50'
              }
            >
              {b.status === 'available' ? 'Available' : 'Lent out'}
            </Badge>
          </div>
          {b.status === 'lent_out' && (
            <p className="text-sm text-stone-400 mt-2">Currently lent out</p>
          )}
        </div>
      </div>

      {/* Borrow button */}
      {b.status === 'available' && (
        <div className="mt-6">
          <BorrowButton bookId={b.id} bookTitle={b.title} ownerId={friendId} />
        </div>
      )}

      {/* Metadata */}
      {(b.publisher || b.year || b.isbn || b.language || b.category) && (
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-stone-100 pt-5">
          {b.publisher && (
            <>
              <dt className="text-stone-400">Publisher</dt>
              <dd className="text-stone-700">{b.publisher}</dd>
            </>
          )}
          {b.year && (
            <>
              <dt className="text-stone-400">Year</dt>
              <dd className="text-stone-700">{b.year}</dd>
            </>
          )}
          {b.isbn && (
            <>
              <dt className="text-stone-400">ISBN</dt>
              <dd className="text-stone-700 font-mono text-xs pt-0.5">{b.isbn}</dd>
            </>
          )}
          {b.language && (
            <>
              <dt className="text-stone-400">Language</dt>
              <dd className="text-stone-700">{b.language}</dd>
            </>
          )}
          {b.category && (
            <>
              <dt className="text-stone-400">Category</dt>
              <dd className="text-stone-700">{translateCategory(b.category, tCat)}</dd>
            </>
          )}
        </dl>
      )}

      {/* Description */}
      {b.description && (
        <p className="mt-6 text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-5">
          {b.description}
        </p>
      )}
    </div>
  )
}
