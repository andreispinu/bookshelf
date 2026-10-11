import type { Metadata } from 'next'
import Link from 'next/link'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { getPublicBooks } from '@/lib/db/books'
import { CATEGORIES } from '@/lib/categories'
import { translateCategory } from '@/lib/translate-category'
import { SITE_URL } from '@/lib/site'
import { bookPath } from '@/lib/slug'
import LandingNav from '../landing-nav'
import SiteFooter from '../site-footer'
import CatalogBookCard from './catalog-book-card'

const PAGE_SIZE = 48

type SearchParams = {
  page?: string
  category?: string
  status?: string
  author?: string
}

// Parse + validate the URL filters into a normalized shape.
function parseFilters(sp: SearchParams) {
  const page = Math.max(1, parseInt(sp.page ?? '1', 10) || 1)
  const category = sp.category && (CATEGORIES as readonly string[]).includes(sp.category) ? sp.category : undefined
  const status: 'available' | 'all' = sp.status === 'available' ? 'available' : 'all'
  const author = sp.author?.trim() || undefined
  return { page, category, status, author }
}

// Build a crawlable /catalog URL, omitting default values.
function catalogHref(f: { page?: number; category?: string; status?: 'available' | 'all'; author?: string }) {
  const q = new URLSearchParams()
  if (f.category) q.set('category', f.category)
  if (f.status === 'available') q.set('status', 'available')
  if (f.author) q.set('author', f.author)
  if (f.page && f.page > 1) q.set('page', String(f.page))
  const qs = q.toString()
  return qs ? `/catalog?${qs}` : '/catalog'
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<Metadata> {
  const { page, category, status, author } = parseFilters(await searchParams)
  const [t, tCat] = await Promise.all([getTranslations('catalog'), getTranslations('categories')])

  let title = category
    ? t('metaTitleCategory', { category: translateCategory(category, tCat) })
    : t('metaTitle')
  if (page > 1) title += t('metaPageSuffix', { page })

  return {
    title: { absolute: title },
    description: t('metaDescription'),
    alternates: { canonical: `${SITE_URL}${catalogHref({ page, category, status, author })}` },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}${catalogHref({ page, category, status, author })}`,
      siteName: 'BookShelf',
      title,
    },
  }
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { page, category, status, author } = parseFilters(await searchParams)
  const supabase = await createClient()
  const [{ data: { user } }, t, tCat, locale] = await Promise.all([
    supabase.auth.getUser(),
    getTranslations('catalog'),
    getTranslations('categories'),
    getLocale(),
  ])

  const { books, total } = await getPublicBooks({ page, category, status, author })
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: t('metaTitle'),
    description: t('metaDescription'),
    url: `${SITE_URL}/catalog`,
    hasPart: books.map((b) => ({
      '@type': 'Book',
      name: b.title,
      author: { '@type': 'Person', name: b.author },
      url: `${SITE_URL}${bookPath(b.title, b.author, b.id)}`,
    })),
  }

  // Windowed page numbers around the current page.
  const windowSize = 5
  let startPage = Math.max(1, page - Math.floor(windowSize / 2))
  const endPage = Math.min(totalPages, startPage + windowSize - 1)
  startPage = Math.max(1, endPage - windowSize + 1)
  const pageNumbers = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i)

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <LandingNav isLoggedIn={!!user} currentLocale={locale} />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <header className="mb-8 text-center">
          <h1 className="font-serif text-3xl md:text-4xl font-semibold text-ink-light">
            {t('heading', { count: total })}
          </h1>
          <p className="mt-3 text-walnut max-w-2xl mx-auto">
            {t('subheading')}
          </p>
        </header>

        {/* Status filter (crawlable links) */}
        <div className="flex gap-2 justify-center mb-4">
          <Link
            href={catalogHref({ category, author, status: 'all' })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === 'all' ? 'bg-ink text-parchment' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {t('statusAll')}
          </Link>
          <Link
            href={catalogHref({ category, author, status: 'available' })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              status === 'available' ? 'bg-ink text-parchment' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {t('statusAvailable')}
          </Link>
        </div>

        {/* Category filter (crawlable links) */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          <Link
            href={catalogHref({ status, author })}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              !category ? 'bg-ink text-parchment' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {t('categoryAll')}
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={catalogHref({ category: cat, status, author })}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                category === cat ? 'bg-ink text-parchment' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {translateCategory(cat, tCat)}
            </Link>
          ))}
        </div>

        {/* Grid */}
        {books.length === 0 ? (
          <p className="text-center text-walnut py-16">{t('empty')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {books.map((b) => (
              <CatalogBookCard
                key={b.id}
                book={b}
                categoryLabel={b.category ? translateCategory(b.category, tCat) : null}
              />
            ))}
          </div>
        )}

        {/* Pagination (crawlable links) */}
        {totalPages > 1 && (
          <nav className="mt-10 flex items-center justify-center gap-1.5 flex-wrap">
            {page > 1 && (
              <Link
                href={catalogHref({ page: page - 1, category, status, author })}
                className="px-3 py-1.5 rounded-md text-sm border border-linen text-walnut hover:bg-stone-100 transition-colors"
                rel="prev"
              >
                {t('paginationPrev')}
              </Link>
            )}
            {pageNumbers.map((n) => (
              <Link
                key={n}
                href={catalogHref({ page: n, category, status, author })}
                aria-current={n === page ? 'page' : undefined}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  n === page ? 'bg-ink text-parchment' : 'border border-linen text-walnut hover:bg-stone-100'
                }`}
              >
                {n}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={catalogHref({ page: page + 1, category, status, author })}
                className="px-3 py-1.5 rounded-md text-sm border border-linen text-walnut hover:bg-stone-100 transition-colors"
                rel="next"
              >
                {t('paginationNext')}
              </Link>
            )}
          </nav>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
