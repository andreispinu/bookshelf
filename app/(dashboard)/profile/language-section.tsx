'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from 'next/navigation'
import { updateUiLanguage } from './actions'

const LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
]

export default function LanguageSection({ currentLanguage }: { currentLanguage: string }) {
  const t = useTranslations('profile')
  const router = useRouter()
  const [justSet, setJustSet] = useState<string | null>(null)

  async function handleSelect(code: string) {
    if (code === currentLanguage) return
    await updateUiLanguage(code)
    setJustSet(code)
    router.refresh()
  }

  const justSetLabel = justSet ? LANGUAGES.find(l => l.code === justSet)?.label : null

  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('preferences')}</h2>
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <p className="text-sm font-medium text-stone-700 mb-3">{t('interfaceLanguage')}</p>
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm transition-all ${
                currentLanguage === lang.code
                  ? 'border-stone-800 bg-stone-50 ring-1 ring-stone-800 font-medium text-stone-800'
                  : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50 text-stone-600'
              }`}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
        {justSetLabel && (
          <p className="text-xs text-stone-400 mt-3">
            {justSetLabel} set — overrides auto-detection.
          </p>
        )}
      </div>
    </section>
  )
}
