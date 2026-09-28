'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { changePassword } from './actions'

export default function PasswordSection() {
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (newPassword.length < 8) {
      toast.error(t('passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error(t('passwordMismatch'))
      return
    }

    setSaving(true)
    const result = await changePassword(currentPassword, newPassword)
    setSaving(false)

    if (result.error) {
      if (result.error === 'wrong_current_password') {
        toast.error(t('wrongCurrentPassword'))
      } else if (result.error === 'password_too_short') {
        toast.error(t('passwordTooShort'))
      } else {
        toast.error(result.error)
      }
      return
    }

    toast.success(t('passwordChanged'))
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-800 mb-4">{t('passwordSection')}</h2>
      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-stone-700">{t('currentPassword')}</Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              className="border-stone-200 focus-visible:ring-stone-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-stone-700">{t('newPasswordLabel')}</Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="border-stone-200 focus-visible:ring-stone-400"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-stone-700">{t('confirmPasswordLabel')}</Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              minLength={8}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="border-stone-200 focus-visible:ring-stone-400"
            />
          </div>
          <Button
            type="submit"
            disabled={saving || !canSubmit}
            className="bg-stone-800 hover:bg-stone-700 text-white"
          >
            {saving ? tc('saving') : t('changePassword')}
          </Button>
        </form>
      </div>
    </section>
  )
}
