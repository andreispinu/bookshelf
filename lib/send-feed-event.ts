import { supabaseAdmin } from './supabase-admin'

type FeedEventType = 'book_lent' | 'book_borrowed' | 'reading_started' | 'reading_finished'

export async function sendFeedEvent(
  userId: string,
  eventType: FeedEventType,
  bookId: string,
  meta: Record<string, unknown> = {}
) {
  const { error } = await supabaseAdmin.from('activity_feed').insert({
    user_id: userId,
    event_type: eventType,
    book_id: bookId,
    meta,
  })
  if (error) console.error('[sendFeedEvent]', error.message)
}
