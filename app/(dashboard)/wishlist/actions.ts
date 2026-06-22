'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import type { FriendMatch } from '@/types'

type WishlistData = {
  title: string
  author: string
  isbn?: string | null
  cover_url?: string | null
  category?: string | null
  language?: string | null
  description?: string | null
}

async function getFriendMatches(userId: string, title: string, author: string, isbn: string | null): Promise<FriendMatch[]> {
  const { data: friendships } = await supabaseAdmin
    .from('friendships')
    .select('requester_id, addressee_id')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .eq('status', 'accepted')

  const friendIds = (friendships ?? []).map(f =>
    f.requester_id === userId ? f.addressee_id : f.requester_id
  )
  if (friendIds.length === 0) return []

  const { data: friendBooks } = await supabaseAdmin
    .from('books')
    .select('id, title, author, isbn, status, user_id')
    .in('user_id', friendIds)

  if (!friendBooks?.length) return []

  const normalizedTitle = title.toLowerCase().trim()
  const normalizedAuthor = author.toLowerCase().trim()

  const matches = friendBooks.filter(b => {
    if (isbn && b.isbn && isbn.replace(/-/g, '') === b.isbn.replace(/-/g, '')) return true
    return (
      b.title.toLowerCase().trim() === normalizedTitle &&
      b.author.toLowerCase().trim() === normalizedAuthor
    )
  })

  if (!matches.length) return []

  const ownerIds = [...new Set(matches.map(b => b.user_id))]
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, name, avatar_url')
    .in('id', ownerIds)

  const profileMap = new Map((profiles ?? []).map(p => [p.id, p]))

  return matches.map(b => ({
    bookId: b.id,
    ownerId: b.user_id,
    ownerName: profileMap.get(b.user_id)?.name ?? 'Unknown',
    ownerAvatar: profileMap.get(b.user_id)?.avatar_url ?? null,
    status: b.status as 'available' | 'lent_out',
  }))
}

export async function addToWishlistAndCheck(data: WishlistData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' as string, id: null, matches: [] as FriendMatch[] }

  const { data: item, error } = await supabase
    .from('wishlist')
    .insert({ user_id: user.id, ...data })
    .select('id')
    .single()

  if (error || !item) return { error: error?.message ?? 'Insert failed', id: null, matches: [] as FriendMatch[] }

  const matches = await getFriendMatches(user.id, data.title, data.author, data.isbn ?? null)

  if (matches.length > 0) {
    await supabase.from('wishlist').update({ has_friend_copy: true }).eq('id', item.id)
  }

  revalidatePath('/wishlist')
  return { error: null, id: item.id as string, matches }
}

export async function checkFriendAvailability(wishlistItemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated', matches: [] as FriendMatch[] }

  const { data: item } = await supabase
    .from('wishlist')
    .select('title, author, isbn')
    .eq('id', wishlistItemId)
    .eq('user_id', user.id)
    .single()

  if (!item) return { error: 'Not found', matches: [] as FriendMatch[] }

  const matches = await getFriendMatches(user.id, item.title, item.author, item.isbn ?? null)

  await supabase
    .from('wishlist')
    .update({ has_friend_copy: matches.length > 0 })
    .eq('id', wishlistItemId)

  revalidatePath('/wishlist')
  return { error: null, matches }
}

export async function updateWishlistItem(id: string, data: Partial<WishlistData>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('wishlist')
    .update(data)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/wishlist')
  return { error: null }
}

export async function markAsPurchased(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('wishlist')
    .update({ status: 'purchased' })
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/wishlist')
  return { error: null }
}

export async function deleteWishlistItem(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('wishlist')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/wishlist')
  return { error: null }
}
