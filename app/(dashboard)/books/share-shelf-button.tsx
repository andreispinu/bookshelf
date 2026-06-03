'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { Share2, X, Check, Loader2, Copy, AlertTriangle } from 'lucide-react'
import { updateUsername, updateProfileVisibility } from '../profile/actions'

const USERNAME_REGEX = /^[a-z0-9-]{3,30}$/

type Visibility = 'private' | 'public_minimal' | 'public_full'

type Props = {
  username: string | null
  visibility: Visibility
  name: string
  bookCount: number
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}

export default function ShareShelfButton({ username, visibility, name, bookCount }: Props) {
  const t = useTranslations('books')

  // Which modal is open
  const [step, setStep] = useState<'closed' | 'setup-username' | 'share'>('closed')

  // Resolved values (may change mid-flow)
  const [currentUsername, setCurrentUsername] = useState(username)
  const [currentVisibility, setCurrentVisibility] = useState<Visibility>(visibility)

  // Sync with server re-renders
  useEffect(() => { setCurrentUsername(username) }, [username])
  useEffect(() => { setCurrentVisibility(visibility) }, [visibility])

  // Username setup state
  const [usernameInput, setUsernameInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Share modal state
  const [copied, setCopied] = useState(false)
  const [makingPublic, setMakingPublic] = useState(false)

  // Debounced availability check for username setup
  const isValidFormat = USERNAME_REGEX.test(usernameInput)
  useEffect(() => {
    if (!usernameInput || !isValidFormat) {
      setAvailable(null)
      setChecking(false)
      return
    }
    setChecking(true)
    setAvailable(null)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username/check?username=${encodeURIComponent(usernameInput)}`)
        const data = await res.json()
        setAvailable(data.available)
      } catch {
        setAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [usernameInput, isValidFormat])

  function handleOpen() {
    if (!currentUsername) {
      setUsernameInput('')
      setAvailable(null)
      setSaveError(null)
      setStep('setup-username')
    } else {
      setStep('share')
    }
  }

  function handleClose() {
    setStep('closed')
  }

  async function handleSaveUsername() {
    setSaving(true)
    setSaveError(null)
    const result = await updateUsername(usernameInput)
    if (result.error) {
      setSaveError(result.error)
      setSaving(false)
      return
    }
    setCurrentUsername(usernameInput)
    setSaving(false)
    setStep('share')
  }

  async function handleMakePublic() {
    setMakingPublic(true)
    const result = await updateProfileVisibility('public_full')
    if (!result.error) setCurrentVisibility('public_full')
    setMakingPublic(false)
  }

  function handleCopy() {
    navigator.clipboard.writeText(`https://bookshelf.name/${currentUsername}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const profileUrl = `https://bookshelf.name/${currentUsername}`
  const isPublic = currentVisibility !== 'private'
  const canSaveUsername = isValidFormat && available === true && !saving

  // Status icon for username input
  let statusIcon: React.ReactNode = null
  if (usernameInput) {
    if (checking) statusIcon = <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
    else if (!isValidFormat) statusIcon = <X className="h-4 w-4 text-red-500" />
    else if (available === true) statusIcon = <Check className="h-4 w-4 text-emerald-500" />
    else if (available === false) statusIcon = <X className="h-4 w-4 text-red-500" />
  }

  return (
    <>
      {/* Share my shelf button */}
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-stone-300 text-stone-700 text-sm font-medium hover:bg-stone-50 hover:border-stone-400 transition-colors shrink-0"
      >
        <Share2 className="h-4 w-4" />
        <span className="hidden sm:inline">{t('shareMyShelf')}</span>
      </button>

      {/* Modal backdrop */}
      {step !== 'closed' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/40"
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
        >

          {/* ── Setup username modal ── */}
          {step === 'setup-username' && (
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <h2 className="font-semibold text-stone-800">{t('setupProfileFirst')}</h2>
                <button onClick={handleClose} className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <p className="text-sm text-stone-500">{t('setupProfileFirstText')}</p>
                <div className="space-y-1.5">
                  <div className="relative">
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={e => setUsernameInput(e.target.value.toLowerCase())}
                      placeholder="e.g. johndoe"
                      maxLength={30}
                      autoFocus
                      className="w-full px-3 py-2.5 pr-9 text-sm rounded-lg border border-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-300 focus:border-transparent placeholder-stone-400"
                    />
                    {statusIcon && (
                      <div className="absolute right-2.5 top-1/2 -translate-y-1/2">{statusIcon}</div>
                    )}
                  </div>
                  {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                  {usernameInput && !isValidFormat && (
                    <p className="text-xs text-red-500">3–30 characters: lowercase letters, numbers, hyphens only</p>
                  )}
                  {isValidFormat && available === false && (
                    <p className="text-xs text-red-500">That username is already taken</p>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 rounded-lg border border-stone-200 text-sm text-stone-700 hover:bg-stone-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!canSaveUsername}
                    onClick={handleSaveUsername}
                    className="flex-1 px-4 py-2 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1.5"
                  >
                    {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {t('saveAndContinue')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Share modal ── */}
          {step === 'share' && (
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
              <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
                <h2 className="font-semibold text-stone-800">{t('shareYourShelf')}</h2>
                <button onClick={handleClose} className="p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="p-5 space-y-4">

                {/* Preview card */}
                <div className="bg-stone-50 border border-stone-200 rounded-lg p-3.5">
                  <p className="text-sm font-semibold text-stone-800">{name}&apos;s BookShelf</p>
                  <p className="text-xs text-stone-400 mt-0.5">bookshelf.name/{currentUsername}</p>
                  <p className="text-xs text-stone-500 mt-1">{t('shelfPreviewBooks', { count: bookCount })}</p>
                </div>

                {/* Private warning */}
                {!isPublic && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 leading-relaxed">{t('profileIsPrivate')}</p>
                  </div>
                )}

                {/* Copy link */}
                <div className="flex items-center gap-2 p-2.5 bg-stone-50 rounded-lg border border-stone-200">
                  <span className="text-xs text-stone-600 flex-1 truncate">bookshelf.name/{currentUsername}</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-stone-200 bg-white text-xs text-stone-700 hover:bg-stone-50 transition-colors shrink-0"
                  >
                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? t('copied') : t('copyLink')}
                  </button>
                </div>

                {/* Share buttons or make-public CTA */}
                {!isPublic ? (
                  <button
                    onClick={handleMakePublic}
                    disabled={makingPublic}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-stone-800 text-white text-sm font-medium hover:bg-stone-700 disabled:opacity-60 transition-colors"
                  >
                    {makingPublic && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('makePublicAndShare')}
                  </button>
                ) : (
                  <div className="flex flex-col gap-2">
                    <a
                      href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1877F2] text-white text-sm font-medium hover:bg-[#166FE5] transition-colors"
                    >
                      <FacebookIcon />
                      {t('shareOnFacebook')}
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(profileUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#0A66C2] text-white text-sm font-medium hover:bg-[#0959A8] transition-colors"
                    >
                      <LinkedInIcon />
                      {t('shareOnLinkedIn')}
                    </a>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      )}
    </>
  )
}
