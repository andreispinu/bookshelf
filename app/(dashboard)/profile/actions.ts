'use server'

import { createClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

const USERNAME_REGEX = /^[a-z0-9-]{3,30}$/

export async function updateName(name: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const trimmed = name.trim()
  if (!trimmed) return { error: 'Name cannot be empty' }

  const { error } = await supabase
    .from('profiles')
    .update({ name: trimmed })
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
