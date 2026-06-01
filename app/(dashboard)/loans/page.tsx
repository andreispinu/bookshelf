import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { getLentOut, getBorrowed } from '@/lib/db/loans'
import LoanList from './loan-list'
import type { SentRequest } from '@/types'

export default async function LoansPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('loans')
  const { tab } = await searchParams

  const [{ data: lentOut, error: lentError }, { data: borrowed, error: borrowedError }, { data: sentData }] =
    await Promise.all([
      getLentOut(user.id),
      getBorrowed(user.id),
      supabase
        .from('borrow_requests')
        .select(`
          id, book_id, requester_id, owner_id, status,
          requester_message, owner_message, created_at, updated_at,
          book:books!borrow_requests_book_id_fkey(id, title, author, cover_url),
          owner:profiles!borrow_requests_owner_id_fkey(id, name, avatar_url)
        `)
        .eq('requester_id', user.id)
        .order('created_at', { ascending: false }),
    ])

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">{t('title')}</h2>
        <p className="text-stone-500 text-sm mt-0.5">{t('subtitle')}</p>
      </div>

      {(lentError || borrowedError) && (
        <p className="text-sm text-red-600 mb-4">Failed to load loans.</p>
      )}

      <LoanList
        lentOut={lentOut ?? []}
        borrowed={borrowed ?? []}
        sentRequests={(sentData ?? []) as unknown as SentRequest[]}
        defaultTab={tab}
      />
    </div>
  )
}
