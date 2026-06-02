import { notFound, redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
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
  const { data: books } = await getBooks(friendId)

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
