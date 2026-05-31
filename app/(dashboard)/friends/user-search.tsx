'use client'

import { useState, useTransition } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { sendFriendRequest } from './actions'
import type { Profile, Friend } from '@/types'

async function search(query: string, currentUserId: string): Promise<Profile[]> {
  const res = await fetch(
    `/api/users/search?q=${encodeURIComponent(query)}&uid=${currentUserId}`
  )
  if (!res.ok) return []
  return res.json()
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function UserSearch({
  currentUserId,
  existingFriends,
}: {
  currentUserId: string
  existingFriends: Friend[]
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Profile[]>([])
  const [searched, setSearched] = useState(false)
  const [sent, setSent] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  const existingIds = new Set(existingFriends.map(f => f.profile.id))

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!query.trim()) return
    const data = await search(query.trim(), currentUserId)
    setResults(data)
    setSearched(true)
  }

  function handleSend(addresseeId: string) {
    startTransition(async () => {
      const result = await sendFriendRequest(addresseeId)
      if (!result?.error) setSent(prev => new Set(prev).add(addresseeId))
    })
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name…"
          className="border-stone-200 focus-visible:ring-stone-400"
        />
        <Button
          type="submit"
          className="bg-stone-800 hover:bg-stone-700 text-white shrink-0"
        >
          Search
        </Button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-sm text-stone-400">No users found.</p>
      )}

      {results.length > 0 && (
        <ul className="divide-y divide-stone-100">
          {results.map(user => {
            const alreadyFriend = existingIds.has(user.id)
            const justSent = sent.has(user.id)
            return (
              <li key={user.id} className="flex items-center gap-3 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm text-stone-800">{user.name}</span>
                {alreadyFriend ? (
                  <span className="text-xs text-stone-400">Already connected</span>
                ) : justSent ? (
                  <span className="text-xs text-stone-400">Request sent</span>
                ) : (
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleSend(user.id)}
                    className="bg-stone-800 hover:bg-stone-700 text-white"
                  >
                    Add friend
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
