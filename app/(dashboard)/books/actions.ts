'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export async function addBook(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase.from('books').insert({
    user_id: user.id,
    title:     (formData.get('title')     as string).trim(),
    author:    (formData.get('author')    as string).trim(),
    isbn:      (formData.get('isbn')      as string).trim() || null,
    cover_url: (formData.get('cover_url') as string).trim() || null,
  })

  if (error) return { error: error.message }

  revalidatePath('/books')
  redirect('/books')
}

export async function updateBook(bookId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('books')
    .update({
      title:     (formData.get('title')     as string).trim(),
      author:    (formData.get('author')    as string).trim(),
      isbn:      (formData.get('isbn')      as string).trim() || null,
      cover_url: (formData.get('cover_url') as string).trim() || null,
    })
    .eq('id', bookId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/books')
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
