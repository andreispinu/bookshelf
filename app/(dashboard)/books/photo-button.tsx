'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronDown, Pencil, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PhotoModal from './photo-modal'

export default function AddBookButton() {
  const t = useTranslations('books')
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [dropdownOpen])

  return (
    <>
      <div ref={ref} className="relative">
        <Button
          className="bg-stone-800 hover:bg-stone-700 text-white flex items-center gap-1.5"
          onClick={() => setDropdownOpen(v => !v)}
        >
          {t('addBook')}
          <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </Button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-1.5 w-64 rounded-xl border border-stone-200 bg-white shadow-lg py-1.5 z-10">
            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 text-left"
              onClick={() => { setDropdownOpen(false); router.push('/books/add') }}
            >
              <div className="shrink-0 h-9 w-9 rounded-lg border border-stone-200 bg-stone-50 flex items-center justify-center text-stone-600">
                <Pencil className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">{t('addManually')}</p>
                <p className="text-xs text-stone-400">{t('addManuallyDesc')}</p>
              </div>
            </button>

            <button
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-stone-50 text-left"
              onClick={() => { setDropdownOpen(false); setModalOpen(true) }}
            >
              <div className="shrink-0 h-9 w-9 rounded-lg bg-stone-800 flex items-center justify-center text-white">
                <Camera className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-stone-800">{t('addWithAI')}</p>
                <p className="text-xs text-stone-400">{t('addWithAIDesc')}</p>
              </div>
            </button>
          </div>
        )}
      </div>

      <PhotoModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  )
}
