'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function AdminRefreshButton() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 1500)
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={refreshing}
      className="text-sm text-stone-500 hover:text-stone-800 border border-stone-200 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50"
    >
      {refreshing ? 'Refreshing…' : 'Refresh data'}
    </button>
  )
}
