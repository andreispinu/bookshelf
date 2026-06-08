import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Nav from './nav'
import MobileBottomNav from './mobile-bottom-nav'
import LocaleSync from './locale-sync'
import SupportButton from './support-button'
import EmailConfirmBanner from './email-confirm-banner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url, subscription_status, first_name, last_name, username, country, city, ui_language, email_confirmed')
    .eq('id', user.id)
    .single()

  const missingCount = [
    profile?.first_name,
    profile?.last_name,
    profile?.username,
    profile?.country,
    profile?.city,
    profile?.avatar_url,
  ].filter(v => !v).length

  return (
    <div className="min-h-screen bg-stone-50">
      <LocaleSync uiLanguage={profile?.ui_language ?? null} />
      <Nav userName={profile?.name ?? user.email ?? ''} avatarUrl={profile?.avatar_url ?? null} missingCount={missingCount} />
      {profile?.email_confirmed === false && <EmailConfirmBanner />}
      <main className="max-w-4xl mx-auto px-4 pt-8 pb-24 sm:pb-8">
        {children}
      </main>
      <MobileBottomNav />
      <SupportButton />
    </div>
  )
}
