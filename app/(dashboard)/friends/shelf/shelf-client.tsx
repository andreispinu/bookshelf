'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { translateCategory } from '@/lib/translate-category'
import { PricePill } from '@/components/price-pill'
import ViewToggle, { useViewMode } from '../../books/view-toggle'
import Pagination from '../../components/pagination'
import BuyButton from '../[id]/buy-button'

export type FriendInfo = {
  id: string
  name: string
  avatar_url: string | null
}

export type BookCopy = {
  bookId: string
  friend: FriendInfo
  status: 'available' | 'lent_out'
  created_at: string
  availabilityMode?: string
  salePrice?: number | null
  saleCurrency?: string | null
  conditionNote?: string | null
}

export type BookGroup = {
  key: string
  title: string
  author: string
  isbn: string | null
  cover_url: string | null
  category: string | null
  copies: BookCopy[]
  latestAddedAt: string
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function FriendAvatar({ friend, size = 5 }: { friend: FriendInfo; size?: number }) {
  const cls = `h-${size} w-${size} rounded-full bg-stone-200 overflow-hidden flex items-center justify-center text-[9px] font-medium text-stone-600 shrink-0`
  return (
    <div className={cls}>
      {friend.avatar_url
        ? <img src={friend.avatar_url} alt={friend.name} className="h-full w-full object-cover" />
        : initials(friend.name)
      }
    </div>
  )
}

function StatusBadge({ status }: { status: 'available' | 'lent_out' }) {
  const t = useTranslations('books')
  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        status === 'available'
          ? 'border-forest/30 text-forest bg-forest-light'
          : 'border-rust/30 text-rust bg-rust-light'
      }`}
    >
      {status === 'available' ? t('available') : t('lentOut')}
    </Badge>
  )
}

function BookGroupRow({ group, isReading }: { group: BookGroup; isReading: boolean }) {
  const tCat = useTranslations('categories')
  const [expanded, setExpanded] = useState(false)
  const isMulti = group.copies.length > 1

  const firstCopy = group.copies[0]

  return (
    <li className="flex items-start gap-4 py-4">
      {/* Cover */}
      <div className="shrink-0 w-10 h-14 rounded bg-stone-200 overflow-hidden flex items-center justify-center">
        {group.cover_url
          ? <img src={group.cover_url} alt={group.title} className="w-full h-full object-cover" />
          : <span className="text-stone-400 text-lg">📖</span>
        }
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-stone-800 truncate">{group.title}</p>
            <p className="text-sm text-stone-500 truncate">{group.author}</p>
            {group.category && <p className="text-xs text-stone-400 mt-0.5">{translateCategory(group.category, tCat)}</p>}
          </div>
          {isReading && (
            <Badge variant="outline" className="border-sky-200 text-sky-700 bg-sky-50 text-xs shrink-0 mt-0.5">
              Reading
            </Badge>
          )}
        </div>

        <div className="mt-1.5">
          {!isMulti ? (
            <div className="flex items-center gap-2 flex-wrap">
              <FriendAvatar friend={group.copies[0].friend} />
              <span className="text-xs text-stone-600">{group.copies[0].friend.name}</span>
              <StatusBadge status={group.copies[0].status} />
              {(group.copies[0].availabilityMode === 'sell_only' || group.copies[0].availabilityMode === 'lend_and_sell') && (
                <PricePill price={group.copies[0].salePrice} currency={group.copies[0].saleCurrency} />
              )}
              {(group.copies[0].availabilityMode === 'sell_only' || group.copies[0].availabilityMode === 'lend_and_sell') && (
                <BuyButton
                  bookId={group.copies[0].bookId}
                  bookTitle={group.title}
                  ownerId={group.copies[0].friend.id}
                  salePrice={group.copies[0].salePrice ?? null}
                  saleCurrency={group.copies[0].saleCurrency ?? null}
                  conditionNote={group.copies[0].conditionNote ?? null}
                />
              )}
            </div>
          ) : (
            <div>
              <button
                onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-2 group"
              >
                <div className="flex -space-x-1.5">
                  {group.copies.slice(0, 3).map(copy => (
                    <div
                      key={copy.bookId}
                      className="h-5 w-5 rounded-full bg-stone-300 ring-1 ring-white overflow-hidden flex items-center justify-center text-[9px] font-medium text-stone-600"
                    >
                      {copy.friend.avatar_url
                        ? <img src={copy.friend.avatar_url} alt={copy.friend.name} className="h-full w-full object-cover" />
                        : initials(copy.friend.name)
                      }
                    </div>
                  ))}
                </div>
                <span className="text-xs text-stone-500 group-hover:text-stone-700 transition-colors">
                  {group.copies.length} {group.copies.length === 1 ? 'friend' : 'friends'} have this
                  <span className="ml-1 text-stone-400">{expanded ? '▴' : '▾'}</span>
                </span>
              </button>

              {expanded && (
                <ul className="mt-2 space-y-1.5 pl-1">
                  {group.copies.map(copy => (
                    <li key={copy.bookId} className="flex items-center gap-2 flex-wrap">
                      <FriendAvatar friend={copy.friend} />
                      <span className="text-xs text-stone-600">{copy.friend.name}</span>
                      <StatusBadge status={copy.status} />
                      {(copy.availabilityMode === 'sell_only' || copy.availabilityMode === 'lend_and_sell') && (
                        <PricePill price={copy.salePrice} currency={copy.saleCurrency} />
                      )}
                      <Link
                        href={`/friends/${copy.friend.id}/books/${copy.bookId}`}
                        className="text-xs text-stone-400 hover:text-stone-700 transition-colors"
                      >
                        View →
                      </Link>
                      {(copy.availabilityMode === 'sell_only' || copy.availabilityMode === 'lend_and_sell') && (
                        <BuyButton
                          bookId={copy.bookId}
                          bookTitle={group.title}
                          ownerId={copy.friend.id}
                          salePrice={copy.salePrice ?? null}
                          saleCurrency={copy.saleCurrency ?? null}
                          conditionNote={copy.conditionNote ?? null}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View button — for single-copy show inline; multi-copy view links are in expanded list */}
      {!isMulti && (
        <div className="shrink-0 self-center">
          <Link
            href={`/friends/${firstCopy.friend.id}/books/${firstCopy.bookId}`}
            className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-50 transition-colors"
          >
            View →
          </Link>
        </div>
      )}
    </li>
  )
}

function BookGroupCard({ group, isReading }: { group: BookGroup; isReading: boolean }) {
  const tCat = useTranslations('categories')
  const t = useTranslations('books')
  const [expanded, setExpanded] = useState(false)
  const firstCopy = group.copies[0]
  const isMulti = group.copies.length > 1

  return (
    <div className="flex flex-col rounded-xl border border-stone-200 bg-white overflow-hidden">
      <div className="relative w-full aspect-[3/4] bg-stone-100 overflow-hidden">
        {isMulti ? (
          <button onClick={() => setExpanded(v => !v)} className="w-full h-full hover:opacity-90 transition-opacity">
            {group.cover_url
              ? <img src={group.cover_url} alt={group.title} className="w-full h-full object-cover" />
              : <span className="absolute inset-0 flex items-center justify-center text-4xl text-stone-300">📖</span>
            }
          </button>
        ) : (
          <Link href={`/friends/${firstCopy.friend.id}/books/${firstCopy.bookId}`} className="block w-full h-full hover:opacity-90 transition-opacity">
            {group.cover_url
              ? <img src={group.cover_url} alt={group.title} className="w-full h-full object-cover" />
              : <span className="absolute inset-0 flex items-center justify-center text-4xl text-stone-300">📖</span>
            }
          </Link>
        )}
        {isReading && (
          <span className="absolute top-1.5 left-1.5 pointer-events-none px-1.5 py-0.5 rounded-md bg-sky-100 border border-sky-200 text-sky-700 text-[10px] font-medium leading-none">
            Reading
          </span>
        )}
        {!isMulti && (firstCopy.availabilityMode === 'sell_only' || firstCopy.availabilityMode === 'lend_and_sell') && (
          <span className="absolute bottom-1.5 right-1.5 pointer-events-none">
            <PricePill price={firstCopy.salePrice} currency={firstCopy.saleCurrency} />
          </span>
        )}
      </div>
      <div className="p-2.5 flex flex-col gap-1 flex-1">
        <p className="text-xs font-semibold text-stone-800 leading-snug line-clamp-2">{group.title}</p>
        <p className="text-[11px] text-stone-500 truncate">{group.author}</p>
        {group.category && <p className="text-[10px] text-stone-400">{translateCategory(group.category, tCat)}</p>}
        <div className="mt-auto pt-1.5">
          {!isMulti ? (
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                <FriendAvatar friend={firstCopy.friend} />
                <StatusBadge status={firstCopy.status} />
              </div>
              <Link
                href={`/friends/${firstCopy.friend.id}/books/${firstCopy.bookId}`}
                className="shrink-0 text-[10px] text-stone-400 hover:text-stone-700 transition-colors"
              >
                {t('view')} →
              </Link>
            </div>
          ) : (
            <div>
              <button onClick={() => setExpanded(v => !v)} className="flex items-center gap-1.5 group">
                <div className="flex -space-x-1">
                  {group.copies.slice(0, 3).map(copy => (
                    <div key={copy.bookId} className="h-4 w-4 rounded-full bg-stone-300 ring-1 ring-white overflow-hidden flex items-center justify-center text-[8px] font-medium text-stone-600">
                      {copy.friend.avatar_url
                        ? <img src={copy.friend.avatar_url} alt={copy.friend.name} className="h-full w-full object-cover" />
                        : initials(copy.friend.name)
                      }
                    </div>
                  ))}
                </div>
                <span className="text-[10px] text-stone-500 group-hover:text-stone-700 transition-colors">
                  {group.copies.length} <span className="text-stone-400">{expanded ? '▴' : '▾'}</span>
                </span>
              </button>
              {expanded && (
                <ul className="mt-1.5 space-y-1">
                  {group.copies.map(copy => (
                    <li key={copy.bookId} className="flex items-center gap-1.5">
                      <FriendAvatar friend={copy.friend} size={4} />
                      <span className="text-[10px] text-stone-600 truncate flex-1">{copy.friend.name}</span>
                      <StatusBadge status={copy.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ShelfClient({ groups, readingBookIds: readingBookIdsArr = [] }: { groups: BookGroup[]; readingBookIds?: string[] }) {
  const tCat = useTranslations('categories')
  const t = useTranslations('books')
  const tc = useTranslations('common')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'title' | 'popular'>('recent')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showReading, setShowReading] = useState(false)
  const [viewMode, setViewMode] = useViewMode()
  const [page, setPage] = useState(1)

  const readingBookIds = useMemo(() => new Set(readingBookIdsArr), [readingBookIdsArr])

  const readingCount = useMemo(() =>
    groups.filter(g => g.copies.some(c => readingBookIds.has(c.bookId))).length,
    [groups, readingBookIds]
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const p = parseInt(params.get('page') ?? '1', 10)
    if (!isNaN(p) && p > 0) setPage(p)
  }, [])

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
    const params = new URLSearchParams(window.location.search)
    if (newPage === 1) params.delete('page')
    else params.set('page', String(newPage))
    const qs = params.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const uniqueCategories = useMemo(() =>
    [...new Set(groups.filter(g => g.category).map(g => g.category as string))].sort(),
    [groups]
  )

  const categoryCounts = useMemo(() =>
    groups.reduce<Record<string, number>>((acc, g) => {
      if (g.category) acc[g.category] = (acc[g.category] ?? 0) + 1
      return acc
    }, {}),
    [groups]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    let result = groups
    if (q) result = result.filter(g => g.title.toLowerCase().includes(q) || g.author.toLowerCase().includes(q))
    if (activeCategory) result = result.filter(g => g.category === activeCategory)
    if (showReading) result = result.filter(g => g.copies.some(c => readingBookIds.has(c.bookId)))

    if (sort === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    } else if (sort === 'popular') {
      result = [...result].sort((a, b) => b.copies.length - a.copies.length)
    } else {
      result = [...result].sort((a, b) => b.latestAddedAt.localeCompare(a.latestAddedAt))
    }

    return result
  }, [groups, query, sort, activeCategory, showReading, readingBookIds])

  const PAGE_SIZE = 10
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginatedGroups = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search by title or author…"
          value={query}
          onChange={e => { setQuery(e.target.value); handlePageChange(1) }}
          className="border-stone-200 focus-visible:ring-stone-400 max-w-xs"
        />
        <select
          value={sort}
          onChange={e => { setSort(e.target.value as 'recent' | 'title' | 'popular'); handlePageChange(1) }}
          className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="recent">Recently added</option>
          <option value="title">Title A–Z</option>
          <option value="popular">Most popular</option>
        </select>
        <div className="ml-auto">
          <ViewToggle mode={viewMode} onChange={setViewMode} />
        </div>
      </div>

      {(uniqueCategories.length > 0 || readingCount > 0) && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => { setActiveCategory(null); setShowReading(false); handlePageChange(1) }}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !activeCategory && !showReading ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {tc('all')} <span className={!activeCategory && !showReading ? 'opacity-75' : 'text-stone-400'}>({groups.length})</span>
          </button>
          {readingCount > 0 && (
            <button
              onClick={() => { setShowReading(v => !v); setActiveCategory(null); handlePageChange(1) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                showReading ? 'bg-sky-700 text-white' : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
              }`}
            >
              {t('currentlyReading')} <span className={showReading ? 'opacity-75' : 'text-sky-400'}>({readingCount})</span>
            </button>
          )}
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(activeCategory === cat ? null : cat); setShowReading(false); handlePageChange(1) }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {translateCategory(cat, tCat)} <span className={activeCategory === cat ? 'opacity-75' : 'text-stone-400'}>({categoryCounts[cat] ?? 0})</span>
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p>No books match your search.</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {paginatedGroups.map(group => (
            <BookGroupCard key={group.key} group={group} isReading={group.copies.some(c => readingBookIds.has(c.bookId))} />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {paginatedGroups.map(group => (
            <BookGroupRow key={group.key} group={group} isReading={group.copies.some(c => readingBookIds.has(c.bookId))} />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={handlePageChange}
      />
    </div>
  )
}
