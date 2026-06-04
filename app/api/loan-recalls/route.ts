import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { recallRequestEmail } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { loanId, reason } = await request.json() as { loanId: string; reason?: string }
  if (!loanId) return NextResponse.json({ error: 'Missing loanId' }, { status: 400 })

  const { data: loan } = await supabaseAdmin
    .from('loans')
    .select('id, book_id, lender_id, borrower_id, workflow_status')
    .eq('id', loanId)
    .single()

  if (!loan || loan.lender_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!['active', 'overdue'].includes(loan.workflow_status as string)) {
    return NextResponse.json({ error: 'Can only recall active or overdue loans' }, { status: 400 })
  }

  const { data: recall, error } = await supabaseAdmin
    .from('loan_recalls')
    .insert({
      loan_id: loanId,
      requested_by: user.id,
      reason: reason?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('loans')
    .update({ workflow_status: 'recall_requested' })
    .eq('id', loanId)

  ;(async () => {
    const [lenderProf, borrowerProf, borrowerAuth, bookData] = await Promise.all([
      supabaseAdmin.from('profiles').select('name').eq('id', loan.lender_id).single(),
      supabaseAdmin.from('profiles').select('first_name').eq('id', loan.borrower_id).single(),
      supabaseAdmin.auth.admin.getUserById(loan.borrower_id),
      supabaseAdmin.from('books').select('title').eq('id', loan.book_id).single(),
    ])
    const borrowerEmail = borrowerAuth.data?.user?.email
    if (!borrowerEmail) return
    const { subject, html } = recallRequestEmail(
      borrowerProf.data?.first_name ?? 'there',
      lenderProf.data?.name ?? 'Your lender',
      bookData.data?.title ?? 'the book',
      reason?.trim() || null,
    )
    await sendEmail({ to: borrowerEmail, subject, html })
  })().catch(console.error)

  return NextResponse.json({ recall })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { recallId } = await request.json() as { recallId: string }
  if (!recallId) return NextResponse.json({ error: 'Missing recallId' }, { status: 400 })

  const { data: recall } = await supabaseAdmin
    .from('loan_recalls')
    .select('id, loan_id')
    .eq('id', recallId)
    .single()

  if (!recall) return NextResponse.json({ error: 'Recall not found' }, { status: 404 })

  const { data: loan } = await supabaseAdmin
    .from('loans')
    .select('id, borrower_id')
    .eq('id', recall.loan_id)
    .single()

  if (!loan || loan.borrower_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await supabaseAdmin
    .from('loan_recalls')
    .update({ status: 'acknowledged' })
    .eq('id', recallId)

  return NextResponse.json({ ok: true })
}
