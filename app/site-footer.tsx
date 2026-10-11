import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

// Shared public footer — mirrors the landing page footer so public SEO pages
// (catalogue, etc.) share the same chrome.
export default async function SiteFooter() {
  const t = await getTranslations('landing')
  const year = new Date().getFullYear()
  return (
    <footer className="py-10 px-4 border-t border-linen mt-8">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-400">
        <span className="font-semibold text-stone-600 tracking-tight">BookShelf</span>
        <div className="flex items-center gap-5">
          <Link href="/login" className="hover:text-stone-700 transition-colors">{t('footerLogIn')}</Link>
          <Link href="/signup" className="hover:text-stone-700 transition-colors">{t('footerSignUp')}</Link>
          <a href="https://www.bookshelf.name" className="hover:text-stone-700 transition-colors">bookshelf.name</a>
        </div>
        <span>© {year} BookShelf</span>
      </div>
    </footer>
  )
}
