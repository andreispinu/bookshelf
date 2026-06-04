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

function formatTrialDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function trialReminder5DayEmail(
  firstName: string,
  trialEndsAt: Date,
): { subject: string; html: string } {
  const subject = '5 days left on your BookShelf trial'
  const dateStr = formatTrialDate(trialEndsAt)
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">5 days left on your trial</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          Your free trial ends in 5 days, on <strong>${dateStr}</strong>.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          You've been building your personal library — don't let it go. Keep access to all your books, friends,
          and lending history for just $1/month or $10/year.
        </p>
        ${ctaButton('Choose a plan →', `${BASE_URL}/profile#plans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function trialReminder1DayEmail(
  firstName: string,
  trialEndsAt: Date,
): { subject: string; html: string } {
  const subject = 'Your BookShelf trial ends tomorrow'
  const dateStr = formatTrialDate(trialEndsAt)
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Your trial ends tomorrow</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          Your free trial ends tomorrow, on <strong>${dateStr}</strong>. After that you'll lose access
          to your books, friends, and lending history.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          Keep your BookShelf for just $1/month or $10/year — that's less than a coffee.
        </p>
        ${ctaButton('Keep my BookShelf →', `${BASE_URL}/profile#plans`)}
        <p style="margin:24px 0 0;font-size:13px;color:#a8a29e;line-height:1.6;">
          P.S. Questions? Just reply to this email.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function trialExpiredEmail(firstName: string): { subject: string; html: string } {
  const subject = 'Your BookShelf trial has ended'
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Your trial has ended</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          Your free trial ended yesterday. Your books and data are safe — we keep everything for 30 days.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          Subscribe now to regain full access. It's just $1/month or $10/year.
        </p>
        ${ctaButton('Reactivate my BookShelf →', `${BASE_URL}/subscribe`)}
        <p style="margin:24px 0 0;font-size:13px;color:#a8a29e;line-height:1.6;">
          P.S. Your library will be waiting for you.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function borrowRequestApprovedEmail(
  firstName: string,
  ownerName: string,
  bookTitle: string,
): { subject: string; html: string } {
  const subject = `${ownerName} approved your borrow request for '${bookTitle}'`
  const safeOwner = ownerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Great news, ${firstName}!</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeOwner} has approved your request to borrow <strong>'${safeTitle}'</strong>.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          You can now arrange to pick up the book. Send them a message to coordinate.
        </p>
        ${ctaButton('View your loans →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function messageDigestEmail(
  firstName: string,
  conversations: { senderName: string; messageCount: number; lastMessagePreview: string }[],
): { subject: string; html: string } {
  const totalMessages = conversations.reduce((sum, c) => sum + c.messageCount, 0)
  const senderCount = conversations.length
  const subject = `You have ${totalMessages} unread message${totalMessages === 1 ? '' : 's'} on BookShelf`

  const conversationRows = conversations.map(c => {
    const safeName = c.senderName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const safePreview = c.lastMessagePreview.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const truncated = safePreview.length > 60 ? safePreview.slice(0, 60) + '…' : safePreview
    const countLabel = c.messageCount === 1 ? '1 message' : `${c.messageCount} messages`
    return `<p style="margin:0 0 10px;font-size:14px;color:#57534e;line-height:1.6;">
      <strong>${safeName}</strong> — ${countLabel}:<br>
      <span style="color:#78716c;font-style:italic;">"${truncated}"</span>
    </p>`
  }).join('')

  const fromLine = senderCount === 1
    ? `You received a message from <strong>${conversations[0].senderName.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong> today on BookShelf.`
    : `You received messages from <strong>${senderCount} friends</strong> today on BookShelf.`

  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Hi ${firstName},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">${fromLine}</p>
        <div style="background:#fafaf9;border:1px solid #e7e5e4;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
          ${conversationRows}
        </div>
        ${ctaButton('Read your messages →', `${BASE_URL}/messages`)}
        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.6;">
          You're receiving this daily digest because you have unread messages.
          <a href="${BASE_URL}/profile" style="color:#a8a29e;">Manage notification preferences</a>
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function dailyInsightEmail(
  firstName: string,
  bookTitle: string,
  bookAuthor: string,
  insightTitle: string,
  insightText: string,
  extract: string,
  position: number,
  total: number,
): { subject: string; html: string } {
  const subject = `Your daily insight from "${bookTitle}"`
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeAuthor = bookAuthor.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeInsightTitle = insightTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeInsightText = insightText.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeExtract = extract.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#a8a29e;text-transform:uppercase;letter-spacing:0.05em;">Insight ${position} of ${total}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#78716c;">${safeTitle} · ${safeAuthor}</p>
        <p style="margin:0 0 20px;font-size:18px;font-weight:bold;color:#292524;">${safeInsightTitle}</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.7;">${safeInsightText}</p>
        <blockquote style="margin:0 0 24px;padding:12px 16px;background:#fafaf9;border-left:3px solid #d6d3d1;border-radius:0 6px 6px 0;font-size:14px;color:#78716c;line-height:1.6;font-style:italic;">${safeExtract}</blockquote>
        ${ctaButton('View all my insights →', `${BASE_URL}/books/read-with-ai`)}
        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.6;">
          You're receiving this because you have daily insights enabled.
          <a href="${BASE_URL}/books/read-with-ai" style="color:#a8a29e;">Manage preferences</a>
        </p>
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
