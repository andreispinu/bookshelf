'use client'

import { useState, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

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
  return (
    <Badge
      variant="outline"
      className={`text-xs ${
        status === 'available'
          ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
          : 'border-amber-200 text-amber-700 bg-amber-50'
      }`}
    >
      {status === 'available' ? 'Available' : 'Lent out'}
    </Badge>
  )
}

function BookGroupRow({ group }: { group: BookGroup }) {
  const [expanded, setExpanded] = useState(false)
  const isMulti = group.copies.length > 1

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
        <p className="font-medium text-stone-800 truncate">{group.title}</p>
        <p className="text-sm text-stone-500 truncate">{group.author}</p>
        {group.category && <p className="text-xs text-stone-400 mt-0.5">{group.category}</p>}

        <div className="mt-1.5">
          {!isMulti ? (
            <div className="flex items-center gap-2 flex-wrap">
              <FriendAvatar friend={group.copies[0].friend} />
              <span className="text-xs text-stone-600">{group.copies[0].friend.name}</span>
              <StatusBadge status={group.copies[0].status} />
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
                  {group.copies.length} friends have this
                  <span className="ml-1 text-stone-400">{expanded ? '▴' : '▾'}</span>
                </span>
              </button>

              {expanded && (
                <ul className="mt-2 space-y-1.5 pl-1">
                  {group.copies.map(copy => (
                    <li key={copy.bookId} className="flex items-center gap-2">
                      <FriendAvatar friend={copy.friend} />
                      <span className="text-xs text-stone-600">{copy.friend.name}</span>
                      <StatusBadge status={copy.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

export default function ShelfClient({ groups }: { groups: BookGroup[] }) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'recent' | 'title' | 'popular'>('recent')
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const uniqueCategories = useMemo(() =>
    [...new Set(groups.filter(g => g.category).map(g => g.category as string))].sort(),
    [groups]
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    let result = groups
    if (q) result = result.filter(g => g.title.toLowerCase().includes(q) || g.author.toLowerCase().includes(q))
    if (activeCategory) result = result.filter(g => g.category === activeCategory)

    if (sort === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    } else if (sort === 'popular') {
      result = [...result].sort((a, b) => b.copies.length - a.copies.length)
    } else {
      result = [...result].sort((a, b) => b.latestAddedAt.localeCompare(a.latestAddedAt))
    }

    return result
  }, [groups, query, sort])

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <Input
          placeholder="Search by title or author…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="border-stone-200 focus-visible:ring-stone-400 max-w-xs"
        />
        <select
          value={sort}
          onChange={e => setSort(e.target.value as 'recent' | 'title' | 'popular')}
          className="h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
        >
          <option value="recent">Recently added</option>
          <option value="title">Title A–Z</option>
          <option value="popular">Most popular</option>
        </select>
      </div>

      {uniqueCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            All
          </button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-stone-400">
          <p>No books match your search.</p>
        </div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {filtered.map(group => (
            <BookGroupRow key={group.key} group={group} />
          ))}
        </ul>
      )}
    </div>
  )
}
