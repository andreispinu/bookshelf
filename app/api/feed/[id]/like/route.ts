import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id: feedId } = await params

  // Check if already liked
  const { data: existing } = await supabaseAdmin
    .from('feed_likes')
    .select('id')
    .eq('feed_id', feedId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // Unlike
    await supabaseAdmin.from('feed_likes').delete().eq('feed_id', feedId).eq('user_id', user.id)
    return NextResponse.json({ liked: false })
  }

  // Like
  await supabaseAdmin.from('feed_likes').insert({ feed_id: feedId, user_id: user.id })

  // Notify the feed event owner (if not liking own post)
  const { data: event } = await supabaseAdmin
    .from('activity_feed')
    .select('user_id')
    .eq('id', feedId)
    .single()

  if (event && event.user_id !== user.id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: event.user_id,
      type: 'feed_like',
      actor_id: user.id,
    })
  }

  return NextResponse.json({ liked: true })
}
