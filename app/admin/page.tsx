export const revalidate = 300

import { supabaseAdmin } from '@/lib/supabase-admin'
import AdminTabs from './admin-tabs'
import AdminRefreshButton from './admin-refresh'

// ── Helpers ──────────────────────────────────────────────────────────────────

function c(n: number | null | undefined): string {
  return (n ?? 0).toLocaleString()
}

function pct(num: number | null | undefined, den: number | null | undefined): string {
  const n = num ?? 0
  const d = den ?? 0
  if (d === 0) return '0.0%'
  return ((n / d) * 100).toFixed(1) + '%'
}

function timeAgo(dateStr: string): string {
  const secs = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function initials(name: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(p => p[0] ?? '').join('').slice(0, 2).toUpperCase() || '?'
}

// ── Components ────────────────────────────────────────────────────────────────

function StatusBadge({ status, trialEndsAt }: { status: string | null; trialEndsAt: string | null }) {
  const expired = status === 'trialing' && trialEndsAt && new Date(trialEndsAt) < new Date()
  const label = expired ? 'Expired'
    : status === 'active' ? 'Active'
    : status === 'trialing' ? 'Trial'
    : status === 'canceled' ? 'Canceled'
    : (status ?? '—')
  const cls = (expired || status === 'canceled')
    ? 'bg-red-100 text-red-700'
    : status === 'active' ? 'bg-green-100 text-green-700'
    : status === 'trialing' ? 'bg-amber-100 text-amber-700'
    : 'bg-stone-100 text-stone-500'
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{label}</span>
}

function MetricCard({ label, value, tint = 'neutral', sub }: {
  label: string
  value: string | number
  tint?: 'green' | 'red' | 'neutral'
  sub?: string
}) {
  const bg = tint === 'green' ? 'bg-green-50 border-green-200'
    : tint === 'red' ? 'bg-red-50 border-red-200'
    : 'bg-white border-stone-200'
  const vc = tint === 'green' ? 'text-green-700'
    : tint === 'red' ? 'text-red-700'
    : 'text-stone-900'
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <p className="text-xs text-stone-400 uppercase tracking-wide font-medium mb-1.5 leading-tight">{label}</p>
      <p className={`text-3xl font-medium ${vc}`}>{value}</p>
      {sub && <p className="text-xs text-stone-400 mt-1">{sub}</p>}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="pb-3 mb-6 border-b-2 border-stone-900">
      <h2 className="text-xl font-semibold text-stone-900">{children}</h2>
    </div>
  )
}

