import { createClient } from '@/lib/supabase-server'
import type { LoanWithDetails } from '@/types'

export async function getActiveLoanForBook(bookId: string): Promise<{
  data: { id: string; loaned_at: string; borrower: { name: string } } | null
  error: string | null
}> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('loans')
    .select('id, loaned_at, borrower:profiles!loans_borrower_id_fkey(name)')
    .eq('book_id', bookId)
    .is('returned_at', null)
    .maybeSingle()

  if (error) return { data: null, error: error.message }
  return { data: data as unknown as { id: string; loaned_at: string; borrower: { name: string } } | null, error: null }
}

export async function getLentOut(userId: string): Promise<{ data: LoanWithDetails[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('loans')
    .select(`
      id, loaned_at, returned_at,
      book:books!loans_book_id_fkey(id, title, author),
      borrower:profiles!loans_borrower_id_fkey(id, name)
    `)
    .eq('lender_id', userId)
    .is('returned_at', null)
    .order('loaned_at', { ascending: false })

  if (error) return { data: null, error: error.message }

  const loans: LoanWithDetails[] = (data ?? []).map(row => ({
    id: row.id,
    loaned_at: row.loaned_at,
    returned_at: row.returned_at,
    book: row.book as unknown as LoanWithDetails['book'],
    otherParty: row.borrower as unknown as LoanWithDetails['otherParty'],
  }))

  return { data: loans, error: null }
}

export async function getBorrowed(userId: string): Promise<{ data: LoanWithDetails[] | null; error: string | null }> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('loans')
    .select(`
      id, loaned_at, returned_at,
      book:books!loans_book_id_fkey(id, title, author),
      lender:profiles!loans_lender_id_fkey(id, name)
    `)
    .eq('borrower_id', userId)
    .is('returned_at', null)
    .order('loaned_at', { ascending: false })

  if (error) return { data: null, error: error.message }

  const loans: LoanWithDetails[] = (data ?? []).map(row => ({
    id: row.id,
    loaned_at: row.loaned_at,
    returned_at: row.returned_at,
    book: row.book as unknown as LoanWithDetails['book'],
    otherParty: row.lender as unknown as LoanWithDetails['otherParty'],
  }))

  return { data: loans, error: null }
}
