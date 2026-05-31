import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import { getLentOut, getBorrowed } from '@/lib/db/loans'
import LoanList from './loan-list'

export default async function LoansPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: lentOut, error: lentError }, { data: borrowed, error: borrowedError }] =
    await Promise.all([getLentOut(user.id), getBorrowed(user.id)])

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">Loans</h2>
        <p className="text-stone-500 text-sm mt-0.5">Books you've lent out and borrowed.</p>
      </div>

      {(lentError || borrowedError) && (
        <p className="text-sm text-red-600 mb-4">Failed to load loans.</p>
      )}

      <LoanList lentOut={lentOut ?? []} borrowed={borrowed ?? []} />
    </div>
  )
}
