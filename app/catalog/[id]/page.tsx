import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound, permanentRedirect } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPublicBook, getBooksByCategory } from '@/lib/db/books'
import { translateCategory } from '@/lib/translate-category'
import { getCategoryColor } from '@/lib/category-color'
import { SITE_URL } from '@/lib/site'
import { extractBookId, bookSlug, bookPath } from '@/lib/slug'
import LandingNav from '../../landing-nav'
import SiteFooter from '../../site-footer'
import CatalogBookCard from '../catalog-book-card'

export const revalidate = 3600

function metaDescription(
  book: { title: string; author: string; description: string | null },
  t: (key: string, values?: Record<string, string>) => string
): string {
  const desc = book.description?.replace(/\s+/g, ' ').trim()
  if (desc) return desc.length > 160 ? `${desc.slice(0, 157)}…` : desc
  return t('detailMetaDescription', { title: book.title, author: book.author })
}

// Pre-render the 500 most recently added books at build time, each at its
// canonical slug URL. Everything else is rendered on-demand and then cached.
export async function generateStaticParams() {
  const { data } = await supabaseAdmin
    .from('books')
    .select('id, title, author')
    .order('created_at', { ascending: false })
    .limit(500)

  return (data ?? []).map((b) => ({ id: bookSlug(b.title, b.author, b.id) }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id: slug } = await params
  const t = await getTranslations('catalog')
  const bookId = extractBookId(slug)
  const book = bookId ? await getPublicBook(bookId) : null
  if (!book) return { title: t('notFoundTitle') }

  const title = t('detailMetaTitle', { title: book.title, author: book.author })
  const description = metaDescription(book, t)
  const images = book.cover_url ? [book.cover_url] : undefined
  const canonical = `${SITE_URL}${bookPath(book.title, book.author, book.id)}`

  return {
    title: { absolute: title },
    description,
    alternates: { canonical },
    openGraph: { title, description, images, type: 'book', url: canonical },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}

export default async function CatalogBookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: slug } = await params
  const bookId = extractBookId(slug)
  if (!bookId) notFound()

  const book = await getPublicBook(bookId)
  if (!book) notFound()

  // Canonicalize the URL: redirect bare UUIDs or stale/wrong slugs to the
  // current slug (permanent 308 — consolidates link equity on one URL).
  const canonicalSlug = bookSlug(book.title, book.author, book.id)
  if (slug !== canonicalSlug) permanentRedirect(`/catalog/${canonicalSlug}`)

  const supabase = await createClient()
  const [{ data: { user } }, t, tCat, locale] = await Promise.all([
    supabase.auth.getUser(),
    getTranslations('catalog'),
    getTranslations('categories'),
    getLocale(),
  ])
  const categoryLabel = book.category ? translateCategory(book.category, tCat) : null
  const available = book.status === 'available'

  const location = [book.city, book.country].filter(Boolean).join(', ')

  const related = book.category ? await getBooksByCategory(book.category, book.id, 4) : []

  const canonicalUrl = `${SITE_URL}${bookPath(book.title, book.author, book.id)}`

  const bookLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    url: canonicalUrl,
    offers: {
      '@type': 'Offer',
      availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      price: '0',
      priceCurrency: 'RON',
      seller: { '@type': 'Organization', name: 'BookShelf' },
    },
  }
  if (book.isbn) bookLd.isbn = book.isbn
  if (book.cover_url) bookLd.image = book.cover_url
  if (book.description) bookLd.description = book.description
  if (book.language) bookLd.inLanguage = book.language
  if (book.year) bookLd.datePublished = book.year
  if (book.publisher) bookLd.publisher = { '@type': 'Organization', name: book.publisher }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: t('breadcrumbHome'), item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: t('breadcrumbBooks'), item: `${SITE_URL}/catalog` },
      { '@type': 'ListItem', position: 3, name: book.title, item: canonicalUrl },
    ],
  }

  const metaLine = [book.publisher, book.year, book.language].filter(Boolean).join(' · ')

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([bookLd, breadcrumbLd]) }}
      />

      <LandingNav isLoggedIn={!!user} currentLocale={locale} />

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-walnut mb-6 flex items-center gap-1.5 flex-wrap">
          <Link href="/" className="hover:text-ink transition-colors">{t('breadcrumbHome')}</Link>
          <span className="text-walnut-mid">→</span>
          <Link href="/catalog" className="hover:text-ink transition-colors">{t('breadcrumbBooks')}</Link>
          <span className="text-walnut-mid">→</span>
          <span className="text-ink-light line-clamp-1">{book.title}</span>
        </nav>

        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          {/* Cover */}
          <div className="mx-auto md:mx-0">
            <div
              className="rounded-xl overflow-hidden flex items-center justify-center shadow-sm"
              style={
                book.cover_url
                  ? { width: 300, aspectRatio: '2/3', backgroundColor: '#f5e6d0' }
                  : { width: 300, aspectRatio: '2/3', backgroundColor: getCategoryColor(book.category) }
              }
            >
              {book.cover_url ? (
                <Image
                  src={book.cover_url}
                  alt={book.title}
                  width={300}
                  height={450}
                  priority
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <span className="px-4 font-serif text-lg text-parchment/85 text-center leading-snug">
                  {book.title}
                </span>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="flex flex-col gap-4">
            <h1 className="font-serif text-3xl font-semibold text-ink-light leading-tight">
              {book.title}
            </h1>
            <p className="text-lg text-walnut">
              {t('byAuthorPrefix')}{' '}
              <Link
                href={`/catalog?author=${encodeURIComponent(book.author)}`}
                className="text-amber hover:underline underline-offset-4"
              >
                {book.author}
              </Link>
            </p>

            <div className="flex items-center gap-2 flex-wrap">
              {categoryLabel && (
                <span className="inline-block text-xs font-medium text-stone-500 bg-stone-100 rounded-full px-3 py-1">
                  {categoryLabel}
                </span>
              )}
              <span
                className={`inline-block text-xs font-medium rounded-full px-3 py-1 border ${
                  available
                    ? 'bg-forest-light text-forest border-forest/30'
                    : 'bg-rust-light text-rust border-rust/30'
                }`}
              >
                {available ? t('available') : t('lentOut')}
              </span>
            </div>

            {location && (
              <p className="text-sm text-walnut">
                {t('availableIn')} <span className="text-ink-light font-medium">{location}</span>
              </p>
            )}

            {metaLine && (
              <p className="text-sm text-walnut-mid">{metaLine}</p>
            )}
            {book.isbn && (
              <p className="text-sm text-walnut-mid">ISBN: {book.isbn}</p>
            )}

            {/* CTA */}
            <div className="mt-2 rounded-xl border border-amber/30 bg-amber-pale px-6 py-5">
              <p className="font-serif text-lg text-ink-light mb-3">
                {t('ctaHeading')}
              </p>
              <Link
                href="/login"
                className="inline-block px-5 py-2.5 rounded-md bg-ink text-parchment text-sm font-medium hover:bg-ink-light transition-colors"
              >
                {t('ctaButton')}
              </Link>
            </div>
          </div>
        </div>

        {/* Description */}
        {book.description && (
          <section className="mt-10 max-w-2xl">
            <p className="text-walnut leading-relaxed whitespace-pre-line">{book.description}</p>
          </section>
        )}

        {/* Related books */}
        {related.length > 0 && categoryLabel && (
          <section className="mt-14">
            <h2 className="font-serif text-xl font-semibold text-ink-light mb-5">
              {t('relatedHeading', { category: categoryLabel })}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {related.map((b) => (
                <div key={b.id} className="w-36 shrink-0">
                  <CatalogBookCard
                    book={b}
                    categoryLabel={b.category ? translateCategory(b.category, tCat) : null}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <SiteFooter />
    </div>
  )
}
