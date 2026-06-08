'use server'

import { createClient } from '@/lib/supabase-server'

export async function resendConfirmationEmail() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return { error: 'Not authenticated' }

  const { error } = await supabase.auth.resend({ type: 'signup', email: user.email })
  if (error) return { error: error.message }
  return { error: null }
}
