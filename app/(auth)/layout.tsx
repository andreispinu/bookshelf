import Link from 'next/link'
import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations('auth')

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50">
      <div className="w-full max-w-sm px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-semibold text-stone-800 tracking-tight">
            <Link href="/">BookShelf</Link>
          </h1>
          <p className="text-stone-500 mt-1 text-sm">{t('tagline')}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
