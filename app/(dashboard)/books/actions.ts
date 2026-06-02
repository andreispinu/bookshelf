'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type BookFields = {
  isbn?: string | null
  publisher?: string | null
  year?: string | null
  category?: string | null
  language?: string | null
  description?: string | null
  cover_url?: string | null
}

export async function fillBookFields(bookId: string, fields: BookFields) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('books')
    .update(fields)
    .eq('id', bookId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/books')
  revalidatePath(`/books/${bookId}`)
  return { error: null }
}

function extractFields(formData: FormData) {
  return {
    title:       (formData.get('title')       as string).trim(),
    author:      (formData.get('author')      as string).trim(),
    isbn:        (formData.get('isbn')        as string).trim() || null,
    cover_url:   (formData.get('cover_url')   as string).trim() || null,
    description: (formData.get('description') as string).trim() || null,
    publisher:   (formData.get('publisher')   as string | null)?.trim() || null,
    year:        (formData.get('year')        as string | null)?.trim() || null,
    category:    (formData.get('category')    as string | null)?.trim() || null,
    language:    (formData.get('language')    as string | null)?.trim() || null,
  }
}

export async function addBook(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const fields = extractFields(formData)

  // Duplicate check (case-insensitive)
  const { data: existing } = await supabase
    .from('books')
    .select('id')
    .eq('user_id', user.id)
    .ilike('title', fields.title)
    .ilike('author', fields.author)
    .limit(1)
    .maybeSingle()

  if (existing) return { duplicate: true as const }

  const { error } = await supabase.from('books').insert({ user_id: user.id, ...fields })
  if (error) return { error: error.message }

  revalidatePath('/books')
  redirect('/books')
}

export async function addBookForce(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const fields = extractFields(formData)
  const { error } = await supabase.from('books').insert({ user_id: user.id, ...fields })
  if (error) return { error: error.message }

  revalidatePath('/books')
  redirect('/books')
}

export async function updateBook(bookId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const fields = extractFields(formData)
  const { error } = await supabase
    .from('books')
    .update(fields)
    .eq('id', bookId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/books')
  revalidatePath(`/books/${bookId}`)
  return { error: null }
}

export async function deleteBook(bookId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Verify ownership before deleting
  const { data: book } = await supabaseAdmin
    .from('books')
    .select('id')
    .eq('id', bookId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!book) return { error: 'Book not found' }

  // Clear notifications.book_id FK reference to avoid constraint violation
  // (notifications.book_id has no ON DELETE clause in older DB deployments)
  await supabaseAdmin
    .from('notifications')
    .update({ book_id: null })
    .eq('book_id', bookId)

  const { error } = await supabaseAdmin
    .from('books')
    .delete()
    .eq('id', bookId)
    .eq('user_id', user.id)

  if (error) {
    console.error('[deleteBook] error:', error.message, error)
    return { error: error.message }
  }

  revalidatePath('/books')
  return { error: null }
}
