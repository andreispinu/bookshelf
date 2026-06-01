'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
import { updateBook, deleteBook } from './actions'
import { lendBook } from '../loans/actions'
import type { Book, Friend } from '@/types'
import { CATEGORIES } from '@/lib/categories'

function BookMenu({
  book, isDeleting, onLend, onEdit, onDelete,
}: {
  book: Book
  isDeleting: boolean
  onLend: () => void
  onEdit: () => void
  onDelete: () => void
}) {
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
        <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-stone-200 bg-white shadow-md py-1 z-10">
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
            disabled={book.status === 'lent_out'}
            onClick={() => { setOpen(false); onLend() }}
          >
            Lend
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-stone-600 hover:bg-stone-50"
            onClick={() => { setOpen(false); onEdit() }}
          >
            Edit
          </button>
          <button
            className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
            disabled={isDeleting}
            onClick={() => { setOpen(false); onDelete() }}
          >
            {isDeleting ? 'Deleting…' : 'Delete'}
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
  const router = useRouter()
  const [books, setBooks] = useState(initial)
  const [editing, setEditing] = useState<Book | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [lending, setLending] = useState<Book | null>(null)
  const [lendError, setLendError] = useState<string | null>(null)
  const [lendingTo, setLendingTo] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const acceptedFriends = friends.filter(f => f.status === 'accepted')

  const uniqueCategories = [...new Set(
    books.filter(b => b.category).map(b => b.category as string)
  )].sort((a, b) => CATEGORIES.indexOf(a as typeof CATEGORIES[number]) - CATEGORIES.indexOf(b as typeof CATEGORIES[number]))

  const filteredBooks = activeCategory ? books.filter(b => b.category === activeCategory) : books

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    setEditError(null)
    setEditLoading(true)

    const formData = new FormData(e.currentTarget)
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
            cover_url:   (formData.get('cover_url')   as string) || null,
            description: (formData.get('description') as string) || null,
            publisher:   (formData.get('publisher')   as string) || null,
            year:        (formData.get('year')        as string) || null,
            category:    (formData.get('category')    as string) || null,
          }
        : b
    ))
    setEditing(null)
    setEditLoading(false)
  }

  async function handleDelete(bookId: string) {
    setDeletingId(bookId)
    const result = await deleteBook(bookId)
    if (!result?.error) {
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

  if (books.length === 0) {
    return (
      <div className="text-center py-20 text-stone-400">
        <p className="text-lg">No books yet.</p>
        <p className="text-sm mt-1">Add your first book to get started.</p>
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
            All
          </button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                activeCategory === cat ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {filteredBooks.length === 0 ? (
        <div className="text-center py-12 text-stone-400 text-sm">No books in this category.</div>
      ) : (
        <ul className="divide-y divide-stone-100">
          {filteredBooks.map(book => (
            <li key={book.id} className="flex items-center gap-4 py-4">
              {/* Cover thumbnail or placeholder */}
              <div className="shrink-0 w-10 h-14 rounded bg-stone-200 overflow-hidden flex items-center justify-center">
                {book.cover_url
                  ? <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                  : <span className="text-stone-400 text-lg">📖</span>
                }
              </div>

              {/* Details */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-stone-800 truncate">{book.title}</p>
                <p className="text-sm text-stone-500 truncate">{book.author}</p>
                {book.category && <p className="text-xs text-stone-400 mt-0.5">{book.category}</p>}
                {book.isbn && <p className="text-xs text-stone-400 mt-0.5">ISBN {book.isbn}</p>}
              </div>

              {/* Status */}
              <Badge
                variant="outline"
                className={
                  book.status === 'available'
                    ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                    : 'border-amber-200 text-amber-700 bg-amber-50'
                }
              >
                {book.status === 'available' ? 'Available' : 'Lent out'}
              </Badge>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-stone-400 hover:text-stone-700"
                  onClick={() => router.push(`/books/${book.id}`)}
                >
                  View
                </Button>
                <BookMenu
                  book={book}
                  isDeleting={deletingId === book.id}
                  onLend={() => { setLending(book); setLendError(null) }}
                  onEdit={() => { setEditing(book); setEditError(null) }}
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
            <DialogTitle className="text-stone-800">Lend book</DialogTitle>
          </DialogHeader>
          {lending && (
            <div>
              <p className="text-sm text-stone-500 mb-4">
                Who are you lending <span className="font-medium text-stone-700">"{lending.title}"</span> to?
              </p>
              {acceptedFriends.length === 0 ? (
                <p className="text-sm text-stone-400">
                  You have no friends yet. Add friends on the Friends page first.
                </p>
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
                        {isPending && lendingTo === f.profile.id ? '…' : 'Lend'}
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
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={open => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-stone-800">Edit book</DialogTitle>
          </DialogHeader>
          {editing && (
            <form onSubmit={handleUpdate}>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title" className="text-stone-700">Title</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    defaultValue={editing.title}
                    required
                    className="border-stone-200 focus-visible:ring-stone-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-author" className="text-stone-700">Author</Label>
                  <Input
                    id="edit-author"
                    name="author"
                    defaultValue={editing.author}
                    required
                    className="border-stone-200 focus-visible:ring-stone-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-publisher" className="text-stone-700">Publisher</Label>
                    <Input id="edit-publisher" name="publisher"
                      defaultValue={editing.publisher ?? ''}
                      className="border-stone-200 focus-visible:ring-stone-400" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-year" className="text-stone-700">Year</Label>
                    <Input id="edit-year" name="year"
                      defaultValue={editing.year ?? ''}
                      className="border-stone-200 focus-visible:ring-stone-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-isbn" className="text-stone-700">
                    ISBN <span className="text-stone-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="edit-isbn"
                    name="isbn"
                    defaultValue={editing.isbn ?? ''}
                    className="border-stone-200 focus-visible:ring-stone-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-category" className="text-stone-700">
                    Category <span className="text-stone-400 font-normal">(optional)</span>
                  </Label>
                  <select
                    id="edit-category"
                    name="category"
                    defaultValue={editing.category ?? ''}
                    className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
                  >
                    <option value="">No category</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-cover" className="text-stone-700">
                    Cover URL <span className="text-stone-400 font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="edit-cover"
                    name="cover_url"
                    type="url"
                    defaultValue={editing.cover_url ?? ''}
                    className="border-stone-200 focus-visible:ring-stone-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="edit-description" className="text-stone-700">
                    Description <span className="text-stone-400 font-normal">(optional)</span>
                  </Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={editing.description ?? ''}
                    rows={3}
                    className="border-stone-200 focus-visible:ring-stone-400 resize-none"
                  />
                </div>
                {editError && <p className="text-sm text-red-600">{editError}</p>}
              </div>
              <DialogFooter className="mt-4">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-stone-500"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editLoading}
                  className="bg-stone-800 hover:bg-stone-700 text-white"
                >
                  {editLoading ? 'Saving…' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
