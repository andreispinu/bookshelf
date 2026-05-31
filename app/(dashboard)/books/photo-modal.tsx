'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type Props = {
  open: boolean
  onClose: () => void
}

export default function PhotoModal({ open, onClose }: Props) {
  const router = useRouter()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)

  async function handleFile(file: File) {
    setLoading(true)

    // Resize client-side to max 1024px before sending
    const resized = await resizeImage(file, 1024)

    const formData = new FormData()
    formData.append('image', resized)

    try {
      const res = await fetch('/api/extract-book', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || data.error) throw new Error(data.error || 'Extraction failed')

      const params = new URLSearchParams()
      if (data.title)       params.set('title',       data.title)
      if (data.author)      params.set('author',      data.author)
      if (data.isbn)        params.set('isbn',         data.isbn)
      if (data.description) params.set('description', data.description)

      onClose()
      router.push(`/books/add?${params.toString()}`)
    } catch {
      onClose()
      toast.error("Couldn't read the cover, please fill in manually")
      router.push('/books/add')
    } finally {
      setLoading(false)
    }
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <Dialog open={open} onOpenChange={open => !open && !loading && onClose()}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-stone-800">Add by photo</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3 text-stone-500">
            <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-700 animate-spin" />
            <p className="text-sm">Reading cover…</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 py-2">
            <Button
              className="w-full bg-stone-800 hover:bg-stone-700 text-white"
              onClick={() => cameraInputRef.current?.click()}
            >
              Take photo
            </Button>
            <Button
              variant="outline"
              className="w-full border-stone-200 text-stone-700"
              onClick={() => uploadInputRef.current?.click()}
            >
              Upload photo
            </Button>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onInputChange}
        />
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onInputChange}
        />
      </DialogContent>
    </Dialog>
  )
}

// Resize image to maxPx on longest side, preserving aspect ratio
function resizeImage(file: File, maxPx: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const { width, height } = img
      const scale = Math.min(1, maxPx / Math.max(width, height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(width  * scale)
      canvas.height = Math.round(height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Canvas toBlob failed'))
        resolve(new File([blob], file.name, { type: 'image/jpeg' }))
      }, 'image/jpeg', 0.88)
    }
    img.onerror = reject
    img.src = url
  })
}
