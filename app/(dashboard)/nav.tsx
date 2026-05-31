'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const links = [
  { href: '/books',   label: 'My Books' },
  { href: '/friends', label: 'Friends'  },
  { href: '/loans',   label: 'Loans'    },
]

export default function Nav({ userName }: { userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = userName
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-stone-800 tracking-tight">BookShelf</span>
          <nav className="flex items-center gap-1">
            {links.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  pathname.startsWith(href)
                    ? 'bg-stone-100 text-stone-900 font-medium'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-50'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-stone-500 hidden sm:block">{userName}</span>
          <button onClick={handleSignOut} className="text-sm text-stone-400 hover:text-stone-700 transition-colors">
            Sign out
          </button>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">{initials}</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}
