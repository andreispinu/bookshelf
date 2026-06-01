import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase-server'
import MessagesClient from './messages-client'

export default async function MessagesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div style={{ height: 'calc(100vh - 10rem)' }}>
      <Suspense>
        <MessagesClient userId={user.id} />
      </Suspense>
    </div>
  )
}
