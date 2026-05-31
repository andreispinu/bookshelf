'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { addBook } from '../actions'

export default function AddBookPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(e.currentTarget)
    const result = await addBook(formData)

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
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title" className="text-stone-700">Title <span className="text-red-500">*</span></Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. The Name of the Wind"
                required
                className="border-stone-200 focus-visible:ring-stone-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="author" className="text-stone-700">Author <span className="text-red-500">*</span></Label>
              <Input
                id="author"
                name="author"
                placeholder="e.g. Patrick Rothfuss"
                required
                className="border-stone-200 focus-visible:ring-stone-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="isbn" className="text-stone-700">
                ISBN <span className="text-stone-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="isbn"
                name="isbn"
                placeholder="e.g. 9780756404741"
                className="border-stone-200 focus-visible:ring-stone-400"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cover_url" className="text-stone-700">
                Cover URL <span className="text-stone-400 font-normal">(optional)</span>
              </Label>
              <Input
                id="cover_url"
                name="cover_url"
                type="url"
                placeholder="https://…"
                className="border-stone-200 focus-visible:ring-stone-400"
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button
              type="submit"
              disabled={loading}
              className="bg-stone-800 hover:bg-stone-700 text-white"
            >
              {loading ? 'Saving…' : 'Add book'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-stone-500"
              onClick={() => router.push('/books')}
            >
              Cancel
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
