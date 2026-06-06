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
  sale_price: number | null
  sale_currency: string | null
  condition_note: string | null
  availability_mode: 'lend_only' | 'sell_only' | 'lend_and_sell'
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

export type WorkflowStatus =
  | 'pending_handoff'
  | 'pending_receipt'
  | 'active'
  | 'overdue'
  | 'extension_requested'
  | 'recall_requested'
  | 'pending_return'
  | 'completed'

export type LoanWithDetails = {
  id: string
  loaned_at: string
  returned_at: string | null
  due_date: string | null
  workflow_status: WorkflowStatus
  approved_days: number | null
  book: Pick<Book, 'id' | 'title' | 'author' | 'cover_url'>
  otherParty: Pick<Profile, 'id' | 'name'>
  pendingExtension?: {
    id: string
    requested_days: number
    requester_note: string | null
  }
  pendingRecall?: {
    id: string
    reason: string | null
  }
}

export type LoanExtension = {
  id: string
  loan_id: string
  requested_by: string
  requested_days: number
  status: 'pending' | 'approved' | 'declined'
  requester_note: string | null
  owner_note: string | null
  created_at: string
  responded_at: string | null
}

export type LoanRecall = {
  id: string
  loan_id: string
  requested_by: string
  reason: string | null
  status: 'pending' | 'acknowledged'
  created_at: string
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
  requested_days: number | null
  created_at: string
  updated_at: string
  book: Pick<Book, 'id' | 'title' | 'author' | 'cover_url'>
  requester: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}

export type WishlistItem = {
  id: string
  user_id: string
  title: string
  author: string
  isbn: string | null
  cover_url: string | null
  category: string | null
  language: string | null
  description: string | null
  status: 'wanted' | 'borrowed' | 'purchased'
  has_friend_copy: boolean
  created_at: string
}

export type FriendMatch = {
  bookId: string
  ownerId: string
  ownerName: string
  ownerAvatar: string | null
  status: 'available' | 'lent_out'
}

export type SaleRequest = {
  id: string
  book_id: string
  buyer_id: string
  seller_id: string
  message: string | null
  sale_price: number | null
  sale_currency: string | null
  status: 'pending' | 'accepted' | 'declined' | 'completed'
  created_at: string
  updated_at: string
  book: Pick<Book, 'id' | 'title' | 'author' | 'cover_url'>
  buyer: Pick<Profile, 'id' | 'name' | 'avatar_url'>
  seller: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}

export type SentRequest = {
  id: string
  book_id: string
  requester_id: string
  owner_id: string
  status: 'pending' | 'approved' | 'rejected'
  requester_message: string | null
  owner_message: string | null
  requested_days: number | null
  created_at: string
  updated_at: string
  book: Pick<Book, 'id' | 'title' | 'author' | 'cover_url'>
  owner: Pick<Profile, 'id' | 'name' | 'avatar_url'>
}
