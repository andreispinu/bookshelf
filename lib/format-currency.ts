const CURRENCY_FORMATS: Record<string, { symbol: string; position: 'before' | 'after' }> = {
  EUR: { symbol: '€', position: 'before' },
  USD: { symbol: '$', position: 'before' },
  GBP: { symbol: '£', position: 'before' },
  RON: { symbol: 'lei', position: 'after' },
  MDL: { symbol: 'L', position: 'after' },
}

export const CURRENCIES = ['EUR', 'USD', 'GBP', 'RON', 'MDL'] as const
export type Currency = typeof CURRENCIES[number]

export function formatPrice(amount: number | null | undefined, currency: string | null | undefined): string {
  if (amount == null) return ''
  const cur = currency ?? 'EUR'
  const fmt = CURRENCY_FORMATS[cur]
  if (!fmt) return `${amount} ${cur}`
  const rounded = Number.isInteger(amount) ? amount : amount.toFixed(2)
  return fmt.position === 'before' ? `${fmt.symbol}${rounded}` : `${rounded} ${fmt.symbol}`
}
