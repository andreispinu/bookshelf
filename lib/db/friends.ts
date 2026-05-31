import { createClient } from '@/lib/supabase-server'
import type { Friend, Profile } from '@/types'

export async function getFriends(userId: string): Promise<{ data: Friend[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      requester_id,
      addressee_id,
      status,
      created_at,
      requester:profiles!friendships_requester_id_fkey(id, name, avatar_url, created_at),
      addressee:profiles!friendships_addressee_id_fkey(id, name, avatar_url, created_at)
    `)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }

  const friends: Friend[] = (data ?? []).map(row => {
    const isSender = row.requester_id === userId
    const profile = (isSender ? row.addressee : row.requester) as unknown as Profile
    return {
      friendshipId: row.id,
      profile,
      direction: isSender ? 'sent' : 'received',
      status: row.status as Friend['status'],
    }
  })

  return { data: friends, error: null }
}

export async function searchUsers(
  query: string,
  currentUserId: string
): Promise<{ data: Profile[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, created_at')
    .neq('id', currentUserId)
    .ilike('name', `%${query}%`)
    .limit(10)

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
