import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getFriends } from '@/lib/db/friends'
import FriendsTabs from '../friends-tabs'
import ShelfClient, { type BookGroup, type BookCopy, type FriendInfo } from './shelf-client'

export default async function FriendsShelfPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: friends } = await getFriends(user.id)
  const acceptedFriends = (friends ?? []).filter(f => f.status === 'accepted')

  const friendMap: Record<string, FriendInfo> = {}
  for (const f of acceptedFriends) {
    friendMap[f.profile.id] = {
      id: f.profile.id,
      name: f.profile.name,
      avatar_url: f.profile.avatar_url ?? null,
    }
  }

  let groups: BookGroup[] = []

  if (acceptedFriends.length > 0) {
    const friendIds = acceptedFriends.map(f => f.profile.id)

    const { data: books } = await supabase
      .from('books')
      .select('id, user_id, title, author, isbn, cover_url, status, created_at')
      .in('user_id', friendIds)
      .order('created_at', { ascending: false })

    const groupMap = new Map<string, BookGroup>()

    for (const book of books ?? []) {
      const key = book.isbn?.trim()
        ? `isbn:${book.isbn.trim()}`
        : `title:${book.title.toLowerCase().trim()}|${book.author.toLowerCase().trim()}`

      const copy: BookCopy = {
        bookId: book.id,
        friend: friendMap[book.user_id],
        status: book.status as 'available' | 'lent_out',
        created_at: book.created_at,
      }

      const existing = groupMap.get(key)
      if (existing) {
        existing.copies.push(copy)
        if (book.created_at > existing.latestAddedAt) {
          existing.latestAddedAt = book.created_at
        }
        if (book.cover_url && !existing.cover_url) {
          existing.cover_url = book.cover_url
        }
      } else {
        groupMap.set(key, {
          key,
          title: book.title,
          author: book.author,
          isbn: book.isbn ?? null,
          cover_url: book.cover_url ?? null,
          copies: [copy],
          latestAddedAt: book.created_at,
        })
      }
    }

    groups = Array.from(groupMap.values())
  }

  return (
    <div>
      <FriendsTabs active="shelf" />

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">Friends' Bookshelves</h2>
        <p className="text-stone-500 text-sm mt-0.5">All books your friends own, in one place</p>
      </div>

      {acceptedFriends.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-lg">No friends yet.</p>
          <p className="text-sm mt-1">Add friends to see their books here.</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-20 text-stone-400">
          <p className="text-lg">No books yet.</p>
          <p className="text-sm mt-1">Your friends haven't added any books yet.</p>
        </div>
      ) : (
        <ShelfClient groups={groups} />
      )}
    </div>
  )
}
