'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Camera, Plus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  redirectTo?: string
}

export default function PhotoModal({ open, onClose, redirectTo = '/books/add' }: Props) {
  const t = useTranslations('books')
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [versoFile, setVersoFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [versoPreview, setVersoPreview] = useState<string | null>(null)

  function resetState() {
    setCoverFile(null)
    setVersoFile(null)
    setCoverPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })
    setVersoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }

  function handleClose() {
    if (loading) return
    resetState()
    onClose()
  }

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
    e.target.value = ''
  }

  function onVersoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setVersoFile(file)
    setVersoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file) })
    e.target.value = ''
  }

  function removeVerso() {
    setVersoFile(null)
    setVersoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })
  }

  async function handleScan() {
    if (!coverFile) return
    setLoading(true)

    try {
      const resizedCover = await resizeImage(coverFile, 1024)
      const formData = new FormData()
      formData.append('coverImage', resizedCover)

      if (versoFile) {
        const resizedVerso = await resizeImage(versoFile, 1024)
        formData.append('versoImage', resizedVerso)
      }

      const res = await fetch('/api/extract-book', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok || data.error) throw new Error(data.error || 'Extraction failed')

      const params = new URLSearchParams()
      if (data.title)       params.set('title',       data.title)
      if (data.author)      params.set('author',      data.author)
      if (data.isbn)        params.set('isbn',        data.isbn)
      if (data.publisher)   params.set('publisher',   data.publisher)
      if (data.year)        params.set('year',        data.year)
      if (data.description) params.set('description', data.description)
      if (data.cover_url)   params.set('cover_url',   data.cover_url)
      if (data.category)    params.set('category',    data.category)
      if (data.language)    params.set('language',    data.language)

      resetState()
      onClose()
      router.push(`${redirectTo}?${params.toString()}`)
    } catch {
      resetState()
      onClose()
      toast.error("Couldn't read the cover, please fill in manually")
      router.push(redirectTo)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={isOpen => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-stone-800">{t('addByPhoto')}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex flex-col items-center gap-3 text-stone-500">
            <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-700 animate-spin" />
            <p className="text-sm">{versoFile ? t('readingBothCovers') : t('readingCover')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">

              {/* Front cover slot */}
              <div className="flex flex-col gap-1.5">
                {coverPreview ? (
                  <div className="aspect-[2/3] border-2 border-stone-300 rounded-lg overflow-hidden relative flex items-center justify-center bg-stone-50">
                    <img src={coverPreview} alt="Front cover" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <label
                    htmlFor="pm-cover-upload"
                    className="aspect-[2/3] border-2 border-stone-300 rounded-lg overflow-hidden relative flex items-center justify-center bg-stone-50 cursor-pointer"
                  >
                    <Camera className="h-7 w-7 text-stone-400" />
                  </label>
                )}
                <p className="text-xs text-center text-stone-600 font-medium">{t('frontCover')}</p>
                <div className="flex gap-1">
                  <label
                    htmlFor="pm-cover-camera"
                    className={cn(buttonVariants({ size: 'sm' }), 'flex-1 h-7 text-xs bg-stone-800 hover:bg-stone-700 text-white px-1.5 cursor-pointer')}
                  >
                    {t('takePhoto')}
                  </label>
                  <label
                    htmlFor="pm-cover-upload"
                    className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'flex-1 h-7 text-xs border-stone-200 text-stone-700 px-1.5 cursor-pointer')}
                  >
                    {t('uploadPhoto')}
                  </label>
                </div>
              </div>

              {/* Back cover slot */}
              <div className="flex flex-col gap-1.5">
                {versoPreview ? (
                  <div className="aspect-[2/3] border-2 border-dashed border-stone-200 rounded-lg overflow-hidden relative flex items-center justify-center bg-stone-50">
                    <img src={versoPreview} alt="Back cover" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-black/60 flex items-center justify-center"
                      onClick={removeVerso}
                      aria-label="Remove back cover"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="pm-verso-upload"
                    className="aspect-[2/3] border-2 border-dashed border-stone-200 rounded-lg overflow-hidden relative flex items-center justify-center bg-stone-50 cursor-pointer"
                  >
                    <Plus className="h-7 w-7 text-stone-300" />
                  </label>
                )}
                <p className="text-xs text-center text-stone-400">{t('backCoverOptional')}</p>
                {!versoPreview && (
                  <div className="flex gap-1">
                    <label
                      htmlFor="pm-verso-camera"
                      className={cn(buttonVariants({ size: 'sm' }), 'flex-1 h-7 text-xs bg-stone-800 hover:bg-stone-700 text-white px-1.5 cursor-pointer')}
                    >
                      {t('takePhotoBack')}
                    </label>
                    <label
                      htmlFor="pm-verso-upload"
                      className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'flex-1 h-7 text-xs border-stone-200 text-stone-700 px-1.5 cursor-pointer')}
                    >
                      {t('uploadBack')}
                    </label>
                  </div>
                )}
              </div>
            </div>

            <Button
              className="w-full bg-stone-800 hover:bg-stone-700 text-white"
              disabled={!coverFile}
              onClick={handleScan}
            >
              {t('scanBook')}
            </Button>
          </div>
        )}

        <input id="pm-cover-camera" type="file" accept="image/*" capture="environment" className="sr-only" onChange={onCoverChange} />
        <input id="pm-cover-upload" type="file" accept="image/*" className="sr-only" onChange={onCoverChange} />
        <input id="pm-verso-camera" type="file" accept="image/*" capture="environment" className="sr-only" onChange={onVersoChange} />
        <input id="pm-verso-upload" type="file" accept="image/*" className="sr-only" onChange={onVersoChange} />
      </DialogContent>
    </Dialog>
  )
}

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
