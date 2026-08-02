'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Mail } from 'lucide-react'

type Feedback = 'sent' | 'already' | 'exists' | null

export default function InviteForm() {
  const t = useTranslations('friends')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.sent) {
        setEmail('')
        setFeedback('sent')
        window.dispatchEvent(new CustomEvent('invite-sent'))
        router.refresh()
      } else if (data.alreadyInvited) {
        setFeedback('already')
      } else if (data.exists) {
        setFeedback('exists')
      }
    } catch {
      // ignore network errors
    } finally {
      setLoading(false)
    }
  }

  return (
    <div id="invite-form" className="bg-[#2c1a0e] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="h-4 w-4 text-[#c4852a]" />
        <h3 className="font-serif text-lg text-white">{t('inviteTitle')}</h3>
      </div>
      <p className="text-xs text-[#c9b8a4] mb-3 leading-relaxed">{t('inviteByEmail')}</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          id="invite-email-input"
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder={t('emailAddress')}
          className="w-full px-3 py-2 rounded-lg bg-white/10 text-white placeholder:text-white/40 text-sm focus:outline-none focus:ring-2 focus:ring-[#c4852a]/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full px-3 py-2 rounded-lg bg-[#c4852a] text-white text-sm font-medium hover:bg-[#b0761f] disabled:opacity-50 transition-colors"
        >
          {loading ? t('sending') : t('sendInvite')}
        </button>
      </form>
      {feedback === 'sent' && <p className="text-xs text-[#8fbf7f] mt-2">{t('inviteSent')}</p>}
      {feedback === 'already' && <p className="text-xs text-[#c9b8a4] mt-2">{t('alreadyInvited')}</p>}
      {feedback === 'exists' && <p className="text-xs text-[#c9b8a4] mt-2">{t('alreadyOnBookshelf')}</p>}
    </div>
  )
}
