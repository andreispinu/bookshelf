'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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
import { addBook, addBookForce } from '../actions'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'

export default function AddBookForm() {
  const t = useTranslations('books')
  const tc = useTranslations('common')
  const searchParams = useSearchParams()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fillLoading, setFillLoading] = useState(false)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)

  const [coverFailed, setCoverFailed] = useState(false)

  const [fields, setFields] = useState({
    title:       searchParams.get('title')       ?? '',
    author:      searchParams.get('author')      ?? '',
    isbn:        searchParams.get('isbn')        ?? '',
    publisher:   searchParams.get('publisher')   ?? '',
    year:        searchParams.get('year')        ?? '',
    description: searchParams.get('description') ?? '',
    cover_url:   searchParams.get('cover_url')   ?? '',
    category:    searchParams.get('category')    ?? '',
    language:    searchParams.get('language')    ?? '',
  })

  const hasPreFill = !!(fields.title || fields.author)

  useEffect(() => {
    if (searchParams.get('error') === '1') {
      toast.error("Couldn't read the cover, please fill in manually")
    }
  }, [searchParams])

  // Reset cover error state whenever cover_url changes
  useEffect(() => { setCoverFailed(false) }, [fields.cover_url])

  function set(key: keyof typeof fields, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  function handleCoverError() {
    setCoverFailed(true)
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

      if (data.error === 'not_found') {
        toast.error("Couldn't find this book — please fill in manually")
        return
      }
      if (data.error === 'ambiguous') {
        toast.error("Add more details to the title for better results")
        return
      }
      if (!data.suggested) {
        toast.error("Couldn't find this book — please fill in manually")
        return
      }

      const s = data.suggested as Record<string, string | null>
      console.log('[Fill with AI] suggested:', s)
      // Only fill empty fields
      setFields(prev => ({
        title:       prev.title,
        author:      prev.author      || s.author      || '',
        isbn:        prev.isbn        || s.isbn        || '',
        publisher:   prev.publisher   || s.publisher   || '',
        year:        prev.year        || s.year        || '',
        description: prev.description || s.description || '',
        cover_url:   prev.cover_url   || s.cover_url   || '',
        category:    prev.category    || s.category    || '',
        language:    prev.language    || s.language    || '',
      }))
      toast.success("Fields filled by AI — review before saving")
    } catch {
      toast.error("Couldn't find this book — please fill in manually")
    } finally {
      setFillLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await addBook(formData)

    if (result && 'duplicate' in result) {
      setPendingFormData(formData)
      setShowDuplicate(true)
      setLoading(false)
      return
    }
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  async function handleAddAnyway() {
    if (!pendingFormData) return
    setShowDuplicate(false)
    setLoading(true)
    const result = await addBookForce(pendingFormData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  const canFill = fields.title.trim().length >= 3

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <Link href="/books" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
          {t('backToBooks')}
        </Link>
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-stone-800 text-xl">{t('addBookTitle')}</CardTitle>
          {hasPreFill && (
            <p className="text-xs text-stone-400 mt-1">{t('prefillNote')}</p>
          )}
        </CardHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
          <CardContent className="space-y-4">

            {/* Cover preview */}
            {fields.cover_url && !coverFailed && (
              <div className="flex justify-center">
                <img
                  key={fields.cover_url}
                  src={fields.cover_url}
                  alt={t('coverImage')}
                  className="h-40 w-auto rounded shadow-sm object-cover"
                  onError={handleCoverError}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="title" className="text-stone-700">{t('titleField')} <span className="text-red-500">*</span></Label>
                <button
                  type="button"
                  onClick={handleFillWithAI}
                  disabled={!canFill || fillLoading}
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md transition-all ${
                    canFill
                      ? 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer'
                      : 'text-stone-300 cursor-default'
                  }`}
                >
                  {fillLoading
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Sparkles className="h-3 w-3" />
                  }
                  Fill with AI
                </button>
              </div>
              <Input id="title" name="title" value={fields.title} onChange={e => set('title', e.target.value)}
                placeholder="e.g. The Name of the Wind" required
                className="border-stone-200 focus-visible:ring-stone-400" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="author" className="text-stone-700">{t('author')} <span className="text-red-500">*</span></Label>
              <Input id="author" name="author" value={fields.author} onChange={e => set('author', e.target.value)}
                placeholder="e.g. Patrick Rothfuss" required
                className="border-stone-200 focus-visible:ring-stone-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="publisher" className="text-stone-700">
                  {t('publisher')} <span className="text-stone-400 font-normal text-xs">({tc('optional')})</span>
                </Label>
                <Input id="publisher" name="publisher" value={fields.publisher} onChange={e => set('publisher', e.target.value)}
                  placeholder="e.g. Gollancz"
                  className="border-stone-200 focus-visible:ring-stone-400" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year" className="text-stone-700">
                  {t('year')} <span className="text-stone-400 font-normal text-xs">({tc('optional')})</span>
                </Label>
                <Input id="year" name="year" value={fields.year} onChange={e => set('year', e.target.value)}
                  placeholder="e.g. 2007"
                  className="border-stone-200 focus-visible:ring-stone-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="isbn" className="text-stone-700">
                {t('isbn')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
              </Label>
              <Input id="isbn" name="isbn" value={fields.isbn} onChange={e => set('isbn', e.target.value)}
                placeholder="e.g. 9780756404741"
                className="border-stone-200 focus-visible:ring-stone-400" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cover_url" className="text-stone-700">
                {t('coverUrl')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
              </Label>
              <Input id="cover_url" name="cover_url" type="url" value={fields.cover_url} onChange={e => set('cover_url', e.target.value)}
                placeholder="https://…"
                className="border-stone-200 focus-visible:ring-stone-400" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-stone-700">
                {t('category')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
              </Label>
              <select
                id="category"
                name="category"
                value={fields.category}
                onChange={e => set('category', e.target.value)}
                className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                <option value="">{t('noCategory')}</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="language" className="text-stone-700">
                {t('language')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
              </Label>
              <select
                id="language"
                name="language"
                value={fields.language}
                onChange={e => set('language', e.target.value)}
                className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                <option value="">{t('noLanguage')}</option>
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-stone-700">
                {t('description')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
              </Label>
              <Textarea id="description" name="description" value={fields.description} onChange={e => set('description', e.target.value)}
                placeholder="A short description of the book…" rows={3}
                className="border-stone-200 focus-visible:ring-stone-400 resize-none" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button type="submit" disabled={loading}
              className="bg-stone-800 hover:bg-stone-700 text-white">
              {loading ? tc('saving') : t('addBook2')}
            </Button>
            <Button type="button" variant="ghost" className="text-stone-500"
              onClick={() => router.push('/books')}>
              {tc('cancel')}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Duplicate confirmation dialog */}
      <Dialog open={showDuplicate} onOpenChange={open => !open && setShowDuplicate(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-stone-800">{t('alreadyOnShelf')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">{t('duplicateMessage')}</p>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="ghost" className="text-stone-500"
              onClick={() => setShowDuplicate(false)}>
              {tc('cancel')}
            </Button>
            <Button onClick={handleAddAnyway}
              className="bg-stone-800 hover:bg-stone-700 text-white">
              {t('addAnyway')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
