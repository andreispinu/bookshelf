import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getTranslations, getLocale } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getPublicBook, getBooksByCategory } from '@/lib/db/books'
import { translateCategory } from '@/lib/translate-category'
import { getCategoryColor } from '@/lib/category-color'
import LandingNav from '../../landing-nav'
import SiteFooter from '../../site-footer'
import CatalogBookCard from '../catalog-book-card'

const SITE_URL = 'https://bookshelf.name'

export const revalidate = 3600

// Pre-render the 500 most recently added books at build time. Everything else
// is rendered on-demand and then cached (ISR).
export async function generateStaticParams() {
  const { data } = await supabaseAdmin
    .from('books')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(500)

  return (data ?? []).map((b) => ({ id: b.id as string }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const t = await getTranslations('catalog')
  const book = await getPublicBook(id)
  if (!book) return { title: t('notFoundTitle') }

  const title = t('detailMetaTitle', { title: book.title, author: book.author })
  const description = t('detailMetaDescription', { title: book.title, author: book.author })
  const images = book.cover_url ? [book.cover_url] : undefined

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/catalog/${book.id}` },
    openGraph: { title, description, images, type: 'book' },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}

export default async function CatalogBookPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const book = await getPublicBook(id)
  if (!book) notFound()

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

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    author: { '@type': 'Person', name: book.author },
    offers: {
      '@type': 'Offer',
      availability: available ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      price: '0',
      priceCurrency: 'RON',
      seller: { '@type': 'Organization', name: 'BookShelf' },
    },
  }
  if (book.isbn) jsonLd.isbn = book.isbn
  if (book.cover_url) jsonLd.image = book.cover_url

  return (
    <div className="min-h-screen bg-parchment text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
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
