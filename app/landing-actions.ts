'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase-server'

const LOCALES = ['en', 'ro', 'ru']

export async function setLocale(lang: string): Promise<void> {
  if (!LOCALES.includes(lang)) return
  const cookieStore = await cookies()
  cookieStore.set('NEXT_LOCALE', lang, { maxAge: 365 * 24 * 60 * 60, path: '/', sameSite: 'lax' })
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('profiles').update({ ui_language: lang }).eq('id', user.id)
    }
  } catch {}
  revalidatePath('/', 'layout')
}
