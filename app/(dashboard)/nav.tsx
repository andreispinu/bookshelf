'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useEffect, useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const links = [
  { href: '/books',   label: 'My Books' },
  { href: '/friends', label: 'Friends'  },
  { href: '/loans',   label: 'Loans'    },
]

export default function Nav({ userName, avatarUrl }: { userName: string; avatarUrl?: string | null }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

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
        <div ref={menuRef} className="relative flex items-center gap-2">
          <span className="text-sm text-stone-500 hidden sm:block">{userName}</span>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            aria-label="Account menu"
          >
            <Avatar className="h-8 w-8">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={userName} />}
              <AvatarFallback className="bg-stone-200 text-stone-700 text-xs cursor-pointer hover:bg-stone-300 transition-colors">
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-stone-200 bg-white shadow-lg py-1.5 z-10">
              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                Profile
              </Link>
              <div className="my-1 border-t border-stone-100" />
              <button
                onClick={() => { setMenuOpen(false); handleSignOut() }}
                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
