import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const limit = 20

  // Get accepted friend IDs + self
  const { data: friendships } = await supabaseAdmin
    .from('friendships')
    .select('requester_id, addressee_id')
    .eq('status', 'accepted')
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  )
  const feedUserIds = [user.id, ...friendIds]

  // Fetch feed events
  const { data: events, error } = await supabaseAdmin
    .from('activity_feed')
    .select(`
      id, user_id, event_type, book_id, meta, created_at,
      actor:profiles!activity_feed_user_id_fkey(id, name, avatar_url),
      book:books!activity_feed_book_id_fkey(id, title, author, cover_url)
    `)
    .in('user_id', feedUserIds)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (!events || events.length === 0) {
    return NextResponse.json({ events: [], hasMore: false })
  }

  const eventIds = events.map(e => e.id)

  // Fetch like counts + whether current user liked
  const [likesResult, likedResult, commentsResult] = await Promise.all([
    supabaseAdmin
      .from('feed_likes')
      .select('feed_id')
      .in('feed_id', eventIds),
    supabaseAdmin
      .from('feed_likes')
      .select('feed_id')
      .in('feed_id', eventIds)
      .eq('user_id', user.id),
    supabaseAdmin
      .from('feed_comments')
      .select('feed_id')
      .in('feed_id', eventIds),
  ])

  const likeCountMap = new Map<string, number>()
  for (const like of (likesResult.data ?? [])) {
    likeCountMap.set(like.feed_id, (likeCountMap.get(like.feed_id) ?? 0) + 1)
  }
  const likedByMeSet = new Set((likedResult.data ?? []).map(l => l.feed_id))
  const commentCountMap = new Map<string, number>()
  for (const comment of (commentsResult.data ?? [])) {
    commentCountMap.set(comment.feed_id, (commentCountMap.get(comment.feed_id) ?? 0) + 1)
  }

  const enriched = events.map(e => ({
    ...e,
    likes_count: likeCountMap.get(e.id) ?? 0,
    liked_by_me: likedByMeSet.has(e.id),
    comments_count: commentCountMap.get(e.id) ?? 0,
  }))

  return NextResponse.json({ events: enriched, hasMore: events.length === limit })
}
