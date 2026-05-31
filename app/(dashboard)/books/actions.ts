'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

function extractFields(formData: FormData) {
  return {
    title:       (formData.get('title')       as string).trim(),
    author:      (formData.get('author')      as string).trim(),
    isbn:        (formData.get('isbn')        as string).trim() || null,
    cover_url:   (formData.get('cover_url')   as string).trim() || null,
    description: (formData.get('description') as string).trim() || null,
    publisher:   (formData.get('publisher')   as string | null)?.trim() || null,
    year:        (formData.get('year')        as string | null)?.trim() || null,
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

  const { error } = await supabase
    .from('books')
    .delete()
    .eq('id', bookId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/books')
  return { error: null }
}
