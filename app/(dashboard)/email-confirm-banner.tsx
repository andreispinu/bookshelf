'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { resendConfirmationEmail } from './actions'

const DISMISSED_KEY = 'bookshelf-email-banner-dismissed'

export default function EmailConfirmBanner() {
  const t = useTranslations('auth')
  const [visible, setVisible] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    const dismissed = sessionStorage.getItem(DISMISSED_KEY)
    if (!dismissed) setVisible(true)
  }, [])

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1')
    setVisible(false)
  }

  async function handleResend() {
    setSending(true)
    await resendConfirmationEmail()
    setSending(false)
    setSent(true)
  }

  if (!visible) return null

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-sm text-amber-800 flex items-center justify-between gap-4">
      <span>
        {sent ? t('confirmationSent') : t('confirmEmailBanner')}
        {!sent && (
          <>
            {' '}
            <button
              onClick={handleResend}
              disabled={sending}
              className="font-semibold underline underline-offset-2 disabled:opacity-60"
            >
              {sending ? t('sending') : t('resendConfirmation')}
            </button>
          </>
        )}
      </span>
      <button
        onClick={dismiss}
        className="text-amber-600 hover:text-amber-900 flex-shrink-0 text-base leading-none"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
