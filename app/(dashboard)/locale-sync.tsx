'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { syncLocaleFromProfile, syncLocaleToProfile } from './locale-actions'

/**
 * Silently keeps the NEXT_LOCALE cookie in sync with the user's profile ui_language.
 * - If profile has ui_language and it differs from the cookie: update cookie + refresh
 * - If profile has no ui_language: save the cookie value to the profile (once)
 */
export default function LocaleSync({ uiLanguage }: { uiLanguage: string | null }) {
  const router = useRouter()

  useEffect(() => {
    if (uiLanguage) {
      // Read cookie client-side to avoid a server round-trip when already in sync
      const cookieLocale = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([^;]+)/)?.[1]
      if (cookieLocale !== uiLanguage) {
        syncLocaleFromProfile(uiLanguage).then(() => router.refresh())
      }
    } else {
      syncLocaleToProfile()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
