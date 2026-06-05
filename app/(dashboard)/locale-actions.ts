'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase-server'

const VALID_LOCALES = ['en', 'ro', 'ru']

/**
 * Sets NEXT_LOCALE cookie to match the user's profile ui_language.
 * Called when the cookie is missing or doesn't match the profile.
 */
export async function syncLocaleFromProfile(lang: string): Promise<void> {
  if (!VALID_LOCALES.includes(lang)) return
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', lang, {
    maxAge: 365 * 24 * 60 * 60,
    path: '/',
    sameSite: 'lax',
  })
}

/**
 * Saves the current NEXT_LOCALE cookie value to the user's profile ui_language.
 * Only updates if ui_language is currently null (never overwrites a saved preference).
 */
export async function syncLocaleToProfile(): Promise<void> {
  const cookieStore = await cookies()
  const lang = cookieStore.get('NEXT_LOCALE')?.value
  if (!lang || !VALID_LOCALES.includes(lang)) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase
    .from('profiles')
    .update({ ui_language: lang })
    .eq('id', user.id)
    .is('ui_language', null)
}
