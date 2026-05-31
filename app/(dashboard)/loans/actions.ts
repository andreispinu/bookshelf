'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

export async function lendBook(bookId: string, borrowerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Create the loan record and update book status atomically
  const { error: loanError } = await supabase.from('loans').insert({
    book_id: bookId,
    lender_id: user.id,
    borrower_id: borrowerId,
  })
  if (loanError) return { error: loanError.message }

  const { error: bookError } = await supabase
    .from('books')
    .update({ status: 'lent_out' })
    .eq('id', bookId)
    .eq('user_id', user.id)
  if (bookError) return { error: bookError.message }

  revalidatePath('/books')
  revalidatePath('/loans')
  return { error: null }
}

export async function markReturned(loanId: string, bookId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error: loanError } = await supabase
    .from('loans')
    .update({ returned_at: new Date().toISOString() })
    .eq('id', loanId)
    .eq('lender_id', user.id)
  if (loanError) return { error: loanError.message }

  const { error: bookError } = await supabase
    .from('books')
    .update({ status: 'available' })
    .eq('id', bookId)
    .eq('user_id', user.id)
  if (bookError) return { error: bookError.message }

  revalidatePath('/books')
  revalidatePath('/loans')
  return { error: null }
}
