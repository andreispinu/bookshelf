'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateMessageDigestEnabled, updateMarketingEmailsEnabled } from './actions'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
        checked ? 'bg-stone-800' : 'bg-stone-200'
      }`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`} />
    </button>
  )
}

export default function NotificationsSection({
  initialMessageDigestEnabled,
  initialMarketingEmailsEnabled,
}: {
  initialMessageDigestEnabled: boolean
  initialMarketingEmailsEnabled: boolean
}) {
  const t = useTranslations('profile')
  const [messageDigestEnabled, setMessageDigestEnabled] = useState(initialMessageDigestEnabled)
  const [marketingEmailsEnabled, setMarketingEmailsEnabled] = useState(initialMarketingEmailsEnabled)

  async function handleDigestToggle(enabled: boolean) {
    setMessageDigestEnabled(enabled)
    await updateMessageDigestEnabled(enabled)
  }

  async function handleMarketingToggle(enabled: boolean) {
    setMarketingEmailsEnabled(enabled)
    await updateMarketingEmailsEnabled(enabled)
  }

  return (
    <section>
      <h3 className="text-lg font-semibold text-stone-800 mb-4">{t('notificationsSection')}</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-700">{t('messageDigest')}</p>
            <p className="text-xs text-stone-400 mt-0.5">{t('messageDigestDesc')}</p>
          </div>
          <Toggle checked={messageDigestEnabled} onChange={handleDigestToggle} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-stone-700">{t('marketingEmails')}</p>
            <p className="text-xs text-stone-400 mt-0.5">{t('marketingEmailsDesc')}</p>
          </div>
          <Toggle checked={marketingEmailsEnabled} onChange={handleMarketingToggle} />
        </div>
      </div>
    </section>
  )
}
