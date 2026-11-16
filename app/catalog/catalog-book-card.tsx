import Link from 'next/link'
import Image from 'next/image'
import { getTranslations } from 'next-intl/server'
import { getCategoryColor } from '@/lib/category-color'
import { bookPath } from '@/lib/slug'
import type { PublicBookCard } from '@/lib/db/books'

// Presentational card used by the catalogue index grid and the related-books
// strip. Matches the landing "recently added" card style. Async server
// component — `categoryLabel` is passed already-translated; status label is
// localized here via the `catalog` namespace.
export default async function CatalogBookCard({
  book,
  categoryLabel,
}: {
  book: PublicBookCard
  categoryLabel: string | null
}) {
  const t = await getTranslations('catalog')
  const available = book.status === 'available'
  return (
    <Link
      href={bookPath(book.title, book.author, book.id)}
      className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-2 hover:border-stone-300 hover:shadow-sm transition-all"
    >
      <div
        className="w-full rounded-lg overflow-hidden flex items-center justify-center relative"
        style={
          book.cover_url
            ? { aspectRatio: '2/3', backgroundColor: '#f5e6d0' }
            : { aspectRatio: '2/3', backgroundColor: getCategoryColor(book.category) }
        }
      >
        {book.cover_url ? (
          <Image
            src={book.cover_url}
            alt={book.title}
            width={300}
            height={450}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="w-full h-full object-cover"
            unoptimized
          />
        ) : (
          <span className="px-2 font-serif text-xs text-parchment/85 text-center leading-snug line-clamp-3">
            {book.title}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-stone-800 leading-snug line-clamp-2">{book.title}</p>
      <p className="text-xs text-stone-500 line-clamp-1">{book.author}</p>
      {categoryLabel && (
        <span className="inline-block text-[10px] font-medium text-stone-500 bg-stone-100 rounded-full px-2 py-0.5 self-start">
          {categoryLabel}
        </span>
      )}
      <span
        className={`inline-block text-[10px] font-medium rounded-full px-2 py-0.5 self-start border ${
          available
            ? 'bg-forest-light text-forest border-forest/30'
            : 'bg-rust-light text-rust border-rust/30'
        }`}
      >
        {available ? t('available') : t('lentOut')}
      </span>
    </Link>
  )
}
