'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Install', href: '#install' },
  { label: 'Pricing', href: '#pricing' },
]

export default function LandingNav({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link href="/" className="font-semibold text-stone-900 tracking-tight text-base shrink-0">
          BookShelf
        </Link>

        {/* Desktop center links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map(l => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        {/* Desktop right CTAs */}
        <div className="hidden md:flex items-center gap-2">
          {isLoggedIn ? (
            <Link
              href="/books"
              className="px-4 py-1.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
            >
              Go to my shelf
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/signup"
                className="px-4 py-1.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
              >
                Start free trial
              </Link>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-stone-600 hover:bg-stone-100 transition-colors"
          onClick={() => setMenuOpen(v => !v)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile dropdown */}
      {menuOpen && (
        <div ref={menuRef} className="md:hidden border-t border-stone-100 bg-white px-4 pb-4">
          <div className="flex justify-end pt-3 pb-1">
            <button
              className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 transition-colors"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 mb-4">
            {navLinks.map(l => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm text-stone-700 hover:bg-stone-50 transition-colors"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex flex-col gap-2 border-t border-stone-100 pt-4">
            {isLoggedIn ? (
              <Link
                href="/books"
                className="block text-center py-2.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                Go to my shelf
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-center py-2.5 rounded-lg border border-stone-200 text-stone-700 text-sm font-medium hover:bg-stone-50 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="block text-center py-2.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 transition-colors"
                  onClick={() => setMenuOpen(false)}
                >
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
