'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { formatPrice } from '@/lib/format-currency'

type Props = {
  bookId: string
  bookTitle: string
  ownerId: string
  salePrice: number | null
  saleCurrency: string | null
  conditionNote: string | null
}

export default function BuyButton({ bookId, bookTitle, ownerId, salePrice, saleCurrency, conditionNote }: Props) {
  const t = useTranslations('books')
  const tc = useTranslations('common')
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSend() {
    setSending(true)
    try {
      const res = await fetch('/api/sale-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId, sellerId: ownerId, message }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error ?? tc('somethingWentWrong'))
        return
      }
      setSent(true)
      toast.success(t('buyRequestSent'))
      setOpen(false)
    } catch {
      toast.error(tc('somethingWentWrong'))
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <span className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-stone-200 text-xs font-medium text-stone-400">
        {t('buyRequestSent')} ✓
      </span>
    )
  }

  const priceLabel = formatPrice(salePrice, saleCurrency)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center h-8 px-3 rounded-md border border-stone-800 bg-stone-800 text-white text-xs font-medium hover:bg-stone-700 transition-colors"
      >
        {t('buyThisBook')}{priceLabel ? ` · ${priceLabel}` : ''}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h3 className="font-semibold text-stone-800 text-base mb-1">{t('buyRequest')}</h3>
            <p className="text-sm text-stone-600 mb-1 truncate">"{bookTitle}"</p>

            {priceLabel && (
              <p className="text-sm font-medium text-stone-800 mb-1">{priceLabel}</p>
            )}
            {conditionNote && (
              <p className="text-xs text-stone-500 mb-4">{conditionNote}</p>
            )}
            {!priceLabel && !conditionNote && <div className="mb-4" />}

            <label className="block text-xs font-medium text-stone-600 mb-1.5">{t('buyMessage')}</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder={t('buyMessagePlaceholder')}
              className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSend}
                disabled={sending}
                className="flex-1 h-9 rounded-xl bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-50 transition-colors"
              >
                {sending ? t('sendingRequest') : t('sendBuyRequest')}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={sending}
                className="h-9 px-4 rounded-xl border border-stone-200 text-stone-600 text-sm hover:bg-stone-50 transition-colors"
              >
                {tc('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
