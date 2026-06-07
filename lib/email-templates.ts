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
          Your free trial is 14 days — make the most of it.
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
          Perioada ta de probă gratuită este de 14 zile — profită la maximum de ea.
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
          Ваш бесплатный пробный период — 14 дней. Используйте его по максимуму.
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
