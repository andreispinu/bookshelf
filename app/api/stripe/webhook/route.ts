import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email'
import { subscriptionConfirmedEmail, type EmailLang } from '@/lib/email-templates'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  console.log('[webhook] received, signature present:', !!signature)
  console.log('[webhook] STRIPE_WEBHOOK_SECRET set:', !!process.env.STRIPE_WEBHOOK_SECRET)
  console.log('[webhook] STRIPE_SECRET_KEY set:', !!process.env.STRIPE_SECRET_KEY)
  console.log('[webhook] STRIPE_MONTHLY_PRICE_ID:', process.env.STRIPE_MONTHLY_PRICE_ID)

  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    // Misconfiguration, not a bad request: surface it clearly instead of letting
    // constructEvent throw a cryptic "key argument must be a string" TypeError.
    console.error('[webhook] STRIPE_WEBHOOK_SECRET is not set in this environment')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[webhook] verification failed:', err)
    return NextResponse.json({ error: `Webhook verification failed: ${err}` }, { status: 400 })
  }

  console.log('[webhook] event type:', event.type)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.userId
      console.log('[webhook] checkout.session.completed — userId:', userId, 'subscription:', session.subscription)

      if (!userId || !session.subscription) {
        console.warn('[webhook] missing userId or subscription, skipping')
        break
      }

      const subscription = await getStripe().subscriptions.retrieve(session.subscription as string)
      const item = subscription.items.data[0]
      const priceId = item.price.id
      const plan = priceId === process.env.STRIPE_MONTHLY_PRICE_ID ? 'monthly' : 'annual'
      const periodEnd = item.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null

      console.log('[webhook] updating profile — plan:', plan, 'periodEnd:', periodEnd, 'customer:', session.customer)

      const { error } = await supabaseAdmin.from('profiles').update({
        stripe_customer_id:      session.customer as string,
        stripe_subscription_id:  session.subscription as string,
        subscription_status:     'active',
        subscription_plan:       plan,
        subscription_ends_at:    periodEnd,
      }).eq('id', userId)

      if (error) console.error('[webhook] supabase update error:', error)
      else console.log('[webhook] profile updated successfully')

      // Set subscribed_at on first activation only
      await supabaseAdmin.from('profiles')
        .update({ subscribed_at: new Date().toISOString() })
        .eq('id', userId)
        .is('subscribed_at', null)

      // Confirmation email (fire-and-forget — never block or fail the webhook)
      if (!error) {
        ;(async () => {
          const [{ data: profile }, { data: authUser }] = await Promise.all([
            supabaseAdmin.from('profiles').select('first_name, ui_language').eq('id', userId).single(),
            supabaseAdmin.auth.admin.getUserById(userId),
          ])
          const to = authUser?.user?.email
          if (!to) return
          const firstName = profile?.first_name || 'there'
          const lang = (profile?.ui_language as EmailLang) || 'en'
          const { subject, html } = subscriptionConfirmedEmail(firstName, plan, periodEnd, lang)
          await sendEmail({ to, subject, html })
        })().catch((e) => console.error('[webhook] confirmation email failed:', e))
      }

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

      console.log('[webhook] subscription.updated — customer:', subscription.customer, 'status:', status)

      const { error } = await supabaseAdmin.from('profiles').update({
        subscription_status:  status,
        subscription_plan:    plan,
        subscription_ends_at: periodEnd,
      }).eq('stripe_customer_id', subscription.customer as string)

      if (error) console.error('[webhook] supabase update error:', error)
      else console.log('[webhook] profile updated successfully')
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      console.log('[webhook] subscription.deleted — customer:', subscription.customer)

      const { error } = await supabaseAdmin.from('profiles').update({
        subscription_status:    'canceled',
        stripe_subscription_id: null,
        subscription_plan:      null,
      }).eq('stripe_customer_id', subscription.customer as string)

      if (error) console.error('[webhook] supabase update error:', error)
      else console.log('[webhook] profile updated successfully')
      break
    }

    default:
      console.log('[webhook] unhandled event type:', event.type)
  }

  return NextResponse.json({ received: true })
}
