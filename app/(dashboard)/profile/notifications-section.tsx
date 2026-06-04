'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateMessageDigestEnabled } from './actions'

export default function NotificationsSection({
  initialMessageDigestEnabled,
}: {
  initialMessageDigestEnabled: boolean
}) {
  const t = useTranslations('profile')
  const [messageDigestEnabled, setMessageDigestEnabled] = useState(initialMessageDigestEnabled)

  async function handleToggle(enabled: boolean) {
    setMessageDigestEnabled(enabled)
    await updateMessageDigestEnabled(enabled)
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
          <button
            role="switch"
            aria-checked={messageDigestEnabled}
            onClick={() => handleToggle(!messageDigestEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none ${
              messageDigestEnabled ? 'bg-stone-800' : 'bg-stone-200'
            }`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              messageDigestEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>
    </section>
  )
}
