// Types for the redesigned /friends page (activity feed, friend cards, suggestions).

export type ActivityItem = {
  type: 'book_added' | 'reading_finished' | 'book_lent'
  friendName: string
  friendAvatarUrl: string | null
  bookTitle: string
  bookAuthor: string
  bookStatus: 'available' | 'lent_out'
  occurredAt: string // ISO timestamp
  // only for book_lent
  borrowerName?: string
}

export type FriendWithCounts = {
  id: string
  name: string
  avatarUrl: string | null
  country: string | null
  currentReading: string | null
  bookCount: number
  availableCount: number
}

export type SuggestedFriend = {
  id: string
  name: string
  avatarUrl: string | null
  mutualCount: number
  bookCount: number
  bookPreview: string[] // first 3 titles
  shelfUrl: string | null // public-profile link, or null when not viewable
}
