'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { LayoutGrid, List } from 'lucide-react'

export type ViewMode = 'grid' | 'list'

const STORAGE_KEY = 'bookshelf-view-mode'

export function useViewMode(): [ViewMode, (v: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>('grid')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'list' || stored === 'grid') setMode(stored)
  }, [])

  function setAndStore(v: ViewMode) {
    setMode(v)
    localStorage.setItem(STORAGE_KEY, v)
  }

  return [mode, setAndStore]
}

export default function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (v: ViewMode) => void }) {
  const t = useTranslations('books')

  return (
    <div className="flex items-center gap-0.5 rounded-lg border border-stone-200 p-0.5">
      <button
        onClick={() => onChange('grid')}
        title={t('gridView')}
        className={`p-1.5 rounded-md transition-colors ${
          mode === 'grid' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-stone-700'
        }`}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => onChange('list')}
        title={t('listView')}
        className={`p-1.5 rounded-md transition-colors ${
          mode === 'list' ? 'bg-stone-800 text-white' : 'text-stone-400 hover:text-stone-700'
        }`}
      >
        <List className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
