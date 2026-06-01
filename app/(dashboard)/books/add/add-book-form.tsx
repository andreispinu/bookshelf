'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
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

export default function AddBookForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showDuplicate, setShowDuplicate] = useState(false)
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null)

  const prefill = {
    title:       searchParams.get('title')       ?? '',
    author:      searchParams.get('author')      ?? '',
    isbn:        searchParams.get('isbn')        ?? '',
    publisher:   searchParams.get('publisher')   ?? '',
    year:        searchParams.get('year')        ?? '',
    description: searchParams.get('description') ?? '',
    cover_url:   searchParams.get('cover_url')   ?? '',
    category:    searchParams.get('category')    ?? '',
  }

  const hasPreFill = !!(prefill.title || prefill.author)

  useEffect(() => {
    if (searchParams.get('error') === '1') {
      toast.error("Couldn't read the cover, please fill in manually")
    }
  }, [searchParams])

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

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <Link href="/books" className="text-sm text-stone-500 hover:text-stone-800 transition-colors">
          ← Back to my books
        </Link>
      </div>

      <Card className="border-stone-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-stone-800 text-xl">Add a book</CardTitle>
          {hasPreFill && (
            <p className="text-xs text-stone-400 mt-1">Fields pre-filled from cover scan — review before saving.</p>
          )}
        </CardHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
          <CardContent className="space-y-4">

            {/* Cover preview (from photo scan) */}
            {prefill.cover_url && (
              <div className="flex justify-center">
                <img
                  src={prefill.cover_url}
                  alt="Book cover"
                  className="h-40 w-auto rounded shadow-sm object-cover"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-stone-700">Title <span className="text-red-500">*</span></Label>
              <Input id="title" name="title" defaultValue={prefill.title}
                placeholder="e.g. The Name of the Wind" required
                className="border-stone-200 focus-visible:ring-stone-400" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="author" className="text-stone-700">Author <span className="text-red-500">*</span></Label>
              <Input id="author" name="author" defaultValue={prefill.author}
                placeholder="e.g. Patrick Rothfuss" required
                className="border-stone-200 focus-visible:ring-stone-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="publisher" className="text-stone-700">
                  Publisher <span className="text-stone-400 font-normal text-xs">(optional)</span>
                </Label>
                <Input id="publisher" name="publisher" defaultValue={prefill.publisher}
                  placeholder="e.g. Gollancz"
                  className="border-stone-200 focus-visible:ring-stone-400" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="year" className="text-stone-700">
                  Year <span className="text-stone-400 font-normal text-xs">(optional)</span>
                </Label>
                <Input id="year" name="year" defaultValue={prefill.year}
                  placeholder="e.g. 2007"
                  className="border-stone-200 focus-visible:ring-stone-400" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="isbn" className="text-stone-700">
                ISBN <span className="text-stone-400 font-normal">(optional)</span>
              </Label>
              <Input id="isbn" name="isbn" defaultValue={prefill.isbn}
                placeholder="e.g. 9780756404741"
                className="border-stone-200 focus-visible:ring-stone-400" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cover_url" className="text-stone-700">
                Cover URL <span className="text-stone-400 font-normal">(optional)</span>
              </Label>
              <Input id="cover_url" name="cover_url" type="url" defaultValue={prefill.cover_url}
                placeholder="https://…"
                className="border-stone-200 focus-visible:ring-stone-400" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category" className="text-stone-700">
                Category <span className="text-stone-400 font-normal">(optional)</span>
              </Label>
              <select
                id="category"
                name="category"
                defaultValue={prefill.category}
                className="w-full h-9 rounded-md border border-stone-200 bg-white px-3 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-stone-400"
              >
                <option value="">No category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-stone-700">
                Description <span className="text-stone-400 font-normal">(optional)</span>
              </Label>
              <Textarea id="description" name="description" defaultValue={prefill.description}
                placeholder="A short description of the book…" rows={3}
                className="border-stone-200 focus-visible:ring-stone-400 resize-none" />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button type="submit" disabled={loading}
              className="bg-stone-800 hover:bg-stone-700 text-white">
              {loading ? 'Saving…' : 'Add book'}
            </Button>
            <Button type="button" variant="ghost" className="text-stone-500"
              onClick={() => router.push('/books')}>
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Duplicate confirmation dialog */}
      <Dialog open={showDuplicate} onOpenChange={open => !open && setShowDuplicate(false)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-stone-800">Already on your shelf</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-600">
            You already have this book on your shelf. Add it anyway?
          </p>
          <DialogFooter className="flex gap-2 mt-2">
            <Button variant="ghost" className="text-stone-500"
              onClick={() => setShowDuplicate(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAnyway}
              className="bg-stone-800 hover:bg-stone-700 text-white">
              Add anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
