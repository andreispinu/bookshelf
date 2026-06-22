'use client'

import { useMemo, useState } from 'react'

export type AdminUserRow = {
  id: string
  name: string | null
  email: string
  joined: string
  isPaid: boolean
  bookCount: number
}

const PAGE_SIZE = 20

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'
}

// Book count is the primary conversion signal (free tier caps at 10 books).
// Paid users show a ✓ indicator with no limit flag; free users get flagged as
// they approach / hit the 10-book ceiling, and a never-active 0 is highlighted.
function BooksCell({ count, isPaid }: { count: number; isPaid: boolean }) {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-medium text-stone-800">{count}</span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">✓ Paid</span>
      </span>
    )
  }
  if (count >= 10) {
    // At the free-tier limit — must upgrade to add more.
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">10/10 🔒</span>
  }
  if (count >= 8) {
    // Near the limit.
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{count}/10</span>
  }
  if (count === 0) {
    // Signed up but never added a book.
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-400">0</span>
  }
  return <span className="font-medium text-stone-800">{count}</span>
}

type SortKey = 'joined' | 'books' | 'plan'

function SortHeader({
  label, col, sortKey, sortDir, onSort,
}: {
  label: string
  col: SortKey
  sortKey: SortKey
  sortDir: 'asc' | 'desc'
  onSort: (col: SortKey) => void
}) {
  const active = sortKey === col
  return (
    <th className="text-left px-4 py-3">
      <button
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors ${
          active ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
        }`}
      >
        {label}
        <span className={active ? 'opacity-100' : 'opacity-30'}>{active && sortDir === 'asc' ? '▲' : '▼'}</span>
      </button>
    </th>
  )
}

export default function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('joined')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  function handleSort(col: SortKey) {
    if (col === sortKey) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(col)
      // Sensible default direction per column: newest / most / paid first.
      setSortDir('desc')
    }
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter(u =>
      (u.name ?? '').toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    )
  }, [users, search])

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'books') return (a.bookCount - b.bookCount) * dir
      if (sortKey === 'plan') return ((a.isPaid ? 1 : 0) - (b.isPaid ? 1 : 0)) * dir
      // joined
      return (new Date(a.joined).getTime() - new Date(b.joined).getTime()) * dir
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const pageRows = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest">
          All Users <span className="text-stone-300 normal-case tracking-normal font-normal">({users.length} total)</span>
        </h3>
        <input
          type="text"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or email…"
          className="w-full sm:w-64 px-3 py-1.5 text-sm rounded-lg border border-stone-200 bg-white text-stone-700 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-200"
        />
      </div>

      <div className="rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-stone-50 border-b border-stone-200">
              <th className="text-left px-4 py-3 text-xs text-stone-400 font-medium uppercase tracking-wide">User</th>
              <SortHeader label="Joined" col="joined" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Books" col="books" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
              <SortHeader label="Plan" col="plan" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {pageRows.map(u => (
              <tr key={u.id} className="hover:bg-stone-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-stone-200 flex items-center justify-center shrink-0 text-xs font-semibold text-stone-600">
                      {initials(u.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-stone-800 truncate">{u.name ?? '—'}</p>
                      <p className="text-xs text-stone-400 truncate">{u.email || '—'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-stone-400 whitespace-nowrap">
                  {new Date(u.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </td>
                <td className="px-4 py-3"><BooksCell count={u.bookCount} isPaid={u.isPaid} /></td>
                <td className="px-4 py-3">
                  {u.isPaid
                    ? <span className="text-green-700 font-medium">Paid</span>
                    : <span className="text-stone-500">Free</span>}
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-sm text-stone-400">No users match your search.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-stone-400">
            Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-stone-500">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 text-stone-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-stone-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
