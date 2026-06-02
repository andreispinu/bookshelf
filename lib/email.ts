import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  await resend.emails.send({
    from: 'BookShelf <noreply@bookshelf.name>',
    to,
    subject,
    html,
  })
}
