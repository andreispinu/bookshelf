import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import RequestsClient from './requests-client'
import type { BorrowRequest } from '@/types'

export default async function BorrowRequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('loans')

  const { data } = await supabase
    .from('borrow_requests')
    .select(`
      id, book_id, requester_id, owner_id, status,
      requester_message, owner_message, created_at, updated_at,
      book:books!borrow_requests_book_id_fkey(id, title, author, cover_url),
      requester:profiles!borrow_requests_requester_id_fkey(id, name, avatar_url)
    `)
    .eq('owner_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">{t('borrowRequestsTitle')}</h2>
        <p className="text-stone-500 text-sm mt-0.5">{t('borrowRequestsSubtitle')}</p>
      </div>
      <RequestsClient requests={(data ?? []) as unknown as BorrowRequest[]} />
    </div>
  )
}
