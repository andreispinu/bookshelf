import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { Friend, Profile } from '@/types'
import type { ActivityItem, FriendWithCounts, SuggestedFriend } from '@/types/friends'

// Minimal row shapes for the untyped Supabase joins below.
type ProfileLite = { id: string; name: string; avatar_url: string | null; country: string | null }
type BookLite = { title: string; author: string; status: 'available' | 'lent_out' }

export type FriendSuggestion = {
  id: string
  name: string
  avatar_url: string | null
  country: string | null
  username: string | null
  profileVisibility: 'private' | 'public_minimal' | 'public_full'
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
    .select('id, name, avatar_url, country, username, profile_visibility')
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
        username: (p.username as string | null) ?? null,
        profileVisibility: (p.profile_visibility as FriendSuggestion['profileVisibility']) ?? 'private',
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

// Fetch the current user's accepted friends as lightweight profiles.
async function getAcceptedFriendProfiles(userId: string): Promise<ProfileLite[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('friendships')
    .select(`
      requester_id,
      addressee_id,
      requester:profiles!friendships_requester_id_fkey(id, name, avatar_url, country),
      addressee:profiles!friendships_addressee_id_fkey(id, name, avatar_url, country)
    `)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')

  if (!data) return []

  return (data as unknown as Array<{
    requester_id: string
    addressee_id: string
    requester: ProfileLite
    addressee: ProfileLite
  }>).map(row => (row.requester_id === userId ? row.addressee : row.requester))
}

// Each accepted friend + total book count + count of books available to borrow +
// the title of the book they're currently reading (falls back to most recent book).
export async function getFriendsWithBookCounts(userId: string): Promise<FriendWithCounts[]> {
  const profiles = await getAcceptedFriendProfiles(userId)
  if (profiles.length === 0) return []

  const friendIds = profiles.map(p => p.id)

  const [booksRes, readingsRes] = await Promise.all([
    supabaseAdmin
      .from('books')
      .select('user_id, status, title, created_at')
      .in('user_id', friendIds),
    supabaseAdmin
      .from('reading_progress')
      .select('user_id, book:books!reading_progress_book_id_fkey(title)')
      .in('user_id', friendIds)
      .eq('status', 'reading')
      .order('updated_at', { ascending: false }),
  ])

  const bookCount = new Map<string, number>()
  const availableCount = new Map<string, number>()
  const latestBook = new Map<string, { title: string; created_at: string }>()

  for (const b of (booksRes.data ?? []) as unknown as Array<{
    user_id: string
    status: string
    title: string
    created_at: string
  }>) {
    bookCount.set(b.user_id, (bookCount.get(b.user_id) ?? 0) + 1)
    if (b.status === 'available') {
      availableCount.set(b.user_id, (availableCount.get(b.user_id) ?? 0) + 1)
    }
    const cur = latestBook.get(b.user_id)
    if (!cur || new Date(b.created_at) > new Date(cur.created_at)) {
      latestBook.set(b.user_id, { title: b.title, created_at: b.created_at })
    }
  }

  const readingTitle = new Map<string, string>()
  for (const r of (readingsRes.data ?? []) as unknown as Array<{
    user_id: string
    book: { title: string } | { title: string }[] | null
  }>) {
    if (readingTitle.has(r.user_id)) continue
    const book = Array.isArray(r.book) ? r.book[0] : r.book
    if (book?.title) readingTitle.set(r.user_id, book.title)
  }

  return profiles.map(p => ({
    id: p.id,
    name: p.name,
    avatarUrl: p.avatar_url,
    country: p.country,
    currentReading: readingTitle.get(p.id) ?? latestBook.get(p.id)?.title ?? null,
    bookCount: bookCount.get(p.id) ?? 0,
    availableCount: availableCount.get(p.id) ?? 0,
  }))
}

// Recent activity from accepted friends, merged from three sources (no new table):
// books added, readings finished, and books lent out. Sorted newest-first.
export async function getFriendActivityFeed(userId: string, limit = 10): Promise<ActivityItem[]> {
  const profiles = await getAcceptedFriendProfiles(userId)
  if (profiles.length === 0) return []

  const nameById = new Map(profiles.map(p => [p.id, { name: p.name, avatar_url: p.avatar_url }]))
  const friendIds = profiles.map(p => p.id)

  const [booksRes, readingsRes, loansRes] = await Promise.all([
    supabaseAdmin
      .from('books')
      .select('user_id, title, author, status, created_at')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from('reading_progress')
      .select('user_id, finished_at, book:books!reading_progress_book_id_fkey(title, author, status)')
      .in('user_id', friendIds)
      .eq('status', 'finished')
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(limit),
    supabaseAdmin
      .from('loans')
      .select('lender_id, loaned_at, book:books!loans_book_id_fkey(title, author, status), borrower:profiles!loans_borrower_id_fkey(name)')
      .in('lender_id', friendIds)
      .order('loaned_at', { ascending: false })
      .limit(limit),
  ])

  const items: ActivityItem[] = []

  for (const b of (booksRes.data ?? []) as unknown as Array<{
    user_id: string
    title: string
    author: string
    status: 'available' | 'lent_out'
    created_at: string
  }>) {
    const fp = nameById.get(b.user_id)
    if (!fp) continue
    items.push({
      type: 'book_added',
      friendName: fp.name,
      friendAvatarUrl: fp.avatar_url,
      bookTitle: b.title,
      bookAuthor: b.author,
      bookStatus: b.status,
      occurredAt: b.created_at,
    })
  }

  for (const r of (readingsRes.data ?? []) as unknown as Array<{
    user_id: string
    finished_at: string | null
    book: BookLite | BookLite[] | null
  }>) {
    const fp = nameById.get(r.user_id)
    const book = Array.isArray(r.book) ? r.book[0] : r.book
    if (!fp || !book || !r.finished_at) continue
    items.push({
      type: 'reading_finished',
      friendName: fp.name,
      friendAvatarUrl: fp.avatar_url,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookStatus: book.status,
      occurredAt: r.finished_at,
    })
  }

  for (const l of (loansRes.data ?? []) as unknown as Array<{
    lender_id: string
    loaned_at: string
    book: BookLite | BookLite[] | null
    borrower: { name: string } | { name: string }[] | null
  }>) {
    const fp = nameById.get(l.lender_id)
    const book = Array.isArray(l.book) ? l.book[0] : l.book
    const borrower = Array.isArray(l.borrower) ? l.borrower[0] : l.borrower
    if (!fp || !book) continue
    items.push({
      type: 'book_lent',
      friendName: fp.name,
      friendAvatarUrl: fp.avatar_url,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookStatus: 'lent_out',
      occurredAt: l.loaned_at,
      borrowerName: borrower?.name,
    })
  }

  items.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
  return items.slice(0, limit)
}

type SuggestionCandidate = {
  id: string
  name: string
  avatar_url: string | null
  username: string | null
  profileVisibility: 'private' | 'public_minimal' | 'public_full'
  mutualCount: number
}

// People you may know: mutual-friend suggestions first, then — if there aren't
// enough — filled with other members the user isn't connected to yet (mutualCount 0).
// Each carries a preview of their first few books.
export async function getSuggestedFriends(userId: string, limit = 5): Promise<SuggestedFriend[]> {
  const base = await getFriendSuggestions(userId)
  const candidates: SuggestionCandidate[] = base.map(s => ({
    id: s.id,
    name: s.name,
    avatar_url: s.avatar_url,
    username: s.username,
    profileVisibility: s.profileVisibility,
    mutualCount: s.mutualCount,
  }))

  if (candidates.length < limit) {
    // Build the exclusion set: self + anyone already connected (any status) + candidates so far.
    const { data: mine } = await supabaseAdmin
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)

    const excluded = new Set<string>([userId])
    for (const f of (mine ?? []) as unknown as Array<{ requester_id: string; addressee_id: string }>) {
      excluded.add(f.requester_id === userId ? f.addressee_id : f.requester_id)
    }
    for (const c of candidates) excluded.add(c.id)

    const { data: others } = await supabaseAdmin
      .from('profiles')
      .select('id, name, avatar_url, username, profile_visibility, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    for (const p of (others ?? []) as unknown as Array<{
      id: string
      name: string | null
      avatar_url: string | null
      username: string | null
      profile_visibility: string | null
    }>) {
      if (candidates.length >= limit) break
      if (excluded.has(p.id) || !p.name) continue
      excluded.add(p.id)
      candidates.push({
        id: p.id,
        name: p.name,
        avatar_url: p.avatar_url,
        username: p.username ?? null,
        profileVisibility: (p.profile_visibility as SuggestionCandidate['profileVisibility']) ?? 'private',
        mutualCount: 0,
      })
    }
  }

  const chosen = candidates.slice(0, limit)
  if (chosen.length === 0) return []

  const ids = chosen.map(c => c.id)
  const { data: books } = await supabaseAdmin
    .from('books')
    .select('user_id, title, created_at')
    .in('user_id', ids)
    .order('created_at', { ascending: false })

  const byUser = new Map<string, { titles: string[]; count: number }>()
  for (const b of (books ?? []) as unknown as Array<{ user_id: string; title: string }>) {
    const entry = byUser.get(b.user_id) ?? { titles: [], count: 0 }
    entry.count += 1
    if (entry.titles.length < 3) entry.titles.push(b.title)
    byUser.set(b.user_id, entry)
  }

  return chosen.map(c => ({
    id: c.id,
    name: c.name,
    avatarUrl: c.avatar_url,
    mutualCount: c.mutualCount,
    bookCount: byUser.get(c.id)?.count ?? 0,
    bookPreview: byUser.get(c.id)?.titles ?? [],
    // Non-friends can only be viewed via their public profile. Fall back to null
    // (no link) when the profile is private or has no username — /friends/[id] 404s.
    shelfUrl:
      c.username && c.profileVisibility !== 'private' ? `/${c.username}` : null,
  }))
}
