'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'

type Book = {
  id: string
  title: string
  author: string
  cover_url: string | null
  status: string
  category: string | null
}

export default function PublicShelf({ books }: { books: Book[] }) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const categories = useMemo(() =>
    [...new Set(books.map(b => b.category).filter(Boolean) as string[])].sort(),
    [books]
  )

  const filtered = activeCategory
    ? books.filter(b => b.category === activeCategory)
    : books

  return (
    <>
      {categories.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto sm:flex-wrap pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setActiveCategory(null)}
            className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
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
                  <p className="text-xs text-stone-400 mt-0.5 truncate">{book.category}</p>
                )}
                <Badge
                  variant="outline"
                  className={`mt-1.5 text-xs ${
                    book.status === 'available'
                      ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                      : 'border-amber-200 text-amber-700 bg-amber-50'
                  }`}
                >
                  {book.status === 'available' ? 'Available' : 'Lent out'}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
