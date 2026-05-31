import Stripe from 'stripe'

// Server-side only — never import in client components
// Lazy singleton to avoid crashing at build time when env vars aren't present
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-05-27.dahlia',
    })
  }
  return _stripe
}
