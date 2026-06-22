'use client'

import { useState } from 'react'

export type AdminUserRow = {
  id: string
  name: string | null
  email: string
  joined: string
  plan: string | null
  isPaid: boolean
  bookCount: number
}

// Book count is the primary conversion signal now (free tier caps at 10 books).
// Paid users show a ✓ indicator with no limit flag; free users get flagged as
// they approach / hit the 10-book ceiling.
function BooksCell({ count, isPaid }: { count: number; isPaid: boolean }) {
  if (isPaid) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-medium text-stone-800">{count}</span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">✓ paid</span>
      </span>
    )
  }
  if (count >= 10) {
    // At the free-tier limit — must upgrade to add more.
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">{count} 🔒</span>
  }
  if (count >= 8) {
    // Near the limit.
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">{count}/10</span>
  }
  return <span className="font-medium text-stone-800">{count}</span>
}

export default function AdminUsersTable({ users }: { users: AdminUserRow[] }) {
  const [sortByBooks, setSortByBooks] = useState(false)
  const rows = sortByBooks ? [...users].sort((a, b) => b.bookCount - a.bookCount) : users

  return (
    <div className="rounded-xl border border-stone-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50 border-b border-stone-200">
            {['Name', 'Email', 'Joined'].map(h => (
              <th key={h} className="text-left px-4 py-3 text-xs text-stone-400 font-medium uppercase tracking-wide">{h}</th>
            ))}
            <th className="text-left px-4 py-3">
              <button
                onClick={() => setSortByBooks(v => !v)}
                className={`inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wide transition-colors ${
                  sortByBooks ? 'text-stone-900' : 'text-stone-400 hover:text-stone-600'
                }`}
                title="Sort by book count (descending)"
              >
                Books
                <span className={sortByBooks ? 'opacity-100' : 'opacity-40'}>▼</span>
              </button>
            </th>
            <th className="text-left px-4 py-3 text-xs text-stone-400 font-medium uppercase tracking-wide">Plan</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map(u => (
            <tr key={u.id} className="hover:bg-stone-50 transition-colors">
              <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap">{u.name ?? '—'}</td>
              <td className="px-4 py-3 text-stone-500">{u.email || '—'}</td>
              <td className="px-4 py-3 text-stone-400 whitespace-nowrap">
                {new Date(u.joined).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>
              <td className="px-4 py-3"><BooksCell count={u.bookCount} isPaid={u.isPaid} /></td>
              <td className="px-4 py-3 text-stone-500 capitalize">{u.plan ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
