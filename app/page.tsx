import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTranslations, getLocale } from 'next-intl/server'
import LandingNav from './landing-nav'
import {
  BookOpen, Camera, HandHelping, Users, Tag, Globe,
  Link as LinkIcon, Smartphone, UserPlus, ClipboardList, Bell, CreditCard,
} from 'lucide-react'

const FEATURE_ICONS = [
  BookOpen, Camera, HandHelping, Users, Tag, Globe,
  LinkIcon, Smartphone, UserPlus, ClipboardList, Bell, CreditCard,
]

const FEATURE_KEYS = [
  'addLibrary', 'aiScan', 'lendFriends', 'friendsShelves',
  'categories', 'multiLanguage', 'publicProfile', 'mobile',
  'friendRequests', 'loanTracking', 'notifications', 'plans',
] as const

const STEP_KEYS = ['createAccount', 'addBooks', 'addFriends', 'startLending'] as const

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const [t, locale] = await Promise.all([getTranslations('landing'), getLocale()])
  const year = new Date().getFullYear()

  const features = FEATURE_KEYS.map((key, i) => ({
    Icon: FEATURE_ICONS[i],
    title: t(`f_${key}_title`),
    description: t(`f_${key}_desc`),
  }))

  const steps = STEP_KEYS.map((key, i) => ({
    n: i + 1,
    title: t(`s_${key}_title`),
    desc: t(`s_${key}_desc`),
  }))

  const iosSteps = [t('installIos1'), t('installIos2'), t('installIos3'), t('installIos4')]
  const androidSteps = [t('installAndroid1'), t('installAndroid2'), t('installAndroid3'), t('installAndroid4')]

  const { data: publicProfiles } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('profile_visibility', 'public_full')

  const publicIds = (publicProfiles ?? []).map((p: { id: string }) => p.id)

  const recentBooks = publicIds.length > 0
    ? ((await supabaseAdmin
        .from('books')
        .select('id, title, cover_url, category, status')
        .in('user_id', publicIds)
        .not('cover_url', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10)
      ).data ?? [])
    : []

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">

      <LandingNav isLoggedIn={isLoggedIn} currentLocale={locale} />

      {/* Hero */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-800 leading-tight">
            {t('heroHeadline')}
          </h1>
          <p className="mt-5 text-lg text-stone-500 leading-relaxed">
            {t('heroSubheadline')}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-700 transition-colors text-center"
            >
              {t('heroStartFreeTrial')}
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 transition-colors text-center"
            >
              {t('heroSeeHowItWorks')}
            </a>
          </div>
          <p className="mt-4 text-sm text-stone-400">{t('heroTrialNote')}</p>
        </div>
      </section>

      {/* Recently Added Books */}
      {recentBooks.length >= 3 && (
        <section className="py-16 px-4 bg-white border-b border-stone-200">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl font-bold text-stone-800 text-center mb-2">
              {t('recentlyAddedHeading')}
            </h2>
            <p className="text-center text-stone-500 text-sm mb-8">
              {t('recentlyAddedSubheading')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {recentBooks.map((book: { id: string; title: string; cover_url: string | null; category: string | null; status: string }) => (
                <div key={book.id} className="bg-white rounded-xl border border-stone-200 p-3 flex flex-col gap-2">
                  <div
                    className="w-full rounded-lg overflow-hidden bg-stone-100 flex items-center justify-center"
                    style={{ aspectRatio: '2/3' }}
                  >
                    {book.cover_url
                      ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      : <span className="text-stone-500 font-semibold text-lg">{book.title.slice(0, 2).toUpperCase()}</span>
                    }
                  </div>
                  <p className="text-sm font-medium text-stone-800 leading-snug line-clamp-2">{book.title}</p>
                  {book.category && (
                    <span className="inline-block text-[10px] font-medium text-stone-500 bg-stone-100 rounded-full px-2 py-0.5 self-start">
                      {book.category}
                    </span>
                  )}
                  <span className={`inline-block text-[10px] font-medium rounded-full px-2 py-0.5 self-start border ${
                    book.status === 'available'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {book.status === 'available' ? t('bookAvailable') : t('bookLentOut')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className="py-16 px-4 bg-stone-100 border-y border-stone-200">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-2">
            {t('featuresHeading')}
          </h2>
          <p className="text-center text-stone-500 text-sm mb-10">{t('featuresSubheading')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map(({ Icon, title, description }, i) => (
              <div key={i} className="bg-white rounded-xl border border-stone-200 p-5 flex flex-col gap-3">
                <div className="h-9 w-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-stone-600" />
                </div>
                <h3 className="font-semibold text-stone-900">{title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-12">{t('howItWorksHeading')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
            {steps.map(step => (
              <div key={step.n} className="flex flex-col gap-3">
                <div className="h-9 w-9 rounded-full bg-stone-800 text-white flex items-center justify-center text-sm font-bold shrink-0">
                  {step.n}
                </div>
                <h3 className="font-semibold text-stone-800">{step.title}</h3>
                <p className="text-sm text-stone-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install */}
      <section id="install" className="py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-2">{t('installHeading')}</h2>
          <p className="text-center text-stone-500 text-sm mb-10">{t('installSubheading')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* iOS */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-stone-600" />
                </div>
                <h3 className="font-semibold text-stone-900">{t('installIphone')}</h3>
              </div>
              <ol className="space-y-2.5">
                {iosSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-stone-600">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-stone-800 text-white text-xs flex items-center justify-center font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-stone-400 border-t border-stone-100 pt-3">
                {t('installIosNote')}
              </p>
            </div>

            {/* Android */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-stone-100 flex items-center justify-center shrink-0">
                  <Smartphone className="h-5 w-5 text-stone-600" />
                </div>
                <h3 className="font-semibold text-stone-900">{t('installAndroid')}</h3>
              </div>
              <ol className="space-y-2.5">
                {androidSteps.map((step, i) => (
                  <li key={i} className="flex gap-3 text-sm text-stone-600">
                    <span className="shrink-0 h-5 w-5 rounded-full bg-stone-800 text-white text-xs flex items-center justify-center font-semibold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
              <p className="text-xs text-stone-400 border-t border-stone-100 pt-3">
                {t('installAndroidNote')}
              </p>
            </div>

          </div>

          <p className="text-center text-sm text-stone-400 mt-8">{t('installNote')}</p>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4 bg-white border-y border-stone-200">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-3">{t('pricingHeading')}</h2>
          <p className="text-center text-stone-500 text-sm mb-10">{t('pricingSubheading')}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Free trial */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 flex flex-col gap-4">
              <div>
                <span className="text-sm font-medium text-stone-500">{t('pricingFreeTrial')}</span>
              </div>
              <div>
                <span className="text-3xl font-bold text-stone-800">$0</span>
                <span className="text-sm text-stone-400 ml-1">{t('pricingPerDays')}</span>
              </div>
              <ul className="space-y-1.5 text-sm text-stone-600 flex-1">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('pricingFullAccess')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('pricingNoCreditCard')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('pricingCancelAnyTime')}</li>
              </ul>
              <Link
                href="/signup"
                className="mt-auto block text-center py-2.5 rounded-lg border border-stone-300 text-stone-800 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                {t('pricingStartFreeTrial')}
              </Link>
            </div>

            {/* Monthly */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 flex flex-col gap-4">
              <div>
                <span className="text-sm font-medium text-stone-500">{t('pricingMonthly')}</span>
              </div>
              <div>
                <span className="text-3xl font-bold text-stone-800">$1</span>
                <span className="text-sm text-stone-400 ml-1">{t('pricingPerMonth')}</span>
              </div>
              <ul className="space-y-1.5 text-sm text-stone-600 flex-1">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('pricingFullLibrary')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('pricingFriendsLending')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('pricingAiScan')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> {t('pricingPwa')}</li>
              </ul>
              <Link
                href="/signup"
                className="mt-auto block text-center py-2.5 rounded-lg border border-stone-300 text-stone-800 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                {t('pricingStartFreeTrial')}
              </Link>
            </div>

            {/* Annual */}
            <div className="rounded-xl border border-stone-700 bg-stone-800 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-300">{t('pricingAnnual')}</span>
                <span className="text-xs bg-amber-400 text-amber-900 font-semibold px-2 py-0.5 rounded-full">{t('pricingBestValue')}</span>
              </div>
              <div>
                <span className="text-3xl font-bold text-white">$10</span>
                <span className="text-sm text-stone-400 ml-1">{t('pricingPerYear')}</span>
              </div>
              <ul className="space-y-1.5 text-sm text-stone-300 flex-1">
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> {t('pricingFullLibrary')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> {t('pricingFriendsLending')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> {t('pricingAiScan')}</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> {t('pricingPwa')}</li>
              </ul>
              <Link
                href="/signup"
                className="mt-auto block text-center py-2.5 rounded-lg bg-white text-stone-900 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                {t('pricingStartFreeTrial')}
              </Link>
            </div>

          </div>

          <p className="text-center text-xs text-stone-400 mt-6">{t('pricingStripeNote')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-400">
          <span className="font-semibold text-stone-600 tracking-tight">BookShelf</span>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-stone-700 transition-colors">{t('footerLogIn')}</Link>
            <Link href="/signup" className="hover:text-stone-700 transition-colors">{t('footerSignUp')}</Link>
            <a href="https://bookshelf.name" className="hover:text-stone-700 transition-colors">bookshelf.name</a>
          </div>
          <span>© {year} BookShelf</span>
        </div>
      </footer>

    </div>
  )
}
