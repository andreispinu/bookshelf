import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import Nav from './nav'
import MobileBottomNav from './mobile-bottom-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url, subscription_status, trial_ends_at, first_name, last_name, username, country, city')
    .eq('id', user.id)
    .single()

  const now = new Date()
  const trialEndsAt = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const isTrialing = profile?.subscription_status === 'trialing' && !!trialEndsAt && trialEndsAt > now
  const isActive = profile?.subscription_status === 'active'

  if (!isTrialing && !isActive) {
    redirect('/subscribe')
  }

  const msLeft = trialEndsAt ? trialEndsAt.getTime() - now.getTime() : 0
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24))
  const showBanner = isTrialing && daysLeft <= 3

  const missingCount = [
    profile?.first_name,
    profile?.last_name,
    profile?.username,
    profile?.country,
    profile?.city,
  ].filter(v => !v).length

  const t = await getTranslations('profile')

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav userName={profile?.name ?? user.email ?? ''} avatarUrl={profile?.avatar_url ?? null} missingCount={missingCount} />
      {showBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
          {daysLeft <= 1
            ? t('expiresToday')
            : t('daysRemaining', { count: daysLeft })}
          {' '}
          <Link href="/subscribe" className="font-semibold underline underline-offset-2">
            {t('subscribeNow').replace(' ↓', '')} →
          </Link>
        </div>
      )}
      <main className="max-w-4xl mx-auto px-4 pt-8 pb-24 sm:pb-8">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
