'use client'

import { useState } from 'react'
import Link from 'next/link'

const plans = [
  { id: 'monthly', label: 'Monthly', price: '$1', period: 'per month', description: 'Cancel any time.', highlight: false },
  { id: 'annual',  label: 'Annual',  price: '$10', period: 'per year', description: '2 months free vs monthly.', highlight: true },
]

export default function SubscribePage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubscribe(planId: string) {
    setError(null)
    setLoading(planId)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to start checkout')
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-semibold text-stone-800 tracking-tight"><Link href="/">BookShelf</Link></h1>
          <p className="text-stone-500 mt-2">Upgrade to unlimited books</p>
          <p className="text-stone-400 text-sm mt-1">You&apos;ve used all 10 free book slots. Upgrade to add unlimited books and keep building your library.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 flex flex-col gap-4 ${
                plan.highlight
                  ? 'border-stone-800 bg-stone-800 text-white shadow-md'
                  : 'border-stone-200 bg-white text-stone-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${plan.highlight ? 'text-stone-300' : 'text-stone-500'}`}>
                  {plan.label}
                </span>
                {plan.highlight && (
                  <span className="text-xs bg-amber-400 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                    Best value
                  </span>
                )}
              </div>

              <div>
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className={`text-sm ml-1 ${plan.highlight ? 'text-stone-400' : 'text-stone-400'}`}>
                  {plan.period}
                </span>
              </div>

              <p className={`text-sm ${plan.highlight ? 'text-stone-400' : 'text-stone-500'}`}>
                {plan.description}
              </p>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading !== null}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${
                  plan.highlight
                    ? 'bg-white text-stone-900 hover:bg-stone-100'
                    : 'bg-stone-800 text-white hover:bg-stone-700'
                }`}
              >
                {loading === plan.id ? 'Loading…' : 'Get unlimited'}
              </button>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-red-600 mt-4">{error}</p>
        )}

        <p className="text-center text-xs text-stone-400 mt-8">
          Payments are processed securely by Stripe. Cancel any time from your account.
        </p>
      </div>
    </div>
  )
}
