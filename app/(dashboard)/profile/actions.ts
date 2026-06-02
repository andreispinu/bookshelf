'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const USERNAME_REGEX = /^[a-z0-9-]{3,30}$/

export async function updateName(firstName: string, lastName: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmedFirst = firstName.trim()
  if (!trimmedFirst) return { error: 'First name cannot be empty' }
  const trimmedLast = lastName.trim() || null

  const { error } = await supabase
    .from('profiles')
    .update({ first_name: trimmedFirst, last_name: trimmedLast })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { error: null }
}

export async function updateUsername(username: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = username.trim().toLowerCase()
  if (!USERNAME_REGEX.test(trimmed)) {
    return { error: 'Username must be 3-30 characters: lowercase letters, numbers, hyphens only' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ username: trimmed })
    .eq('id', user.id)

  if (error) {
    if (error.code === '23505') return { error: 'That username is already taken' }
    return { error: error.message }
  }

  revalidatePath('/profile')
  return { error: null }
}

export async function updateProfileVisibility(
  visibility: 'private' | 'public_minimal' | 'public_full'
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ profile_visibility: visibility })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { error: null }
}

export async function updateLocation(
  country: string | null,
  city: string | null,
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { error } = await supabase
    .from('profiles')
    .update({ country: country || null, city: city || null })
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  return { error: null }
}

export async function updateUiLanguage(lang: string): Promise<{ error: string | null }> {
  const LOCALES = ['en', 'ro', 'ru']
  if (!LOCALES.includes(lang)) return { error: 'Invalid language' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  await supabase
    .from('profiles')
    .update({ ui_language: lang })
    .eq('id', user.id)

  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', lang, {
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
  return { error: null }
}