function SubHeader({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-widest mb-4">{children}</h3>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminPage() {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [
    qTotal, qPaid, qTrialing, qExpired, qCanceled,
    qNewMonth, qNewWeek, qNewToday,
    qMonthlyActive, qAnnualActive,
    qTrialEver, qMonthlyEver, qAnnualEver,
    qCanceledMonth, qNewSubsMonth,
    qRecentProfiles,
    qTotalBooks, qBooksMonth, qBooksWithCover, qBooksWithCat,
    qTotalFriendships, qAcceptedFriendships,
    qTotalInvitations, qAcceptedInvitations,
    qTotalLoans, qActiveLoans, qOverdueLoans,
    qTotalBorrowReqs, qApprovedBorrowReqs,
    qUserMessages, qSysMessages,
    qWishlist,
    qReadingStarted, qInsightsDelivered, qInsightsRead,
    authResult,
  ] = await Promise.all([
    // ── User metrics ──
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trialing').gt('trial_ends_at', now.toISOString()),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trialing').lt('trial_ends_at', now.toISOString()),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'canceled'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('subscription_plan', 'monthly'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('subscription_plan', 'annual'),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).not('trial_ends_at', 'is', null),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_plan', 'monthly').not('subscribed_at', 'is', null),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_plan', 'annual').not('subscribed_at', 'is', null),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('subscription_status', 'canceled').gte('updated_at', startOfMonth),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).not('subscribed_at', 'is', null).gte('subscribed_at', startOfMonth),
    supabaseAdmin.from('profiles').select('id, name, created_at, subscription_status, subscription_plan, trial_ends_at').order('created_at', { ascending: false }).limit(20),
    // ── Activity ──
    supabaseAdmin.from('books').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('books').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonth),
    supabaseAdmin.from('books').select('*', { count: 'exact', head: true }).not('cover_url', 'is', null),
    supabaseAdmin.from('books').select('*', { count: 'exact', head: true }).not('category', 'is', null),
    supabaseAdmin.from('friendships').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('friendships').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabaseAdmin.from('invitations').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('invitations').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabaseAdmin.from('loans').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('loans').select('*', { count: 'exact', head: true }).is('returned_at', null).neq('workflow_status', 'completed'),
    supabaseAdmin.from('loans').select('*', { count: 'exact', head: true }).eq('workflow_status', 'overdue'),
    supabaseAdmin.from('borrow_requests').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('borrow_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).not('content', 'like', 'SYSTEM:%'),
    supabaseAdmin.from('messages').select('*', { count: 'exact', head: true }).like('content', 'SYSTEM:%'),
    supabaseAdmin.from('wishlist').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('reading_ai_books').select('*', { count: 'exact', head: true }).neq('status', 'pending'),
    supabaseAdmin.from('reading_ai_insights').select('*', { count: 'exact', head: true }).not('delivered_at', 'is', null),
    supabaseAdmin.from('reading_ai_insights').select('*', { count: 'exact', head: true }).not('read_at', 'is', null),
    // ── Auth users for emails ──
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  // ── Extract values ────────────────────────────────────────────────────────

  const totalUsers       = qTotal.count ?? 0
  const paidUsers        = qPaid.count ?? 0
  const trialingUsers    = qTrialing.count ?? 0
  const expiredTrialUsers = qExpired.count ?? 0
  const canceledUsers    = qCanceled.count ?? 0
  const newThisMonth     = qNewMonth.count ?? 0
  const newThisWeek      = qNewWeek.count ?? 0
  const newToday         = qNewToday.count ?? 0
  const monthlyActive    = qMonthlyActive.count ?? 0
  const annualActive     = qAnnualActive.count ?? 0
  const trialEverCount   = qTrialEver.count ?? 0
  const monthlyEverPaid  = qMonthlyEver.count ?? 0
  const annualEverPaid   = qAnnualEver.count ?? 0
  const canceledThisMonth = qCanceledMonth.count ?? 0
  const newSubsThisMonth = qNewSubsMonth.count ?? 0
  const recentProfiles   = qRecentProfiles.data ?? []

  const totalBooks       = qTotalBooks.count ?? 0
  const booksThisMonth   = qBooksMonth.count ?? 0
  const booksWithCover   = qBooksWithCover.count ?? 0
  const booksWithCategory = qBooksWithCat.count ?? 0
  const totalFriendships = qTotalFriendships.count ?? 0
  const acceptedFriendships = qAcceptedFriendships.count ?? 0
  const totalInvitations = qTotalInvitations.count ?? 0
  const acceptedInvitations = qAcceptedInvitations.count ?? 0
  const totalLoans       = qTotalLoans.count ?? 0
  const activeLoans      = qActiveLoans.count ?? 0
  const overdueLoans     = qOverdueLoans.count ?? 0
  const totalBorrowReqs  = qTotalBorrowReqs.count ?? 0
  const approvedBorrowReqs = qApprovedBorrowReqs.count ?? 0
  const userMessages     = qUserMessages.count ?? 0
  const sysMessages      = qSysMessages.count ?? 0
  const wishlistItems    = qWishlist.count ?? 0
  const readingStarted   = qReadingStarted.count ?? 0
  const insightsDelivered = qInsightsDelivered.count ?? 0
  const insightsRead     = qInsightsRead.count ?? 0

  // ── Derived metrics ───────────────────────────────────────────────────────

  const mrr = ((monthlyActive * 1.0) + (annualActive * 10.0 / 12)).toFixed(2)
  const arr = (parseFloat(mrr) * 12).toFixed(2)
  const totalRevenue = (monthlyEverPaid * 1) + (annualEverPaid * 10)
  const churnDenominator = paidUsers + canceledThisMonth
  const churnRate = churnDenominator > 0 ? ((canceledThisMonth / churnDenominator) * 100).toFixed(1) : '0.0'

  // ── Email map ─────────────────────────────────────────────────────────────

  const authUsers = authResult.data?.users ?? []
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? '']))

  const lastUpdated = now.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div>
      <AdminTabs />

      <div className="max-w-7xl mx-auto px-6 pb-24">

        {/* Toolbar */}
        <div className="flex items-center justify-end py-4 gap-3">
          <span className="text-xs text-stone-400">Last updated: {lastUpdated}</span>
          <AdminRefreshButton />
        </div>

        {/* ── OVERVIEW ── */}
        <section id="overview" className="mb-20 scroll-mt-16">
          <SectionHeader>Overview</SectionHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <MetricCard label="Total Users" value={c(totalUsers)} />
            <MetricCard label="Paid Users" value={c(paidUsers)} tint="green" />
            <MetricCard label="MRR" value={`$${mrr}`} tint="green" />
            <MetricCard label="ARR" value={`$${arr}`} tint="green" />
            <MetricCard label="Trial → Paid" value={pct(paidUsers, trialEverCount)} tint="green" />
            <MetricCard label="Total Books" value={c(totalBooks)} />
            <MetricCard label="Total Loans" value={c(totalLoans)} />
            <MetricCard label="New Today" value={c(newToday)} tint="green" />
            <MetricCard label="New This Week" value={c(newThisWeek)} tint="green" />
            <MetricCard label="New This Month" value={c(newThisMonth)} tint="green" />
          </div>
        </section>

        {/* ── USERS ── */}
        <section id="users" className="mb-20 scroll-mt-16">
          <SectionHeader>Users</SectionHeader>

          <div className="mb-10">
            <SubHeader>Subscription Status</SubHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
              <MetricCard label="Total Registered" value={c(totalUsers)} />
              <MetricCard label="Active (Paid)" value={c(paidUsers)} tint="green" />
              <MetricCard label="Monthly" value={c(monthlyActive)} tint="green" />
              <MetricCard label="Annual" value={c(annualActive)} tint="green" />
              <MetricCard label="Trialing" value={c(trialingUsers)} />
              <MetricCard label="Expired Trial" value={c(expiredTrialUsers)} tint="red" />
              <MetricCard label="Canceled" value={c(canceledUsers)} tint="red" />
            </div>
          </div>

          <div className="mb-10">
            <SubHeader>Growth</SubHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetricCard label="New Today" value={c(newToday)} tint="green" />
              <MetricCard label="New This Week" value={c(newThisWeek)} tint="green" />
              <MetricCard label="New This Month" value={c(newThisMonth)} tint="green" />
            </div>
          </div>

          <div className="mb-10">
            <SubHeader>Conversion & Churn</SubHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard label="Trial→Paid Conversion" value={pct(paidUsers, trialEverCount)} tint="green" />
              <MetricCard label="New Subs This Month" value={c(newSubsThisMonth)} tint="green" />
              <MetricCard label="Canceled This Month" value={c(canceledThisMonth)} tint={canceledThisMonth > 0 ? 'red' : 'neutral'} />
              <MetricCard label="Churn Rate (Month)" value={`${churnRate}%`} tint={canceledThisMonth > 0 ? 'red' : 'neutral'} />
              <MetricCard label="Expired w/o Converting" value={c(expiredTrialUsers)} tint="red" />
            </div>
          </div>

          <div className="mb-10">
            <SubHeader>Recent Registrations (last 10)</SubHeader>
            <div className="rounded-xl border border-stone-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200">
                    {['Name', 'Email', 'Joined', 'Status', 'Plan'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs text-stone-400 font-medium uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentProfiles.slice(0, 10).map(p => (
                    <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-stone-800 whitespace-nowrap">{p.name ?? '—'}</td>
                      <td className="px-4 py-3 text-stone-500">{emailMap.get(p.id) ?? '—'}</td>
                      <td className="px-4 py-3 text-stone-400 whitespace-nowrap">
                        {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={p.subscription_status} trialEndsAt={p.trial_ends_at} />
                      </td>
                      <td className="px-4 py-3 text-stone-500 capitalize">{p.subscription_plan ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <SubHeader>Recent Signups Feed (last 20)</SubHeader>
            <div className="space-y-1.5">
              {recentProfiles.map(p => (
                <div key={p.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-stone-100 hover:border-stone-200 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-stone-200 flex items-center justify-center shrink-0 text-xs font-semibold text-stone-600">
                    {initials(p.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-stone-800 text-sm truncate">{p.name ?? '—'}</p>
                    <p className="text-xs text-stone-400 truncate">{emailMap.get(p.id) ?? ''}</p>
                  </div>
                  <span className="text-xs text-stone-400 whitespace-nowrap shrink-0">{timeAgo(p.created_at)}</span>
                  <StatusBadge status={p.subscription_status} trialEndsAt={p.trial_ends_at} />
                  {p.subscription_plan && (
                    <span className="text-xs text-stone-500 capitalize shrink-0">{p.subscription_plan}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REVENUE ── */}
        <section id="revenue" className="mb-20 scroll-mt-16">
          <SectionHeader>Revenue</SectionHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            <MetricCard label="MRR" value={`$${mrr}`} tint="green" sub="Monthly Recurring Revenue" />
            <MetricCard label="ARR" value={`$${arr}`} tint="green" sub="Annual Recurring Revenue" />
            <MetricCard label="Monthly Subscribers" value={c(monthlyActive)} tint="green" sub="$1/mo each" />
            <MetricCard label="Annual Subscribers" value={c(annualActive)} tint="green" sub="$10/yr each" />
            <MetricCard label="Total Active" value={c(paidUsers)} tint="green" />
            <MetricCard label="New Subs This Month" value={c(newSubsThisMonth)} tint="green" />
            <MetricCard label="Est. Total Revenue" value={`$${c(totalRevenue)}`} tint="green" sub="Since subscribed_at tracking" />
          </div>

          <p className="text-xs text-stone-400 leading-relaxed max-w-2xl">
            MRR = (monthly subscribers × $1) + (annual subscribers × $10 ÷ 12). ARR = MRR × 12.
            Est. total revenue uses <code className="bg-stone-100 px-1 rounded">subscribed_at</code> tracking —
            counts all-time monthly/annual activations. Historical subscribers backfilled from <code className="bg-stone-100 px-1 rounded">created_at</code>.
            Revenue data is from the Supabase profiles table, not the Stripe API.
          </p>
        </section>

        {/* ── ACTIVITY ── */}
        <section id="activity" className="mb-20 scroll-mt-16">
          <SectionHeader>Activity</SectionHeader>

          <div className="mb-10">
            <SubHeader>Books</SubHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard label="Total Books" value={c(totalBooks)} />
              <MetricCard label="Added This Month" value={c(booksThisMonth)} tint="green" />
              <MetricCard label="With Cover Image" value={c(booksWithCover)} sub={pct(booksWithCover, totalBooks)} />
              <MetricCard label="With AI Category" value={c(booksWithCategory)} sub={pct(booksWithCategory, totalBooks)} />
            </div>
          </div>

          <div className="mb-10">
            <SubHeader>Friends & Social</SubHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard label="Friend Requests Sent" value={c(totalFriendships)} />
              <MetricCard label="Accepted Friendships" value={c(acceptedFriendships)} sub={pct(acceptedFriendships, totalFriendships)} />
              <MetricCard label="Email Invitations Sent" value={c(totalInvitations)} />
              <MetricCard label="Invitations Accepted" value={c(acceptedInvitations)} tint="green" />
              <MetricCard label="Invite Conversion" value={pct(acceptedInvitations, totalInvitations)} tint="green" />
            </div>
          </div>

          <div className="mb-10">
            <SubHeader>Lending</SubHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <MetricCard label="Total Loans" value={c(totalLoans)} />
              <MetricCard label="Active Loans" value={c(activeLoans)} />
              <MetricCard label="Overdue Loans" value={c(overdueLoans)} tint={overdueLoans > 0 ? 'red' : 'neutral'} />
              <MetricCard label="Borrow Requests" value={c(totalBorrowReqs)} />
              <MetricCard label="Approved Requests" value={c(approvedBorrowReqs)} tint="green" sub={pct(approvedBorrowReqs, totalBorrowReqs)} />
            </div>
          </div>

          <div className="mb-10">
            <SubHeader>Messaging</SubHeader>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <MetricCard label="User Messages Sent" value={c(userMessages)} />
              <MetricCard label="System Messages" value={c(sysMessages)} sub="Workflow events" />
            </div>
          </div>

          <div>
            <SubHeader>Reading & Wishlist</SubHeader>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <MetricCard label="Wishlist Books" value={c(wishlistItems)} />
              <MetricCard label="Read with AI Started" value={c(readingStarted)} tint="green" />
              <MetricCard label="Insights Delivered" value={c(insightsDelivered)} tint="green" />
              <MetricCard label="Insights Read" value={c(insightsRead)} tint="green" sub={pct(insightsRead, insightsDelivered)} />
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
