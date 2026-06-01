'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { signup } from '../actions'

export default function SignupPage() {
  const t = useTranslations('auth')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await signup(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <Card className="border-stone-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-stone-800 text-xl">{t('createAccount')}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-stone-700">{t('name')}</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder={t('yourName')}
              required
              className="border-stone-200 focus-visible:ring-stone-400"
            />
          </div>
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
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-stone-700">{t('password')}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
              className="border-stone-200 focus-visible:ring-stone-400"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-800 hover:bg-stone-700 text-white"
          >
            {loading ? t('creatingAccount') : t('createAccount')}
          </Button>
          <p className="text-sm text-stone-500 text-center">
            {t('alreadyHaveAccount')}{' '}
            <Link href="/login" className="text-stone-800 underline underline-offset-2">
              {t('signIn')}
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
