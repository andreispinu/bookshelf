import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data, error } = await supabase
    .from('notifications')
    .select(`
      id, type, read, created_at,
      actor:profiles!notifications_actor_id_fkey(id, name, avatar_url),
      book:books!notifications_book_id_fkey(id, title)
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ notifications: data ?? [] })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await request.json()

  if (body.all) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)
  } else if (body.id) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', body.id)
      .eq('user_id', user.id)
  } else if (body.actorId && body.type) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('actor_id', body.actorId)
      .eq('type', body.type)
      .eq('read', false)
  }

  return NextResponse.json({ ok: true })
}
