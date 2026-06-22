'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useTranslations } from 'next-intl'
import { Sparkles, Loader2 } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { addToWishlistAndCheck } from '../actions'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'
import { translateCategory } from '@/lib/translate-category'
import type { FriendMatch } from '@/types'

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function AddWishlistForm() {
  const t = useTranslations('wishlist')
  const tc = useTranslations('common')
  const tCat = useTranslations('categories')
  const searchParams = useSearchParams()
  const router = useRouter()

  const [loading, setLoading] = useState(false)
  const [fillLoading, setFillLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Friend availability result
  const [friendResult, setFriendResult] = useState<{ matches: FriendMatch[] } | null>(null)
  const [borrowingMatch, setBorrowingMatch] = useState<FriendMatch | null>(null)
  const [borrowMessage, setBorrowMessage] = useState('')
  const [borrowLoading, setBorrowLoading] = useState(false)
  const [sentBorrowIds, setSentBorrowIds] = useState<Set<string>>(new Set())

  const [fields, setFields] = useState({
    title:       searchParams.get('title')       ?? '',
    author:      searchParams.get('author')      ?? '',
    isbn:        searchParams.get('isbn')        ?? '',
    description: searchParams.get('description') ?? '',
    cover_url:   searchParams.get('cover_url')   ?? '',
    category:    searchParams.get('category')    ?? '',
    language:    searchParams.get('language')    ?? '',
  })

  function set(key: keyof typeof fields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  async function handleFillWithAI() {
    const title = fields.title.trim()
    if (title.length < 3) return
    setFillLoading(true)
    try {
      const res = await fetch('/api/fill-book-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, author: fields.author.trim() || undefined }),
      })
      const data = await res.json()
      if (data.error === 'not_found') { toast.error(t('couldntFindBook')); return }
      if (data.error === 'ambiguous') { toast.error(t('addMoreDetails')); return }
      if (!data.suggested) { toast.error(t('couldntFindBook')); return }

      const s = data.suggested as Record<string, string | null>
      setFields(prev => ({
        title:       prev.title,
        author:      prev.author      || s.author      || '',
        isbn:        prev.isbn        || s.isbn        || '',
        description: prev.description || s.description || '',
        cover_url:   prev.cover_url   || s.cover_url   || '',
        category:    prev.category    || s.category    || '',
        language:    prev.language    || s.language    || '',
      }))
      toast.success(t('fieldsFilled'))
    } catch {
      toast.error(t('couldntFindBook'))
    } finally {
      setFillLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!fields.title.trim() || !fields.author.trim()) return
    setError(null)
    setLoading(true)
    try {
      const result = await addToWishlistAndCheck({
        title:       fields.title.trim(),
        author:      fields.author.trim(),
        isbn:        fields.isbn.trim() || null,
        cover_url:   fields.cover_url.trim() || null,
        category:    fields.category || null,
        language:    fields.language || null,
        description: fields.description.trim() || null,
      })
      if (result.error) { setError(result.error); return }
      setFriendResult({ matches: result.matches })
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleBorrowRequest(match: FriendMatch) {
    setBorrowLoading(true)
    try {
      const res = await fetch('/api/borrow-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: match.bookId, ownerId: match.ownerId, message: borrowMessage }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? tc('somethingWentWrong')); return }
      setSentBorrowIds(prev => new Set(prev).add(match.bookId))
      setBorrowingMatch(null)
      setBorrowMessage('')
    } catch {
      toast.error(tc('somethingWentWrong'))
    } finally {
      setBorrowLoading(false)
    }
  }

  const titleTooShort = fields.title.trim().length < 3

  return (
    <>
      <Card className="max-w-lg mx-auto border-stone-200">
        <CardHeader>
          <CardTitle className="text-stone-800">{t('addToWishlist')}</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* Title + Fill with AI */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="title" className="text-stone-700">{t('titleField')}</Label>
                <button
                  type="button"
                  disabled={titleTooShort || fillLoading}
                  onClick={handleFillWithAI}
                  className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {fillLoading
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Sparkles className="h-3 w-3" />
                  }
                  {t('fillWithAI')}
                </button>
              </div>
              <Input
                id="title"
                value={fields.title}
                onChange={e => set('title', e.target.value)}
                placeholder={t('titlePlaceholder')}
                required
                className="border-stone-200 focus-visible:ring-stone-400"
              />
            </div>

            {/* Author */}
            <div className="space-y-1.5">
              <Label htmlFor="author" className="text-stone-700">{t('authorField')}</Label>
              <Input
                id="author"
                value={fields.author}
                onChange={e => set('author', e.target.value)}
                placeholder={t('authorPlaceholder')}
                required
                className="border-stone-200 focus-visible:ring-stone-400"
              />
            </div>

            {/* ISBN */}
            <div className="space-y-1.5">
              <Label htmlFor="isbn" className="text-stone-700">
                ISBN <span className="text-stone-400 font-normal">({tc('optional')})</span>
              </Label>
              <Input
                id="isbn"
                value={fields.isbn}
                onChange={e => set('isbn', e.target.value)}
                className="border-stone-200 focus-visible:ring-stone-400"
              />
            </div>

            {/* Category + Language */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-stone-700">
                  {t('category')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
                </Label>
                <select
                  id="category"
                  value={fields.category}
                  onChange={e => set('category', e.target.value)}
                  className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="">{t('noCategory')}</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{translateCategory(c, tCat)}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="language" className="text-stone-700">
                  {t('language')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
                </Label>
                <select
                  id="language"
                  value={fields.language}
                  onChange={e => set('language', e.target.value)}
                  className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
                >
                  <option value="">{t('noLanguage')}</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-stone-700">
                {t('description')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
              </Label>
              <Textarea
                id="description"
                value={fields.description}
                onChange={e => set('description', e.target.value)}
                rows={3}
                className="border-stone-200 focus-visible:ring-stone-400 resize-none"
              />
            </div>

            {/* Cover preview */}
            {fields.cover_url && (
              <div className="flex items-center gap-3">
                <img
                  src={fields.cover_url}
                  alt="Cover"
                  className="h-20 w-auto rounded-lg object-cover shadow-sm"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <p className="text-xs text-stone-400">{t('coverFromScan')}</p>
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
          <CardFooter className="flex justify-between border-t border-stone-100 pt-4">
            <Button
              type="button"
              variant="ghost"
              className="text-stone-500"
              onClick={() => router.push('/wishlist')}
            >
              {tc('cancel')}
            </Button>
            <Button
              type="submit"
              disabled={loading || !fields.title.trim() || !fields.author.trim()}
              className="bg-stone-800 hover:bg-stone-700 text-white"
            >
              {loading ? tc('saving') : t('addToWishlist')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Friend availability result modal */}
      <Dialog
        open={!!friendResult}
        onOpenChange={open => {
          if (!open) { setFriendResult(null); router.push('/wishlist') }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-stone-800">
              {friendResult?.matches.length ? t('friendsHaveThisTitle') : t('addedTitle')}
            </DialogTitle>
          </DialogHeader>

          {friendResult?.matches.length === 0 && (
            <p className="text-sm text-stone-500 py-2">{t('noFriendsHaveThis')}</p>
          )}

          {(friendResult?.matches.length ?? 0) > 0 && (
            <div className="space-y-3 py-1">
              <p className="text-sm text-stone-500">{t('friendsHaveThisDesc')}</p>
              <ul className="divide-y divide-stone-100">
                {friendResult?.matches.map(match => (
                  <li key={match.bookId} className="flex items-center gap-3 py-2.5">
                    <Avatar className="h-8 w-8 shrink-0">
                      {match.ownerAvatar && <AvatarImage src={match.ownerAvatar} alt={match.ownerName} />}
                      <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                        {initials(match.ownerName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{match.ownerName}</p>
                      <span className={`inline-block text-[10px] font-medium rounded-full px-2 py-0.5 border ${
                        match.status === 'available'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {match.status === 'available' ? t('available') : t('lentOut')}
                      </span>
                    </div>
                    {sentBorrowIds.has(match.bookId) ? (
                      <span className="text-xs text-emerald-600 font-medium shrink-0">{t('requestSent')}</span>
                    ) : match.status === 'available' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-stone-300 text-stone-700 shrink-0 text-xs"
                        onClick={() => setBorrowingMatch(match)}
                      >
                        {t('requestToBorrow')}
                      </Button>
                    ) : (
                      <span className="text-xs text-stone-400 shrink-0">{t('currentlyLentOut')}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              className="bg-stone-800 hover:bg-stone-700 text-white"
              onClick={() => { setFriendResult(null); router.push('/wishlist') }}
            >
              {tc('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Borrow request sub-modal */}
      {borrowingMatch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={e => { if (e.target === e.currentTarget) { setBorrowingMatch(null); setBorrowMessage('') } }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6">
            <h3 className="font-semibold text-stone-800 text-base mb-1">{t('requestToBorrow')}</h3>
            <p className="text-sm text-stone-500 mb-4">{t('fromFriend', { name: borrowingMatch.ownerName })}</p>
            <label className="block text-xs font-medium text-stone-600 mb-1.5">
              {t('messageLabel')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
            </label>
            <textarea
              value={borrowMessage}
              onChange={e => setBorrowMessage(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-stone-200 px-3 py-2.5 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-300"
            />
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => handleBorrowRequest(borrowingMatch)}
                disabled={borrowLoading}
                className="flex-1 bg-stone-800 text-white hover:bg-stone-700"
              >
                {borrowLoading ? tc('loading') : t('sendRequest')}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setBorrowingMatch(null); setBorrowMessage('') }}
                disabled={borrowLoading}
                className="border-stone-200 text-stone-600 hover:bg-stone-50"
              >
                {tc('cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
