'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { welcomeEmail, welcomeEmailRo, welcomeEmailRu } from '@/lib/email-templates'

const VALID_LOCALES = ['en', 'ro', 'ru']

export async function login(formData: FormData) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) {
    return { error: error.message }
  }

  // Sync language on login: profile ui_language wins; if absent, save cookie to profile
  if (data.user) {
    const cookieStore = await cookies()
    const { data: profile } = await supabase
      .from('profiles')
      .select('ui_language')
      .eq('id', data.user.id)
      .single()

    if (profile?.ui_language) {
      // Profile has a preference — set cookie to match (profile always takes precedence)
      cookieStore.set('NEXT_LOCALE', profile.ui_language, {
        maxAge: 365 * 24 * 60 * 60, path: '/', sameSite: 'lax',
      })
    } else {
      // No preference saved yet — persist current cookie to profile
      const currentLocale = cookieStore.get('NEXT_LOCALE')?.value
      if (currentLocale && VALID_LOCALES.includes(currentLocale)) {
        supabase.from('profiles')
          .update({ ui_language: currentLocale })
          .eq('id', data.user.id)
          .then(({ error: e }) => { if (e) console.error('[login] ui_language sync error:', e) })
      }
    }
  }

  revalidatePath('/', 'layout')

  // Honour a `next` redirect target, but only safe relative paths (no open redirect).
  const next = formData.get('next') as string | null
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/books'
  redirect(target)
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

  // Populate first_name, last_name, and ui_language on the profile row created by the DB trigger
  if (data.user) {
    const cookieStore = await cookies()
    const uiLanguage = cookieStore.get('NEXT_LOCALE')?.value
    await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName || null,
        ...(uiLanguage && VALID_LOCALES.includes(uiLanguage) ? { ui_language: uiLanguage } : {}),
      })
      .eq('id', data.user.id)

    // Fire-and-forget welcome email with confirmation link
    const email = formData.get('email') as string
    const lang = uiLanguage && VALID_LOCALES.includes(uiLanguage) ? uiLanguage : 'en'
    ;(async () => {
      const { data: linkData } = await supabaseAdmin.auth.admin.generateLink({
        type: 'signup',
        email,
        password: formData.get('password') as string,
      })
      const confirmationUrl = linkData?.properties?.action_link ?? 'https://bookshelf.name'
      const template = lang === 'ro' ? welcomeEmailRo : lang === 'ru' ? welcomeEmailRu : welcomeEmail
      const { subject, html } = template(firstName, confirmationUrl)
      await sendEmail({ to: email, subject, html })
    })().catch(console.error)
  }

  revalidatePath('/', 'layout')
  return { error: null }
}
