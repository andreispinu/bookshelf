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
      id, loaned_at, returned_at, due_date, workflow_status, approved_days,
      book:books!loans_book_id_fkey(id, title, author, cover_url),
      borrower:profiles!loans_borrower_id_fkey(id, name)
    `)
    .eq('lender_id', userId)
    .neq('workflow_status', 'completed')
    .order('loaned_at', { ascending: false })

  if (error) return { data: null, error: error.message }

  const loans: LoanWithDetails[] = (data ?? []).map(row => ({
    id: row.id,
    loaned_at: row.loaned_at,
    returned_at: row.returned_at,
    due_date: (row as unknown as { due_date: string | null }).due_date,
    workflow_status: (row as unknown as { workflow_status: string }).workflow_status as LoanWithDetails['workflow_status'],
    approved_days: (row as unknown as { approved_days: number | null }).approved_days,
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
      id, loaned_at, returned_at, due_date, workflow_status, approved_days,
      book:books!loans_book_id_fkey(id, title, author, cover_url),
      lender:profiles!loans_lender_id_fkey(id, name)
    `)
    .eq('borrower_id', userId)
    .neq('workflow_status', 'completed')
    .order('loaned_at', { ascending: false })

  if (error) return { data: null, error: error.message }

  const loans: LoanWithDetails[] = (data ?? []).map(row => ({
    id: row.id,
    loaned_at: row.loaned_at,
    returned_at: row.returned_at,
    due_date: (row as unknown as { due_date: string | null }).due_date,
    workflow_status: (row as unknown as { workflow_status: string }).workflow_status as LoanWithDetails['workflow_status'],
    approved_days: (row as unknown as { approved_days: number | null }).approved_days,
    book: row.book as unknown as LoanWithDetails['book'],
    otherParty: row.lender as unknown as LoanWithDetails['otherParty'],
  }))

  return { data: loans, error: null }
}
