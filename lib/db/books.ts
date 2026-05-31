import { createClient } from '@/lib/supabase-server'
import type { Book } from '@/types'

export async function getBooks(userId: string): Promise<{ data: Book[] | null; error: string | null }> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
