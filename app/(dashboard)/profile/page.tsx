import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import ProfileClient from './profile-client'
import type { Profile } from '@/types'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, avatar_url, created_at, trial_ends_at, stripe_customer_id, stripe_subscription_id, subscription_status, subscription_plan, subscription_ends_at')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-stone-800">Profile</h2>
        <p className="text-stone-500 text-sm mt-0.5">Manage your account and subscription</p>
      </div>
      <ProfileClient
        profile={profile as unknown as Profile}
        email={user.email ?? ''}
        monthlyPriceId={process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID ?? ''}
        annualPriceId={process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID ?? ''}
      />
    </div>
  )
}
