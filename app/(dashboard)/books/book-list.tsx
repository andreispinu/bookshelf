'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { updateBook, deleteBook, fillBookFields } from './actions'
import { lendBook } from '../loans/actions'
import type { Book, Friend } from '@/types'
import { CATEGORIES } from '@/lib/categories'
import { LANGUAGES } from '@/lib/languages'

type FillSuggestion = {
  field: keyof Pick<Book, 'isbn' | 'publisher' | 'year' | 'category' | 'language' | 'description' | 'cover_url'>
  label: string
  current: string | null
  suggested: string
  accepted: boolean
}

function BookMenu({
  book, isDeleting, onLend, onEdit, onFill, onDelete,
}: {
  book: Book
  isDeleting: boolean
  onLend: () => void
  onEdit: () => void
  onFill: () => void
  onDelete: () => void
}) {
  const t = useTranslations('books')
  const tc = useTranslations('common')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="text-stone-400 hover:text-stone-700 px-2"
        onClick={() => setOpen(v => !v)}
        aria-label="More actions"
      >
        ⋯
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-stone-200 bg-white shadow-md py-1 z-10">
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={book.status === 'lent_out'}
            onClick={() => { setOpen(false); onLend() }}
          >
            {t('lend')}
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            onClick={() => { setOpen(false); onEdit() }}
          >
            {tc('edit')}
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            onClick={() => { setOpen(false); onFill() }}
          >
            {t('fillWithAI')}
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
            disabled={isDeleting}
            onClick={() => { setOpen(false); onDelete() }}
          >
            {isDeleting ? tc('saving') : tc('delete')}
          </button>
        </div>
      )}
    </div>
  )
}

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function BookList({ books: initial, friends }: { books: Book[], friends: Friend[] }) {
  const t = useTranslations('books')
  const tc = useTranslations('common')
  const router = useRouter()
  const [books, setBooks] = useState(initial)
  const [editing, setEditing] = useState<Book | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editCoverFile, setEditCoverFile] = useState<File | null>(null)
  const [editCoverPreview, setEditCoverPreview] = useState<string | null>(null)
  const [editCoverRemoved, setEditCoverRemoved] = useState(false)
  const editCameraRef = useRef<HTMLInputElement>(null)
  const editUploadRef = useRef<HTMLInputElement>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lending, setLending] = useState<Book | null>(null)
  const [lendError, setLendError] = useState<string | null>(null)
  const [lendingTo, setLendingTo] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const [fillingBook, setFillingBook] = useState<Book | null>(null)
  const [fillLoading, setFillLoading] = useState(false)
  const [fillError, setFillError] = useState<string | null>(null)
  const [fillSuggestions, setFillSuggestions] = useState<FillSuggestion[]>([])
  const [fillConfirming, setFillConfirming] = useState(false)

  const acceptedFriends = friends.filter(f => f.status === 'accepted')

  const uniqueCategories = [...new Set(
    books.filter(b => b.category).map(b => b.category as string)
  )].sort((a, b) => CATEGORIES.indexOf(a as typeof CATEGORIES[number]) - CATEGORIES.indexOf(b as typeof CATEGORIES[number]))

  const categoryCounts = books.reduce<Record<string, number>>((acc, b) => {
    if (b.category) acc[b.category] = (acc[b.category] ?? 0) + 1
    return acc
  }, {})

  const filteredBooks = activeCategory ? books.filter(b => b.category === activeCategory) : books

  function handleEditCoverSelect(file: File) {
    setEditCoverFile(file)
    setEditCoverPreview(URL.createObjectURL(file))
    setEditCoverRemoved(false)
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    setEditError(null)
    setEditLoading(true)

    const form = e.currentTarget

    try {
      let newCoverUrl: string | null = editCoverRemoved ? null : editing.cover_url

      if (editCoverFile) {
        const fd = new FormData()
        fd.append('image', editCoverFile)
        const res = await fetch('/api/upload-book-cover', { method: 'POST', body: fd })
        const data = await res.json()
        if (!res.ok) {
          setEditError(data.error || 'Cover upload failed')
          setEditLoading(false)
          return
        }
        newCoverUrl = data.cover_url
      }

      const formData = new FormData(form)
      formData.set('cover_url', newCoverUrl ?? '')
      const result = await updateBook(editing.id, formData)

      if (result?.error) {
        setEditError(result.error)
        setEditLoading(false)
        return
      }

      setBooks(prev => prev.map(b =>
        b.id === editing.id
          ? {
              ...b,
              title:       formData.get('title')       as string,
              author:      formData.get('author')      as string,
              isbn:        (formData.get('isbn')        as string) || null,
              cover_url:   newCoverUrl,
              description: (formData.get('description') as string) || null,
              publisher:   (formData.get('publisher')   as string) || null,
              year:        (formData.get('year')        as string) || null,
              category:    (formData.get('category')    as string) || null,
              language:    (formData.get('language')    as string) || null,
            }
          : b
      ))
      setEditing(null)
      setEditLoading(false)
    } catch (err) {
      console.error('handleUpdate error:', err)
      setEditError('Something went wrong. Please try again.')
      setEditLoading(false)
    }
  }

  async function handleDelete(bookId: string) {
    setDeletingId(bookId)
    const result = await deleteBook(bookId)
    if (result?.error) {
      toast.error(result.error)
    } else {
      setBooks(prev => prev.filter(b => b.id !== bookId))
    }
    setDeletingId(null)
  }

  function handleLend(borrowerId: string) {
    if (!lending) return
    setLendError(null)
    setLendingTo(borrowerId)
    startTransition(async () => {
      const result = await lendBook(lending.id, borrowerId)
      if (result?.error) {
        setLendError(result.error)
      } else {
        setBooks(prev => prev.map(b =>
          b.id === lending.id ? { ...b, status: 'lent_out' } : b
        ))
        setLending(null)
      }
      setLendingTo(null)
    })
  }

  async function handleFillWithAI(book: Book) {
    setFillingBook(book)
    setFillLoading(true)
    setFillError(null)
    setFillSuggestions([])

    try {
      const res = await fetch('/api/fill-book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId: book.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI fill failed')

      const fields: Array<{ field: FillSuggestion['field']; label: string }> = [
        { field: 'isbn',        label: 'ISBN' },
        { field: 'publisher',   label: t('publisher') },
        { field: 'year',        label: t('year') },
        { field: 'category',    label: t('category') },
        { field: 'language',    label: t('language') },
        { field: 'description', label: t('description') },
        { field: 'cover_url',   label: t('coverImage') },
      ]

      const suggestions: FillSuggestion[] = []
      for (const { field, label } of fields) {
        const suggested = data.suggested?.[field]
        if (!suggested) continue
        const current = book[field] as string | null
        if (suggested === current) continue
        suggestions.push({ field, label, current, suggested, accepted: !current })
      }

      setFillSuggestions(suggestions)
    } catch (err) {
      setFillError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setFillLoading(false)
    }
  }

  async function handleFillConfirm() {
    if (!fillingBook) return
    const accepted = fillSuggestions.filter(s => s.accepted)
    if (accepted.length === 0) { setFillingBook(null); return }

    setFillConfirming(true)
    const fields: Record<string, string | null> = {}
    for (const s of accepted) fields[s.field] = s.suggested

    const result = await fillBookFields(fillingBook.id, fields)
    if (result?.error) {
      setFillError(result.error)
      setFillConfirming(false)
      return
    }

    setBooks(prev => prev.map(b => {
      if (b.id !== fillingBook.id) return b
      const updated = { ...b }
      for (const s of accepted) (updated as Record<string, unknown>)[s.field] = s.suggested
      return updated
    }))

    setFillingBook(null)
    setFillConfirming(false)
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-20 text-stone-400">
        <p className="text-lg">{t('noBooksYet')}</p>
        <p className="text-sm mt-1">{t('addFirstBook')}</p>
      </div>
    )
  }

  return (
    <>
      {uniqueCategories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              !activeCategory ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`}
          >
            {tc('all')} <span className={!activeCategory ? 'opacity-75' : 'text-stone-400'}>({books.length})</span>
          </button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat} <span className={activeCategory === cat ? 'opacity-75' : 'text-stone-400'}>({categoryCounts[cat] ?? 0})</span>
            </button>
          ))}
        </div>
      )}

      {filteredBooks.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">{t('noBooksInCategory')}</div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {filteredBooks.map(book => (
            <li key={book.id} className="flex items-center gap-4 py-4">
              <div className="shrink-0 w-10 h-14 rounded bg-stone-200 overflow-hidden flex items-center justify-center">
                {book.cover_url
                  ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  : <span className="text-stone-400 text-lg">📖</span>
                }
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 truncate">{book.title}</p>
                <p className="text-sm text-stone-500 truncate">{book.author}</p>
                {book.category && <p className="text-xs text-stone-400 mt-0.5">{book.category}</p>}
                {book.isbn && <p className="text-xs text-stone-400 mt-0.5">ISBN {book.isbn}</p>}
              </div>

              <Badge
                variant="outline"
                className={
                  book.status === 'available'
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : 'border-amber-200 text-amber-700 bg-amber-50'
                }
              >
                {book.status === 'available' ? t('available') : t('lentOut')}
              </Badge>

              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-stone-400 hover:text-stone-700"
                  onClick={() => router.push(`/books/${book.id}`)}
                >
                  {t('view')}
                </Button>
                <BookMenu
                  book={book}
                  isDeleting={deletingId === book.id}
                  onLend={() => { setLending(book); setLendError(null) }}
                  onEdit={() => { setEditing(book); setEditError(null); setEditCoverFile(null); setEditCoverPreview(null); setEditCoverRemoved(false) }}
                  onFill={() => handleFillWithAI(book)}
                  onDelete={() => handleDelete(book.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Lend dialog */}
      <Dialog open={!!lending} onOpenChange={open => !open && setLending(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-stone-800">{t('lendBook')}</DialogTitle>
          </DialogHeader>
          {lending && (
            <div>
              <p className="text-sm text-stone-500 mb-4">
                {t('lendTo', { title: lending.title })}
              </p>
              {acceptedFriends.length === 0 ? (
                <p className="text-sm text-stone-400">{t('noFriendsToLend')}</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {acceptedFriends.map(f => (
                    <li key={f.friendshipId} className="flex items-center gap-3 py-2.5">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="bg-stone-200 text-stone-700 text-xs">
                          {initials(f.profile.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="flex-1 text-sm text-stone-800">{f.profile.name}</span>
                      <Button
                        size="sm"
                        disabled={isPending && lendingTo === f.profile.id}
                        onClick={() => handleLend(f.profile.id)}
                        className="bg-stone-800 hover:bg-stone-700 text-white"
                      >
                        {isPending && lendingTo === f.profile.id ? '…' : t('lend')}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {lendError && <p className="text-sm text-red-600 mt-3">{lendError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" className="text-stone-500" onClick={() => setLending(null)}>
              {tc('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[95vh] sm:max-h-[90vh] p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0">
            <DialogTitle className="text-stone-800">{t('editBook')}</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate} className="flex flex-col flex-1 min-h-0">
              <div className="space-y-4 px-6 py-2 overflow-y-auto flex-1">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title" className="text-stone-700">{t('titleField')}</Label>
                  <Input id="edit-title" name="title" defaultValue={editing.title} required
                    className="border-stone-200 focus-visible:ring-stone-400" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-author" className="text-stone-700">{t('author')}</Label>
                  <Input id="edit-author" name="author" defaultValue={editing.author} required
                    className="border-stone-200 focus-visible:ring-stone-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-publisher" className="text-stone-700">{t('publisher')}</Label>
                    <Input id="edit-publisher" name="publisher" defaultValue={editing.publisher ?? ''}
                      className="border-stone-200 focus-visible:ring-stone-400" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-year" className="text-stone-700">{t('year')}</Label>
                    <Input id="edit-year" name="year" defaultValue={editing.year ?? ''}
                      className="border-stone-200 focus-visible:ring-stone-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-isbn" className="text-stone-700">
                    {t('isbn')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
                  </Label>
                  <Input id="edit-isbn" name="isbn" defaultValue={editing.isbn ?? ''}
                    className="border-stone-200 focus-visible:ring-stone-400" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-category" className="text-stone-700">
                      {t('category')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
                    </Label>
                    <select id="edit-category" name="category" defaultValue={editing.category ?? ''}
                      className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400">
                      <option value="">{t('noCategory')}</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-language" className="text-stone-700">
                      {t('language')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
                    </Label>
                    <select id="edit-language" name="language" defaultValue={editing.language ?? ''}
                      className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400">
                      <option value="">{t('noLanguage')}</option>
                      {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-stone-700">{t('cover')} <span className="text-stone-400 font-normal">({tc('optional')})</span></Label>
                  <div className="flex flex-col items-center gap-3 pt-1">
                    <div className="w-24 h-36 rounded-lg bg-stone-100 overflow-hidden flex items-center justify-center border border-stone-200 shrink-0">
                      {editCoverPreview
                        ? <img src={editCoverPreview} alt="Cover" className="w-full h-full object-cover" />
                        : !editCoverRemoved && editing.cover_url
                        ? <img src={editing.cover_url} alt="Cover" className="w-full h-full object-cover" />
                        : <span className="text-stone-400 text-3xl">📖</span>
                      }
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" variant="outline" size="sm"
                        className="text-stone-600 border-stone-200"
                        onClick={() => editCameraRef.current?.click()}>
                        {t('takePhoto')}
                      </Button>
                      <Button type="button" variant="outline" size="sm"
                        className="text-stone-600 border-stone-200"
                        onClick={() => editUploadRef.current?.click()}>
                        {t('uploadPhoto')}
                      </Button>
                    </div>
                    {(editCoverPreview || (!editCoverRemoved && editing.cover_url)) && (
                      <button type="button"
                        className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                        onClick={() => { setEditCoverFile(null); setEditCoverPreview(null); setEditCoverRemoved(true) }}>
                        {t('removeCover')}
                      </button>
                    )}
                  </div>
                  <input ref={editCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleEditCoverSelect(f) }} />
                  <input ref={editUploadRef} type="file" accept="image/*" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleEditCoverSelect(f) }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-description" className="text-stone-700">
                    {t('description')} <span className="text-stone-400 font-normal">({tc('optional')})</span>
                  </Label>
                  <Textarea id="edit-description" name="description" defaultValue={editing.description ?? ''}
                    rows={3} className="border-stone-200 focus-visible:ring-stone-400 resize-none" />
                </div>
                {editError && <p className="text-sm text-red-600">{editError}</p>}
              </div>
              <DialogFooter className="px-6 py-4 border-t border-stone-100 shrink-0">
                <Button type="button" variant="ghost" className="text-stone-500" onClick={() => setEditing(null)}>
                  {tc('cancel')}
                </Button>
                <Button type="submit" disabled={editLoading} className="bg-stone-800 hover:bg-stone-700 text-white">
                  {editLoading ? tc('saving') : tc('save')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Fill with AI dialog */}
      <Dialog open={!!fillingBook} onOpenChange={open => { if (!open && !fillLoading && !fillConfirming) setFillingBook(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-stone-800">
              {fillingBook ? t('fillWithAITitle', { title: fillingBook.title }) : t('fillWithAI')}
            </DialogTitle>
          </DialogHeader>

          {fillLoading && (
            <div className="py-8 flex flex-col items-center gap-3 text-stone-500">
              <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-700 animate-spin" />
              <p className="text-sm">{t('lookingUpDetails')}</p>
            </div>
          )}

          {!fillLoading && fillError && (
            <p className="text-sm text-red-600 py-4">{fillError}</p>
          )}

          {!fillLoading && !fillError && fillSuggestions.length === 0 && fillingBook && (
            <p className="text-sm text-stone-500 py-4 text-center">{t('noNewInfo')}</p>
          )}

          {!fillLoading && fillSuggestions.length > 0 && (
            <div className="space-y-4 py-2 max-h-[420px] overflow-y-auto pr-1">
              {fillSuggestions.map((s, i) => (
                <label key={s.field} className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={s.accepted}
                    onChange={e => setFillSuggestions(prev =>
                      prev.map((x, j) => j === i ? { ...x, accepted: e.target.checked } : x)
                    )}
                    className="mt-1 h-4 w-4 shrink-0 accent-stone-800"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">{s.label}</p>
                    {s.current && (
                      <p className="text-xs text-stone-400 line-through mb-0.5 truncate">{s.current}</p>
                    )}
                    {s.field === 'cover_url' ? (
                      <img src={s.suggested} alt="Cover preview"
                        className="h-28 w-auto rounded shadow-sm object-cover mt-1"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    ) : s.field === 'description' ? (
                      <p className="text-sm text-stone-800 leading-snug">{s.suggested}</p>
                    ) : (
                      <p className="text-sm font-medium text-stone-800">{s.suggested}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" className="text-stone-500"
              onClick={() => setFillingBook(null)} disabled={fillLoading || fillConfirming}>
              {tc('cancel')}
            </Button>
            {!fillLoading && fillSuggestions.length > 0 && (
              <Button className="bg-stone-800 hover:bg-stone-700 text-white"
                onClick={handleFillConfirm}
                disabled={fillConfirming || !fillSuggestions.some(s => s.accepted)}>
                {fillConfirming ? tc('saving') : t('applyFields', { count: fillSuggestions.filter(s => s.accepted).length })}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
