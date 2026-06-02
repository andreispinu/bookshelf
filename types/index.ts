export type Book = {
  id: string
  user_id: string
  title: string
  author: string
  isbn: string | null
  cover_url: string | null
  description: string | null
  publisher: string | null
  year: string | null
  category: string | null
  language: string | null
  status: 'available' | 'lent_out'
  created_at: string
}

export type Profile = {
  id: string
  name: string
  first_name: string | null
  last_name: string | null
  avatar_url: string | null
  created_at: string
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: 'trialing' | 'active' | 'canceled' | 'past_due' | null
  subscription_plan: 'monthly' | 'annual' | null
  subscription_ends_at: string | null
  username: string | null
  profile_visibility: 'private' | 'public_minimal' | 'public_full'
  country: string | null
  city: string | null
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

export type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  read: boolean
  created_at: string
}

export type ConvItem = {
  userId: string
  name: string
  avatar_url: string | null
  lastMessage: string
  lastAt: string
  unread: number
}

export type BorrowRequest = {
  id: string
  book_id: string
  requester_id: string
  owner_id: string
  status: 'pending' | 'approved' | 'rejected'
  requester_message: string | null
  owner_message: string | null
  created_at: string
  updated_at: string
  book: Pick<Book, 'id' | 'title' | 'author' | 'cover_url'>
  requester: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}

export type SentRequest = {
  id: string
  book_id: string
  requester_id: string
  owner_id: string
  status: 'pending' | 'approved' | 'rejected'
  requester_message: string | null
  owner_message: string | null
  created_at: string
  updated_at: string
  book: Pick<Book, 'id' | 'title' | 'author' | 'cover_url'>
  owner: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}
