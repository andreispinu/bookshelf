import Link from 'next/link'

export default function FriendsTabs({ active }: { active: 'friends' | 'shelf' }) {
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
        Friends
      </Link>
      <Link
        href="/friends/shelf"
        className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
          active === 'shelf'
            ? 'bg-stone-100 text-stone-900 font-medium'
            : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
        }`}
      >
        Friends' Shelf
      </Link>
    </div>
  )
}
