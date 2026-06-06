import { Tag } from 'lucide-react'
import { formatPrice } from '@/lib/format-currency'

export function PricePill({
  price,
  currency,
}: {
  price: number | null | undefined
  currency: string | null | undefined
}) {
  const text = formatPrice(price, currency)
  if (!text) return null
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[10px] sm:text-[11px] font-medium leading-none whitespace-nowrap shrink-0"
      style={{ border: '0.5px solid #fcd34d' }}
    >
      <Tag className="h-2.5 w-2.5 shrink-0" />
      {text}
    </span>
  )
}
