const BASE_URL = 'https://bookshelf.name'
const BOOKS_URL = `${BASE_URL}/books`
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

function truncate(text: string, max: number): string {
  const t = text.trim()
  return t.length > max ? t.slice(0, max) + '…' : t
}

/**
 * Convert a raw message body into human-readable preview text for emails.
 * Messages may carry internal prefixes (see CLAUDE.md → Messaging):
 *   SALE_REQUEST:{json}  SALE_RESPONSE:{json}  SUPPORT:{json}  SUPPORT_REPLY:…  SYSTEM:…
 * Without this, the digest/notification emails leak raw JSON into the preview.
 * Never throws — malformed JSON falls back to a generic, friendly line.
 */
export function getMessagePreview(content: string): string {
  const raw = (content ?? '').trim()

  if (raw.startsWith('SALE_REQUEST:')) {
    try {
      const data = JSON.parse(raw.slice('SALE_REQUEST:'.length))
      const title = data?.bookTitle
      return title ? `Sent a request to buy "${title}"` : 'Sent you a purchase request'
    } catch {
      return 'Sent you a purchase request'
    }
  }

  if (raw.startsWith('SALE_RESPONSE:')) {
    try {
      const data = JSON.parse(raw.slice('SALE_RESPONSE:'.length))
      // action: 'accept' | 'complete' | 'decline'
      if (data?.action === 'decline') return 'Declined your sale request'
      return 'Accepted your sale request'
    } catch {
      return 'Responded to your sale request'
    }
  }

  if (raw.startsWith('SUPPORT_REPLY:')) {
    return 'New reply from BookShelf Support'
  }

  if (raw.startsWith('SUPPORT:')) {
    return 'Sent a support message'
  }

  if (raw.startsWith('SYSTEM:')) {
    const text = raw.slice('SYSTEM:'.length).trim()
    return text ? truncate(text, 100) : 'System notification'
  }

  // Plain text — show as-is, truncated.
  return raw ? truncate(raw, 100) : 'Sent you a message'
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
  const safePreview = getMessagePreview(preview).replace(/</g, '&lt;').replace(/>/g, '&gt;')
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
    const safePreview = getMessagePreview(c.lastMessagePreview).replace(/</g, '&lt;').replace(/>/g, '&gt;')
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

export function lenderHandoffReminderEmail(
  firstName: string,
  borrowerName: string,
  bookTitle: string,
  approvedDays: number | null,
): { subject: string; html: string } {
  const subject = `Time to hand off "${bookTitle}" to ${borrowerName}`
  const safeBorrower = borrowerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const daysNote = approvedDays ? `<p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
    The loan is approved for <strong>${approvedDays} days</strong>. Once ${safeBorrower} confirms receipt, the clock starts.
  </p>` : ''
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Hand off "${safeTitle}" to ${safeBorrower}</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          You approved ${safeBorrower}'s request to borrow <strong>"${safeTitle}"</strong>. Once you've handed it off, confirm the handoff in the app.
        </p>
        ${daysNote}
        ${ctaButton('Go to Loans →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function borrowerReceiptConfirmEmail(
  firstName: string,
  lenderName: string,
  bookTitle: string,
): { subject: string; html: string } {
  const subject = `${lenderName} says they've handed you "${bookTitle}"`
  const safeLender = lenderName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Did you receive "${safeTitle}"?</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeLender} has confirmed they handed off <strong>"${safeTitle}"</strong>. Once you have the book, confirm receipt in the app to start the loan.
        </p>
        ${ctaButton('Confirm receipt →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function loanStartedEmail(
  firstName: string,
  lenderName: string,
  bookTitle: string,
  dueDate: string | null,
): { subject: string; html: string } {
  const subject = `Your loan of "${bookTitle}" has started`
  const safeLender = lenderName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const dueLine = dueDate
    ? `<p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
        Please return it by <strong>${new Date(dueDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</strong>.
      </p>`
    : '<p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">No specific due date — please return it when you\'re done.</p>'
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Enjoy "${safeTitle}"!</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          Your loan of <strong>"${safeTitle}"</strong> from ${safeLender} has officially started.
        </p>
        ${dueLine}
        ${ctaButton('View my loans →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function loanOverdueEmail(
  firstName: string,
  bookTitle: string,
  lenderName: string,
  dueDateStr: string,
): { subject: string; html: string } {
  const subject = `"${bookTitle}" is overdue — please return it`
  const safeLender = lenderName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">"${safeTitle}" is overdue</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          Your loan of <strong>"${safeTitle}"</strong> from ${safeLender} was due on <strong>${dueDateStr}</strong>.
          Please return it as soon as possible.
        </p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          If you need more time, you can request an extension from your loans page.
        </p>
        ${ctaButton('Go to Loans →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function extensionRequestEmail(
  firstName: string,
  borrowerName: string,
  bookTitle: string,
  requestedDays: number,
  requesterNote?: string | null,
): { subject: string; html: string } {
  const subject = `${borrowerName} is requesting a ${requestedDays}-day extension for "${bookTitle}"`
  const safeBorrower = borrowerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const noteBlock = requesterNote
    ? `<p style="margin:0 0 24px;font-size:14px;color:#78716c;line-height:1.6;">
        Note: <em>"${requesterNote.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</em>
       </p>`
    : ''
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Extension request for "${safeTitle}"</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeBorrower} is requesting a <strong>${requestedDays}-day extension</strong> on their loan of <strong>"${safeTitle}"</strong>.
        </p>
        ${noteBlock}
        ${ctaButton('Review extension →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function extensionApprovedEmail(
  firstName: string,
  lenderName: string,
  bookTitle: string,
  newDueDateStr: string,
): { subject: string; html: string } {
  const subject = `Extension approved — "${bookTitle}" now due ${newDueDateStr}`
  const safeLender = lenderName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Extension approved!</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeLender} approved your extension request for <strong>"${safeTitle}"</strong>.
          Your new due date is <strong>${newDueDateStr}</strong>.
        </p>
        ${ctaButton('View my loans →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function extensionDeclinedEmail(
  firstName: string,
  lenderName: string,
  bookTitle: string,
): { subject: string; html: string } {
  const subject = `Extension declined for "${bookTitle}"`
  const safeLender = lenderName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Extension request declined</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeLender} was unable to approve the extension for <strong>"${safeTitle}"</strong>.
          Please return the book by the original due date.
        </p>
        ${ctaButton('View my loans →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function recallRequestEmail(
  firstName: string,
  lenderName: string,
  bookTitle: string,
  reason?: string | null,
): { subject: string; html: string } {
  const subject = `${lenderName} needs "${bookTitle}" back`
  const safeLender = lenderName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const reasonBlock = reason
    ? `<p style="margin:0 0 24px;font-size:14px;color:#78716c;line-height:1.6;">
        Reason: <em>"${reason.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</em>
       </p>`
    : '<p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">Please return it as soon as you can.</p>'
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">${safeLender} wants "${safeTitle}" back</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeLender} has requested the return of <strong>"${safeTitle}"</strong>.
        </p>
        ${reasonBlock}
        ${ctaButton('Go to Loans →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function returnInitiatedEmail(
  firstName: string,
  borrowerName: string,
  bookTitle: string,
): { subject: string; html: string } {
  const subject = `${borrowerName} says they've returned "${bookTitle}"`
  const safeBorrower = borrowerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Book return initiated</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeBorrower} says they've returned <strong>"${safeTitle}"</strong>.
          Once you have the book back, confirm the return in the app.
        </p>
        ${ctaButton('Confirm return →', `${BASE_URL}/loans`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function returnConfirmedEmail(
  firstName: string,
  lenderName: string,
  bookTitle: string,
): { subject: string; html: string } {
  const subject = `Return confirmed — "${bookTitle}" is back home`
  const safeLender = lenderName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Loan completed!</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${firstName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeLender} confirmed receipt of <strong>"${safeTitle}"</strong>. The loan is now complete. Thanks for returning it!
        </p>
        ${ctaButton('See all loans →', `${BASE_URL}/loans`)}
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

export function newTicketAdminEmail(
  userName: string,
  userEmail: string,
  type: string,
  subject: string,
  message: string,
  ticketId: string,
): { subject: string; html: string } {
  const emailSubject = `[Support] ${subject}`
  const safeUser = userName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeSubject = subject.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeMessage = message.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">New support ticket</p>
        <p style="margin:0 0 8px;font-size:14px;color:#57534e;"><strong>From:</strong> ${safeUser} (${userEmail})</p>
        <p style="margin:0 0 8px;font-size:14px;color:#57534e;"><strong>Type:</strong> ${type}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#57534e;"><strong>Subject:</strong> ${safeSubject}</p>
        <blockquote style="margin:0 0 24px;padding:12px 16px;background:#fafaf9;border-left:3px solid #d6d3d1;border-radius:0 6px 6px 0;font-size:14px;color:#78716c;line-height:1.6;">
          ${safeMessage}
        </blockquote>
        ${ctaButton('Reply to ticket →', `${BASE_URL}/admin/support/${ticketId}`)}
      </td>
    </tr>
  `)
  return { subject: emailSubject, html }
}

export function adminReplyEmail(
  firstName: string,
  replyText: string,
  ticketSubject: string,
): { subject: string; html: string } {
  const subject = `Re: ${ticketSubject} — BookShelf Support`
  const safeName = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeReply = replyText.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">BookShelf Support replied</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${safeName},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          Our support team has replied to your message:
        </p>
        <blockquote style="margin:0 0 24px;padding:12px 16px;background:#fafaf9;border-left:3px solid #d6d3d1;border-radius:0 6px 6px 0;font-size:14px;color:#78716c;line-height:1.6;">
          ${safeReply}
        </blockquote>
        ${ctaButton('View conversation →', `${BASE_URL}/support`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function ticketSolvedEmail(
  firstName: string,
  ticketSubject: string,
): { subject: string; html: string } {
  const subject = `Your support request has been resolved — BookShelf`
  const safeName = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeSubject = ticketSubject.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Your ticket has been resolved</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${safeName},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          Your support ticket "<strong>${safeSubject}</strong>" has been marked as resolved.
          If you need further help, you can always open a new ticket.
        </p>
        ${ctaButton('Open support →', `${BASE_URL}/support`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function buyRequestEmail(
  sellerFirstName: string,
  buyerName: string,
  bookTitle: string,
  message?: string | null,
): { subject: string; html: string } {
  const subject = `${buyerName} wants to buy "${bookTitle}"`
  const safeSeller = sellerFirstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeBuyer = buyerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const noteBlock = message
    ? `<p style="margin:0 0 24px;font-size:14px;color:#78716c;line-height:1.6;">
        They added a note: <em>"${message.replace(/</g, '&lt;').replace(/>/g, '&gt;')}"</em>
       </p>`
    : ''
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Buy request for "${safeTitle}"</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${safeSeller},</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeBuyer} wants to buy your book <strong>"${safeTitle}"</strong>. Accept or decline in the app.
        </p>
        ${noteBlock}
        ${ctaButton('View sale request →', `${BASE_URL}/messages`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function buyAcceptedEmail(
  buyerFirstName: string,
  sellerName: string,
  bookTitle: string,
): { subject: string; html: string } {
  const subject = `${sellerName} accepted your offer to buy "${bookTitle}"`
  const safeBuyer = buyerFirstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeSeller = sellerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Your purchase is accepted!</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${safeBuyer},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeSeller} accepted your request to buy <strong>"${safeTitle}"</strong>.
          Coordinate the handoff directly in your messages.
        </p>
        ${ctaButton('Go to messages →', `${BASE_URL}/messages`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function buyDeclinedEmail(
  buyerFirstName: string,
  sellerName: string,
  bookTitle: string,
): { subject: string; html: string } {
  const subject = `${sellerName} declined your offer to buy "${bookTitle}"`
  const safeBuyer = buyerFirstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeSeller = sellerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Purchase request declined</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${safeBuyer},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeSeller} has declined your request to buy <strong>"${safeTitle}"</strong>.
        </p>
        ${ctaButton('Browse friends\' shelves →', `${BASE_URL}/friends/shelf`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function bookTransferredEmail(
  buyerFirstName: string,
  sellerName: string,
  bookTitle: string,
): { subject: string; html: string } {
  const subject = `"${bookTitle}" is now on your shelf!`
  const safeBuyer = buyerFirstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeSeller = sellerName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const safeTitle = bookTitle.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">Sale complete — book on your shelf!</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">Hi ${safeBuyer},</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          ${safeSeller} confirmed the sale of <strong>"${safeTitle}"</strong>.
          The book has been added to your shelf automatically.
        </p>
        ${ctaButton('View my books →', `${BASE_URL}/books`)}
      </td>
    </tr>
  `)
  return { subject, html }
}

export function firstBookReminderEmail(firstName: string): { subject: string; html: string } {
  const subject = `Your BookShelf is empty — let's add your first book 📚`
  const safe = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">Hi ${safe},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
          Welcome to BookShelf! Your account is ready — now it's time to build your library.
        </p>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Option 1 — Scan the cover with AI (fastest):</p>
        <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Open BookShelf on your phone</li>
          <li>Tap "Add a book" → "Add with AI"</li>
          <li>Take a photo of any book cover</li>
          <li>AI fills in the title, author, category and description automatically</li>
          <li>Tap "Add book" — done!</li>
        </ol>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Option 2 — Add manually:</p>
        <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Tap "Add a book" → "Add manually"</li>
          <li>Type the title — tap "Fill with AI" to let AI complete the rest</li>
          <li>Review the details and tap "Add book"</li>
        </ol>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Once your books are in, you can:</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Share your shelf with friends at bookshelf.name/[username]</li>
          <li>Lend or sell books to friends</li>
          <li>Get daily AI reading insights with Read with AI</li>
        </ul>

        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Your free BookShelf holds up to 10 books — start filling it!
        </p>

        ${ctaButton('Add my first book →', BOOKS_URL)}

        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          You're receiving this because you recently joined BookShelf.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function firstBookReminderEmailRo(firstName: string): { subject: string; html: string } {
  const subject = `Raftul tău BookShelf este gol — hai să adăugi prima carte 📚`
  const safe = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">Salut, ${safe}!</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
          Bun venit pe BookShelf! Contul tău este gata — acum e timpul să îți construiești biblioteca.
        </p>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Opțiunea 1 — Scanează coperta cu AI (cel mai rapid):</p>
        <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Deschide BookShelf pe telefon</li>
          <li>Apasă "Adaugă o carte" → "Adaugă cu AI"</li>
          <li>Fotografiază coperta oricărei cărți</li>
          <li>AI completează automat titlul, autorul, categoria și descrierea</li>
          <li>Apasă "Adaugă carte" — gata!</li>
        </ol>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Opțiunea 2 — Adaugă manual:</p>
        <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Apasă "Adaugă o carte" → "Adaugă manual"</li>
          <li>Scrie titlul — apasă "Completează cu AI" și lasă AI-ul să facă restul</li>
          <li>Verifică detaliile și apasă "Adaugă carte"</li>
        </ol>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Odată ce ai cărțile adăugate, poți:</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Împărtăși raftul cu prietenii la bookshelf.name/[username]</li>
          <li>Împrumuta sau vinde cărți prietenilor</li>
          <li>Primi zilnic insight-uri AI cu Read with AI</li>
        </ul>

        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          BookShelf-ul tău gratuit poate stoca până la 10 cărți — începe să-l umpli!
        </p>

        ${ctaButton('Adaugă prima mea carte →', BOOKS_URL)}

        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          Primești acest email deoarece te-ai înscris recent pe BookShelf.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function firstBookReminderEmailRu(firstName: string): { subject: string; html: string } {
  const subject = `Ваша полка BookShelf пуста — добавьте первую книгу 📚`
  const safe = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">Привет, ${safe}!</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
          Добро пожаловать в BookShelf! Ваш аккаунт готов — пора начать строить свою библиотеку.
        </p>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Вариант 1 — Сканирование обложки с AI (самый быстрый):</p>
        <ol style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Откройте BookShelf на телефоне</li>
          <li>Нажмите «Добавить книгу» → «Добавить с AI»</li>
          <li>Сфотографируйте обложку любой книги</li>
          <li>AI автоматически заполнит название, автора, категорию и описание</li>
          <li>Нажмите «Добавить книгу» — готово!</li>
        </ol>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Вариант 2 — Добавить вручную:</p>
        <ol style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Нажмите «Добавить книгу» → «Добавить вручную»</li>
          <li>Введите название — нажмите «Заполнить с AI», чтобы AI завершил остальное</li>
          <li>Проверьте данные и нажмите «Добавить книгу»</li>
        </ol>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">После добавления книг вы сможете:</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Поделиться полкой с друзьями на bookshelf.name/[username]</li>
          <li>Одалживать или продавать книги друзьям</li>
          <li>Получать ежедневные AI-инсайты с Read with AI</li>
        </ul>

        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Ваша бесплатная полка BookShelf вмещает до 10 книг — начните заполнять её!
        </p>

        ${ctaButton('Добавить первую книгу →', BOOKS_URL)}

        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          Вы получили это письмо, потому что недавно зарегистрировались в BookShelf.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function inviteFriendsReminderEmail(firstName: string, bookCount: number): { subject: string; html: string } {
  const subject = `BookShelf is better with friends — invite yours`
  const safe = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const bookLine = bookCount > 0
    ? `and you've already added <strong>${bookCount} ${bookCount === 1 ? 'book' : 'books'}</strong> to your library — great start!`
    : ''
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">Hi ${safe},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
          You've been on BookShelf for 5 days${bookLine ? ` ${bookLine}` : '.'}
        </p>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Here's what happens when you connect with friends:</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>See every book on their shelf</li>
          <li>Request to borrow books from each other</li>
          <li>Buy and sell books directly</li>
          <li>Get notified when they add something new</li>
        </ul>

        <p style="margin:0 0 12px;font-size:14px;font-weight:bold;color:#292524;">How to invite friends:</p>

        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#292524;">Option 1 — Invite by email:</p>
        <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
          Go to Friends → scroll to "Invite a friend" → type their email and send. They'll get a personal invite from you.
        </p>

        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#292524;">Option 2 — Search by name:</p>
        <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
          Go to Friends → search for someone already on BookShelf → send a friend request.
        </p>

        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#292524;">Option 3 — Share your shelf:</p>
        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Set up your username in Profile → share your bookshelf.name/[username] link anywhere — WhatsApp, Instagram, wherever your friends are.
        </p>

        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          The more friends you connect with, the more useful BookShelf becomes.
        </p>

        ${ctaButton('Invite my friends →', `${BASE_URL}/friends`)}

        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          You're receiving this because you recently joined BookShelf.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function inviteFriendsReminderEmailRo(firstName: string, bookCount: number): { subject: string; html: string } {
  const subject = `BookShelf e mai bun cu prietenii — invită-i pe ai tăi`
  const safe = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const bookLine = bookCount > 0
    ? `și ai adăugat deja <strong>${bookCount} ${bookCount === 1 ? 'carte' : 'cărți'}</strong> în biblioteca ta — start excelent!`
    : ''
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">Salut, ${safe}!</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
          Ești pe BookShelf de 5 zile${bookLine ? ` ${bookLine}` : '.'}
        </p>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Iată ce se întâmplă când te conectezi cu prietenii:</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Vezi toate cărțile de pe raftul lor</li>
          <li>Cereți să împrumutați cărți reciproc</li>
          <li>Cumpărați și vindeți cărți direct</li>
          <li>Primești notificări când adaugă ceva nou</li>
        </ul>

        <p style="margin:0 0 12px;font-size:14px;font-weight:bold;color:#292524;">Cum să îți inviți prietenii:</p>

        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#292524;">Opțiunea 1 — Invită prin email:</p>
        <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
          Mergi la Prieteni → derulează la „Invită un prieten" → scrie emailul lor și trimite. Vor primi o invitație personală din partea ta.
        </p>

        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#292524;">Opțiunea 2 — Caută după nume:</p>
        <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
          Mergi la Prieteni → caută pe cineva deja pe BookShelf → trimite o cerere de prietenie.
        </p>

        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#292524;">Opțiunea 3 — Împărtășește-ți raftul:</p>
        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Setează-ți numele de utilizator în Profil → distribuie link-ul bookshelf.name/[username] oriunde — WhatsApp, Instagram, oriunde sunt prietenii tăi.
        </p>

        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Cu cât te conectezi cu mai mulți prieteni, cu atât BookShelf devine mai util.
        </p>

        ${ctaButton('Invită-mi prietenii →', `${BASE_URL}/friends`)}

        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          Primești acest email deoarece te-ai înscris recent pe BookShelf.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function inviteFriendsReminderEmailRu(firstName: string, bookCount: number): { subject: string; html: string } {
  const subject = `BookShelf лучше с друзьями — пригласите своих`
  const safe = firstName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const bookLine = bookCount > 0
    ? `и вы уже добавили <strong>${bookCount} ${bookCount === 1 ? 'книгу' : bookCount < 5 ? 'книги' : 'книг'}</strong> в свою библиотеку — отличное начало!`
    : ''
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">Привет, ${safe}!</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">
          Вы пользуетесь BookShelf уже 5 дней${bookLine ? ` ${bookLine}` : '.'}
        </p>

        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">Вот что происходит, когда вы подключаетесь с друзьями:</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>Видите все книги на их полке</li>
          <li>Можете брать книги друг у друга</li>
          <li>Покупаете и продаёте книги напрямую</li>
          <li>Получаете уведомления, когда они добавляют что-то новое</li>
        </ul>

        <p style="margin:0 0 12px;font-size:14px;font-weight:bold;color:#292524;">Как пригласить друзей:</p>

        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#292524;">Вариант 1 — Пригласить по email:</p>
        <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
          Перейдите в Друзья → прокрутите до «Пригласить друга» → введите их email и отправьте. Они получат личное приглашение от вас.
        </p>

        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#292524;">Вариант 2 — Поиск по имени:</p>
        <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
          Перейдите в Друзья → найдите кого-то, кто уже на BookShelf → отправьте запрос в друзья.
        </p>

        <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#292524;">Вариант 3 — Поделитесь полкой:</p>
        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Задайте имя пользователя в Профиле → поделитесь ссылкой bookshelf.name/[username] где угодно — в WhatsApp, Instagram, везде, где есть ваши друзья.
        </p>

        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Чем больше друзей вы подключите, тем полезнее становится BookShelf.
        </p>

        ${ctaButton('Пригласить друзей →', `${BASE_URL}/friends`)}

        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          Вы получили это письмо, потому что недавно зарегистрировались в BookShelf.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function welcomeEmail(firstName: string, confirmationUrl: string): { subject: string; html: string } {
  const subject = `Welcome to BookShelf, ${firstName}! Confirm your email to get started`
  const html = wrapper(`
    <tr>
      <td style="padding:32px 40px;">
        <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#292524;">Hi ${firstName},</p>
        <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.6;">
          Welcome to BookShelf — your personal library, shared with friends.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          You're all set and can start using the app right away. To secure your account, please confirm your email address:
        </p>
        ${ctaButton('Confirm my email address →', confirmationUrl)}
        <p style="margin:32px 0 12px;font-size:14px;font-weight:bold;color:#292524;">Once you're in, here's what to do first:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:14px;color:#57534e;line-height:1.5;"><strong>1.</strong> <strong>Add your first book</strong> — scan the cover with AI or type the title</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#57534e;line-height:1.5;"><strong>2.</strong> <strong>Set up your public profile</strong> — share your shelf at bookshelf.name/[username]</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#57534e;line-height:1.5;"><strong>3.</strong> <strong>Invite friends</strong> — connect and start lending books to each other</td></tr>
        </table>
        <p style="margin:24px 0 20px;font-size:14px;color:#57534e;line-height:1.6;">Your BookShelf is waiting for you.</p>
        <a href="${BOOKS_URL}" style="font-size:13px;color:#78716c;text-decoration:underline;">Go to my shelf →</a>
        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          You're receiving this because you just created a BookShelf account. If this wasn't you, you can safely ignore this email.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function welcomeEmailRo(firstName: string, confirmationUrl: string): { subject: string; html: string } {
  const subject = `Bun venit pe BookShelf, ${firstName}! Confirmă-ți adresa de e-mail`
  const html = wrapper(`
    <tr>
      <td style="padding:32px 40px;">
        <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#292524;">Salut, ${firstName},</p>
        <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.6;">
          Bun venit pe BookShelf — biblioteca ta personală, împărțită cu prietenii.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Poți folosi aplicația chiar acum. Pentru a-ți securiza contul, confirmă-ți adresa de e-mail:
        </p>
        ${ctaButton('Confirmă adresa de e-mail →', confirmationUrl)}
        <p style="margin:32px 0 12px;font-size:14px;font-weight:bold;color:#292524;">Ce poți face pentru început:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:14px;color:#57534e;line-height:1.5;"><strong>1.</strong> <strong>Adaugă prima carte</strong> — scanează coperta cu AI sau scrie titlul</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#57534e;line-height:1.5;"><strong>2.</strong> <strong>Configurează-ți profilul public</strong> — partajează-ți raftul la bookshelf.name/[username]</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#57534e;line-height:1.5;"><strong>3.</strong> <strong>Invită prieteni</strong> — conectează-te și împrumutați cărți între voi</td></tr>
        </table>
        <p style="margin:24px 0 20px;font-size:14px;color:#57534e;line-height:1.6;">Raftul tău te așteaptă.</p>
        <a href="${BOOKS_URL}" style="font-size:13px;color:#78716c;text-decoration:underline;">Mergi la raftul meu →</a>
        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          Primești acest e-mail deoarece tocmai ai creat un cont BookShelf. Dacă nu tu ai făcut asta, poți ignora acest mesaj.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function welcomeEmailRu(firstName: string, confirmationUrl: string): { subject: string; html: string } {
  const subject = `Добро пожаловать на BookShelf, ${firstName}! Подтвердите email`
  const html = wrapper(`
    <tr>
      <td style="padding:32px 40px;">
        <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#292524;">Привет, ${firstName},</p>
        <p style="margin:0 0 20px;font-size:14px;color:#57534e;line-height:1.6;">
          Добро пожаловать на BookShelf — ваша личная библиотека, которой можно делиться с друзьями.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          Вы можете начать пользоваться приложением прямо сейчас. Чтобы защитить аккаунт, подтвердите адрес электронной почты:
        </p>
        ${ctaButton('Подтвердить email →', confirmationUrl)}
        <p style="margin:32px 0 12px;font-size:14px;font-weight:bold;color:#292524;">С чего начать:</p>
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td style="padding:6px 0;font-size:14px;color:#57534e;line-height:1.5;"><strong>1.</strong> <strong>Добавьте первую книгу</strong> — отсканируйте обложку с помощью ИИ или введите название</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#57534e;line-height:1.5;"><strong>2.</strong> <strong>Настройте публичный профиль</strong> — поделитесь полкой по адресу bookshelf.name/[username]</td></tr>
          <tr><td style="padding:6px 0;font-size:14px;color:#57534e;line-height:1.5;"><strong>3.</strong> <strong>Пригласите друзей</strong> — общайтесь и давайте книги друг другу</td></tr>
        </table>
        <p style="margin:24px 0 20px;font-size:14px;color:#57534e;line-height:1.6;">Ваша полка ждёт вас.</p>
        <a href="${BOOKS_URL}" style="font-size:13px;color:#78716c;text-decoration:underline;">Перейти к моей полке →</a>
        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          Вы получили это письмо, потому что только что создали аккаунт BookShelf. Если это были не вы, просто проигнорируйте это сообщение.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function bookLimitNudgeEmail(firstName: string, bookCount: number): { subject: string; html: string } {
  const subject = 'Your free BookShelf is almost full'
  const html = wrapper(
    `<tr>
      <td style="padding:32px 40px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">Your shelf is filling up, ${firstName}!</p>
        <p style="margin:0 0 16px;font-size:14px;color:#57534e;line-height:1.6;">
          You've added <strong>${bookCount} book${bookCount === 1 ? '' : 's'}</strong> to your BookShelf — great progress!
          Free accounts hold up to 10 books. When you're ready for more, upgrading is just <strong>$1/month</strong> or
          <strong>$10/year</strong> — unlimited books forever.
        </p>
        <p style="margin:0 0 24px;font-size:14px;color:#57534e;line-height:1.6;">
          No rush — your existing books and all your data are safe. Upgrade whenever you're ready.
        </p>
        ${ctaButton('Upgrade to unlimited →', `${BASE_URL}/profile#plans`)}
        <p style="margin:24px 0 0;font-size:12px;color:#a8a29e;line-height:1.5;">
          You're receiving this because you have a free BookShelf account.
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function friendRequestAcceptedEmail(acceptorName: string, acceptorUsername: string): { subject: string; html: string } {
  const safeName = acceptorName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const shelfUrl = acceptorUsername ? `${BASE_URL}/${acceptorUsername}` : `${BASE_URL}/friends`
  const subject = `${acceptorName} accepted your friend request on BookShelf`
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">${safeName} is now your friend on BookShelf!</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          You can now see each other's bookshelves, lend books, and send messages.
        </p>
        ${ctaButton('View their shelf →', shelfUrl)}
        <p style="margin:24px 0 0;">
          <a href="${BASE_URL}/friends" style="font-size:13px;color:#78716c;text-decoration:underline;">Go to my friends →</a>
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function friendRequestAcceptedEmailRo(acceptorName: string, acceptorUsername: string): { subject: string; html: string } {
  const safeName = acceptorName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const shelfUrl = acceptorUsername ? `${BASE_URL}/${acceptorUsername}` : `${BASE_URL}/friends`
  const subject = `${acceptorName} ți-a acceptat cererea de prietenie pe BookShelf`
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">${safeName} este acum prietenul tău pe BookShelf!</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          Acum puteți vedea rafturile celuilalt, vă puteți împrumuta cărți și trimite mesaje.
        </p>
        ${ctaButton('Vezi raftul lor →', shelfUrl)}
        <p style="margin:24px 0 0;">
          <a href="${BASE_URL}/friends" style="font-size:13px;color:#78716c;text-decoration:underline;">Mergi la prietenii mei →</a>
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

export function friendRequestAcceptedEmailRu(acceptorName: string, acceptorUsername: string): { subject: string; html: string } {
  const safeName = acceptorName.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const shelfUrl = acceptorUsername ? `${BASE_URL}/${acceptorUsername}` : `${BASE_URL}/friends`
  const subject = `${acceptorName} принял(а) ваш запрос в друзья на BookShelf`
  const html = wrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 12px;font-size:18px;font-weight:bold;color:#292524;">${safeName} теперь ваш друг на BookShelf!</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">
          Теперь вы можете видеть книжные полки друг друга, давать книги взаймы и обмениваться сообщениями.
        </p>
        ${ctaButton('Посмотреть их полку →', shelfUrl)}
        <p style="margin:24px 0 0;">
          <a href="${BASE_URL}/friends" style="font-size:13px;color:#78716c;text-decoration:underline;">Перейти к моим друзьям →</a>
        </p>
      </td>
    </tr>
  `)
  return { subject, html }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lifecycle & marketing emails (weekly friend digest, add-books reminders,
// invite follow-ups, monthly tips). All localized EN/RO/RU via a `lang` param
// and wrapped with marketingWrapper(), which adds a "manage preferences" footer.
// Respect profiles.marketing_emails_enabled — the crons filter on it before sending.
// ─────────────────────────────────────────────────────────────────────────────

export type EmailLang = 'en' | 'ro' | 'ru'

function esc(text: string): string {
  return (text ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function pick<T>(lang: EmailLang, table: Record<EmailLang, T>): T {
  return table[lang] ?? table.en
}

// Footer link back to the notification preferences on the profile page.
function marketingFooter(lang: EmailLang): string {
  const label = pick(lang, {
    en: 'Manage email preferences',
    ro: 'Gestionează preferințele de e-mail',
    ru: 'Настроить уведомления по эл. почте',
  })
  const memberLine = pick(lang, {
    en: "You're receiving this because you're a BookShelf member.",
    ro: 'Primești acest mesaj pentru că ești membru BookShelf.',
    ru: 'Вы получили это письмо, потому что являетесь участником BookShelf.',
  })
  return `
  <tr>
    <td style="padding:24px 0 0;border-top:1px solid #e7e5e4;text-align:center;font-family:Georgia,serif;font-size:12px;color:#a8a29e;">
      © ${YEAR} BookShelf &nbsp;·&nbsp;
      <a href="${BASE_URL}" style="color:#a8a29e;text-decoration:none;">bookshelf.name</a><br>
      <span style="display:inline-block;margin-top:6px;">${memberLine}</span><br>
      <a href="${BASE_URL}/profile" style="display:inline-block;margin-top:6px;color:#78716c;text-decoration:underline;">${label}</a>
    </td>
  </tr>`
}

function marketingWrapper(body: string, lang: EmailLang): string {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fafaf9;font-family:Georgia,serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#fafaf9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e7e5e4;padding:32px 32px 24px;">
          <tr>
            <td style="padding-bottom:24px;border-bottom:1px solid #f5f5f4;">
              <span style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#292524;letter-spacing:-0.5px;">BookShelf</span>
            </td>
          </tr>
          ${body}
          ${marketingFooter(lang)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

export interface DigestBook {
  title: string
  author: string
  coverUrl: string | null
  friendName: string
}

// A single book row inside the weekly digest.
function digestBookRow(b: DigestBook, addedByLabel: (name: string) => string): string {
  const title = esc(b.title)
  const author = esc(b.author)
  const friend = esc(b.friendName)
  const cover = b.coverUrl
    ? `<img src="${b.coverUrl}" width="44" height="66" alt="" style="display:block;width:44px;height:66px;object-fit:cover;border-radius:4px;border:1px solid #e7e5e4;">`
    : `<div style="width:44px;height:66px;border-radius:4px;background:#292524;"></div>`
  return `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f5f5f4;" valign="top">
        <table cellpadding="0" cellspacing="0"><tr>
          <td width="44" valign="top">${cover}</td>
          <td valign="top" style="padding-left:12px;">
            <p style="margin:0;font-size:15px;font-weight:bold;color:#292524;line-height:1.3;">${title}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#57534e;">${author}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#a8a29e;">${addedByLabel(friend)}</p>
          </td>
        </tr></table>
      </td>
    </tr>`
}

export function weeklyFriendDigestEmail(
  firstName: string,
  books: DigestBook[],
  lang: EmailLang,
): { subject: string; html: string } {
  const safe = esc(firstName)
  const t = pick(lang, {
    en: {
      subject: `Your friends added books this week, ${firstName}`,
      greeting: `Hi ${safe},`,
      intro: 'Here’s what your friends have been adding to their shelves this week:',
      addedBy: (n: string) => `Added by ${n}`,
      cta: 'See your friends’ shelves →',
    },
    ro: {
      subject: `${firstName}, prietenii tăi au adăugat cărți săptămâna aceasta`,
      greeting: `Salut, ${safe}!`,
      intro: 'Iată ce au adăugat prietenii tăi pe rafturi săptămâna aceasta:',
      addedBy: (n: string) => `Adăugată de ${n}`,
      cta: 'Vezi rafturile prietenilor →',
    },
    ru: {
      subject: `${firstName}, ваши друзья добавили книги на этой неделе`,
      greeting: `Привет, ${safe}!`,
      intro: 'Вот что ваши друзья добавили на свои полки на этой неделе:',
      addedBy: (n: string) => `Добавил(а) ${n}`,
      cta: 'Посмотреть полки друзей →',
    },
  })
  const rows = books.map(b => digestBookRow(b, t.addedBy)).join('')
  const html = marketingWrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">${t.greeting}</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">${t.intro}</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">${rows}</table>
        ${ctaButton(t.cta, `${BASE_URL}/friends`)}
      </td>
    </tr>
  `, lang)
  return { subject: t.subject, html }
}

export function addBooksReminderAEmail(
  firstName: string,
  categories: string[],
  lang: EmailLang,
): { subject: string; html: string } {
  const safe = esc(firstName)
  const cats = categories.slice(0, 3).map(esc)
  const t = pick(lang, {
    en: {
      subject: `Your BookShelf is waiting for its first books, ${firstName}`,
      greeting: `Hi ${safe},`,
      intro: 'Most readers start by adding 5–10 books they already own at home.',
      tipsHead: 'Two easy ways to add a book:',
      tip1: '<strong>Take a photo</strong> of the cover — our AI reads the title, author and details for you.',
      tip2: '<strong>Or just type the title</strong> and let AI fill in the rest.',
      catsHead: 'Popular categories to get you started:',
      cta: 'Add your first books →',
    },
    ro: {
      subject: `Raftul tău BookShelf își așteaptă primele cărți, ${firstName}`,
      greeting: `Salut, ${safe}!`,
      intro: 'Majoritatea cititorilor încep prin a adăuga 5–10 cărți pe care le au deja acasă.',
      tipsHead: 'Două moduri simple de a adăuga o carte:',
      tip1: '<strong>Fă o poză</strong> copertei — AI-ul nostru citește titlul, autorul și detaliile pentru tine.',
      tip2: '<strong>Sau scrie doar titlul</strong> și lasă AI-ul să completeze restul.',
      catsHead: 'Categorii populare ca să începi:',
      cta: 'Adaugă primele tale cărți →',
    },
    ru: {
      subject: `Ваша полка BookShelf ждёт свои первые книги, ${firstName}`,
      greeting: `Привет, ${safe}!`,
      intro: 'Большинство читателей начинают с 5–10 книг, которые уже есть у них дома.',
      tipsHead: 'Два простых способа добавить книгу:',
      tip1: '<strong>Сфотографируйте</strong> обложку — наш ИИ распознает название, автора и детали.',
      tip2: '<strong>Или просто введите название</strong>, а ИИ заполнит остальное.',
      catsHead: 'Популярные категории для начала:',
      cta: 'Добавить первые книги →',
    },
  })
  const catPills = cats.length
    ? `<p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">${t.catsHead}</p>
       <p style="margin:0 0 24px;">${cats.map(c => `<span style="display:inline-block;margin:0 6px 6px 0;padding:5px 12px;background:#f5f5f4;border-radius:14px;font-size:13px;color:#57534e;">${c}</span>`).join('')}</p>`
    : ''
  const html = marketingWrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">${t.greeting}</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">${t.intro}</p>
        <p style="margin:0 0 8px;font-size:14px;font-weight:bold;color:#292524;">${t.tipsHead}</p>
        <ul style="margin:0 0 24px;padding-left:20px;font-size:14px;color:#57534e;line-height:1.8;">
          <li>${t.tip1}</li>
          <li>${t.tip2}</li>
        </ul>
        ${catPills}
        ${ctaButton(t.cta, `${BASE_URL}/books/add`)}
      </td>
    </tr>
  `, lang)
  return { subject: t.subject, html }
}

export function addBooksReminderBEmail(
  firstName: string,
  bookCount: number,
  lang: EmailLang,
): { subject: string; html: string } {
  const safe = esc(firstName)
  const t = pick(lang, {
    en: {
      subject: `You have ${bookCount} ${bookCount === 1 ? 'book' : 'books'} on your shelf — add a few more`,
      greeting: `Hi ${safe},`,
      ack: bookCount > 0
        ? `You’ve added <strong>${bookCount} ${bookCount === 1 ? 'book' : 'books'}</strong> — great start.`
        : 'Your shelf is still empty — let’s change that.',
      pitch: 'Readers with 10+ books get <strong>3× more borrow requests</strong> from friends.',
      cta: 'Add more books →',
    },
    ro: {
      subject: `Ai ${bookCount} ${bookCount === 1 ? 'carte' : 'cărți'} pe raft — mai adaugă câteva`,
      greeting: `Salut, ${safe}!`,
      ack: bookCount > 0
        ? `Ai adăugat <strong>${bookCount} ${bookCount === 1 ? 'carte' : 'cărți'}</strong> — un start excelent.`
        : 'Raftul tău este încă gol — hai să schimbăm asta.',
      pitch: 'Cititorii cu peste 10 cărți primesc de <strong>3× mai multe cereri de împrumut</strong> de la prieteni.',
      cta: 'Adaugă mai multe cărți →',
    },
    ru: {
      subject: `У вас ${bookCount} ${bookCount === 1 ? 'книга' : 'книг'} на полке — добавьте ещё`,
      greeting: `Привет, ${safe}!`,
      ack: bookCount > 0
        ? `Вы добавили <strong>${bookCount} ${bookCount === 1 ? 'книгу' : 'книг'}</strong> — отличное начало.`
        : 'Ваша полка всё ещё пуста — давайте это исправим.',
      pitch: 'Читатели с 10+ книгами получают <strong>в 3 раза больше запросов</strong> на книги от друзей.',
      cta: 'Добавить ещё книги →',
    },
  })
  const html = marketingWrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">${t.greeting}</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">${t.ack}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">${t.pitch}</p>
        ${ctaButton(t.cta, `${BASE_URL}/books/add`)}
      </td>
    </tr>
  `, lang)
  return { subject: t.subject, html }
}

export function inviteReminderAEmail(
  firstName: string,
  lang: EmailLang,
): { subject: string; html: string } {
  const safe = esc(firstName)
  const t = pick(lang, {
    en: {
      subject: `Invite a friend to BookShelf, ${firstName}`,
      greeting: `Hi ${safe},`,
      intro: 'BookShelf works best when your friends are on it too.',
      body: 'You can lend books, see what they’re reading, and message each other — all in one place.',
      cta: 'Invite a friend →',
      secondary: 'Or search to see if they’re already on BookShelf.',
    },
    ro: {
      subject: `Invită un prieten pe BookShelf, ${firstName}`,
      greeting: `Salut, ${safe}!`,
      intro: 'BookShelf funcționează cel mai bine când și prietenii tăi sunt aici.',
      body: 'Puteți împrumuta cărți, vedea ce citește fiecare și trimite mesaje — totul într-un singur loc.',
      cta: 'Invită un prieten →',
      secondary: 'Sau caută să vezi dacă sunt deja pe BookShelf.',
    },
    ru: {
      subject: `Пригласите друга в BookShelf, ${firstName}`,
      greeting: `Привет, ${safe}!`,
      intro: 'BookShelf работает лучше всего, когда ваши друзья тоже здесь.',
      body: 'Вы можете давать книги, видеть, что читают друзья, и переписываться — всё в одном месте.',
      cta: 'Пригласить друга →',
      secondary: 'Или найдите их — возможно, они уже в BookShelf.',
    },
  })
  const html = marketingWrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">${t.greeting}</p>
        <p style="margin:0 0 16px;font-size:15px;color:#57534e;line-height:1.6;">${t.intro}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">${t.body}</p>
        ${ctaButton(t.cta, `${BASE_URL}/friends`)}
        <p style="margin:20px 0 0;font-size:13px;color:#a8a29e;line-height:1.5;">${t.secondary}</p>
      </td>
    </tr>
  `, lang)
  return { subject: t.subject, html }
}

export function inviteReminderBEmail(
  firstName: string,
  username: string | null,
  lang: EmailLang,
): { subject: string; html: string } {
  const safe = esc(firstName)
  const shelfUrl = username ? `${BASE_URL}/${username}` : `${BASE_URL}/profile`
  const shelfLabel = username ? `bookshelf.name/${esc(username)}` : 'bookshelf.name/[your-username]'
  const t = pick(lang, {
    en: {
      subject: `Do you know someone who loves books?`,
      greeting: `Hi ${safe},`,
      intro: 'Even one friend on BookShelf unlocks lending, messaging and a shared feed.',
      shareHead: 'Just share your shelf link:',
      cta: username ? 'Share my shelf →' : 'Set up my shelf link →',
    },
    ro: {
      subject: `Cunoști pe cineva care iubește cărțile?`,
      greeting: `Salut, ${safe}!`,
      intro: 'Chiar și un singur prieten pe BookShelf deblochează împrumuturi, mesaje și un flux comun.',
      shareHead: 'Doar distribuie linkul raftului tău:',
      cta: username ? 'Distribuie raftul meu →' : 'Configurează linkul raftului →',
    },
    ru: {
      subject: `Знаете кого-то, кто любит книги?`,
      greeting: `Привет, ${safe}!`,
      intro: 'Даже один друг в BookShelf открывает обмен книгами, сообщения и общую ленту.',
      shareHead: 'Просто поделитесь ссылкой на свою полку:',
      cta: username ? 'Поделиться моей полкой →' : 'Настроить ссылку на полку →',
    },
  })
  const html = marketingWrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 16px;font-size:18px;font-weight:bold;color:#292524;">${t.greeting}</p>
        <p style="margin:0 0 20px;font-size:15px;color:#57534e;line-height:1.6;">${t.intro}</p>
        <p style="margin:0 0 6px;font-size:14px;font-weight:bold;color:#292524;">${t.shareHead}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#c4852a;font-weight:bold;">${shelfLabel}</p>
        ${ctaButton(t.cta, shelfUrl)}
      </td>
    </tr>
  `, lang)
  return { subject: t.subject, html }
}

// Six rotating monthly tips. Each entry provides localized subject/heading/body and a CTA.
// Tip 2 (public shelf) and Tip 6 (wishlist) CTAs use the username / route accordingly.
const TIP_COUNT = 6

function tipContent(n: number, username: string | null, lang: EmailLang): {
  subject: string; heading: string; body: string; cta: string; href: string
} {
  const shelfUrl = username ? `${BASE_URL}/${username}` : `${BASE_URL}/profile`
  const TIPS: Record<number, Record<EmailLang, { subject: string; heading: string; body: string; cta: string }> & { href: string }> = {
    1: {
      href: `${BASE_URL}/books/add`,
      en: { subject: 'The fastest way to add a book to BookShelf', heading: 'Add books by photo', body: 'Snap a photo of any book cover and our AI reads the title, author, ISBN and more — filling in your shelf in seconds. No typing required.', cta: 'Try it now →' },
      ro: { subject: 'Cel mai rapid mod de a adăuga o carte pe BookShelf', heading: 'Adaugă cărți din poză', body: 'Fă o poză oricărei coperți, iar AI-ul nostru citește titlul, autorul, ISBN-ul și altele — completând raftul tău în câteva secunde. Fără scris.', cta: 'Încearcă acum →' },
      ru: { subject: 'Самый быстрый способ добавить книгу в BookShelf', heading: 'Добавляйте книги по фото', body: 'Сфотографируйте обложку любой книги, и наш ИИ распознает название, автора, ISBN и другое — заполнив полку за секунды. Без набора текста.', cta: 'Попробовать →' },
    },
    2: {
      href: shelfUrl,
      en: { subject: 'Your public BookShelf profile is live', heading: 'Share your shelf with the world', body: 'Turn on your public profile and get a personal link at bookshelf.name/your-name. Share it anywhere so friends can browse what you own.', cta: username ? 'See my public shelf →' : 'Set up my public shelf →' },
      ro: { subject: 'Profilul tău public BookShelf este activ', heading: 'Distribuie raftul tău lumii', body: 'Activează-ți profilul public și primești un link personal la bookshelf.name/numele-tău. Distribuie-l oriunde ca prietenii să vadă ce ai.', cta: username ? 'Vezi raftul meu public →' : 'Configurează raftul public →' },
      ru: { subject: 'Ваш публичный профиль BookShelf активен', heading: 'Поделитесь полкой со всем миром', body: 'Включите публичный профиль и получите личную ссылку bookshelf.name/ваше-имя. Делитесь ею где угодно, чтобы друзья видели ваши книги.', cta: username ? 'Моя публичная полка →' : 'Настроить публичную полку →' },
    },
    3: {
      href: `${BASE_URL}/books`,
      en: { subject: 'How lending works on BookShelf', heading: 'Lend a book to a friend', body: 'A friend requests a book, you approve, you hand it over, and BookShelf tracks the whole loan until it’s returned — with reminders along the way.', cta: 'See my books →' },
      ro: { subject: 'Cum funcționează împrumutul pe BookShelf', heading: 'Împrumută o carte unui prieten', body: 'Un prieten cere o carte, tu aprobi, i-o dai, iar BookShelf urmărește tot împrumutul până la returnare — cu memento-uri pe parcurs.', cta: 'Vezi cărțile mele →' },
      ru: { subject: 'Как работает обмен книгами в BookShelf', heading: 'Дайте книгу другу', body: 'Друг запрашивает книгу, вы одобряете, передаёте её, а BookShelf отслеживает весь процесс до возврата — с напоминаниями по пути.', cta: 'Мои книги →' },
    },
    4: {
      href: `${BASE_URL}/books/read-with-ai`,
      en: { subject: 'Get daily insights from the books you’re reading', heading: 'Read with AI', body: 'Add a book to Read with AI and receive 10–20 thoughtful insights, delivered one a day. It’s like a reading companion in your inbox.', cta: 'Try Read with AI →' },
      ro: { subject: 'Primește idei zilnice din cărțile pe care le citești', heading: 'Citește cu AI', body: 'Adaugă o carte la Citește cu AI și primești 10–20 de idei valoroase, una pe zi. E ca un însoțitor de lectură în inbox-ul tău.', cta: 'Încearcă Citește cu AI →' },
      ru: { subject: 'Получайте ежедневные идеи из книг, которые читаете', heading: 'Читай с ИИ', body: 'Добавьте книгу в «Читай с ИИ» и получайте 10–20 содержательных инсайтов — по одному в день. Это как спутник чтения в вашей почте.', cta: 'Попробовать «Читай с ИИ» →' },
    },
    5: {
      href: `${BASE_URL}/marketplace`,
      en: { subject: 'Did you know you can sell books on BookShelf?', heading: 'Buy & sell books', body: 'Set a price on any book and sell it to friends or to anyone on the public marketplace. Browse what other readers are selling too.', cta: 'Browse the marketplace →' },
      ro: { subject: 'Știai că poți vinde cărți pe BookShelf?', heading: 'Cumpără și vinde cărți', body: 'Setează un preț pentru orice carte și vinde-o prietenilor sau oricui de pe piața publică. Vezi și ce vând alți cititori.', cta: 'Explorează piața →' },
      ru: { subject: 'Знаете, что в BookShelf можно продавать книги?', heading: 'Покупайте и продавайте книги', body: 'Установите цену на любую книгу и продайте её друзьям или кому угодно на публичной площадке. Смотрите, что продают другие читатели.', cta: 'Открыть площадку →' },
    },
    6: {
      href: `${BASE_URL}/wishlist`,
      en: { subject: 'Save books you want to read next', heading: 'Your Wishlist', body: 'Add books you want to your Wishlist — and BookShelf instantly checks whether any of your friends already own a copy you could borrow.', cta: 'Open my wishlist →' },
      ro: { subject: 'Salvează cărțile pe care vrei să le citești', heading: 'Lista ta de dorințe', body: 'Adaugă cărțile pe care le vrei în Lista de dorințe — iar BookShelf verifică instant dacă vreun prieten are deja un exemplar de împrumutat.', cta: 'Deschide lista de dorințe →' },
      ru: { subject: 'Сохраняйте книги, которые хотите прочитать', heading: 'Ваш список желаний', body: 'Добавляйте нужные книги в список желаний — а BookShelf сразу проверит, есть ли копия у кого-то из друзей, чтобы одолжить.', cta: 'Открыть список желаний →' },
    },
  }
  const entry = TIPS[n] ?? TIPS[1]
  const loc = pick(lang, { en: entry.en, ro: entry.ro, ru: entry.ru })
  return { ...loc, href: entry.href }
}

export function monthlyTipEmail(
  firstName: string,
  tipNumber: number,
  username: string | null,
  lang: EmailLang,
): { subject: string; html: string } {
  const safe = esc(firstName)
  const n = ((tipNumber - 1) % TIP_COUNT + TIP_COUNT) % TIP_COUNT + 1
  const c = tipContent(n, username, lang)
  const greeting = pick(lang, { en: `Hi ${safe},`, ro: `Salut, ${safe}!`, ru: `Привет, ${safe}!` })
  const badge = pick(lang, { en: 'Tip of the month', ro: 'Sfatul lunii', ru: 'Совет месяца' })
  const html = marketingWrapper(`
    <tr>
      <td style="padding:24px 0 20px;">
        <p style="margin:0 0 4px;font-size:12px;font-weight:bold;color:#c4852a;text-transform:uppercase;letter-spacing:0.5px;">${badge}</p>
        <p style="margin:0 0 16px;font-size:20px;font-weight:bold;color:#292524;">${esc(c.heading)}</p>
        <p style="margin:0 0 12px;font-size:15px;color:#57534e;line-height:1.6;">${greeting}</p>
        <p style="margin:0 0 24px;font-size:15px;color:#57534e;line-height:1.6;">${c.body}</p>
        ${ctaButton(c.cta, c.href)}
      </td>
    </tr>
  `, lang)
  return { subject: c.subject, html }
}

export const MONTHLY_TIP_COUNT = TIP_COUNT
