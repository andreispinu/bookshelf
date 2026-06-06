import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { getActiveLoanForBook } from '@/lib/db/loans'
import { Badge } from '@/components/ui/badge'
import { PricePill } from '@/components/price-pill'
import BookDetailActions from './book-detail-actions'
import type { Book } from '@/types'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function BookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: book, error } = await supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (error || !book) notFound()

  const { data: loan } = book.status === 'lent_out'
    ? await getActiveLoanForBook(id)
    : { data: null }

  const b = book as Book

  return (
    <div className="max-w-lg">
      <div className="mb-6">
        <Link href="/books" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
          ← Back to my books
        </Link>
      </div>

      <div className="flex gap-6 items-start">
        {/* Cover */}
        <div className="shrink-0 w-28 rounded-md overflow-hidden bg-stone-200 flex items-center justify-center shadow-sm" style={{ aspectRatio: '2/3' }}>
          {b.cover_url
            ? <img src={b.cover_url} alt={b.title} className="w-full h-full object-cover" />
            : <span className="text-4xl">📖</span>
          }
        </div>

        {/* Title / Author / Status */}
        <div className="flex-1 min-w-0 pt-1">
          <h2 className="text-2xl font-semibold text-stone-800 leading-tight">{b.title}</h2>
          <p className="text-stone-500 mt-1">{b.author}</p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={
                b.status === 'available'
                  ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                  : 'border-amber-200 text-amber-700 bg-amber-50'
              }
            >
              {b.status === 'available' ? 'Available' : 'Lent out'}
            </Badge>
            {(b.availability_mode === 'sell_only' || b.availability_mode === 'lend_and_sell') && (
              <PricePill price={b.sale_price} currency={b.sale_currency} />
            )}
          </div>
          {loan && (
            <p className="text-sm text-stone-500 mt-2">
              Lent to <span className="font-medium text-stone-700">{loan.borrower.name}</span>
              {' '}since {formatDate(loan.loaned_at)}
            </p>
          )}
        </div>
      </div>

      {/* Metadata */}
      {(b.publisher || b.year || b.isbn) && (
        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-stone-100 pt-5">
          {b.publisher && (
            <>
              <dt className="text-stone-400">Publisher</dt>
              <dd className="text-stone-700">{b.publisher}</dd>
            </>
          )}
          {b.year && (
            <>
              <dt className="text-stone-400">Year</dt>
              <dd className="text-stone-700">{b.year}</dd>
            </>
          )}
          {b.isbn && (
            <>
              <dt className="text-stone-400">ISBN</dt>
              <dd className="text-stone-700 font-mono text-xs pt-0.5">{b.isbn}</dd>
            </>
          )}
        </dl>
      )}

      {/* Description */}
      {b.description && (
        <p className="mt-6 text-sm text-stone-600 leading-relaxed border-t border-stone-100 pt-5">
          {b.description}
        </p>
      )}

      {/* Actions */}
      <div className="mt-8 border-t border-stone-100 pt-6">
        <BookDetailActions book={b} />
      </div>
    </div>
  )
}
