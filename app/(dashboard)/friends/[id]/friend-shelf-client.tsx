'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import BorrowButton from './borrow-button'
import BuyButton from './buy-button'
import { translateCategory } from '@/lib/translate-category'
import { PricePill } from '@/components/price-pill'
import type { Book } from '@/types'

export default function FriendShelfClient({
  books,
  friendId,
  ownerId,
  availableLabel,
  lentOutLabel,
}: {
  books: Book[]
  friendId: string
  ownerId: string
  availableLabel: string
  lentOutLabel: string
}) {
  const tCat = useTranslations('categories')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

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

  const filtered = activeCategory ? books.filter(b => b.category === activeCategory) : books

  return (
    <>
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All <span className={!activeCategory ? 'opacity-75' : 'text-stone-400'}>({books.length})</span>
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {translateCategory(cat, tCat)} <span className={activeCategory === cat ? 'opacity-75' : 'text-stone-400'}>({categoryCounts[cat] ?? 0})</span>
            </button>
          ))}
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 sm:block sm:divide-y sm:divide-stone-100">
        {filtered.map(book => (
          <li
            key={book.id}
            className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-stone-200
                       sm:flex-row sm:items-center sm:gap-4 sm:py-4 sm:px-0 sm:bg-transparent sm:rounded-none sm:border-0"
          >
            <div className="shrink-0 w-full aspect-[2/3] sm:w-10 sm:h-14 sm:aspect-auto rounded bg-stone-200 overflow-hidden flex items-center justify-center">
              {book.cover_url
                ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                : <span className="text-stone-400 text-2xl sm:text-lg">📖</span>
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-medium text-stone-800 truncate text-sm sm:text-base">{book.title}</p>
              <p className="text-xs sm:text-sm text-stone-500 truncate">{book.author}</p>
              {book.category && (
                <p className="text-xs text-stone-400 mt-0.5 truncate">{translateCategory(book.category, tCat)}</p>
              )}
              <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    book.status === 'available'
                      ? 'border-forest/30 text-forest bg-forest-light'
                      : 'border-rust/30 text-rust bg-rust-light'
                  }`}
                >
                  {book.status === 'available' ? availableLabel : lentOutLabel}
                </Badge>
                {(book.availability_mode === 'sell_only' || book.availability_mode === 'lend_and_sell') && (
                  <PricePill price={book.sale_price} currency={book.sale_currency} />
                )}
              </div>
            </div>

            <div className="sm:shrink-0 flex gap-2 flex-wrap">
              <Link
                href={`/friends/${friendId}/books/${book.id}`}
                className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
              >
                View
              </Link>
              {book.status === 'available' && book.availability_mode !== 'sell_only' && (
                <BorrowButton bookId={book.id} bookTitle={book.title} ownerId={ownerId} />
              )}
              {(book.availability_mode === 'sell_only' || book.availability_mode === 'lend_and_sell') && (
                <BuyButton
                  bookId={book.id}
                  bookTitle={book.title}
                  ownerId={ownerId}
                  salePrice={book.sale_price}
                  saleCurrency={book.sale_currency}
                  conditionNote={book.condition_note}
                />
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}
