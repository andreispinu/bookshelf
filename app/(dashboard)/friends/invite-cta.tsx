'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { UserPlus } from 'lucide-react'

const GOAL = 5

export default function InviteCta({ initialCount }: { initialCount: number }) {
  const t = useTranslations('friends')
  const [count, setCount] = useState(initialCount)

  // Keep in sync when server re-renders with fresh count after router.refresh()
  useEffect(() => {
    setCount(initialCount)
  }, [initialCount])

  // Optimistic increment when an invite is sent from InviteSection
  useEffect(() => {
    function handleInviteSent() {
      setCount(prev => Math.min(prev + 1, GOAL))
    }
    window.addEventListener('invite-sent', handleInviteSent)
    return () => window.removeEventListener('invite-sent', handleInviteSent)
  }, [])

  if (count >= GOAL) return null

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
      <div className="flex gap-3">
        <div className="shrink-0 h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
          <UserPlus className="h-5 w-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-stone-800 text-sm">{t('ctaHeading')}</h3>
          <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">{t('ctaSubtext')}</p>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5 mt-3">
            {Array.from({ length: GOAL }).map((_, i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full transition-colors duration-300 ${
                  i < count ? 'bg-amber-400' : 'bg-stone-200'
                }`}
              />
            ))}
            <span className="ml-1 text-xs text-stone-500">{t('ctaProgress', { count })}</span>
          </div>

          <button
            onClick={() => {
              document.getElementById('invite-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              setTimeout(() => document.getElementById('invite-email-input')?.focus(), 400)
            }}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 text-white text-xs font-medium hover:bg-stone-700 transition-colors"
          >
            {t('ctaButton')}
          </button>
        </div>
      </div>
    </div>
  )
}
