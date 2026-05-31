'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { updateBook, deleteBook } from '../actions'
import type { Book } from '@/types'

export default function BookDetailActions({ book }: { book: Book }) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [deleting, startDeleteTransition] = useTransition()

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setEditError(null)
    setEditLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await updateBook(book.id, formData)
    if (result?.error) {
      setEditError(result.error)
      setEditLoading(false)
      return
    }
    setEditOpen(false)
    setEditLoading(false)
    router.refresh()
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      await deleteBook(book.id)
      router.push('/books')
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => { setEditOpen(true); setEditError(null) }}
          className="bg-stone-800 hover:bg-stone-700 text-white"
        >
          Edit
        </Button>
        <Button
          variant="ghost"
          disabled={deleting}
          onClick={handleDelete}
          className="text-red-500 hover:text-red-700 hover:bg-red-50"
        >
          {deleting ? 'Deleting…' : 'Delete'}
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={open => !open && setEditOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-stone-800">Edit book</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="d-title" className="text-stone-700">Title</Label>
                <Input id="d-title" name="title" defaultValue={book.title} required
                  className="border-stone-200 focus-visible:ring-stone-400" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-author" className="text-stone-700">Author</Label>
                <Input id="d-author" name="author" defaultValue={book.author} required
                  className="border-stone-200 focus-visible:ring-stone-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="d-publisher" className="text-stone-700">Publisher</Label>
                  <Input id="d-publisher" name="publisher" defaultValue={book.publisher ?? ''}
                    className="border-stone-200 focus-visible:ring-stone-400" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="d-year" className="text-stone-700">Year</Label>
                  <Input id="d-year" name="year" defaultValue={book.year ?? ''}
                    className="border-stone-200 focus-visible:ring-stone-400" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-isbn" className="text-stone-700">ISBN</Label>
                <Input id="d-isbn" name="isbn" defaultValue={book.isbn ?? ''}
                  className="border-stone-200 focus-visible:ring-stone-400" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-cover" className="text-stone-700">Cover URL</Label>
                <Input id="d-cover" name="cover_url" type="url" defaultValue={book.cover_url ?? ''}
                  className="border-stone-200 focus-visible:ring-stone-400" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-description" className="text-stone-700">Description</Label>
                <Textarea id="d-description" name="description" defaultValue={book.description ?? ''}
                  rows={3} className="border-stone-200 focus-visible:ring-stone-400 resize-none" />
              </div>
              {editError && <p className="text-sm text-red-600">{editError}</p>}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="ghost" className="text-stone-500"
                onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={editLoading}
                className="bg-stone-800 hover:bg-stone-700 text-white">
                {editLoading ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
