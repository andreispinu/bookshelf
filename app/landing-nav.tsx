'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { setLocale } from './landing-actions'

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ro', label: 'RO' },
  { code: 'ru', label: 'RU' },
]

const LANG_NAMES: Record<string, string> = { en: 'English', ro: 'Română', ru: 'Русский' }

export default function LandingNav({
  isLoggedIn,
  currentLocale,
}: {
  isLoggedIn: boolean
  currentLocale: string
}) {
  const t = useTranslations('landing')
  const router = useRouter()
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [justSet, setJustSet] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const onLanding = pathname === '/'

  // Section anchors live on the landing page; when the nav is shown on another
  // public page (e.g. /marketplace) prefix them with "/" so they navigate back
  // to the landing page section instead of a non-existent in-page anchor.
  const navLinks = [
    { label: t('navBooks'), href: onLanding ? '#recent-books' : '/#recent-books' },
    { label: t('navMarketplace'), href: '/marketplace' },
    { label: t('navHowItWorks'), href: onLanding ? '#how-it-works' : '/#how-it-works' },
    { label: t('navInstall'), href: onLanding ? '#install' : '/#install' },
  ]

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  function handleLocale(code: string) {
    if (code === currentLocale || isPending) return
    startTransition(async () => {
      await setLocale(code)
      setJustSet(code)
      router.refresh()
    })
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo + desktop nav */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/icon.svg" alt="" className="w-8 h-8" aria-hidden="true" />
            <span className="font-serif text-2xl font-semibold text-ink tracking-tight">BookShelf</span>
          </Link>

          {/* Desktop center links */}
          <nav className="hidden md:flex items-center gap-6">
            {navLinks.map(l => (
              <a
                key={l.href}
                href={l.href}
                className={`text-sm transition-colors whitespace-nowrap ${
                  l.href === pathname
                    ? 'font-medium text-stone-900'
                    : 'text-stone-500 hover:text-stone-900'
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Desktop right: lang switcher + CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-0.5 rounded-lg border border-stone-200 p-0.5">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => handleLocale(lang.code)}
                  disabled={isPending}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                    currentLocale === lang.code
                      ? 'bg-stone-800 text-white'
                      : 'text-stone-500 hover:text-stone-800 disabled:opacity-50'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
            {process.env.NODE_ENV === 'development' && justSet && !isPending && (
              <p className="text-xs text-stone-400 whitespace-nowrap">
                {LANG_NAMES[justSet]} set — overrides auto-detection
              </p>
            )}
          </div>
          {isLoggedIn ? (
            <Link
              href="/books"
              className="px-4 py-1.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
            >
              {t('navGoToShelf')}
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors"
              >
                {t('navLogIn')}
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                {t('navStartFreeTrial')}
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div ref={menuRef} className="md:hidden border-t border-stone-100 bg-white px-4 pb-4">
          <div className="flex justify-end pt-3 pb-1">
            <button
              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 mb-4">
            {navLinks.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  l.href === pathname
                    ? 'font-medium text-stone-900 bg-stone-50'
                    : 'text-stone-700 hover:bg-stone-50'
                }`}
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* Mobile language switcher */}
          <div className="flex items-center gap-1.5 mb-3">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => { handleLocale(lang.code); setMenuOpen(false) }}
                disabled={isPending}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentLocale === lang.code
                    ? 'bg-stone-800 text-white'
                    : 'border border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-2 border-t border-stone-100 pt-3">
            {isLoggedIn ? (
              <Link
                href="/books"
                className="block text-center py-2.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {t('navGoToShelf')}
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-center py-2.5 rounded-lg border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('navLogIn')}
                </Link>
                <Link
                  href="/signup"
                  className="block text-center py-2.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  {t('navStartFreeTrial')}
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
