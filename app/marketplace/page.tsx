import type { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import MarketplaceClient from './marketplace-client'

const SITE_URL = 'https://bookshelf.name'
const TITLE = 'BookShelf Marketplace — Buy books from readers near you'
const DESCRIPTION =
  'Browse books for sale by BookShelf readers. Search by title, author, category, language, or location.'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: TITLE },
    description: DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/marketplace` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}/marketplace`,
      siteName: 'BookShelf',
      title: TITLE,
      description: DESCRIPTION,
    },
    twitter: {
      card: 'summary_large_image',
      title: TITLE,
      description: DESCRIPTION,
    },
  }
}

export default async function MarketplacePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const t = await getTranslations('marketplace')

  return (
    <div className="min-h-screen bg-parchment text-ink">

      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-parchment-card border-b border-linen">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <img src="/icon.svg" alt="" className="w-7 h-7" aria-hidden="true" />
            <span className="font-serif text-xl font-semibold text-ink tracking-tight">BookShelf</span>
          </Link>
          {isLoggedIn ? (
            <Link
              href="/books"
              className="px-4 py-1.5 rounded-lg bg-ink text-parchment text-sm font-medium hover:bg-ink-light transition-colors"
            >
              {t('goToShelf')}
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="px-3 py-1.5 text-sm text-walnut hover:text-ink transition-colors">
                {t('logIn')}
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-lg bg-ink text-parchment text-sm font-medium hover:bg-ink-light transition-colors"
              >
                {t('signUp')}
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="bg-parchment border-b border-linen py-12 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-ink-light">
            {t('title')}
          </h1>
          <p className="mt-3 text-lg text-walnut">{t('tagline')}</p>
        </div>
      </section>

      <Suspense>
        <MarketplaceClient isLoggedIn={isLoggedIn} />
      </Suspense>
    </div>
  )
}
