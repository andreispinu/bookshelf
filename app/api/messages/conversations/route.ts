import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import type { ConvItem } from '@/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: messages, error } = await supabase
    .from('messages')
    .select('id, sender_id, receiver_id, content, read, created_at')
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!messages || messages.length === 0) return NextResponse.json({ conversations: [] })

  // Group by conversation partner, messages are DESC so first occurrence per partner = latest
  const convMap = new Map<string, { lastMessage: string; lastAt: string; unread: number }>()
  for (const msg of messages) {
    const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
    if (!convMap.has(otherId)) {
      convMap.set(otherId, { lastMessage: msg.content, lastAt: msg.created_at, unread: 0 })
    }
    if (msg.receiver_id === user.id && !msg.read) {
      convMap.get(otherId)!.unread++
    }
  }

  const partnerIds = Array.from(convMap.keys())
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', partnerIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  const conversations: ConvItem[] = partnerIds
    .map(id => {
      const c = convMap.get(id)!
      const p = profileMap.get(id)
      return {
        userId: id,
        name: p?.name ?? 'Unknown',
        avatar_url: p?.avatar_url ?? null,
        lastMessage: c.lastMessage,
        lastAt: c.lastAt,
        unread: c.unread,
      }
    })
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())

  return NextResponse.json({ conversations })
}
