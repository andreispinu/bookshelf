import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { loanOverdueEmail } from '@/lib/email-templates'

export const maxDuration = 60

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: loans } = await supabaseAdmin
    .from('loans')
    .select('id, book_id, lender_id, borrower_id, due_date, overdue_email_sent_at')
    .eq('workflow_status', 'active')
    .not('due_date', 'is', null)
    .lt('due_date', new Date().toISOString())

  if (!loans || loans.length === 0) {
    return NextResponse.json({ ok: true, updated: 0, emailsSent: 0 })
  }

  let updated = 0
  let emailsSent = 0
  let errors = 0

  for (const loan of loans) {
    try {
      await supabaseAdmin
        .from('loans')
        .update({ workflow_status: 'overdue' })
        .eq('id', loan.id)
      updated++

      if (!loan.overdue_email_sent_at) {
        const [borrowerProf, lenderProf, borrowerAuth, bookData] = await Promise.all([
          supabaseAdmin.from('profiles').select('first_name').eq('id', loan.borrower_id).single(),
          supabaseAdmin.from('profiles').select('name').eq('id', loan.lender_id).single(),
          supabaseAdmin.auth.admin.getUserById(loan.borrower_id),
          supabaseAdmin.from('books').select('title').eq('id', loan.book_id).single(),
        ])

        const borrowerEmail = borrowerAuth.data?.user?.email
        if (borrowerEmail && loan.due_date) {
          const dueDateStr = new Date(loan.due_date as string).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'long', year: 'numeric',
          })
          const { subject, html } = loanOverdueEmail(
            borrowerProf.data?.first_name ?? 'there',
            bookData.data?.title ?? 'the book',
            lenderProf.data?.name ?? 'your friend',
            dueDateStr,
          )
          await sendEmail({ to: borrowerEmail, subject, html })
          await supabaseAdmin
            .from('loans')
            .update({ overdue_email_sent_at: new Date().toISOString() })
            .eq('id', loan.id)
          emailsSent++
        }
      }
    } catch (e) {
      console.error('Error processing overdue loan', loan.id, e)
      errors++
    }
  }

  return NextResponse.json({ ok: true, updated, emailsSent, errors })
}
