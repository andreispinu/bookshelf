'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Camera } from 'lucide-react'
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
import { toast } from 'sonner'
import { updateName } from './actions'
import type { Profile } from '@/types'

type Props = {
  profile: Profile
  email: string
  missingFields: string[]
}

const FIELD_SECTIONS: Record<string, string> = {
  firstName: '#profile-account',
  lastName: '#profile-account',
  username: '#profile-username',
  country: '#profile-location',
  city: '#profile-location',
}

function initials(firstName: string, lastName: string | null) {
  return ((firstName[0] ?? '') + (lastName?.[0] ?? '')).toUpperCase()
}

function scrollToPlans() {
  document.getElementById('plans')?.scrollIntoView({ behavior: 'smooth' })
}

export default function ProfileClient({ profile, email, missingFields }: Props) {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  useEffect(() => {
    setBannerDismissed(localStorage.getItem('bookshelf_profile_banner_dismissed') === 'true')
  }, [])

  function handleDismissBanner() {
    setBannerDismissed(true)
    localStorage.setItem('bookshelf_profile_banner_dismissed', 'true')
  }
  const [avatarUploading, setAvatarUploading] = useState(false)

  const [editOpen, setEditOpen] = useState(false)
  const [editFirstName, setEditFirstName] = useState(profile.first_name ?? '')
  const [editLastName, setEditLastName] = useState(profile.last_name ?? '')
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [currentName, setCurrentName] = useState(profile.name)
  const [currentFirstName, setCurrentFirstName] = useState(profile.first_name ?? profile.name.split(' ')[0] ?? '')
  const [currentLastName, setCurrentLastName] = useState<string | null>(profile.last_name ?? profile.name.split(' ')[1] ?? null)

  const [subscribeLoading, setSubscribeLoading] = useState<string | null>(null)
  const [subscribeError, setSubscribeError] = useState<string | null>(null)
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

  const planPrice = profile.subscription_plan === 'monthly' ? '$1/month' : '$10/year'
  const planTypeLabel = profile.subscription_plan === 'monthly' ? t('monthlyPlan') : t('annualPlan')
  const nextBilling = profile.subscription_ends_at
    ? new Date(profile.subscription_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null
  const trialEndDate = trialEndsAt
    ? trialEndsAt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarUploading(true)
    const formData = new FormData()
    formData.append('image', file)
    try {
      const res = await fetch('/api/upload-avatar', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setAvatarUrl(data.avatar_url)
      toast.success('Profile picture updated')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setAvatarUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSaveName() {
    setEditError(null)
    setEditLoading(true)
    const result = await updateName(editFirstName, editLastName)
    if (result.error) {
      setEditError(result.error)
      setEditLoading(false)
      return
    }
    const newName = [editFirstName, editLastName].filter(s => s.trim()).join(' ')
    setCurrentName(newName)
    setCurrentFirstName(editFirstName)
    setCurrentLastName(editLastName.trim() || null)
    setEditOpen(false)
    setEditLoading(false)
  }

  async function handleSubscribe(planId: string) {
    setSubscribeError(null)
    setSubscribeLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
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
    } catch {
      setPortalLoading(false)
    }
  }

  const features = [
    t('featureLibrary'),
    t('featureFriends'),
    t('featureAI'),
    t('featurePWA'),
  ]

  const totalFields = 5
  const doneCount = totalFields - missingFields.length
  const progressPct = (doneCount / totalFields) * 100

  const fieldLabels: Record<string, string> = {
    firstName: t('firstName'),
    lastName: t('lastName'),
    username: t('username'),
    country: t('country'),
    city: t('city'),
  }

  return (
    <>

      {/* Profile completion */}
      {missingFields.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
          <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="text-sm text-emerald-800 font-medium">{t('completionComplete')}</span>
        </div>
      ) : !bannerDismissed ? (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 space-y-2.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-amber-900">{t('completionTitle')}</span>
            <button
              onClick={handleDismissBanner}
              className="text-amber-500 hover:text-amber-700 text-xs shrink-0"
              aria-label={t('completionDismiss')}
            >
              {t('completionDismiss')}
            </button>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-amber-700">
              <span>{t('completionProgress', { done: doneCount, total: totalFields })}</span>
              <span>{Math.round(progressPct)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {missingFields.map(field => (
              <a
                key={field}
                href={FIELD_SECTIONS[field]}
                className="inline-flex items-center px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-xs hover:bg-amber-200 transition-colors"
              >
                + {fieldLabels[field]}
              </a>
            ))}
          </div>
        </div>
      ) : null}

      {/* User Info */}
      <section id="profile-account">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('account')}</h2>
        <div className="bg-white rounded-xl border border-stone-200 p-6 flex items-center gap-5">
          <button
            type="button"
            className="relative shrink-0 h-14 w-14 rounded-full overflow-hidden group focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
            onClick={() => !avatarUploading && fileInputRef.current?.click()}
            aria-label="Change profile picture"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={currentName} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full bg-stone-800 flex items-center justify-center text-white text-lg font-semibold">
                {initials(currentFirstName, currentLastName)}
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              {avatarUploading ? (
                <svg className="h-5 w-5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <Camera className="h-5 w-5 text-white" />
              )}
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium text-stone-800">{currentName}</p>
            <p className="text-sm text-stone-500">{email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-stone-200 text-stone-700 hover:bg-stone-50 shrink-0"
            onClick={() => { setEditFirstName(currentFirstName); setEditLastName(currentLastName ?? ''); setEditError(null); setEditOpen(true) }}
          >
            {t('editName')}
          </Button>
        </div>
      </section>

      {/* Subscription Status */}
      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('subscription')}</h2>
        <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">

          {isTrialing && (
            <>
              <div className="flex items-center gap-3">
                <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                  {t('freeTrial')}
                </Badge>
                <span className="text-sm font-medium text-stone-700">
                  {daysLeft === 0 ? t('expiresToday') : t('daysRemaining', { count: daysLeft })}
                </span>
              </div>
              {trialEndDate && (
                <p className="text-sm text-stone-500">{t('trialEndsOn', { date: trialEndDate })}</p>
              )}
              <p className="text-sm text-stone-500">{t('afterTrialEnds')}</p>
              <Button
                variant="outline"
                className="border-stone-300 text-stone-700 hover:bg-stone-50"
                onClick={scrollToPlans}
              >
                {t('viewPlans')}
              </Button>
            </>
          )}

          {isActive && (
            <>
              <div className="flex items-center gap-3">
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
                  {t('active')}
                </Badge>
                <span className="text-sm font-medium text-stone-700">{planTypeLabel}</span>
              </div>
              <div className="text-sm text-stone-500 space-y-0.5">
                {nextBilling && <p>{t('nextBilling', { date: nextBilling })}</p>}
                <p>{t('amount', { price: planPrice })}</p>
              </div>
              <Button
                variant="outline"
                className="border-stone-300 text-stone-700 hover:bg-stone-50"
                disabled={portalLoading}
                onClick={handleManageSubscription}
              >
                {portalLoading ? t('managingSubscription') : t('manageSubscription')}
              </Button>
            </>
          )}

          {isExpired && (
            <>
              <div className="flex items-center gap-3">
                <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                  {t('expired')}
                </Badge>
              </div>
              <p className="text-sm text-stone-500">{t('trialExpiredMessage')}</p>
              <Button
                className="bg-stone-800 hover:bg-stone-700 text-white"
                onClick={scrollToPlans}
              >
                {t('subscribeNow')}
              </Button>
            </>
          )}

        </div>
      </section>

      {/* Plans */}
      <section id="plans">
        <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('plans')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Monthly */}
          <div className="bg-white rounded-xl border border-stone-200 p-6 flex flex-col gap-4">
            <div>
              <span className="text-sm font-medium text-stone-500">{t('monthly')}</span>
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
              onClick={() => handleSubscribe('monthly')}
            >
              {subscribeLoading === 'monthly' ? tc('loading') : isActive && profile.subscription_plan === 'monthly' ? t('currentPlan') : t('subscribe')}
            </Button>
          </div>

          {/* Annual */}
          <div className="bg-stone-800 rounded-xl border border-stone-700 p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-300">{t('annual')}</span>
              <span className="text-xs bg-amber-400 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
                {t('bestValue')}
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
              onClick={() => handleSubscribe('annual')}
            >
              {subscribeLoading === 'annual' ? tc('loading') : isActive && profile.subscription_plan === 'annual' ? t('currentPlan') : t('subscribe')}
            </Button>
          </div>

        </div>
        {subscribeError && (
          <p className="text-sm text-red-600 mt-3">{subscribeError}</p>
        )}
        <p className="text-xs text-stone-400 mt-4">{t('stripeNote')}</p>
      </section>

      {/* Edit name dialog */}
      <Dialog open={editOpen} onOpenChange={open => !open && setEditOpen(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-stone-800">{t('editName')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-first-name" className="text-stone-700">{t('firstName')}</Label>
                <Input
                  id="edit-first-name"
                  value={editFirstName}
                  onChange={e => setEditFirstName(e.target.value)}
                  className="border-stone-200 focus-visible:ring-stone-400"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-last-name" className="text-stone-700">{t('lastName')}</Label>
                <Input
                  id="edit-last-name"
                  value={editLastName}
                  onChange={e => setEditLastName(e.target.value)}
                  className="border-stone-200 focus-visible:ring-stone-400"
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                />
              </div>
            </div>
            {editError && <p className="text-sm text-red-600">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" className="text-stone-500" onClick={() => setEditOpen(false)}>
              {tc('cancel')}
            </Button>
            <Button
              disabled={editLoading}
              className="bg-stone-800 hover:bg-stone-700 text-white"
              onClick={handleSaveName}
            >
              {editLoading ? tc('saving') : tc('save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
