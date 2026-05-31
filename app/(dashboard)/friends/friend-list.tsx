'use client'

import { useState, useTransition } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { respondToRequest, cancelOrRemoveFriend } from './actions'
import type { Friend } from '@/types'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function FriendList({ friends: initial }: { friends: Friend[] }) {
  const [friends, setFriends] = useState(initial)
  const [isPending, startTransition] = useTransition()

  const accepted  = friends.filter(f => f.status === 'accepted')
  const incoming  = friends.filter(f => f.status === 'pending' && f.direction === 'received')
  const outgoing  = friends.filter(f => f.status === 'pending' && f.direction === 'sent')

  function remove(friendshipId: string) {
    setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId))
  }

  function handleRespond(friendshipId: string, response: 'accepted' | 'declined') {
    startTransition(async () => {
      const result = await respondToRequest(friendshipId, response)
      if (!result?.error) {
        if (response === 'accepted') {
          setFriends(prev => prev.map(f =>
            f.friendshipId === friendshipId ? { ...f, status: 'accepted' } : f
          ))
        } else {
          remove(friendshipId)
        }
      }
    })
  }

  function handleCancel(friendshipId: string) {
    startTransition(async () => {
      const result = await cancelOrRemoveFriend(friendshipId)
      if (!result?.error) remove(friendshipId)
    })
  }

  return (
    <div className="space-y-8">

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
            Pending requests <Badge variant="outline" className="ml-1 border-amber-200 text-amber-700 bg-amber-50">{incoming.length}</Badge>
          </h3>
          <ul className="divide-y divide-stone-100">
            {incoming.map(f => (
              <li key={f.friendshipId} className="flex items-center gap-3 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                    {initials(f.profile.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm text-stone-800">{f.profile.name}</span>
                <div className="flex gap-1.5">
                  <Button
                    size="sm"
                    disabled={isPending}
                    onClick={() => handleRespond(f.friendshipId, 'accepted')}
                    className="bg-stone-800 hover:bg-stone-700 text-white"
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isPending}
                    onClick={() => handleRespond(f.friendshipId, 'declined')}
                    className="text-stone-400 hover:text-red-600"
                  >
                    Decline
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Friends */}
      <section>
        <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
          Friends <span className="text-stone-400 font-normal normal-case">({accepted.length})</span>
        </h3>
        {accepted.length === 0 ? (
          <p className="text-sm text-stone-400">No friends yet. Search for someone above.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {accepted.map(f => (
              <li key={f.friendshipId} className="flex items-center gap-3 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                    {initials(f.profile.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm text-stone-800">{f.profile.name}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleCancel(f.friendshipId)}
                  className="text-stone-300 hover:text-red-500"
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Outgoing requests */}
      {outgoing.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wide mb-3">
            Sent requests
          </h3>
          <ul className="divide-y divide-stone-100">
            {outgoing.map(f => (
              <li key={f.friendshipId} className="flex items-center gap-3 py-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                    {initials(f.profile.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="flex-1 text-sm text-stone-800">{f.profile.name}</span>
                <span className="text-xs text-stone-400 mr-2">Pending</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleCancel(f.friendshipId)}
                  className="text-stone-300 hover:text-red-500"
                >
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
