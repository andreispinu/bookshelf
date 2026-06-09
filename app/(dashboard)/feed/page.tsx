import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTranslations } from 'next-intl/server'
import { redirect } from 'next/navigation'
import FeedClient, { type FeedEvent } from './feed-client'

export default async function FeedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('feed')

  // Fetch accepted friend IDs + self
  const { data: friendships } = await supabaseAdmin
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )
  const feedUserIds = [user.id, ...friendIds]

  // Initial page of feed events (20)
  const { data: events } = await supabaseAdmin
    .from('activity_feed')
    .select(`
      id, user_id, event_type, book_id, meta, created_at,
      actor:profiles!activity_feed_user_id_fkey(id, name, avatar_url),
      book:books!activity_feed_book_id_fkey(id, title, author, cover_url)
    `)
    .in('user_id', feedUserIds)
    .order('created_at', { ascending: false })
    .range(0, 19)

  const initialEvents = events ?? []
  const eventIds = initialEvents.map(e => e.id)

  const [likesResult, likedResult, commentsResult] = eventIds.length > 0
    ? await Promise.all([
        supabaseAdmin.from('feed_likes').select('feed_id').in('feed_id', eventIds),
        supabaseAdmin.from('feed_likes').select('feed_id').in('feed_id', eventIds).eq('user_id', user.id),
        supabaseAdmin.from('feed_comments').select('feed_id').in('feed_id', eventIds),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const likeCountMap = new Map<string, number>()
  for (const like of (likesResult.data ?? [])) {
    likeCountMap.set(like.feed_id, (likeCountMap.get(like.feed_id) ?? 0) + 1)
  }
  const likedByMeSet = new Set((likedResult.data ?? []).map((l: { feed_id: string }) => l.feed_id))
  const commentCountMap = new Map<string, number>()
  for (const comment of (commentsResult.data ?? [])) {
    commentCountMap.set(comment.feed_id, (commentCountMap.get(comment.feed_id) ?? 0) + 1)
  }

  const enrichedEvents: FeedEvent[] = initialEvents.map(e => ({
    id: e.id,
    user_id: e.user_id,
    event_type: e.event_type,
    book_id: e.book_id,
    meta: e.meta as Record<string, unknown>,
    created_at: e.created_at,
    actor: (Array.isArray(e.actor) ? e.actor[0] ?? null : e.actor) as FeedEvent['actor'],
    book: (Array.isArray(e.book) ? e.book[0] ?? null : e.book) as FeedEvent['book'],
    likes_count: likeCountMap.get(e.id) ?? 0,
    liked_by_me: likedByMeSet.has(e.id),
    comments_count: commentCountMap.get(e.id) ?? 0,
  }))

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-semibold text-stone-800 mb-6">{t('title')}</h1>
      <FeedClient
        initialEvents={enrichedEvents}
        initialHasMore={initialEvents.length === 20}
        currentUserId={user.id}
      />
    </div>
  )
}
