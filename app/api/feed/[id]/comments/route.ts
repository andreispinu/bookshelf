import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id: feedId } = await params

  const { data, error } = await supabaseAdmin
    .from('feed_comments')
    .select(`
      id, feed_id, user_id, content, created_at,
      author:profiles!feed_comments_user_id_fkey(id, name, avatar_url)
    `)
    .eq('feed_id', feedId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ comments: data ?? [] })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id: feedId } = await params
  const { content } = await request.json()
  if (!content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('feed_comments')
    .insert({ feed_id: feedId, user_id: user.id, content: content.trim() })
    .select(`
      id, feed_id, user_id, content, created_at,
      author:profiles!feed_comments_user_id_fkey(id, name, avatar_url)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notify the feed event owner (if not commenting on own post)
  const { data: event } = await supabaseAdmin
    .from('activity_feed')
    .select('user_id')
    .eq('id', feedId)
    .single()

  if (event && event.user_id !== user.id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: event.user_id,
      type: 'feed_comment',
      actor_id: user.id,
    })
  }

  return NextResponse.json({ comment: data })
}
