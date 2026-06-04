export const revalidate = 300

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getTranslations, getLocale } from 'next-intl/server'
import LandingNav from './landing-nav'
import RecentlyAddedClient from './recently-added-client'
import {
  BookOpen, Camera, HandHelping, Users, Tag, Globe,
  Link as LinkIcon, Smartphone, UserPlus, ClipboardList, Bell, CreditCard,
  ArrowLeftRight,
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

const LIBRARY_STEP_KEYS = ['createAccount', 'addBooks', 'organiseCategories', 'shareShelf'] as const
const LEND_STEP_KEYS = ['addFriends', 'browseShelves', 'requestBorrow', 'coordinateHandoff', 'returnSmoothly'] as const
const PAID_FEATURE_KEYS = [
  'pricingFullLibrary', 'pricingAiScan', 'pricingReadWithAI',
  'pricingFriendsLending', 'pricingBorrowWorkflow', 'pricingPublicProfile',
  'pricingPwa', 'pricingEmailNotifications',
] as const

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

  const librarySteps = LIBRARY_STEP_KEYS.map((key, i) => ({
    n: i + 1,
    title: t(`s_${key}_title`),
    desc: t(`s_${key}_desc`),
  }))

  const lendSteps = LEND_STEP_KEYS.map((key, i) => ({
    n: i + 1,
    title: t(`s_${key}_title`),
    desc: t(`s_${key}_desc`),
  }))

  const paidFeatures = PAID_FEATURE_KEYS.map(key => t(key))

  const iosSteps = [t('installIos1'), t('installIos2'), t('installIos3'), t('installIos4')]
  const androidSteps = [t('installAndroid1'), t('installAndroid2'), t('installAndroid3'), t('installAndroid4')]

  const { data: booksData } = await supabaseAdmin
    .from('books')
    .select('id, title, cover_url, category, status')
    .not('cover_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1000)

  const allBooks = booksData ?? []

  const rawCounts: Record<string, number> = {}
  for (const book of allBooks) {
    if (book.category) {
      rawCounts[book.category] = (rawCounts[book.category] ?? 0) + 1
    }
  }
  const categoryCounts: Record<string, number> = Object.fromEntries(
    Object.entries(rawCounts).filter(([, n]) => n >= 5)
  )

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
      {allBooks.length >= 3 && (
        <div id="recent-books">
          <RecentlyAddedClient books={allBooks} categoryCounts={categoryCounts} />
        </div>
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
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-2">{t('howItWorksHeading')}</h2>
          <p className="text-center text-stone-500 text-sm mb-12">{t('howItWorksSubheading')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">

            {/* Build your library */}
            <div className="bg-stone-100 rounded-2xl border border-stone-200 p-7 flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-base font-semibold text-stone-900">{t('howItWorksLibraryTitle')}</h3>
              </div>
              <ol className="flex flex-col gap-4">
                {librarySteps.map(step => (
                  <li key={step.n} className="flex gap-3">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-stone-800 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                      {step.n}
                    </span>
                    <div>
                      <p className="font-medium text-stone-800 text-sm">{step.title}</p>
                      <p className="text-sm text-stone-500 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Lend & borrow with friends */}
            <div className="bg-stone-100 rounded-2xl border border-stone-200 p-7 flex flex-col gap-6">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-stone-800 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-base font-semibold text-stone-900">{t('howItWorksLendTitle')}</h3>
              </div>
              <ol className="flex flex-col gap-4">
                {lendSteps.map(step => (
                  <li key={step.n} className="flex gap-3">
                    <span className="shrink-0 h-6 w-6 rounded-full bg-stone-800 text-white text-xs flex items-center justify-center font-bold mt-0.5">
                      {step.n}
                    </span>
                    <div>
                      <p className="font-medium text-stone-800 text-sm">{step.title}</p>
                      <p className="text-sm text-stone-500 mt-0.5 leading-relaxed">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

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
          <p className="text-center text-stone-500 text-sm mb-8">{t('pricingSubheading')}</p>

          {/* Why do we charge? */}
          <div className="max-w-[600px] mx-auto mb-10 rounded-lg border border-[#fcd34d]/50 bg-[#fffbeb] px-6 py-4 flex gap-3">
            <span className="text-amber-400 shrink-0 mt-0.5 text-base">♥</span>
            <div>
              <p className="text-stone-900 font-medium text-base leading-snug mb-1.5">{t('pricingWhyHeading')}</p>
              <p className="text-stone-600 text-sm leading-relaxed">{t('pricingWhyText')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">

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
                <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-px">✓</span> {t('pricingFullAccess')}</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-px">✓</span> {t('pricingNoCreditCard')}</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500 shrink-0 mt-px">✓</span> {t('pricingCancelAnyTime')}</li>
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
              <p className="text-xs italic text-stone-400 -mt-2">{t('pricingMonthlyComparison')}</p>
              <ul className="space-y-1.5 text-sm text-stone-600 flex-1">
                {paidFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-500 shrink-0 mt-px">✓</span> {f}
                  </li>
                ))}
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
              <p className="text-xs italic text-stone-400 -mt-2">{t('pricingAnnualComparison')}</p>
              <ul className="space-y-1.5 text-sm text-stone-300 flex-1">
                {paidFeatures.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-px">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className="mt-auto block text-center py-2.5 rounded-lg bg-white text-stone-900 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                {t('pricingStartFreeTrial')}
              </Link>
            </div>

          </div>

          <p className="text-center text-xs text-stone-400 mt-8">{t('pricingStripeNote')}</p>
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
