import { redirect } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase-server'
import BookstoreClient from './bookstore-client'
import AddWishlistButton from './photo-button'
import type { WishlistItem } from '@/types'

export default async function BookstorePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const t = await getTranslations('bookstore')

  const { data: items } = await supabase
    .from('wishlist')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-stone-800">{t('title')}</h2>
          <p className="text-stone-500 text-sm mt-0.5">{t('subtitle')}</p>
        </div>
        <AddWishlistButton />
      </div>
      <BookstoreClient items={(items ?? []) as WishlistItem[]} />
    </div>
  )
}
