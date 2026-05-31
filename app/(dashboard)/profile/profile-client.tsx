'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { updateName } from './actions'
import type { Profile } from '@/types'

type Props = {
  profile: Profile
  email: string
  monthlyPriceId: string
  annualPriceId: string
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

function scrollToPlans() {
  document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })
}

export default function ProfileClient({ profile, email, monthlyPriceId, annualPriceId }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(profile.name)
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [currentName, setCurrentName] = useState(profile.name)

  const [subscribeLoading, setSubscribeLoading] = useState<string | null>(null)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)

  console.log('[profile] price IDs:', { monthly: monthlyPriceId, annual: annualPriceId })
  const [portalLoading, setPortalLoading] = useState(false)

  // Subscription state
  const now = new Date()
  const trialEndsAt = profile.trial_ends_at ? new Date(profile.trial_ends_at) : null
  const status = profile.subscription_status
  const isTrialing = status === 'trialing' && !!trialEndsAt && trialEndsAt > now
  const isActive = status === 'active'
  const isExpired = !isTrialing && !isActive

  const msLeft = trialEndsAt ? trialEndsAt.getTime() - now.getTime() : 0
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)))

  const planLabel = profile.subscription_plan === 'monthly' ? 'Monthly' : 'Annual'
  const planPrice = profile.subscription_plan === 'monthly' ? '$1/month' : '$10/year'
  const nextBilling = profile.subscription_ends_at
    ? new Date(profile.subscription_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const trialEndDate = trialEndsAt
    ? trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  async function handleSaveName() {
    setEditError(null)
    setEditLoading(true)
    const result = await updateName(editName)
    if (result.error) {
      setEditError(result.error)
      setEditLoading(false)
      return
    }
    setCurrentName(editName)
    setEditOpen(false)
    setEditLoading(false)
  }

  async function handleSubscribe(priceId: string, planId: string) {
    setSubscribeError(null)
    setSubscribeLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to start checkout')
      window.location.href = data.url
    } catch (err) {
      setSubscribeError(err instanceof Error ? err.message : 'Something went wrong')
      setSubscribeLoading(null)
    }
  }

  async function handleManageSubscription() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Failed to open portal')
      window.location.href = data.url
    } catch (err) {
      setPortalLoading(false)
    }
  }

  const features = [
    'Full book library',
    'Friends & lending',
    'AI book scanning',
    'PWA mobile app',
  ]

  return (
    <div className="space-y-10 max-w-2xl">

      {/* User Info */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-4">Account</h2>
        <div className="bg-white rounded-xl border border-stone-200 p-6 flex items-center gap-5">
          <div className="shrink-0 h-14 w-14 rounded-full bg-stone-800 flex items-center justify-center text-white text-lg font-semibold">
            {initials(currentName)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-stone-800">{currentName}</p>
            <p className="text-sm text-stone-500">{email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-stone-200 text-stone-700 hover:bg-stone-50 shrink-0"
            onClick={() => { setEditName(currentName); setEditError(null); setEditOpen(true) }}
          >
            Edit name
          </Button>
        </div>
      </section>

      {/* Subscription Status */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-4">Subscription</h2>
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">

          {isTrialing && (
            <>
              <div className="flex items-center gap-3">
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                  Free Trial
                </Badge>
                <span className="text-sm font-medium text-stone-700">
                  {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} remaining`}
                </span>
              </div>
              {trialEndDate && (
                <p className="text-sm text-stone-500">Trial ends on {trialEndDate}</p>
              )}
              <p className="text-sm text-stone-500">
                After your trial ends, choose a plan to keep access.
              </p>
              <Button
                variant="outline"
                className="border-stone-300 text-stone-700 hover:bg-stone-50"
                onClick={scrollToPlans}
              >
                View plans ↓
              </Button>
            </>
          )}

          {isActive && (
            <>
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                  Active
                </Badge>
                <span className="text-sm font-medium text-stone-700">{planLabel} plan</span>
              </div>
              <div className="text-sm text-stone-500 space-y-0.5">
                {nextBilling && <p>Next billing date: {nextBilling}</p>}
                <p>Amount: {planPrice}</p>
              </div>
              <Button
                variant="outline"
                className="border-stone-300 text-stone-700 hover:bg-stone-50"
                disabled={portalLoading}
                onClick={handleManageSubscription}
              >
                {portalLoading ? 'Loading…' : 'Manage subscription →'}
              </Button>
            </>
          )}

          {isExpired && (
            <>
              <div className="flex items-center gap-3">
                <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                  Expired
                </Badge>
              </div>
              <p className="text-sm text-stone-500">
                Your trial has ended. Subscribe to regain access.
              </p>
              <Button
                className="bg-stone-800 hover:bg-stone-700 text-white"
                onClick={scrollToPlans}
              >
                Subscribe now ↓
              </Button>
            </>
          )}

        </div>
      </section>

      {/* Plans */}
      <section id="plans">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">Plans</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Monthly */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-4">
            <div>
              <span className="text-sm font-medium text-stone-500">Monthly</span>
            </div>
            <div>
              <span className="text-3xl font-bold text-stone-800">$1</span>
              <span className="text-sm text-stone-400 ml-1">/ month</span>
            </div>
            <ul className="space-y-1.5">
              {features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-stone-600">
                  <span className="text-emerald-500">✓</span> {f}
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              className="mt-auto border-stone-300 text-stone-800 hover:bg-stone-50"
              disabled={subscribeLoading !== null || isActive}
              onClick={() => handleSubscribe(monthlyPriceId, 'monthly')}
            >
              {subscribeLoading === 'monthly' ? 'Loading…' : isActive && profile.subscription_plan === 'monthly' ? 'Current plan' : 'Subscribe'}
            </Button>
          </div>

          {/* Annual */}
          <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-300">Annual</span>
              <span className="text-xs bg-amber-400 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                Best value
              </span>
            </div>
            <div>
              <span className="text-3xl font-bold text-white">$10</span>
              <span className="text-sm text-stone-400 ml-1">/ year</span>
            </div>
            <ul className="space-y-1.5">
              {features.map(f => (
                <li key={f} className="flex items-center gap-2 text-sm text-stone-300">
                  <span className="text-emerald-400">✓</span> {f}
                </li>
              ))}
            </ul>
            <Button
              className="mt-auto bg-white text-stone-900 hover:bg-stone-100"
              disabled={subscribeLoading !== null || isActive}
              onClick={() => handleSubscribe(annualPriceId, 'annual')}
            >
              {subscribeLoading === 'annual' ? 'Loading…' : isActive && profile.subscription_plan === 'annual' ? 'Current plan' : 'Subscribe'}
            </Button>
          </div>

        </div>
        {subscribeError && (
          <p className="text-sm text-red-600 mt-3">{subscribeError}</p>
        )}
        <p className="text-xs text-stone-400 mt-4">
          Payments processed securely by Stripe. Cancel any time.
        </p>
      </section>

      {/* Edit name dialog */}
      <Dialog open={editOpen} onOpenChange={open => !open && setEditOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-stone-800">Edit name</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-stone-700">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="border-stone-200 focus-visible:ring-stone-400"
                onKeyDown={e => e.key === 'Enter' && handleSaveName()}
              />
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-stone-500" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={editLoading}
              className="bg-stone-800 hover:bg-stone-700 text-white"
              onClick={handleSaveName}
            >
              {editLoading ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}
