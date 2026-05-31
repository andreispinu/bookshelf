'use client'

import { useState, useEffect } from 'react'
import { Lock, Eye, Library, Copy, ExternalLink, Check, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateUsername, updateProfileVisibility } from './actions'

const USERNAME_REGEX = /^[a-z0-9-]{3,30}$/

type Visibility = 'private' | 'public_minimal' | 'public_full'

type Props = {
  initialUsername: string | null
  initialVisibility: Visibility
}

const visibilityOptions: {
  value: Visibility
  label: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    value: 'private',
    label: 'Private',
    description: 'Only you can see your profile',
    icon: <Lock className="h-4 w-4" />,
  },
  {
    value: 'public_minimal',
    label: 'Public minimal',
    description: 'Anyone with the link can see your name and book count',
    icon: <Eye className="h-4 w-4" />,
  },
  {
    value: 'public_full',
    label: 'Public full',
    description: 'Anyone with the link can see your full library',
    icon: <Library className="h-4 w-4" />,
  },
]

export default function UsernameSection({ initialUsername, initialVisibility }: Props) {
  const [username, setUsername] = useState(initialUsername ?? '')
  const [savedUsername, setSavedUsername] = useState(initialUsername)
  const [checking, setChecking] = useState(false)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [visibility, setVisibility] = useState<Visibility>(initialVisibility)
  const [savingVisibility, setSavingVisibility] = useState(false)

  const isValidFormat = USERNAME_REGEX.test(username)
  const isUnchanged = username === savedUsername

  // Debounced availability check
  useEffect(() => {
    if (!username || !isValidFormat || isUnchanged) {
      setAvailable(null)
      setChecking(false)
      return
    }
    setChecking(true)
    setAvailable(null)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/username/check?username=${encodeURIComponent(username)}`)
        const data = await res.json()
        setAvailable(data.available)
      } catch {
        setAvailable(null)
      } finally {
        setChecking(false)
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [username, isValidFormat, isUnchanged])

  async function handleSave() {
    setSaveError(null)
    setSaving(true)
    const result = await updateUsername(username)
    if (result.error) {
      setSaveError(result.error)
    } else {
      setSavedUsername(username)
      setAvailable(null)
      toast.success('Username saved')
    }
    setSaving(false)
  }

  async function handleVisibilityChange(v: Visibility) {
    setVisibility(v)
    setSavingVisibility(true)
    const result = await updateProfileVisibility(v)
    if (result.error) toast.error(result.error)
    setSavingVisibility(false)
  }

  function copyLink() {
    navigator.clipboard.writeText(`https://bookshelf.name/${savedUsername}`)
    toast.success('Link copied!')
  }

  // Status indicator for the input
  let statusIcon: React.ReactNode = null
  if (username && !isUnchanged) {
    if (checking) statusIcon = <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
    else if (!isValidFormat) statusIcon = <X className="h-4 w-4 text-red-500" />
    else if (available === true)  statusIcon = <Check className="h-4 w-4 text-emerald-500" />
    else if (available === false) statusIcon = <X className="h-4 w-4 text-red-500" />
  }

  const canSave = isValidFormat && !isUnchanged && available === true && !saving

  return (
    <section>
      <h2 className="text-lg font-semibold text-stone-800 mb-4">Public Profile</h2>
      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-6">

        {/* Username */}
        <div className="space-y-2">
          <Label className="text-stone-700">Username</Label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Input
                value={username}
                onChange={e => setUsername(e.target.value.toLowerCase())}
                placeholder="e.g. johndoe"
                className="border-stone-200 focus-visible:ring-stone-400 pr-8"
                maxLength={30}
              />
              {statusIcon && (
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                  {statusIcon}
                </div>
              )}
            </div>
            <Button
              disabled={!canSave}
              onClick={handleSave}
              className="bg-stone-800 hover:bg-stone-700 text-white shrink-0"
            >
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>

          {/* Hint / error */}
          {saveError && <p className="text-xs text-red-600">{saveError}</p>}
          {!saveError && username && !isValidFormat && (
            <p className="text-xs text-red-500">
              3–30 characters, lowercase letters, numbers, and hyphens only.
            </p>
          )}
          {!saveError && isValidFormat && !isUnchanged && available === false && (
            <p className="text-xs text-red-500">That username is already taken.</p>
          )}
          {!saveError && !username && (
            <p className="text-xs text-stone-400">
              Your public link will be bookshelf.name/[username]
            </p>
          )}

          {/* Public link (once saved) */}
          {savedUsername && (
            <div className="flex items-center gap-2 mt-1 p-2.5 bg-stone-50 rounded-lg border border-stone-200">
              <span className="text-sm text-stone-600 flex-1 truncate">
                bookshelf.name/<span className="font-medium text-stone-800">{savedUsername}</span>
              </span>
              <button
                onClick={copyLink}
                className="text-stone-400 hover:text-stone-700 transition-colors"
                title="Copy link"
              >
                <Copy className="h-4 w-4" />
              </button>
              <a
                href={`https://bookshelf.name/${savedUsername}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-stone-400 hover:text-stone-700 transition-colors"
                title="Open profile"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          )}
        </div>

        {/* Visibility */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-stone-700">Visibility</Label>
            {savingVisibility && <Loader2 className="h-3.5 w-3.5 animate-spin text-stone-400" />}
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {visibilityOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleVisibilityChange(opt.value)}
                className={`text-left p-3.5 rounded-lg border transition-all ${
                  visibility === opt.value
                    ? 'border-stone-800 bg-stone-50 ring-1 ring-stone-800'
                    : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <div className={`mb-2 ${visibility === opt.value ? 'text-stone-800' : 'text-stone-400'}`}>
                  {opt.icon}
                </div>
                <p className="text-sm font-medium text-stone-800">{opt.label}</p>
                <p className="text-xs text-stone-500 mt-0.5 leading-snug">{opt.description}</p>
              </button>
            ))}
          </div>
        </div>

      </div>
    </section>
  )
}
