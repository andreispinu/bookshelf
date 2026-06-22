'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { translateCategory } from '@/lib/translate-category'
import { getCategoryColor } from '@/lib/category-color'

type Book = {
  id: string
  title: string
  cover_url: string | null
  category: string | null
  status: string
}

type Props = {
  books: Book[]
  categoryCounts: Record<string, number>
}

export default function RecentlyAddedClient({ books, categoryCounts }: Props) {
  const t = useTranslations('landing')
  const tCat = useTranslations('categories')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const hasCategories = Object.keys(categoryCounts).length > 0

  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])

  const displayed = activeCategory
    ? books.filter(b => b.category === activeCategory).slice(0, 10)
    : books.slice(0, 10)

  return (
    <section className="py-16 px-4 bg-white border-b border-stone-200">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-stone-800 text-center mb-2">
          {t('recentlyAddedHeading')}
        </h2>
        <p className="text-center text-stone-500 text-sm mb-8">
          {t('recentlyAddedSubheading')}
        </p>

        {hasCategories && (
          <div className="flex gap-2 overflow-x-auto pb-3 mb-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                activeCategory === null
                  ? 'bg-stone-800 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {t('filterAll', { count: books.length })}
            </button>
            {sortedCategories.map(([cat, count]) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {translateCategory(cat, tCat)} <span className={activeCategory === cat ? 'opacity-75' : 'text-stone-400'}>({count})</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {displayed.map((book, i) => (
            <div key={book.id} className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-2">
              <div
                className="w-full rounded-lg overflow-hidden flex items-center justify-center"
                style={book.cover_url ? { aspectRatio: '2/3', backgroundColor: '#f5e6d0' } : { aspectRatio: '2/3', backgroundColor: getCategoryColor(book.category) }}
              >
                {book.cover_url
                  // First row (up to 5 covers) is above the fold and an LCP
                  // candidate — load eagerly with high priority; lazy-load the rest.
                  ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading={i < 5 ? 'eager' : 'lazy'} fetchPriority={i < 5 ? 'high' : 'auto'} />
                  : <span className="px-2 font-serif text-xs text-parchment/85 text-center leading-snug line-clamp-3">{book.title}</span>
                }
              </div>
              <p className="text-sm font-medium text-stone-800 leading-snug line-clamp-2">{book.title}</p>
              {book.category && (
                <span className="inline-block text-[10px] font-medium text-stone-500 bg-stone-100 rounded-full px-2 py-0.5 self-start">
                  {translateCategory(book.category, tCat)}
                </span>
              )}
              <span className={`inline-block text-[10px] font-medium rounded-full px-2 py-0.5 self-start border ${
                book.status === 'available'
                  ? 'bg-forest-light text-forest border-forest/30'
                  : 'bg-rust-light text-rust border-rust/30'
              }`}>
                {book.status === 'available' ? t('bookAvailable') : t('bookLentOut')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
