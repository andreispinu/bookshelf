export type Book = {
  id: string
  user_id: string
  title: string
  author: string
  isbn: string | null
  cover_url: string | null
  status: 'available' | 'lent_out'
  created_at: string
}

export type Profile = {
  id: string
  name: string
  avatar_url: string | null
  created_at: string
}

export type FriendshipStatus = 'pending' | 'accepted' | 'declined'

export type Friendship = {
  id: string
  requester_id: string
  addressee_id: string
  status: FriendshipStatus
  created_at: string
}

// A friend as seen from the current user's perspective
export type Friend = {
  friendshipId: string
  profile: Profile
  direction: 'sent' | 'received'
  status: FriendshipStatus
}

export type LoanWithDetails = {
  id: string
  loaned_at: string
  returned_at: string | null
  book: Pick<Book, 'id' | 'title' | 'author'>
  otherParty: Pick<Profile, 'id' | 'name'>
}
