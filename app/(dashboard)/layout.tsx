import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Nav from './nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url, subscription_status, trial_ends_at')
    .eq('id', user.id)
    .single()

  // Access control: allow trialing (within window) or active subscriptions
  const now = new Date()
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const isTrialing = profile?.subscription_status === 'trialing' && !!trialEndsAt && trialEndsAt > now
  const isActive = profile?.subscription_status === 'active'

  if (!isTrialing && !isActive) {
    redirect('/subscribe')
  }

  // Trial countdown banner (shown when ≤ 3 days remain)
  const msLeft = trialEndsAt ? trialEndsAt.getTime() - now.getTime() : 0
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
  const showBanner = isTrialing && daysLeft <= 3

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav userName={profile?.name ?? user.email ?? ''} />
      {showBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          {daysLeft <= 1
            ? 'Your free trial expires today.'
            : `${daysLeft} days left in your free trial.`}
          {' '}
          <Link href="/subscribe" className="font-semibold underline underline-offset-2">
            Subscribe to keep access →
          </Link>
        </div>
      )}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
