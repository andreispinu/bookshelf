import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { ConvItem } from '@/types'

export async function GET() {
  // Authenticate via session client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  // Use admin client for data queries to avoid RLS/JWT issues in API routes
  const [{ data: sent, error: sentError }, { data: received, error: receivedError }] = await Promise.all([
    supabaseAdmin
      .from('messages')
      .select('id, sender_id, receiver_id, content, read, created_at')
      .eq('sender_id', user.id)
      .order('created_at', { ascending: false }),
    supabaseAdmin
      .from('messages')
      .select('id, sender_id, receiver_id, content, read, created_at')
      .eq('receiver_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  if (sentError) console.error('[conversations] sent query error:', sentError)
  if (receivedError) console.error('[conversations] received query error:', receivedError)

  const allMessages = [...(sent ?? []), ...(received ?? [])]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  if (allMessages.length === 0) return NextResponse.json({ conversations: [] })

  // Group by conversation partner — messages are DESC so first occurrence per partner = latest
  const convMap = new Map<string, { lastMessage: string; lastAt: string; unread: number }>()
  for (const msg of allMessages) {
    const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
    if (!convMap.has(otherId)) {
      convMap.set(otherId, { lastMessage: msg.content, lastAt: msg.created_at, unread: 0 })
    }
    if (msg.receiver_id === user.id && !msg.read) {
      convMap.get(otherId)!.unread++
    }
  }

  const partnerIds = Array.from(convMap.keys())
  const { data: profiles } = await supabaseAdmin
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
