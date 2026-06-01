'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const email = (new FormData(e.currentTarget)).get('email') as string
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://bookshelf.name/reset-password',
    })
    // Always show success — don't reveal if email exists
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <Card className="border-stone-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-stone-800 text-xl">{t('resetPassword')}</CardTitle>
      </CardHeader>
      {submitted ? (
        <CardContent>
          <p className="text-sm text-stone-600">{t('resetEmailSent')}</p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <p className="text-sm text-stone-500">{t('enterEmailForReset')}</p>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-stone-700">{t('email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="border-stone-200 focus-visible:ring-stone-400"
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-stone-800 hover:bg-stone-700 text-white"
            >
              {loading ? t('sending') : t('sendResetLink')}
            </Button>
          </CardFooter>
        </form>
      )}
      <CardFooter className={submitted ? 'pt-0' : ''}>
        <p className="text-sm text-stone-500 text-center w-full">
          <Link href="/login" className="text-stone-800 underline underline-offset-2">
            {t('backToSignIn')}
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
