import Link from 'next/link'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-stone-800">
      <header className="border-b border-stone-200 px-6 h-14 flex items-center justify-between bg-white">
        <span className="font-semibold text-stone-900 tracking-tight text-base">BookShelf Admin</span>
        <Link
          href="/books"
          className="text-sm text-stone-500 hover:text-stone-800 transition-colors"
        >
          ← Back to app
        </Link>
      </header>
      {children}
    </div>
  )
}
