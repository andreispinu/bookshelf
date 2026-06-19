'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import {
  Search, SlidersHorizontal, X, ChevronLeft, ChevronRight, MapPin, Loader2, Lock,
} from 'lucide-react'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'
import { CURRENCIES } from '@/lib/format-currency'
import { COUNTRIES, COUNTRY_FLAGS } from '@/lib/countries'
import { translateCategory } from '@/lib/translate-category'
import { getCategoryColor } from '@/lib/category-color'
import { formatPrice } from '@/lib/format-currency'

// Anonymous visitors receive only { city, country } — name/avatar_url/username
// are omitted by the API and stay undefined.
type Seller = {
  name?: string
  avatar_url?: string | null
  city: string | null
  country: string | null
  username?: string | null
}

type MarketBook = {
  id: string
  title: string
  author: string
  cover_url: string | null
  category: string | null
  language: string | null
  sale_price: number | null
  sale_currency: string | null
  seller: Seller | null
}

type ApiResponse = {
  books: MarketBook[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function MarketplaceClient({ isLoggedIn }: { isLoggedIn: boolean }) {
  const t = useTranslations('marketplace')
  const tCat = useTranslations('categories')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const sp = searchParams.toString()

  // Current committed filter values (source of truth = URL)
  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const country = searchParams.get('country') ?? ''
  const city = searchParams.get('city') ?? ''
  const language = searchParams.get('language') ?? ''
  const currency = searchParams.get('currency') ?? ''
  const maxPrice = searchParams.get('max_price') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10) || 1)

  const hasFilters = !!(q || category || country || city || language || currency || maxPrice)

  const [data, setData] = useState<ApiResponse>({ books: [], total: 0, page: 1, limit: 24, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Local search input with 400ms debounce → URL
  const [qInput, setQInput] = useState(q)
  useEffect(() => { setQInput(q) }, [q])
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updateParams = useCallback(
    (updates: Record<string, string>, resetPage = true) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      for (const [k, v] of Object.entries(updates)) {
        if (v) params.set(k, v)
        else params.delete(k)
      }
      if (resetPage) params.delete('page')
      const qs = params.toString()
      router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname],
  )

  function onSearchChange(value: string) {
    setQInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => updateParams({ q: value }), 400)
  }

  function clearAll() {
    setQInput('')
    router.push(pathname, { scroll: false })
  }

  // Fetch results whenever the URL query changes
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetch(`/api/marketplace?${sp}`)
      .then(r => r.json())
      .then((d: ApiResponse) => { if (!cancelled) { setData(d); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [sp])

  function goToPage(p: number) {
    updateParams({ page: String(p) }, false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const pageNumbers = buildPageWindow(page, data.totalPages)

  const filterControls = (
    <div className="flex flex-col gap-4">
      {/* Category */}
      <FilterSelect
        label={t('filterCategory')}
        value={category}
        onChange={v => updateParams({ category: v })}
        allLabel={t('allCategories')}
        options={CATEGORIES.map(c => ({ value: c, label: translateCategory(c, tCat) }))}
      />
      {/* Country */}
      <FilterSelect
        label={t('filterCountry')}
        value={country}
        onChange={v => updateParams({ country: v })}
        allLabel={t('anyCountry')}
        options={COUNTRIES.map(c => ({ value: c, label: `${COUNTRY_FLAGS[c] ?? ''} ${c}`.trim() }))}
      />
      {/* City */}
      <div>
        <label className="block text-xs font-medium text-walnut mb-1.5">{t('filterCity')}</label>
        <input
          type="text"
          value={city}
          onChange={e => updateParams({ city: e.target.value })}
          placeholder={t('filterCity')}
          className="w-full h-9 rounded-lg border border-linen bg-parchment-card px-3 text-sm text-ink placeholder-walnut-mid focus:outline-none focus:ring-2 focus:ring-amber/40"
        />
      </div>
      {/* Language */}
      <FilterSelect
        label={t('filterLanguage')}
        value={language}
        onChange={v => updateParams({ language: v })}
        allLabel={t('allLanguages')}
        options={LANGUAGES.map(l => ({ value: l, label: l }))}
      />
      {/* Currency */}
      <FilterSelect
        label={t('filterCurrency')}
        value={currency}
        onChange={v => updateParams({ currency: v })}
        allLabel={t('allCurrencies')}
        options={CURRENCIES.map(c => ({ value: c, label: c }))}
      />
      {/* Max price */}
      <div>
        <label className="block text-xs font-medium text-walnut mb-1.5">{t('filterMaxPrice')}</label>
        <input
          type="number"
          min={0}
          value={maxPrice}
          onChange={e => updateParams({ max_price: e.target.value })}
          placeholder="—"
          className="w-full h-9 rounded-lg border border-linen bg-parchment-card px-3 text-sm text-ink placeholder-walnut-mid focus:outline-none focus:ring-2 focus:ring-amber/40"
        />
      </div>
      {hasFilters && (
        <button
          onClick={clearAll}
          className="mt-1 inline-flex items-center justify-center gap-1.5 h-9 rounded-lg border border-linen text-sm text-walnut hover:bg-amber-pale transition-colors"
        >
          <X className="h-3.5 w-3.5" /> {t('clearFilters')}
        </button>
      )}
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">

      {/* Search bar */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-walnut-mid" />
        <input
          type="text"
          value={qInput}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={t('search_placeholder')}
          className="w-full h-12 rounded-xl border border-linen bg-parchment-card pl-11 pr-4 text-base text-ink placeholder-walnut-mid shadow-sm focus:outline-none focus:ring-2 focus:ring-amber/40"
        />
      </div>

      {/* Mobile filter toggle */}
      <button
        onClick={() => setFiltersOpen(true)}
        className="lg:hidden mb-4 inline-flex items-center gap-2 h-10 px-4 rounded-lg border border-linen bg-parchment-card text-sm font-medium text-ink"
      >
        <SlidersHorizontal className="h-4 w-4" /> {t('filters')}
        {hasFilters && <span className="h-2 w-2 rounded-full bg-amber" />}
      </button>

      <div className="flex gap-8">

        {/* Desktop filters sidebar */}
        <aside className="hidden lg:block w-60 shrink-0">
          <div className="sticky top-20">
            <h2 className="text-sm font-semibold text-ink mb-4">{t('filters')}</h2>
            {filterControls}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-walnut mb-4">
            {loading ? t('loading') : t('results_count', { shown: data.books.length, total: data.total })}
          </p>

          {!loading && data.books.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-walnut">{t('empty')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {data.books.map(book => (
                <MarketCard key={book.id} book={book} isLoggedIn={isLoggedIn} tCat={tCat} t={t} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!loading && data.totalPages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-1.5">
              <button
                onClick={() => goToPage(page - 1)}
                disabled={page <= 1}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-linen text-walnut disabled:opacity-40 hover:bg-amber-pale transition-colors"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageNumbers.map((p, i) =>
                p === null ? (
                  <span key={`gap-${i}`} className="px-1.5 text-walnut-mid">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`h-9 min-w-9 px-2 inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                      p === page
                        ? 'bg-ink text-parchment'
                        : 'border border-linen text-walnut hover:bg-amber-pale'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}
              <button
                onClick={() => goToPage(page + 1)}
                disabled={page >= data.totalPages}
                className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-linen text-walnut disabled:opacity-40 hover:bg-amber-pale transition-colors"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile filters drawer */}
      {filtersOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={() => setFiltersOpen(false)} />
          <div className="w-80 max-w-[85%] bg-parchment h-full overflow-y-auto p-5 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-ink">{t('filters')}</h2>
              <button onClick={() => setFiltersOpen(false)} className="p-1.5 rounded-lg text-walnut hover:bg-amber-pale">
                <X className="h-4 w-4" />
              </button>
            </div>
            {filterControls}
          </div>
        </div>
      )}
    </div>
  )
}

/* ---------- Sub-components ---------- */

function FilterSelect({
  label, value, onChange, allLabel, options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  allLabel: string
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-walnut mb-1.5">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full h-9 rounded-lg border border-linen bg-parchment-card px-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-amber/40"
      >
        <option value="">{allLabel}</option>
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

function MarketCard({
  book, isLoggedIn, tCat, t,
}: {
  book: MarketBook
  isLoggedIn: boolean
  tCat: ReturnType<typeof useTranslations>
  t: ReturnType<typeof useTranslations>
}) {
  const seller = book.seller
  const priceLabel = formatPrice(book.sale_price, book.sale_currency)
  const loc = seller && seller.city && seller.country
    ? t('seller_in', { city: seller.city, country: seller.country })
    : seller?.country || seller?.city || ''

  return (
    <div className="bg-parchment-card rounded-xl border border-linen overflow-hidden flex flex-col">
      <div
        className="w-full flex items-center justify-center relative"
        style={{ aspectRatio: '2/3', backgroundColor: book.cover_url ? '#f5e6d0' : getCategoryColor(book.category) }}
      >
        {book.cover_url
          ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" loading="lazy" />
          : <span className="px-3 font-serif text-sm text-parchment/85 text-center leading-snug line-clamp-4">{book.title}</span>
        }
        {priceLabel && (
          <span className="absolute top-2 right-2 bg-amber text-white text-xs font-semibold px-2 py-1 rounded-full shadow">
            {priceLabel}
          </span>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        <div>
          <p className="text-sm font-medium text-ink leading-snug line-clamp-2">{book.title}</p>
          <p className="text-xs text-walnut line-clamp-1">{book.author}</p>
        </div>

        {book.category && (
          <span className="inline-block text-[10px] font-medium text-walnut bg-amber-light rounded-full px-2 py-0.5 self-start">
            {translateCategory(book.category, tCat)}
          </span>
        )}

        {/* Seller */}
        {seller && (
          <SellerLine seller={seller} loc={loc} t={t} />
        )}

        <div className="mt-auto pt-1">
          <MarketBuyButton bookId={book.id} bookTitle={book.title} priceLabel={priceLabel} isLoggedIn={isLoggedIn} t={t} />
        </div>
      </div>
    </div>
  )
}

function SellerLine({
  seller, loc, t,
}: {
  seller: Seller
  loc: string
  t: ReturnType<typeof useTranslations>
}) {
  // Anonymous view: the API omits name/avatar/username, so show location only
  // plus a locked hint inviting the visitor to log in for full seller details.
  if (!seller.name) {
    return (
      <div className="flex flex-col gap-1 text-walnut">
        {loc && (
          <span className="flex items-center gap-1 text-[11px] text-walnut-mid">
            <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{loc}</span>
          </span>
        )}
        <Link
          href="/login?next=/marketplace"
          className="flex items-center gap-1 text-[11px] text-walnut-mid hover:text-ink transition-colors"
        >
          <Lock className="h-3 w-3 shrink-0" /> <span className="truncate">{t('login_to_see_seller')}</span>
        </Link>
      </div>
    )
  }

  const initials = seller.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const inner = (
    <span className="flex items-center gap-1.5 min-w-0">
      {seller.avatar_url
        ? <img src={seller.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover shrink-0" />
        : <span className="h-5 w-5 rounded-full bg-amber-light text-walnut text-[9px] font-semibold flex items-center justify-center shrink-0">{initials}</span>
      }
      <span className="min-w-0">
        <span className="block text-xs text-ink truncate">{seller.name}</span>
      </span>
    </span>
  )
  return (
    <div className="flex flex-col gap-0.5 text-walnut">
      {seller.username
        ? <Link href={`/${seller.username}`} className="hover:opacity-80 transition-opacity">{inner}</Link>
        : inner}
      {loc && (
        <span className="flex items-center gap-1 text-[11px] text-walnut-mid">
          <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{loc}</span>
        </span>
      )}
    </div>
  )
}

function MarketBuyButton({
  bookId, bookTitle, priceLabel, isLoggedIn, t,
}: {
  bookId: string
  bookTitle: string
  priceLabel: string
  isLoggedIn: boolean
  t: ReturnType<typeof useTranslations>
}) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  if (!isLoggedIn) {
    return (
      <Link
        href="/login?next=/marketplace"
        className="block w-full text-center h-9 leading-9 rounded-lg bg-ink text-parchment text-sm font-medium hover:bg-ink-light transition-colors"
      >
        {t('buy_button')}
      </Link>
    )
  }

  if (sent) {
    return (
      <span className="block w-full text-center h-9 leading-9 rounded-lg border border-linen text-xs font-medium text-walnut-mid">
        {t('buy_sent')} ✓
      </span>
    )
  }

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch('/api/sale-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, message }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error ?? t('buy_error'))
        return
      }
      setSent(true)
      setOpen(false)
      toast.success(t('buy_sent'))
    } catch {
      toast.error(t('buy_error'))
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full h-9 rounded-lg bg-ink text-parchment text-sm font-medium hover:bg-ink-light transition-colors"
      >
        {t('buy_button')}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-parchment-card shadow-xl p-6">
            <h3 className="font-serif font-semibold text-ink text-lg mb-1">{t('buy_button')}</h3>
            <p className="text-sm text-walnut mb-1 truncate">&ldquo;{bookTitle}&rdquo;</p>
            {priceLabel && <p className="text-sm font-medium text-ink mb-4">{priceLabel}</p>}
            {!priceLabel && <div className="mb-4" />}

            <label className="block text-xs font-medium text-walnut mb-1.5">{t('buy_message')}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder={t('buy_message_placeholder')}
              className="w-full resize-none rounded-xl border border-linen bg-parchment px-3 py-2.5 text-sm placeholder-walnut-mid focus:outline-none focus:ring-2 focus:ring-amber/40"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 h-9 rounded-xl bg-ink text-parchment text-sm font-medium hover:bg-ink-light disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-2"
              >
                {sending && <Loader2 className="h-4 w-4 animate-spin" />}
                {sending ? t('buy_sending') : t('buy_send')}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={sending}
                className="h-9 px-4 rounded-xl border border-linen text-walnut text-sm hover:bg-amber-pale transition-colors"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/* ---------- helpers ---------- */

// Windowed pagination: 1 … (p-1) p (p+1) … last. null = ellipsis.
function buildPageWindow(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: (number | null)[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push(null)
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total - 1) pages.push(null)
  pages.push(total)
  return pages
}
