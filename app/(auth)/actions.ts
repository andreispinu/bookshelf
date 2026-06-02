'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/books')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const firstName = (formData.get('first_name') as string).trim()
  const lastName = (formData.get('last_name') as string | null)?.trim() || ''

  const { data, error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName || undefined,
        name: [firstName, lastName].filter(Boolean).join(' '),
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  // Populate first_name / last_name on the profile row created by the DB trigger
  if (data.user) {
    await supabase
      .from('profiles')
      .update({ first_name: firstName, last_name: lastName || null })
      .eq('id', data.user.id)
  }

  revalidatePath('/', 'layout')
  return { error: null }
}
