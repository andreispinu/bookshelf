'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { updateBookAvailability } from './actions'
import { CURRENCIES, formatPrice } from '@/lib/format-currency'
import type { Book } from '@/types'

type Props = {
  book: Book
  onClose: () => void
  onSaved: (updated: Partial<Book>) => void
}

export default function AvailabilityModal({ book, onClose, onSaved }: Props) {
  const t = useTranslations('books')
  const tc = useTranslations('common')

  const [mode, setMode] = useState<'lend_only' | 'sell_only' | 'lend_and_sell'>(
    book.availability_mode ?? 'lend_only'
  )
  const [price, setPrice] = useState(book.sale_price != null ? String(book.sale_price) : '')
  const [currency, setCurrency] = useState(book.sale_currency ?? 'EUR')
  const [conditionNote, setConditionNote] = useState(book.condition_note ?? '')
  const [saving, setSaving] = useState(false)

  const showPrice = mode === 'sell_only' || mode === 'lend_and_sell'

  async function handleSave() {
    if (showPrice && !price.trim()) {
      toast.error(t('priceRequired'))
      return
    }
    const parsedPrice = showPrice ? parseFloat(price) : null
    if (showPrice && (isNaN(parsedPrice!) || parsedPrice! <= 0)) {
      toast.error(t('priceRequired'))
      return
    }
    setSaving(true)
    const result = await updateBookAvailability(
      book.id,
      mode,
      parsedPrice,
      showPrice ? currency : null,
      showPrice && conditionNote.trim() ? conditionNote.trim() : null,
    )
    setSaving(false)
    if (result?.error) {
      toast.error(result.error)
      return
    }
    toast.success(t('availabilityUpdated'))
    onSaved({
      availability_mode: mode,
      sale_price: parsedPrice,
      sale_currency: showPrice ? currency : null,
      condition_note: showPrice && conditionNote.trim() ? conditionNote.trim() : null,
    })
    onClose()
  }

  const modes = [
    { value: 'lend_only' as const, label: t('lendOnly'), desc: t('lendOnlyDesc') },
    { value: 'sell_only' as const, label: t('sellOnly'), desc: t('sellOnlyDesc') },
    { value: 'lend_and_sell' as const, label: t('lendAndSell'), desc: t('lendAndSellDesc') },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
        <h3 className="font-semibold text-stone-800 text-base mb-1">{t('bookAvailability')}</h3>
        <p className="text-xs text-stone-500 mb-4 truncate">"{book.title}"</p>

        <div className="space-y-2 mb-4">
          {modes.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                mode === m.value
                  ? 'border-stone-800 bg-stone-50'
                  : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <p className={`text-sm font-medium ${mode === m.value ? 'text-stone-900' : 'text-stone-700'}`}>
                {m.label}
              </p>
              <p className="text-xs text-stone-500 mt-0.5">{m.desc}</p>
            </button>
          ))}
        </div>

        {showPrice && (
          <div className="space-y-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">{t('salePrice')}</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="0.00"
                  className="flex-1 rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
                />
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  className="h-9 rounded-xl border border-stone-200 bg-white px-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-300"
                >
                  {CURRENCIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {price && !isNaN(parseFloat(price)) && (
                <p className="text-xs text-stone-400 mt-1">{formatPrice(parseFloat(price), currency)}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-600 mb-1.5">{t('conditionNote')}</label>
              <input
                type="text"
                value={conditionNote}
                onChange={e => setConditionNote(e.target.value)}
                placeholder={t('conditionNotePlaceholder')}
                className="w-full rounded-xl border border-stone-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-stone-300"
              />
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 bg-stone-800 text-white hover:bg-stone-700"
          >
            {saving ? tc('saving') : tc('save')}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={saving}
            className="border-stone-200 text-stone-600 hover:bg-stone-50"
          >
            {tc('cancel')}
          </Button>
        </div>
      </div>
    </div>
  )
}
