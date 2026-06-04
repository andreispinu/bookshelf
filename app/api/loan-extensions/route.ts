import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { extensionRequestEmail, extensionApprovedEmail, extensionDeclinedEmail } from '@/lib/email-templates'
import { sendSystemMessage } from '@/lib/send-system-message'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { loanId, requestedDays, requesterNote } = await request.json() as {
    loanId: string
    requestedDays: number
    requesterNote?: string
  }
  if (!loanId || !requestedDays) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: loan } = await supabaseAdmin
    .from('loans')
    .select('id, book_id, lender_id, borrower_id, workflow_status')
    .eq('id', loanId)
    .single()

  if (!loan || loan.borrower_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (!['active', 'overdue'].includes(loan.workflow_status as string)) {
    return NextResponse.json({ error: 'Can only request extension on active or overdue loans' }, { status: 400 })
  }

  const { data: ext, error } = await supabaseAdmin
    .from('loan_extensions')
    .insert({
      loan_id: loanId,
      requested_by: user.id,
      requested_days: requestedDays,
      requester_note: requesterNote?.trim() || null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabaseAdmin
    .from('loans')
    .update({ workflow_status: 'extension_requested' })
    .eq('id', loanId)

  const [borrowerProf, lenderProf, bookData] = await Promise.all([
    supabaseAdmin.from('profiles').select('name, first_name').eq('id', user.id).single(),
    supabaseAdmin.from('profiles').select('name, first_name').eq('id', loan.lender_id).single(),
    supabaseAdmin.from('books').select('title').eq('id', loan.book_id).single(),
  ])
  const borrowerName = borrowerProf.data?.name ?? 'Borrower'
  const bookTitle = bookData.data?.title ?? 'the book'

  const noteText = requesterNote?.trim() ? `. Note: "${requesterNote.trim()}"` : ''
  await sendSystemMessage(
    user.id,
    loan.lender_id,
    `🔄 ${borrowerName} is requesting ${requestedDays} more days for "${bookTitle}"${noteText}`,
  )

  ;(async () => {
    const lenderAuth = await supabaseAdmin.auth.admin.getUserById(loan.lender_id)
    const lenderEmail = lenderAuth.data?.user?.email
    if (!lenderEmail) return
    const { subject, html } = extensionRequestEmail(
      lenderProf.data?.first_name ?? 'there',
      borrowerName,
      bookTitle,
      requestedDays,
      requesterNote?.trim() || null,
    )
    await sendEmail({ to: lenderEmail, subject, html })
  })().catch(console.error)

  return NextResponse.json({ extension: ext })
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { extensionId, action, ownerNote } = await request.json() as {
    extensionId: string
    action: 'approve' | 'decline'
    ownerNote?: string
  }
  if (!extensionId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: ext } = await supabaseAdmin
    .from('loan_extensions')
    .select('id, loan_id, requested_by, requested_days')
    .eq('id', extensionId)
    .single()

  if (!ext) return NextResponse.json({ error: 'Extension not found' }, { status: 404 })

  const { data: loan } = await supabaseAdmin
    .from('loans')
    .select('id, book_id, lender_id, borrower_id, due_date, approved_days')
    .eq('id', ext.loan_id)
    .single()

  if (!loan || loan.lender_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = new Date().toISOString()
  const newStatus = action === 'approve' ? 'approved' : 'declined'

  await supabaseAdmin
    .from('loan_extensions')
    .update({ status: newStatus, owner_note: ownerNote?.trim() || null, responded_at: now })
    .eq('id', extensionId)

  const [lenderProf, borrowerProf, bookData] = await Promise.all([
    supabaseAdmin.from('profiles').select('name, first_name').eq('id', loan.lender_id).single(),
    supabaseAdmin.from('profiles').select('name, first_name').eq('id', loan.borrower_id).single(),
    supabaseAdmin.from('books').select('title').eq('id', loan.book_id).single(),
  ])
  const lenderName = lenderProf.data?.name ?? 'Lender'
  const bookTitle = bookData.data?.title ?? 'the book'

  if (action === 'approve') {
    const currentDue = loan.due_date ? new Date(loan.due_date as string) : new Date()
    const newDue = new Date(currentDue.getTime() + (ext.requested_days as number) * 24 * 60 * 60 * 1000)
    const newApprovedDays = ((loan.approved_days as number | null) ?? 0) + (ext.requested_days as number)

    await supabaseAdmin
      .from('loans')
      .update({ workflow_status: 'active', due_date: newDue.toISOString(), approved_days: newApprovedDays })
      .eq('id', ext.loan_id)

    const dueDateStr = newDue.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    await sendSystemMessage(
      loan.lender_id,
      loan.borrower_id,
      `✅ ${lenderName} approved the extension. New due date: ${dueDateStr}.`,
    )

    ;(async () => {
      const borrowerAuth = await supabaseAdmin.auth.admin.getUserById(loan.borrower_id)
      const borrowerEmail = borrowerAuth.data?.user?.email
      if (!borrowerEmail) return
      const { subject, html } = extensionApprovedEmail(
        borrowerProf.data?.first_name ?? 'there',
        lenderName,
        bookTitle,
        dueDateStr,
      )
      await sendEmail({ to: borrowerEmail, subject, html })
    })().catch(console.error)
  } else {
    const isOverdue = loan.due_date && new Date(loan.due_date as string) < new Date()
    await supabaseAdmin
      .from('loans')
      .update({ workflow_status: isOverdue ? 'overdue' : 'active' })
      .eq('id', ext.loan_id)

    const originalDueDateStr = loan.due_date
      ? new Date(loan.due_date as string).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'the original date'
    await sendSystemMessage(
      loan.lender_id,
      loan.borrower_id,
      `❌ ${lenderName} declined the extension request. Please return "${bookTitle}" by ${originalDueDateStr}.`,
    )

    ;(async () => {
      const borrowerAuth = await supabaseAdmin.auth.admin.getUserById(loan.borrower_id)
      const borrowerEmail = borrowerAuth.data?.user?.email
      if (!borrowerEmail) return
      const { subject, html } = extensionDeclinedEmail(
        borrowerProf.data?.first_name ?? 'there',
        lenderName,
        bookTitle,
      )
      await sendEmail({ to: borrowerEmail, subject, html })
    })().catch(console.error)
  }

  return NextResponse.json({ ok: true })
}
