import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    return NextResponse.json({ error: `Webhook verification failed: ${err}` }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      if (!userId || !session.subscription) break

      const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
      const item = subscription.items.data[0]
      const priceId = item.price.id
      const plan = priceId === process.env.STRIPE_MONTHLY_PRICE_ID ? 'monthly' : 'annual'
      const periodEnd = item.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null

      await supabaseAdmin.from('profiles').update({
        stripe_customer_id:      session.customer as string,
        stripe_subscription_id:  session.subscription as string,
        subscription_status:     'active',
        subscription_plan:       plan,
        subscription_ends_at:    periodEnd,
      }).eq('id', userId)
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const item = subscription.items.data[0]
      const priceId = item.price.id
      const plan = priceId === process.env.STRIPE_MONTHLY_PRICE_ID ? 'monthly' : 'annual'
      const status = subscription.status === 'active' ? 'active'
        : subscription.status === 'past_due' ? 'past_due'
        : subscription.status === 'canceled' ? 'canceled'
        : 'active'
      const periodEnd = item.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null

      await supabaseAdmin.from('profiles').update({
        subscription_status:  status,
        subscription_plan:    plan,
        subscription_ends_at: periodEnd,
      }).eq('stripe_customer_id', subscription.customer as string)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await supabaseAdmin.from('profiles').update({
        subscription_status:    'canceled',
        stripe_subscription_id: null,
        subscription_plan:      null,
      }).eq('stripe_customer_id', subscription.customer as string)
      break
    }
  }

  return NextResponse.json({ received: true })
}
