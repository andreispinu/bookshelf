import { Resend } from 'resend'

let _resend: Resend | null = null
function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  await getResend().emails.send({
    from: 'BookShelf <noreply@bookshelf.name>',
    to,
    subject,
    html,
  })
}
