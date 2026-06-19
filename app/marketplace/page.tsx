import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import LandingNav from '../landing-nav'
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

  const [t, locale] = await Promise.all([getTranslations('marketplace'), getLocale()])

  return (
    <div className="min-h-screen bg-parchment text-ink">

      <LandingNav isLoggedIn={isLoggedIn} currentLocale={locale} />

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
