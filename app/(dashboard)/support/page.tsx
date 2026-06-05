import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { redirect } from 'next/navigation'
import SupportClient from './support-client'

export default async function SupportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('support')

  const { data: tickets } = await supabaseAdmin
    .from('support_tickets')
    .select(`
      id, type, subject, status, created_at, updated_at,
      support_replies(id, from_admin, content, read_at, created_at)
    `)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">{t('title')}</h1>
      <SupportClient initialTickets={tickets ?? []} />
    </div>
  )
}
