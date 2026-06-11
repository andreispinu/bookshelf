'use client'

import { useState, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { PricePill } from '@/components/price-pill'
import { translateCategory } from '@/lib/translate-category'
import { getCategoryColor } from '@/lib/category-color'

type Book = {
  id: string
  title: string
  author: string
  cover_url: string | null
  status: string
  category: string | null
  availability_mode: string | null
  sale_price: number | null
  sale_currency: string | null
}

const FOR_SALE_KEY = '__for_sale__'

export default function PublicShelf({ books }: { books: Book[] }) {
  const tCat = useTranslations('categories')
  const tBooks = useTranslations('books')
  const [activePill, setActivePill] = useState<string | null>(null)

  const categories = useMemo(() =>
    [...new Set(books.map(b => b.category).filter(Boolean) as string[])].sort(),
    [books]
  )

  const categoryCounts = useMemo(() =>
    books.reduce<Record<string, number>>((acc, b) => {
      if (b.category) acc[b.category] = (acc[b.category] ?? 0) + 1
      return acc
    }, {}),
    [books]
  )

  const forSaleCount = useMemo(() =>
    books.filter(b => b.availability_mode === 'sell_only' || b.availability_mode === 'lend_and_sell').length,
    [books]
  )

  const filtered = useMemo(() => {
    if (activePill === FOR_SALE_KEY) return books.filter(b => b.availability_mode === 'sell_only' || b.availability_mode === 'lend_and_sell')
    if (activePill) return books.filter(b => b.category === activePill)
    return books
  }, [books, activePill])

  const showPills = categories.length > 0 || forSaleCount > 0

  return (
    <>
      {showPills && (
        <div className="flex gap-2 mb-6 overflow-x-auto sm:flex-wrap pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActivePill(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !activePill ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All <span className={!activePill ? 'opacity-75' : 'text-stone-400'}>({books.length})</span>
          </button>
          {forSaleCount > 0 && (
            <button
              onClick={() => setActivePill(activePill === FOR_SALE_KEY ? null : FOR_SALE_KEY)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activePill === FOR_SALE_KEY ? 'bg-amber-700 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
              style={activePill !== FOR_SALE_KEY ? { border: '0.5px solid #fcd34d' } : undefined}
            >
              {tBooks('forSaleLabel')} <span className={activePill === FOR_SALE_KEY ? 'opacity-75' : 'text-amber-600'}>({forSaleCount})</span>
            </button>
          )}
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActivePill(activePill === cat ? null : cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activePill === cat ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {translateCategory(cat, tCat)} <span className={activePill === cat ? 'opacity-75' : 'text-stone-400'}>({categoryCounts[cat] ?? 0})</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400 text-sm">
          No books in this category.
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:block sm:divide-y sm:divide-stone-100">
          {filtered.map(book => {
            const isForSale = book.availability_mode === 'sell_only' || book.availability_mode === 'lend_and_sell'
            const isSellOnly = book.availability_mode === 'sell_only'
            return (
              <li
                key={book.id}
                className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-stone-200
                           sm:flex-row sm:items-center sm:gap-4 sm:py-4 sm:px-0 sm:bg-transparent sm:rounded-none sm:border-0"
              >
                <div
                  className="shrink-0 w-full aspect-[2/3] sm:w-10 sm:h-14 sm:aspect-auto rounded overflow-hidden flex items-center justify-center"
                  style={book.cover_url ? { backgroundColor: '#e8ddd0' } : { backgroundColor: getCategoryColor(book.category) }}
                >
                  {book.cover_url
                    ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                    : <span className="px-2 font-serif text-xs sm:text-[8px] text-parchment/85 text-center leading-snug line-clamp-3">{book.title}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-stone-800 truncate text-sm sm:text-base">{book.title}</p>
                  <p className="text-xs sm:text-sm text-stone-500 truncate">{book.author}</p>
                  {book.category && (
                    <p className="text-xs text-stone-400 mt-0.5 truncate">{translateCategory(book.category, tCat)}</p>
                  )}
                  <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                    {isSellOnly ? (
                      <Badge variant="outline" className="text-xs border-navy/30 text-navy bg-navy-light">
                        {tBooks('forSaleLabel')}
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          book.status === 'available'
                            ? 'border-forest/30 text-forest bg-forest-light'
                            : 'border-rust/30 text-rust bg-rust-light'
                        }`}
                      >
                        {book.status === 'available' ? tBooks('available') : tBooks('lentOut')}
                      </Badge>
                    )}
                    {isForSale && (
                      <PricePill price={book.sale_price} currency={book.sale_currency} />
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
