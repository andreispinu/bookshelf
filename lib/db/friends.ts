import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Friend, Profile } from '@/types'

export type FriendSuggestion = {
  id: string
  name: string
  avatar_url: string | null
  country: string | null
  mutualCount: number
}

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
      requester:profiles!friendships_requester_id_fkey(id, name, avatar_url, created_at, country),
      addressee:profiles!friendships_addressee_id_fkey(id, name, avatar_url, created_at, country)
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

export async function getFriendSuggestions(userId: string): Promise<FriendSuggestion[]> {
  // Step 1: All my friendships (any status) — build exclusion set + accepted friend list
  const { data: allMine } = await supabaseAdmin
    .from('friendships')
    .select('requester_id, addressee_id, status')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

  if (!allMine) return []

  const excluded = new Set<string>([userId])
  const acceptedFriendIds: string[] = []

  for (const f of allMine) {
    const otherId = f.requester_id === userId ? f.addressee_id : f.requester_id
    excluded.add(otherId)
    if (f.status === 'accepted') acceptedFriendIds.push(otherId)
  }

  if (acceptedFriendIds.length === 0) return []

  // Step 2: All accepted friendships of my friends
  const { data: friendsFriendships } = await supabaseAdmin
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.in.(${acceptedFriendIds.join(',')}),addressee_id.in.(${acceptedFriendIds.join(',')})`)
    .eq('status', 'accepted')

  if (!friendsFriendships) return []

  const acceptedFriendSet = new Set(acceptedFriendIds)
  const mutualCounts = new Map<string, number>()

  for (const { requester_id, addressee_id } of friendsFriendships) {
    if (acceptedFriendSet.has(requester_id) && !excluded.has(addressee_id)) {
      mutualCounts.set(addressee_id, (mutualCounts.get(addressee_id) ?? 0) + 1)
    }
    if (acceptedFriendSet.has(addressee_id) && !excluded.has(requester_id)) {
      mutualCounts.set(requester_id, (mutualCounts.get(requester_id) ?? 0) + 1)
    }
  }

  if (mutualCounts.size === 0) return []

  const topIds = [...mutualCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id)

  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatar_url, country')
    .in('id', topIds)

  if (!profiles) return []

  return topIds
    .map(id => {
      const p = profiles.find(p => p.id === id)
      if (!p) return null
      return {
        id: p.id,
        name: p.name as string,
        avatar_url: p.avatar_url as string | null,
        country: p.country as string | null,
        mutualCount: mutualCounts.get(id) ?? 0,
      }
    })
    .filter((x): x is FriendSuggestion => x !== null)
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
  return { data: data as unknown as Profile[], error: null }
}
