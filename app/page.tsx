import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'

const features = [
  {
    icon: '📚',
    title: 'Add your library',
    description: 'Catalogue every book you own. Scan the cover with AI and it fills in the details automatically.',
  },
  {
    icon: '🤝',
    title: 'Lend to friends',
    description: 'See what your friends are reading. Lend your books and track who has what.',
  },
  {
    icon: '📱',
    title: 'Always with you',
    description: 'Install on iPhone or Android. Your shelf is always in your pocket.',
  },
]

const steps = [
  { n: 1, title: 'Create your account', desc: 'Free 14-day trial. No credit card needed.' },
  { n: 2, title: 'Add your books', desc: 'Add manually or scan the cover with AI.' },
  { n: 3, title: 'Add friends', desc: 'Connect with people you trust.' },
  { n: 4, title: 'Start lending', desc: 'Offer books, track loans, mark as returned.' },
]

export default async function LandingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isLoggedIn = !!user

  const year = new Date().getFullYear()

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">

      {/* Nav */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="font-semibold text-stone-800 tracking-tight">BookShelf</span>
          <div className="flex items-center gap-2">
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
                  className="px-3 py-1.5 text-sm text-stone-600 hover:text-stone-800 transition-colors"
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
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 text-center">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-stone-800 leading-tight">
            Your personal library,<br />shared with friends
          </h1>
          <p className="mt-5 text-lg text-stone-500 leading-relaxed">
            Add your books, connect with friends, and lend your favourites — all in one place.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-stone-800 text-white font-medium hover:bg-stone-700 transition-colors text-center"
            >
              Start free trial
            </Link>
            <a
              href="#how-it-works"
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-stone-300 text-stone-700 font-medium hover:bg-stone-100 transition-colors text-center"
            >
              See how it works
            </a>
          </div>
          <p className="mt-4 text-sm text-stone-400">Free for 14 days. No credit card required.</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-white border-y border-stone-200">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {features.map(f => (
              <div key={f.title} className="flex flex-col gap-3">
                <span className="text-3xl">{f.icon}</span>
                <h3 className="text-lg font-semibold text-stone-800">{f.title}</h3>
                <p className="text-stone-500 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-12">How it works</h2>
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

      {/* Pricing */}
      <section className="py-16 px-4 bg-white border-y border-stone-200">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-800 text-center mb-3">Simple pricing</h2>
          <p className="text-center text-stone-500 text-sm mb-10">Start free. Upgrade when you're ready.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* Free trial */}
            <div className="rounded-xl border border-stone-200 bg-stone-50 p-6 flex flex-col gap-4">
              <div>
                <span className="text-sm font-medium text-stone-500">Free trial</span>
              </div>
              <div>
                <span className="text-3xl font-bold text-stone-800">$0</span>
                <span className="text-sm text-stone-400 ml-1">/ 14 days</span>
              </div>
              <ul className="space-y-1.5 text-sm text-stone-600 flex-1">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Full access</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> No credit card</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Cancel any time</li>
              </ul>
              <Link
                href="/signup"
                className="mt-auto block text-center py-2.5 rounded-lg border border-stone-300 text-stone-800 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                Start free trial
              </Link>
            </div>

            {/* Monthly */}
            <div className="rounded-xl border border-stone-200 bg-white p-6 flex flex-col gap-4">
              <div>
                <span className="text-sm font-medium text-stone-500">Monthly</span>
              </div>
              <div>
                <span className="text-3xl font-bold text-stone-800">$1</span>
                <span className="text-sm text-stone-400 ml-1">/ month</span>
              </div>
              <ul className="space-y-1.5 text-sm text-stone-600 flex-1">
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Full book library</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> Friends & lending</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> AI book scanning</li>
                <li className="flex items-center gap-2"><span className="text-emerald-500">✓</span> PWA mobile app</li>
              </ul>
              <Link
                href="/signup"
                className="mt-auto block text-center py-2.5 rounded-lg border border-stone-300 text-stone-800 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                Start free trial
              </Link>
            </div>

            {/* Annual */}
            <div className="rounded-xl border border-stone-700 bg-stone-800 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-stone-300">Annual</span>
                <span className="text-xs bg-amber-400 text-amber-900 font-semibold px-2 py-0.5 rounded-full">Best value</span>
              </div>
              <div>
                <span className="text-3xl font-bold text-white">$10</span>
                <span className="text-sm text-stone-400 ml-1">/ year</span>
              </div>
              <ul className="space-y-1.5 text-sm text-stone-300 flex-1">
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Full book library</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> Friends & lending</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> AI book scanning</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">✓</span> PWA mobile app</li>
              </ul>
              <Link
                href="/signup"
                className="mt-auto block text-center py-2.5 rounded-lg bg-white text-stone-900 text-sm font-medium hover:bg-stone-100 transition-colors"
              >
                Start free trial
              </Link>
            </div>

          </div>

          <p className="text-center text-xs text-stone-400 mt-6">
            Payments processed securely by Stripe. Cancel any time.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-stone-400">
          <span className="font-semibold text-stone-600 tracking-tight">BookShelf</span>
          <div className="flex items-center gap-5">
            <Link href="/login" className="hover:text-stone-700 transition-colors">Log in</Link>
            <Link href="/signup" className="hover:text-stone-700 transition-colors">Sign up</Link>
            <a href="https://bookshelf.name" className="hover:text-stone-700 transition-colors">bookshelf.name</a>
          </div>
          <span>© {year} BookShelf</span>
        </div>
      </footer>

    </div>
  )
}
