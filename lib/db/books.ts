import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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

// ---------------------------------------------------------------------------
// Public catalogue (SEO/GEO) — server-only.
//
// NOTE ON CLIENT: these read ALL users' books, which RLS blocks for the anon
// client (anon can only read for-sale books — see supabase/add-marketplace.sql).
// So they use the service-role client, exactly like the public profile page and
// the landing "recently added" section. They select ONLY safe columns and are
// NEVER imported into client components. We deliberately do not add a blanket
// anon SELECT policy on `books`, which would leak user_id and every column to
// the public anon key (same reasoning as the marketplace migration's profiles note).
// ---------------------------------------------------------------------------

export type PublicBookCard = {
  id: string
  title: string
  author: string
  cover_url: string | null
  category: string | null
  status: 'available' | 'lent_out'
  created_at: string
}

export type PublicBookDetail = PublicBookCard & {
  isbn: string | null
  description: string | null
  publisher: string | null
  year: string | null
  language: string | null
  city: string | null
  country: string | null
}

const PUBLIC_PAGE_SIZE = 48
const CARD_COLUMNS = 'id, title, author, cover_url, category, status, created_at'

export async function getPublicBooks({
  page = 1,
  category,
  status = 'all',
  author,
}: {
  page?: number
  category?: string
  status?: 'available' | 'all'
  author?: string
}): Promise<{ books: PublicBookCard[]; total: number }> {
  const safePage = Math.max(1, page)
  const from = (safePage - 1) * PUBLIC_PAGE_SIZE
  const to = from + PUBLIC_PAGE_SIZE - 1

  let query = supabaseAdmin
    .from('books')
    .select(CARD_COLUMNS, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (category) query = query.eq('category', category)
  if (status === 'available') query = query.eq('status', 'available')
  if (author) query = query.eq('author', author)

  const { data, count, error } = await query
  if (error) return { books: [], total: 0 }
  return { books: (data as PublicBookCard[]) ?? [], total: count ?? 0 }
}

export async function getPublicBook(id: string): Promise<PublicBookDetail | null> {
  const { data: book, error } = await supabaseAdmin
    .from('books')
    .select('id, title, author, isbn, cover_url, category, status, created_at, description, publisher, year, language, user_id')
    .eq('id', id)
    .maybeSingle()

  if (error || !book) return null

  // Owner location only — never name, avatar, email, or id.
  const { data: owner } = await supabaseAdmin
    .from('profiles')
    .select('city, country')
    .eq('id', book.user_id)
    .maybeSingle()

  return {
    id: book.id,
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    cover_url: book.cover_url,
    category: book.category,
    status: book.status,
    created_at: book.created_at,
    description: book.description ?? null,
    publisher: book.publisher ?? null,
    year: book.year ?? null,
    language: book.language ?? null,
    city: owner?.city ?? null,
    country: owner?.country ?? null,
  }
}

export async function getBooksByCategory(
  category: string,
  excludeId: string,
  limit = 4
): Promise<PublicBookCard[]> {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select(CARD_COLUMNS)
    .eq('category', category)
    .neq('id', excludeId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data as PublicBookCard[]) ?? []
}

export async function getAllBooksForSitemap(): Promise<
  { id: string; title: string; author: string; created_at: string }[]
> {
  const { data, error } = await supabaseAdmin
    .from('books')
    .select('id, title, author, created_at')
    .order('created_at', { ascending: false })

  if (error) return []
  return data ?? []
}
