'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function startReading(bookId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabaseAdmin
    .from('reading_progress')
    .upsert(
      { user_id: user.id, book_id: bookId, status: 'reading', progress_percent: 0, started_at: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: 'user_id,book_id' }
    )

  if (error) return { error: error.message }
  revalidatePath('/books')
  revalidatePath('/books/currently-reading')
  return { ok: true }
}

export async function updateProgress(bookId: string, percent: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabaseAdmin
    .from('reading_progress')
    .update({ progress_percent: percent, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .eq('book_id', bookId)

  return { ok: true }
}

export async function finishBook(bookId: string, rating?: number | null, review?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabaseAdmin
    .from('reading_progress')
    .update({
      status: 'finished',
      progress_percent: 100,
      finished_at: new Date().toISOString(),
      rating: rating ?? null,
      review: review ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('book_id', bookId)

  // Notify accepted friends when rating >= 4
  if (rating && rating >= 4) {
    const [{ data: book }, { data: friendships }] = await Promise.all([
      supabaseAdmin.from('books').select('title').eq('id', bookId).single(),
      supabaseAdmin
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    ])

    if (book && friendships && friendships.length > 0) {
      const friendIds = friendships.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      )
      await supabaseAdmin.from('notifications').insert(
        friendIds.map(friendId => ({
          user_id: friendId,
          type: 'friend_finished_book',
          actor_id: user.id,
          book_id: bookId,
        }))
      )
    }
  }

  revalidatePath('/books')
  revalidatePath('/books/currently-reading')
  return { ok: true }
}

export async function readAgain(bookId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabaseAdmin
    .from('reading_progress')
    .update({
      status: 'reading',
      progress_percent: 0,
      rating: null,
      review: null,
      started_at: new Date().toISOString(),
      finished_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('book_id', bookId)

  revalidatePath('/books')
  revalidatePath('/books/currently-reading')
  return { ok: true }
}
