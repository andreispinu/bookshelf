import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import {
  borrowerReceiptConfirmEmail,
  loanStartedEmail,
  returnInitiatedEmail,
  returnConfirmedEmail,
} from '@/lib/email-templates'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { loanId, action } = await request.json() as { loanId: string; action: string }
  if (!loanId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: loan } = await supabaseAdmin
    .from('loans')
    .select('id, book_id, lender_id, borrower_id, workflow_status, due_date, approved_days')
    .eq('id', loanId)
    .single()

  if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
  if (loan.lender_id !== user.id && loan.borrower_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date().toISOString()

  if (action === 'confirm_handoff') {
    if (loan.lender_id !== user.id) return NextResponse.json({ error: 'Only the lender can confirm handoff' }, { status: 403 })
    if (loan.workflow_status !== 'pending_handoff') return NextResponse.json({ error: 'Invalid workflow status' }, { status: 400 })

    await supabaseAdmin
      .from('loans')
      .update({ workflow_status: 'pending_receipt', handoff_confirmed_at: now })
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
      const { subject, html } = borrowerReceiptConfirmEmail(
        borrowerProf.data?.first_name ?? 'there',
        lenderProf.data?.name ?? 'Your friend',
        bookData.data?.title ?? 'the book',
      )
      await sendEmail({ to: borrowerEmail, subject, html })
    })().catch(console.error)

  } else if (action === 'confirm_receipt') {
    if (loan.borrower_id !== user.id) return NextResponse.json({ error: 'Only the borrower can confirm receipt' }, { status: 403 })
    if (loan.workflow_status !== 'pending_receipt') return NextResponse.json({ error: 'Invalid workflow status' }, { status: 400 })

    const dueDate = loan.approved_days
      ? new Date(Date.now() + (loan.approved_days as number) * 24 * 60 * 60 * 1000).toISOString()
      : null

    await supabaseAdmin
      .from('loans')
      .update({ workflow_status: 'active', received_confirmed_at: now, due_date: dueDate })
      .eq('id', loanId)

    ;(async () => {
      const [borrowerProf, lenderProf, borrowerAuth, bookData] = await Promise.all([
        supabaseAdmin.from('profiles').select('first_name').eq('id', loan.borrower_id).single(),
        supabaseAdmin.from('profiles').select('name').eq('id', loan.lender_id).single(),
        supabaseAdmin.auth.admin.getUserById(loan.borrower_id),
        supabaseAdmin.from('books').select('title').eq('id', loan.book_id).single(),
      ])
      const borrowerEmail = borrowerAuth.data?.user?.email
      if (!borrowerEmail) return
      const { subject, html } = loanStartedEmail(
        borrowerProf.data?.first_name ?? 'there',
        lenderProf.data?.name ?? 'Your friend',
        bookData.data?.title ?? 'the book',
        dueDate,
      )
      await sendEmail({ to: borrowerEmail, subject, html })
    })().catch(console.error)

  } else if (action === 'initiate_return') {
    if (loan.borrower_id !== user.id) return NextResponse.json({ error: 'Only the borrower can initiate return' }, { status: 403 })
    if (!['active', 'overdue', 'recall_requested'].includes(loan.workflow_status as string)) {
      return NextResponse.json({ error: 'Invalid workflow status' }, { status: 400 })
    }

    await supabaseAdmin
      .from('loans')
      .update({ workflow_status: 'pending_return', return_initiated_at: now })
      .eq('id', loanId)

    ;(async () => {
      const [borrowerProf, lenderProf, lenderAuth, bookData] = await Promise.all([
        supabaseAdmin.from('profiles').select('name').eq('id', loan.borrower_id).single(),
        supabaseAdmin.from('profiles').select('first_name').eq('id', loan.lender_id).single(),
        supabaseAdmin.auth.admin.getUserById(loan.lender_id),
        supabaseAdmin.from('books').select('title').eq('id', loan.book_id).single(),
      ])
      const lenderEmail = lenderAuth.data?.user?.email
      if (!lenderEmail) return
      const { subject, html } = returnInitiatedEmail(
        lenderProf.data?.first_name ?? 'there',
        borrowerProf.data?.name ?? 'Your friend',
        bookData.data?.title ?? 'the book',
      )
      await sendEmail({ to: lenderEmail, subject, html })
    })().catch(console.error)

  } else if (action === 'confirm_return') {
    if (loan.lender_id !== user.id) return NextResponse.json({ error: 'Only the lender can confirm return' }, { status: 403 })
    if (loan.workflow_status !== 'pending_return') return NextResponse.json({ error: 'Invalid workflow status' }, { status: 400 })

    await supabaseAdmin
      .from('loans')
      .update({ workflow_status: 'completed', return_confirmed_at: now, returned_at: now })
      .eq('id', loanId)

    await supabaseAdmin
      .from('books')
      .update({ status: 'available' })
      .eq('id', loan.book_id)
      .eq('user_id', loan.lender_id)

    ;(async () => {
      const [lenderProf, borrowerProf, borrowerAuth, bookData] = await Promise.all([
        supabaseAdmin.from('profiles').select('name').eq('id', loan.lender_id).single(),
        supabaseAdmin.from('profiles').select('first_name').eq('id', loan.borrower_id).single(),
        supabaseAdmin.auth.admin.getUserById(loan.borrower_id),
        supabaseAdmin.from('books').select('title').eq('id', loan.book_id).single(),
      ])
      const borrowerEmail = borrowerAuth.data?.user?.email
      if (!borrowerEmail) return
      const { subject, html } = returnConfirmedEmail(
        borrowerProf.data?.first_name ?? 'there',
        lenderProf.data?.name ?? 'Your friend',
        bookData.data?.title ?? 'the book',
      )
      await sendEmail({ to: borrowerEmail, subject, html })
    })().catch(console.error)

  } else if (action === 'deny_return') {
    if (loan.lender_id !== user.id) return NextResponse.json({ error: 'Only the lender can deny return' }, { status: 403 })
    if (loan.workflow_status !== 'pending_return') return NextResponse.json({ error: 'Invalid workflow status' }, { status: 400 })

    const isOverdue = loan.due_date && new Date(loan.due_date as string) < new Date()
    await supabaseAdmin
      .from('loans')
      .update({ workflow_status: isOverdue ? 'overdue' : 'active' })
      .eq('id', loanId)

  } else {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
