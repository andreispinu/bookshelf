'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase'

export default function ForgotPasswordPage() {
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
        <CardTitle className="text-stone-800 text-xl">Reset password</CardTitle>
      </CardHeader>
      {submitted ? (
        <CardContent>
          <p className="text-sm text-stone-600">
            Check your email — we&apos;ve sent you a password reset link.
          </p>
        </CardContent>
      ) : (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <p className="text-sm text-stone-500">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-stone-700">Email</Label>
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
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </CardFooter>
        </form>
      )}
      <CardFooter className={submitted ? 'pt-0' : ''}>
        <p className="text-sm text-stone-500 text-center w-full">
          <Link href="/login" className="text-stone-800 underline underline-offset-2">
            Back to sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}
