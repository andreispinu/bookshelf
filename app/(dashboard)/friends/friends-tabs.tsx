import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function FriendsTabs({ active }: { active: 'friends' | 'shelf' }) {
  const t = await getTranslations('friends')

  return (
    <div className="flex gap-1 mb-6">
      <Link
        href="/friends"
        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
          active === 'friends'
            ? 'bg-stone-100 text-stone-900 font-medium'
            : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
        }`}
      >
        {t('title')}
      </Link>
      <Link
        href="/friends/shelf"
        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
          active === 'shelf'
            ? 'bg-stone-100 text-stone-900 font-medium'
            : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
        }`}
      >
        {t('friendsShelf')}
      </Link>
    </div>
  )
}
