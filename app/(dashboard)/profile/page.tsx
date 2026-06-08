import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import ProfileClient from './profile-client'
import UsernameSection from './username-section'
import LocationSection from './location-section'
import LanguageSection from './language-section'
import NotificationsSection from './notifications-section'
import type { Profile } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('profile')

  const [{ data: profile }, { count: bookCount }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, name, first_name, last_name, avatar_url, created_at, trial_ends_at, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_plan, subscription_ends_at, username, profile_visibility, country, city, ui_language, message_digest_enabled')
      .eq('id', user.id)
      .single(),
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  if (!profile) redirect('/login')

  const missingFields = [
    !profile.avatar_url && 'avatarUrl',
    !profile.first_name && 'firstName',
    !profile.last_name && 'lastName',
    !profile.username && 'username',
    !profile.country && 'country',
    !profile.city && 'city',
  ].filter(Boolean) as string[]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">{t('title')}</h2>
        <p className="text-stone-500 text-sm mt-0.5">{t('subtitle')}</p>
      </div>
      <div className="space-y-10 max-w-2xl">
        <ProfileClient
          profile={profile as unknown as Profile}
          email={user.email ?? ''}
          missingFields={missingFields}
          bookCount={bookCount ?? 0}
        />
        <div id="profile-username">
          <UsernameSection
            initialUsername={profile.username ?? null}
            initialVisibility={(profile.profile_visibility as Profile['profile_visibility']) ?? 'private'}
          />
        </div>
        <div id="profile-location">
          <LocationSection
            initialCountry={profile.country ?? null}
            initialCity={profile.city ?? null}
          />
        </div>
        <LanguageSection currentLanguage={profile.ui_language ?? 'en'} />
        <NotificationsSection initialMessageDigestEnabled={profile.message_digest_enabled ?? true} />
        {process.env.NEXT_PUBLIC_BUILD_ID && (
          <p className="text-xs text-stone-300 text-center pt-2">
            Version: {process.env.NEXT_PUBLIC_BUILD_ID}
          </p>
        )}
      </div>
    </div>
  )
}
