import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase-server'
import Nav from './nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-stone-50">
      <Nav userName={profile?.name ?? user.email ?? ''} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
