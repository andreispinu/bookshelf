const BASE_URL = 'https://bookshelf.name'
const YEAR = new Date().getFullYear()

const footer = `
  <tr>
    <td style="padding:24px 0 0;border-top:1px solid #e7e5e4;text-align:center;font-family:Georgia,serif;font-size:12px;color:#a8a29e;">
      © ${YEAR} BookShelf &nbsp;·&nbsp;
      <a href="${BASE_URL}" style="color:#a8a29e;text-decoration:none;">bookshelf.name</a>
      &nbsp;·&nbsp; You're receiving this because you're a BookShelf member.
    </td>
  </tr>
`

function wrapper(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e7e5e4;padding:32px 32px 24px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #f5f5f4;">
              <span style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#292524;letter-spacing:-0.5px;">BookShelf</span>
            </td>
          </tr>
          <!-- Body -->
          ${body}
          <!-- Footer -->
          ${footer}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(label: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;padding:12px 24px;background:#292524;color:#ffffff;font-family:Georgia,serif;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;">${label}</a>`
}

export function friendRequestEmail(senderName: string): { subject: string; html: string } {
  const subject = `${senderName} wants to connect on BookShelf`
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">${senderName} wants to connect</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${senderName} sent you a friend request on BookShelf.
          Accept to see their bookshelf and share books.
        </p>
        ${ctaButton('View friend request', `${BASE_URL}/friends`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function newMessageEmail(senderName: string, preview: string): { subject: string; html: string } {
  const subject = `${senderName} sent you a message on BookShelf`
  const safePreview = preview.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">New message from ${senderName}</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          ${senderName} sent you a message:
        </p>
        <blockquote style="margin:0 0 24px;padding:12px 16px;background:#fafaf9;border-left:3px solid #d6d3d1;border-radius:0 6px 6px 0;font-size:14px;color:#78716c;line-height:1.6;">
          ${safePreview}
        </blockquote>
        ${ctaButton(`Reply to ${senderName}`, `${BASE_URL}/messages`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function invitationEmail(inviterName: string, token: string): { subject: string; html: string } {
  const subject = `${inviterName} invited you to join BookShelf`
  const safeInviter = inviterName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">${safeInviter} invited you to join BookShelf</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeInviter} invited you to join BookShelf — a personal library app where you can catalogue your books, connect with friends, and lend books to each other.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeInviter} wants to connect with you and share their bookshelf.
        </p>
        ${ctaButton('Accept invitation &amp; join BookShelf', `${BASE_URL}/signup?invite=${token}`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function borrowRequestEmail(
  requesterName: string,
  bookTitle: string,
  message?: string | null,
): { subject: string; html: string } {
  const subject = `${requesterName} wants to borrow '${bookTitle}'`
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeRequester = requesterName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const noteBlock = message
    ? `<p style="margin:0 0 24px;font-size:14px;color:#78716c;line-height:1.6;">
        They added a note: <em>"${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</em>
       </p>`
    : ''
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Borrow request for '${safeTitle}'</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeRequester} has requested to borrow your book <strong>'${safeTitle}'</strong>.
        </p>
        ${noteBlock}
        ${ctaButton('Review request', `${BASE_URL}/loans/requests`)}
      </td>
    </tr>
  `)
  return { subject, html }
}
