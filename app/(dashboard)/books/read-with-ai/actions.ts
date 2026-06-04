'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function addToReadWithAI(
  bookId: string,
): Promise<{ error: string | null; tooMany?: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { count } = await supabase
    .from('reading_ai_books')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) >= 3) return { error: 'Too many books', tooMany: true }

  const { error } = await supabase
    .from('reading_ai_books')
    .insert({ user_id: user.id, book_id: bookId })

  if (error) return { error: error.message }

  revalidatePath('/books')
  revalidatePath('/books/read-with-ai')
  return { error: null }
}

export async function removeFromReadWithAI(
  readingId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('reading_ai_books')
    .delete()
    .eq('id', readingId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/books')
  revalidatePath('/books/read-with-ai')
  return { error: null }
}

export async function markInsightRead(
  insightId: string,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('reading_ai_insights')
    .update({ read_at: new Date().toISOString() })
    .eq('id', insightId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { error: null }
}

export async function updateReadingAiNotifications(
  enabled: boolean,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ reading_ai_email_notifications: enabled })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { error: null }
}
